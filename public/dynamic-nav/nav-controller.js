/**
 * Dynamic Navigation Controller
 *
 * Handles client-side navigation for the progressive UI generation system.
 * - Supports STREAMING page generation with skeleton UI
 * - Manages segment navigation (AI-discovered segments, not hardcoded)
 * - Handles on-demand page generation with SSE
 * - Tracks visitor behavior for persona detection
 * - Uses history.pushState for seamless navigation
 */

(function () {
  "use strict";

  // Configuration (injected by server)
  const config = window.NEXTGENWEB_NAV_CONFIG || {
    siteId: "",
    versionId: "",
    apiEndpoint: "",
    personaDetectionEnabled: false,
    companyName: "Company",
    useStreaming: true, // Enable streaming by default
  };

  // Session management
  function getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem("ngw_session_id");
    if (!sessionId) {
      sessionId = "sess_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
      sessionStorage.setItem("ngw_session_id", sessionId);
    }
    return sessionId;
  }

  // Behavior tracking for persona detection
  const behaviorTracker = {
    startTime: Date.now(),
    pagesVisited: ["landing"],
    timeOnSections: {},
    clickedElements: [],
    scrollDepth: {},
    sectionStartTimes: {},

    trackPageVisit(page) {
      if (!this.pagesVisited.includes(page)) {
        this.pagesVisited.push(page);
      }
    },

    trackClick(elementId) {
      if (elementId && !this.clickedElements.includes(elementId)) {
        this.clickedElements.push(elementId);
      }
    },

    startSectionTimer(section) {
      this.sectionStartTimes[section] = Date.now();
    },

    endSectionTimer(section) {
      if (this.sectionStartTimes[section]) {
        const elapsed = (Date.now() - this.sectionStartTimes[section]) / 1000;
        this.timeOnSections[section] = (this.timeOnSections[section] || 0) + elapsed;
        delete this.sectionStartTimes[section];
      }
    },

    trackScrollDepth(section, depth) {
      this.scrollDepth[section] = Math.max(this.scrollDepth[section] || 0, depth);
    },

    getSignals() {
      return {
        pagesVisited: this.pagesVisited,
        timeOnSections: this.timeOnSections,
        clickedElements: this.clickedElements,
        scrollDepth: this.scrollDepth,
      };
    },
  };

  // Main navigation controller
  class DynamicNavController {
    constructor() {
      this.sessionId = getOrCreateSessionId();
      this.currentPage = "landing";
      this.pageCache = {};
      this.isLoading = false;
      this.explorerOpen = false;
      this.streamingInProgress = false;

      // Navigation stack for deterministic breadcrumb navigation
      // Each entry: { slug: 'segment-slug', name: 'Segment Name', type: 'segment'|'topic' }
      this.navigationStack = [];
      this.companyName = ""; // Will be extracted from landing page

      this.init();
    }

    init() {
      // Save the original landing page HTML immediately
      this.saveLandingPage();

      this.setupEventListeners();
      this.setupScrollTracking();
      this.injectLoadingOverlay();

      // Handle browser back/forward (within iframe context)
      window.addEventListener("popstate", (e) => this.handlePopState(e));

      // Listen for answer page generation requests from chat widget
      window.addEventListener("ngw-generate-answer", (e) => this.handleAnswerPageRequest(e));

      // Set initial history state
      if (!history.state) {
        history.replaceState(
          { page: "landing", siteId: config.siteId, versionId: config.versionId },
          "",
          window.location.href
        );
      }

      console.log("[DynamicNav] Initialized with streaming support", {
        siteId: config.siteId,
        versionId: config.versionId,
      });
    }

    saveLandingPage() {
      // Only save if not already saved and we're on landing page
      // Include versionId in key to support version-specific navigation
      const cacheKey = "ngw_landing_html_" + config.siteId + "_" + config.versionId;

      // Extract company name from landing page for navigation
      const logoElement =
        document.querySelector('[data-action="back-to-landing"]') ||
        document.querySelector("header a:first-child") ||
        document.querySelector("nav a:first-child");
      if (logoElement && !this.companyName) {
        this.companyName =
          logoElement.textContent?.trim() || logoElement.getAttribute("alt") || "Home";
      }
      if (!sessionStorage.getItem(cacheKey)) {
        sessionStorage.setItem(cacheKey, document.documentElement.outerHTML);
        console.log("[DynamicNav] Landing page saved for version:", config.versionId);
      }

      // Fix hero section alignment issues after page load
      this.fixHeroAlignment();
    }

    /**
     * Fix hero section benefit items alignment
     * This corrects any AI-generated layout issues where benefit items are not centered
     */
    fixHeroAlignment() {
      // Find the hero section (dark gradient background)
      const heroSection = document.querySelector(
        'section[class*="from-slate"], section[class*="from-gray"], section[class*="bg-gradient"]'
      );
      if (!heroSection) return;

      // Find all flex containers with text-gray-300 (benefit items)
      const benefitContainers = heroSection.querySelectorAll(".text-gray-300");

      // Find the parent container of benefit items (the row containing multiple benefits)
      benefitContainers.forEach((el) => {
        const parent = el.parentElement;
        if (parent && parent.children.length > 1) {
          // This is likely the container holding multiple benefit items
          // Check if it's a flex container
          const computedStyle = window.getComputedStyle(parent);
          if (computedStyle.display === "flex") {
            // Center the items
            parent.style.justifyContent = "center";
            parent.style.width = "100%";
            parent.style.flexWrap = "wrap";
            parent.style.gap = "2rem";
            console.log("[DynamicNav] Fixed hero benefit alignment");
          }
        }
      });

      // Also try to find by structure: div containing multiple spans with icons
      const allDivs = heroSection.querySelectorAll("div");
      allDivs.forEach((div) => {
        const spans = div.querySelectorAll(":scope > span.flex.items-center");
        if (spans.length >= 2) {
          // This div contains multiple benefit items
          div.style.display = "flex";
          div.style.justifyContent = "center";
          div.style.width = "100%";
          div.style.flexWrap = "wrap";
          div.style.gap = "2rem";
          console.log("[DynamicNav] Fixed hero benefit container alignment");
        }
      });
    }

    setupEventListeners() {
      document.addEventListener("click", (e) => {
        // Direct segment navigation (from nav links, cards, buttons)
        const segmentLink = e.target.closest("[data-segment]");
        if (segmentLink) {
          e.preventDefault();
          const segment = segmentLink.dataset.segment;
          console.log("[DynamicNav] Navigating to segment:", segment);
          this.navigateToSegment(segment);
          return;
        }

        // Topic detail clicks (new unified approach)
        const topicElement = e.target.closest("[data-topic]");
        if (topicElement) {
          e.preventDefault();
          const topic = topicElement.dataset.topic;
          const parentSegment =
            topicElement.dataset.parentSegment ||
            this.currentPage.split("/")[0] ||
            this.currentPage;
          console.log("[DynamicNav] Navigating to topic:", parentSegment, topic);
          this.navigateToTopicFallback(parentSegment, topic);
          return;
        }

        // Item detail clicks (AI-discovered items) - legacy support
        const itemCard = e.target.closest("[data-item-id]");
        if (itemCard) {
          e.preventDefault();
          const itemId = itemCard.dataset.itemId;
          // Find parent segment from the page context
          const currentSegment = this.currentPage.split("/")[0] || this.currentPage;
          console.log("[DynamicNav] Navigating to item detail:", currentSegment, itemId);
          this.navigateToTopicFallback(currentSegment, itemId);
          return;
        }

        // Legacy: Feature detail clicks
        const featureCard = e.target.closest("[data-feature-id]");
        if (featureCard) {
          e.preventDefault();
          const featureId = featureCard.dataset.featureId;
          console.log("[DynamicNav] Navigating to feature detail:", featureId);
          this.navigateToDetail("features", featureId);
          return;
        }

        // Legacy: Solution detail clicks
        const solutionCard = e.target.closest("[data-solution-id]");
        if (solutionCard) {
          e.preventDefault();
          const solutionId = solutionCard.dataset.solutionId;
          console.log("[DynamicNav] Navigating to solution detail:", solutionId);
          this.navigateToDetail("solutions", solutionId);
          return;
        }

        // Legacy: Capability detail clicks
        const capabilityCard = e.target.closest("[data-capability-id]");
        if (capabilityCard) {
          e.preventDefault();
          const capabilityId = capabilityCard.dataset.capabilityId;
          console.log("[DynamicNav] Navigating to capability detail:", capabilityId);
          this.navigateToDetail("platform", capabilityId);
          return;
        }

        // Back to landing
        const backToLanding = e.target.closest('[data-action="back-to-landing"]');
        if (backToLanding) {
          e.preventDefault();
          console.log("[DynamicNav] Navigating back to landing");
          this.navigateToLanding();
          return;
        }

        // CTA button clicks (demo, signup, contact, etc.)
        const ctaButton = e.target.closest('[data-action^="cta-"]');
        if (ctaButton) {
          e.preventDefault();
          const action = ctaButton.dataset.action;
          const ctaType = ctaButton.dataset.ctaType || "contact";
          console.log("[DynamicNav] CTA clicked:", action, ctaType);
          this.handleCTAAction(ctaType, ctaButton.textContent.trim());
          return;
        }

        // Track all clicks for persona detection
        if (config.personaDetectionEnabled) {
          const clickTarget = e.target.closest("[id], [data-track]");
          if (clickTarget) {
            behaviorTracker.trackClick(clickTarget.id || clickTarget.dataset.track);
          }
        }
      });
    }

    setupScrollTracking() {
      if (!config.personaDetectionEnabled) return;

      let ticking = false;
      window.addEventListener("scroll", () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = docHeight > 0 ? scrollTop / docHeight : 0;

            behaviorTracker.trackScrollDepth(
              this.currentPage,
              Math.round(scrollPercent * 100) / 100
            );
            ticking = false;
          });
          ticking = true;
        }
      });
    }

    injectLoadingOverlay() {
      // Remove existing if present
      const existing = document.getElementById("ngw-loading-overlay");
      if (existing) existing.remove();

      const overlay = document.createElement("div");
      overlay.id = "ngw-loading-overlay";
      overlay.className = "ngw-loading-overlay";
      // Add inline styles to ensure overlay is hidden by default (before CSS loads)
      overlay.style.cssText =
        "position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:opacity 0.3s,visibility 0.3s;";
      overlay.innerHTML = `
        <div class="ngw-loading-content">
          <div class="ngw-loading-spinner"></div>
          <h3>Generating Page</h3>
          <p>AI is creating personalized content...</p>
          <div class="ngw-loading-progress">
            <div class="ngw-loading-progress-bar"></div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    showLoading() {
      const overlay = document.getElementById("ngw-loading-overlay");
      if (overlay) {
        overlay.classList.add("visible");
        // Also set inline styles to ensure visibility
        overlay.style.opacity = "1";
        overlay.style.visibility = "visible";
        // Animate progress bar
        const progressBar = overlay.querySelector(".ngw-loading-progress-bar");
        if (progressBar) {
          progressBar.style.width = "0%";
          setTimeout(() => (progressBar.style.width = "30%"), 100);
          setTimeout(() => (progressBar.style.width = "60%"), 3000);
          setTimeout(() => (progressBar.style.width = "80%"), 6000);
        }
      }
      this.isLoading = true;
    }

    hideLoading() {
      const overlay = document.getElementById("ngw-loading-overlay");
      if (overlay) {
        const progressBar = overlay.querySelector(".ngw-loading-progress-bar");
        if (progressBar) {
          progressBar.style.width = "100%";
        }
        setTimeout(() => {
          overlay.classList.remove("visible");
          // Also reset inline styles to ensure hidden state
          overlay.style.opacity = "0";
          overlay.style.visibility = "hidden";
          if (progressBar) progressBar.style.width = "0%";
        }, 300);
      }
      this.isLoading = false;
    }

    /**
     * Show skeleton UI for streaming - uses body replacement instead of document.write
     */
    showSkeleton() {
      // Ensure Tailwind CSS is loaded for styling generated content
      if (!document.querySelector('script[src*="tailwindcss"]')) {
        const tailwindScript = document.createElement("script");
        tailwindScript.src = "https://cdn.tailwindcss.com";
        document.head.appendChild(tailwindScript);
        console.log("[DynamicNav] Injected Tailwind CSS");
      }

      // Ensure Feather icons are loaded
      if (!document.querySelector('script[src*="feather-icons"]')) {
        const featherScript = document.createElement("script");
        featherScript.src = "https://unpkg.com/feather-icons";
        document.head.appendChild(featherScript);
        console.log("[DynamicNav] Injected Feather Icons");
      }

      // Ensure dynamic nav styles are loaded
      if (!document.querySelector('link[href*="dynamic-nav/styles.css"]')) {
        const styleLink = document.createElement("link");
        styleLink.rel = "stylesheet";
        styleLink.href = `${config.apiEndpoint.replace("/api/widget", "")}/dynamic-nav/styles.css`;
        document.head.appendChild(styleLink);
        console.log("[DynamicNav] Injected navigation styles");
      }

      // Add required styles to head if not present
      if (!document.getElementById("ngw-skeleton-styles")) {
        const styleEl = document.createElement("style");
        styleEl.id = "ngw-skeleton-styles";
        styleEl.textContent = `
          @keyframes skeleton-pulse {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          .skeleton-pulse {
            animation: skeleton-pulse 1.5s ease-in-out infinite;
            background: linear-gradient(90deg, #e5e7eb 25%, #d1d5db 50%, #e5e7eb 75%);
            background-size: 200% 100%;
          }
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .section-reveal { animation: fade-in 0.5s ease-out forwards; }
          .ngw-skeleton-container { min-height: 100vh; background: #f9fafb; }

          /* Progressive rendering styles */
          .section-streaming {
            min-height: 200px;
            position: relative;
            overflow: hidden;
          }
          .section-streaming::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 60px;
            background: linear-gradient(transparent, #f9fafb);
            pointer-events: none;
          }

          /* Hover effects for navigable elements */
          [data-segment], [data-topic], [data-item-id], [data-action] {
            cursor: pointer !important;
            transition: all 0.2s ease !important;
          }
          [data-segment]:hover, [data-topic]:hover, [data-item-id]:hover {
            opacity: 0.85;
            transform: translateY(-2px);
          }
          [data-action]:hover {
            opacity: 0.9;
            transform: scale(1.02);
          }

          /* Card hover effects */
          [data-topic], [data-item-id] {
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          [data-topic]:hover, [data-item-id]:hover {
            box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
          }
        `;
        document.head.appendChild(styleEl);
      }

      // OPTIMIZED: 3 sections instead of 5 for faster loading
      const skeletonContent = `
        <!-- Header Skeleton (navbar + hero combined) -->
        <div data-skeleton="header">
          <div class="sticky top-0 z-50 bg-white shadow-sm">
            <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
              <div class="skeleton-pulse w-32 h-8 rounded"></div>
              <div class="hidden md:flex items-center space-x-6">
                <div class="skeleton-pulse w-16 h-4 rounded"></div>
                <div class="skeleton-pulse w-16 h-4 rounded"></div>
                <div class="skeleton-pulse w-16 h-4 rounded"></div>
              </div>
              <div class="skeleton-pulse w-28 h-10 rounded-lg"></div>
            </div>
          </div>
          <div class="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 py-20">
            <div class="max-w-4xl mx-auto px-4 text-center">
              <div class="skeleton-pulse w-40 h-4 rounded mx-auto mb-6" style="background: rgba(255,255,255,0.1);"></div>
              <div class="skeleton-pulse w-80 h-12 rounded mx-auto mb-4" style="background: rgba(255,255,255,0.15);"></div>
              <div class="skeleton-pulse w-96 h-6 rounded mx-auto" style="background: rgba(255,255,255,0.1);"></div>
            </div>
          </div>
        </div>

        <!-- Content Skeleton -->
        <div data-skeleton="content" class="max-w-6xl mx-auto px-4 py-16">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="bg-white rounded-xl p-6 shadow-sm">
              <div class="skeleton-pulse w-12 h-12 rounded-lg mb-4"></div>
              <div class="skeleton-pulse w-3/4 h-6 rounded mb-3"></div>
              <div class="skeleton-pulse w-full h-4 rounded mb-2"></div>
              <div class="skeleton-pulse w-4/5 h-4 rounded"></div>
            </div>
            <div class="bg-white rounded-xl p-6 shadow-sm">
              <div class="skeleton-pulse w-12 h-12 rounded-lg mb-4"></div>
              <div class="skeleton-pulse w-3/4 h-6 rounded mb-3"></div>
              <div class="skeleton-pulse w-full h-4 rounded mb-2"></div>
              <div class="skeleton-pulse w-4/5 h-4 rounded"></div>
            </div>
            <div class="bg-white rounded-xl p-6 shadow-sm">
              <div class="skeleton-pulse w-12 h-12 rounded-lg mb-4"></div>
              <div class="skeleton-pulse w-3/4 h-6 rounded mb-3"></div>
              <div class="skeleton-pulse w-full h-4 rounded mb-2"></div>
              <div class="skeleton-pulse w-4/5 h-4 rounded"></div>
            </div>
          </div>
        </div>

        <!-- Footer Skeleton (cta + footer combined) -->
        <div data-skeleton="footer">
          <div class="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
            <div class="max-w-2xl mx-auto px-4 text-center">
              <div class="skeleton-pulse w-64 h-8 rounded mx-auto mb-6" style="background: rgba(255,255,255,0.2);"></div>
              <div class="flex justify-center gap-4">
                <div class="skeleton-pulse w-36 h-12 rounded-lg" style="background: rgba(255,255,255,0.3);"></div>
                <div class="skeleton-pulse w-32 h-12 rounded-lg" style="background: rgba(255,255,255,0.15);"></div>
              </div>
            </div>
          </div>
          <div class="bg-gray-900 py-12">
            <div class="max-w-6xl mx-auto px-4 text-center">
              <div class="skeleton-pulse w-24 h-6 rounded mx-auto mb-6" style="background: rgba(255,255,255,0.1);"></div>
              <div class="flex justify-center gap-6 mb-4">
                <div class="skeleton-pulse w-16 h-4 rounded" style="background: rgba(255,255,255,0.1);"></div>
                <div class="skeleton-pulse w-16 h-4 rounded" style="background: rgba(255,255,255,0.1);"></div>
              </div>
              <div class="skeleton-pulse w-48 h-3 rounded mx-auto" style="background: rgba(255,255,255,0.05);"></div>
            </div>
          </div>
        </div>

        <!-- Streaming Indicator with Progress -->
        <div id="streaming-indicator" class="fixed bottom-6 right-6 bg-white rounded-xl shadow-2xl px-5 py-4 z-50 min-w-[280px]" style="border: 1px solid #e5e7eb;">
          <div class="flex items-center gap-3 mb-3">
            <div class="relative">
              <div class="w-8 h-8 border-3 border-indigo-200 rounded-full"></div>
              <div class="absolute inset-0 w-8 h-8 border-3 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div>
              <div class="font-semibold text-gray-900 text-sm">Generating Page</div>
              <div id="streaming-status" class="text-xs text-gray-500">Preparing sections...</div>
            </div>
          </div>
          <div class="space-y-2">
            <div class="flex items-center gap-2" data-progress="header">
              <div class="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center">
                <div class="w-2 h-2 rounded-full bg-gray-300"></div>
              </div>
              <span class="text-xs text-gray-600">Header & Navigation</span>
            </div>
            <div class="flex items-center gap-2" data-progress="content">
              <div class="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center">
                <div class="w-2 h-2 rounded-full bg-gray-300"></div>
              </div>
              <span class="text-xs text-gray-600">Main Content</span>
            </div>
            <div class="flex items-center gap-2" data-progress="footer">
              <div class="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center">
                <div class="w-2 h-2 rounded-full bg-gray-300"></div>
              </div>
              <span class="text-xs text-gray-600">Footer & CTA</span>
            </div>
          </div>
        </div>
      `;

      // Create skeleton container - replace body content without destroying DOM/listeners
      const container = document.createElement("div");
      container.id = "ngw-skeleton-container";
      container.className = "ngw-skeleton-container";
      container.innerHTML = skeletonContent;

      // Clear body and add skeleton (preserves document structure and listeners)
      document.body.innerHTML = "";
      document.body.appendChild(container);

      console.log("[DynamicNav] Skeleton UI displayed");
    }

    /**
     * Reveal a section with animation - replaces skeleton with final content
     */
    revealSection(sectionId, html) {
      const skeleton = document.querySelector(`[data-skeleton="${sectionId}"]`);
      if (skeleton) {
        // Create a wrapper for the new content
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        const newSection = wrapper.firstElementChild;

        if (newSection) {
          newSection.classList.add("section-reveal");
          console.log(`[DynamicNav] Revealing section: ${sectionId}`);
          skeleton.replaceWith(newSection);

          // Initialize Feather icons in the new section
          this.initializeFeatherIcons();
        }
      } else {
        // Fallback: section might already exist, try to find and replace by data-section
        const existingSection = document.querySelector(`[data-section="${sectionId}"]`);
        if (existingSection) {
          const wrapper = document.createElement("div");
          wrapper.innerHTML = html;
          const newSection = wrapper.firstElementChild;
          if (newSection) {
            newSection.classList.add("section-reveal");
            existingSection.replaceWith(newSection);

            // Initialize Feather icons in the new section
            this.initializeFeatherIcons();
          }
        }
      }
    }

    /**
     * Initialize Feather icons - called after content is added to DOM
     */
    initializeFeatherIcons() {
      // Wait a tick for DOM to settle, then initialize Feather icons
      setTimeout(() => {
        if (typeof feather !== "undefined") {
          feather.replace();
          console.log("[DynamicNav] Feather icons initialized");
        }
      }, 50);
    }

    /**
     * Update streaming progress indicator
     */
    updateStreamingProgress(sectionId, status) {
      const progressEl = document.querySelector(`[data-progress="${sectionId}"]`);
      if (!progressEl) return;

      const circle = progressEl.querySelector(".w-4");
      const text = progressEl.querySelector("span");

      if (status === "generating") {
        // Show spinning animation
        circle.innerHTML = `<div class="w-4 h-4 border-2 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>`;
        text.classList.remove("text-gray-600");
        text.classList.add("text-indigo-600", "font-medium");
      } else if (status === "complete") {
        // Show checkmark
        circle.innerHTML = `
          <svg class="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
        `;
        text.classList.remove("text-gray-600", "text-indigo-600");
        text.classList.add("text-green-600", "font-medium");
      }

      // Update status text
      const statusEl = document.getElementById("streaming-status");
      if (statusEl) {
        const sectionNames = { header: "Header", content: "Content", footer: "Footer" };
        if (status === "generating") {
          statusEl.textContent = `Generating ${sectionNames[sectionId] || sectionId}...`;
        } else if (status === "complete") {
          statusEl.textContent = `${sectionNames[sectionId] || sectionId} ready!`;
        }
      }
    }

    /**
     * Hide streaming indicator
     */
    hideStreamingIndicator() {
      const indicator = document.getElementById("streaming-indicator");
      if (indicator) {
        // Show completion state briefly
        const statusEl = document.getElementById("streaming-status");
        if (statusEl) {
          statusEl.textContent = "Page ready!";
        }
        // Fade out
        setTimeout(() => {
          indicator.style.transition = "opacity 0.3s, transform 0.3s";
          indicator.style.opacity = "0";
          indicator.style.transform = "translateY(10px)";
          setTimeout(() => indicator.remove(), 300);
        }, 500);
      }
    }

    /**
     * Show error UI when generation fails
     */
    showErrorUI(message = "Failed to generate page") {
      const errorHtml = `
        <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div class="max-w-md w-full text-center">
            <div class="mb-6">
              <svg class="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Generation Failed</h2>
            <p class="text-gray-600 mb-6">${message}</p>
            <button
              data-action="back-to-landing"
              class="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg class="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </button>
          </div>
        </div>
      `;

      document.body.innerHTML = errorHtml;
      this.hideStreamingIndicator();
    }

    /**
     * Navigate to segment with streaming
     */
    async navigateToSegmentStreaming(segment) {
      if (this.streamingInProgress) return;
      this.streamingInProgress = true;

      behaviorTracker.trackPageVisit(segment);
      behaviorTracker.trackClick(`segment-${segment}`);

      // Save landing page before navigating
      if (this.currentPage === "landing") {
        this.saveLandingPage();
      }

      // Show skeleton UI
      this.showSkeleton();

      // Set up timeout (60 seconds)
      const STREAMING_TIMEOUT = 60000;
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Generation timed out. Please try again."));
        }, STREAMING_TIMEOUT);
      });

      try {
        // Race between fetch and timeout
        const response = await Promise.race([
          fetch(`${config.apiEndpoint}/generate-page-stream`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              siteId: config.siteId,
              versionId: config.versionId,
              pageType: "segment",
              segment: segment,
              sessionId: this.sessionId,
              behaviorSignals: config.personaDetectionEnabled ? behaviorTracker.getSignals() : null,
            }),
          }),
          timeoutPromise,
        ]);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // Clear timeout since we got a response
        clearTimeout(timeoutId);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        // Initialize with fallback HTML to prevent race condition
        // Note: closing script tag is escaped to prevent breaking when this JS is inlined in HTML
        let fullHtml =
          '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"><\/script></head><body class="bg-gray-50">';
        const sectionHtml = {};

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events
          const events = buffer.split("\n\n");
          buffer = events.pop() || ""; // Keep incomplete event in buffer

          for (const eventStr of events) {
            if (!eventStr.trim()) continue;

            const lines = eventStr.split("\n");
            let eventType = "";
            let eventData = "";

            for (const line of lines) {
              if (line.startsWith("event: ")) {
                eventType = line.slice(7);
              } else if (line.startsWith("data: ")) {
                eventData = line.slice(6);
              }
            }

            if (!eventType || !eventData) continue;

            try {
              const data = JSON.parse(eventData);

              switch (eventType) {
                case "wrapper":
                  // Store wrapper for final assembly
                  fullHtml = data.head + data.bodyOpen;
                  break;

                case "section-start":
                  // Section is starting to generate - update progress indicator
                  this.updateStreamingProgress(data.id, "generating");
                  break;

                case "section-chunk":
                  // Buffer chunks silently - DON'T show raw HTML during streaming
                  // The skeleton remains visible until section-complete fires
                  // This prevents users from seeing raw HTML code during generation
                  if (!sectionHtml[data.id]) {
                    sectionHtml[data.id] = "";
                    // Update progress when first chunk arrives
                    this.updateStreamingProgress(data.id, "generating");
                  }
                  sectionHtml[data.id] += data.chunk;
                  break;

                case "section-complete":
                  // Update progress to complete
                  this.updateStreamingProgress(data.id, "complete");
                  // Final reveal - replace skeleton with complete section
                  sectionHtml[data.id] = data.html;
                  this.revealSection(data.id, data.html);
                  // Initialize Feather icons if present
                  if (typeof feather !== "undefined") {
                    setTimeout(() => feather.replace(), 100);
                  }
                  break;

                case "section-error":
                  // Section failed to generate
                  console.error(`[DynamicNav] Section "${data.id}" failed to generate`);
                  sectionHtml[data.id] =
                    `<div data-section="${data.id}" class="p-8 text-center text-red-500">Failed to load section</div>`;
                  this.revealSection(data.id, sectionHtml[data.id]);
                  break;

                case "complete":
                  // Hide streaming indicator
                  this.hideStreamingIndicator();

                  // Log any validation issues
                  if (data.validationStatus && !data.validationStatus.allValid) {
                    console.warn(
                      "[DynamicNav] Some sections had issues:",
                      data.validationStatus.failedSections
                    );
                  }

                  // Assemble full HTML for caching - OPTIMIZED: 3 sections
                  const sections = ["header", "content", "footer"];
                  let assembledHtml = fullHtml;
                  for (const sec of sections) {
                    assembledHtml += sectionHtml[sec] || "";
                  }
                  assembledHtml += "</body></html>";

                  // Cache the assembled HTML
                  const cacheKey = `segment_${segment}`;
                  this.pageCache[cacheKey] = assembledHtml;
                  console.log("[DynamicNav] Page cached successfully");

                  // Update state
                  this.currentPage = segment;
                  const baseUrl = window.location.href.split("#")[0];
                  history.pushState(
                    {
                      page: segment,
                      siteId: config.siteId,
                      versionId: config.versionId,
                      navigationStack: [...this.navigationStack],
                    },
                    "",
                    `${baseUrl}#${segment}`
                  );

                  console.log("[DynamicNav] Streaming complete:", segment);
                  break;

                case "error":
                  console.error("[DynamicNav] Stream error:", data.message);
                  this.hideStreamingIndicator();
                  break;
              }
            } catch (parseError) {
              console.warn("[DynamicNav] Failed to parse event:", parseError);
            }
          }
        }
      } catch (error) {
        console.error("[DynamicNav] Streaming failed:", error);

        // Show error UI for timeout or fatal errors
        if (error.message.includes("timed out")) {
          this.showErrorUI("Page generation timed out. The server may be busy. Please try again.");
        } else {
          // Fallback to non-streaming for other errors
          this.navigateToSegmentFallback(segment);
        }
      } finally {
        // Always clear the timeout
        clearTimeout(timeoutId);
        this.streamingInProgress = false;
      }
    }

    /**
     * Navigate to segment (decides between streaming and fallback)
     */
    async navigateToSegment(segment) {
      if (this.isLoading || this.streamingInProgress) return;

      // Update navigation stack - reset to just this segment
      const segmentName = this.slugToName(segment);
      this.navigationStack = [{ slug: segment, name: segmentName, type: "segment" }];

      behaviorTracker.trackPageVisit(segment);
      behaviorTracker.trackClick(`segment-${segment}`);

      // Check cache first
      const cacheKey = `segment_${segment}`;
      if (this.pageCache[cacheKey]) {
        this.displayPage(this.pageCache[cacheKey], segment);
        return;
      }

      // Use non-streaming for segment pages (has better content generation)
      // Use streaming for detail/topic pages (shows progressive reveal)
      await this.navigateToSegmentFallback(segment);
    }

    /**
     * Fallback to non-streaming page generation
     */
    async navigateToSegmentFallback(segment) {
      this.showLoading();

      try {
        const response = await fetch(`${config.apiEndpoint}/generate-page`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            siteId: config.siteId,
            versionId: config.versionId,
            pageType: "segment",
            segment: segment,
            sessionId: this.sessionId,
            behaviorSignals: config.personaDetectionEnabled ? behaviorTracker.getSignals() : null,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Cache the result
        const cacheKey = `segment_${segment}`;
        this.pageCache[cacheKey] = data.html;

        this.displayPage(data.html, segment);
      } catch (error) {
        console.error("[DynamicNav] Failed to generate segment page:", error);
        this.hideLoading();
        alert("Failed to load page. Please try again.");
      }
    }

    /**
     * Non-streaming topic/detail page navigation (unified with segment pages)
     * Uses the same loading experience as segment pages for consistency
     */
    async navigateToTopicFallback(parentSegment, topic) {
      if (this.isLoading) return;

      // Update navigation stack - ensure parent segment is there, then add topic
      const segmentName = this.slugToName(parentSegment);
      const topicName = this.slugToName(topic);

      // If stack is empty or first item doesn't match parent, reset to parent
      if (this.navigationStack.length === 0 || this.navigationStack[0].slug !== parentSegment) {
        this.navigationStack = [{ slug: parentSegment, name: segmentName, type: "segment" }];
      }

      // Add topic if not already the last item
      const lastItem = this.navigationStack[this.navigationStack.length - 1];
      if (!lastItem || lastItem.slug !== topic) {
        // Remove any existing topics (keep only the segment)
        this.navigationStack = this.navigationStack.filter((item) => item.type === "segment");
        this.navigationStack.push({ slug: topic, name: topicName, type: "topic" });
      }

      const pageSlug = `${parentSegment}/${topic}`;
      behaviorTracker.trackPageVisit(pageSlug);
      behaviorTracker.trackClick(`topic-${topic}`);

      // Check cache first
      const cacheKey = `topic_${parentSegment}_${topic}`;
      if (this.pageCache[cacheKey]) {
        const validation = this.validatePageHtml(this.pageCache[cacheKey], "detail");
        if (validation.isValid) {
          this.displayPage(this.pageCache[cacheKey], pageSlug);
          return;
        }
        delete this.pageCache[cacheKey];
      }

      // Show loading overlay (same as segment pages for consistency)
      this.showLoading();

      try {
        const response = await fetch(`${config.apiEndpoint}/generate-page`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            siteId: config.siteId,
            versionId: config.versionId,
            pageType: "detail",
            segment: parentSegment,
            topic: topic,
            sessionId: this.sessionId,
            behaviorSignals: config.personaDetectionEnabled ? behaviorTracker.getSignals() : null,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Cache the result
        this.pageCache[cacheKey] = data.html;

        console.log("[DynamicNav] Topic page generated:", pageSlug);
        this.displayPage(data.html, pageSlug);
      } catch (error) {
        console.error("[DynamicNav] Failed to generate topic page:", error);
        this.hideLoading();
        alert("Failed to load page. Please try again.");
      }
    }

    /**
     * Validate HTML completeness on client side
     * Returns warnings but doesn't block display - validation is lenient
     */
    validatePageHtml(html, pageType) {
      const warnings = [];

      // Basic sanity checks - only reject if truly broken
      if (!html || html.length < 500) {
        return { isValid: false, reason: "Page too short or empty" };
      }

      // Log warnings but don't block
      if (!html.includes("</html>") || !html.includes("</body>")) {
        warnings.push("Missing closing tags");
      }

      if (warnings.length > 0) {
        console.warn("[DynamicNav] Page validation warnings:", warnings);
      }

      // Always return valid for non-empty content
      return { isValid: true, warnings };
    }

    /**
     * Navigate to topic with streaming (used for all topic/detail navigation)
     * This provides progressive loading feedback to users
     */
    async navigateToTopicWithStreaming(parentSegment, topic) {
      if (this.streamingInProgress || this.isLoading) return;
      this.streamingInProgress = true;

      const pageSlug = `${parentSegment}/${topic}`;
      behaviorTracker.trackPageVisit(pageSlug);
      behaviorTracker.trackClick(`topic-${topic}`);

      // Check cache first
      const cacheKey = `topic_${parentSegment}_${topic}`;
      if (this.pageCache[cacheKey]) {
        const validation = this.validatePageHtml(this.pageCache[cacheKey], "detail");
        if (validation.isValid) {
          this.displayPage(this.pageCache[cacheKey], pageSlug);
          this.streamingInProgress = false;
          return;
        }
        delete this.pageCache[cacheKey];
      }

      // Show skeleton UI for streaming
      this.showSkeleton();

      // Set up timeout (60 seconds)
      const STREAMING_TIMEOUT = 60000;
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Generation timed out. Please try again."));
        }, STREAMING_TIMEOUT);
      });

      try {
        const response = await Promise.race([
          fetch(`${config.apiEndpoint}/generate-page-stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              siteId: config.siteId,
              versionId: config.versionId,
              pageType: "detail",
              segment: parentSegment,
              topic: topic,
              sessionId: this.sessionId,
              context: {
                currentPage: this.currentPage,
                clickedTopic: topic,
                parentSegment: parentSegment,
              },
              behaviorSignals: config.personaDetectionEnabled ? behaviorTracker.getSignals() : null,
            }),
          }),
          timeoutPromise,
        ]);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        clearTimeout(timeoutId);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        // Note: closing script tag is escaped to prevent breaking when this JS is inlined in HTML
        let fullHtml =
          '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><script src="https://cdn.tailwindcss.com"><\/script></head><body>';
        const sectionHtml = {};

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const eventStr of events) {
            if (!eventStr.trim()) continue;

            const lines = eventStr.split("\n");
            let eventType = "";
            let eventData = "";

            for (const line of lines) {
              if (line.startsWith("event: ")) eventType = line.slice(7);
              else if (line.startsWith("data: ")) eventData = line.slice(6);
            }

            if (!eventType || !eventData) continue;

            try {
              const data = JSON.parse(eventData);

              switch (eventType) {
                case "wrapper":
                  fullHtml = data.head + data.bodyOpen;
                  break;
                case "section-start":
                  this.updateStreamingProgress(data.id, "generating");
                  break;
                case "section-chunk":
                  // Buffer chunks silently - DON'T show raw HTML during streaming
                  // The skeleton remains visible until section-complete fires
                  if (!sectionHtml[data.id]) {
                    sectionHtml[data.id] = "";
                    this.updateStreamingProgress(data.id, "generating");
                  }
                  sectionHtml[data.id] += data.chunk;
                  break;
                case "section-complete":
                  this.updateStreamingProgress(data.id, "complete");
                  sectionHtml[data.id] = data.html;
                  this.revealSection(data.id, data.html);
                  // Initialize Feather icons if present
                  if (typeof feather !== "undefined") {
                    setTimeout(() => feather.replace(), 100);
                  }
                  break;
                case "complete":
                  this.hideStreamingIndicator();
                  const sections = ["header", "content", "footer"];
                  let assembledHtml = fullHtml;
                  for (const sec of sections) assembledHtml += sectionHtml[sec] || "";
                  assembledHtml += "</body></html>";

                  this.pageCache[cacheKey] = assembledHtml;
                  this.currentPage = pageSlug;
                  const baseUrl = window.location.href.split("#")[0];
                  history.pushState(
                    {
                      page: pageSlug,
                      siteId: config.siteId,
                      versionId: config.versionId,
                      navigationStack: [...this.navigationStack],
                    },
                    "",
                    `${baseUrl}#${pageSlug}`
                  );
                  console.log("[DynamicNav] Topic page streaming complete:", pageSlug);
                  break;
                case "error":
                  console.error("[DynamicNav] Stream error:", data.message);
                  this.hideStreamingIndicator();
                  break;
              }
            } catch (parseError) {
              console.warn("[DynamicNav] Failed to parse event:", parseError);
            }
          }
        }
      } catch (error) {
        console.error("[DynamicNav] Topic streaming failed:", error);
        if (error.message.includes("timed out")) {
          this.showErrorUI("Page generation timed out. Please try again.");
        } else {
          // Fallback to non-streaming
          this.navigateToDetail(parentSegment, topic);
        }
      } finally {
        clearTimeout(timeoutId);
        this.streamingInProgress = false;
      }
    }

    async navigateToDetail(segment, topicId) {
      if (this.isLoading || this.streamingInProgress) return;

      behaviorTracker.trackPageVisit(`${segment}-${topicId}`);
      behaviorTracker.trackClick(`detail-${topicId}`);

      // Check cache first - but validate before using
      const cacheKey = `detail_${segment}_${topicId}`;
      if (this.pageCache[cacheKey]) {
        const validation = this.validatePageHtml(this.pageCache[cacheKey], "detail");
        if (validation.isValid) {
          this.displayPage(this.pageCache[cacheKey], `${segment}/${topicId}`);
          return;
        } else {
          console.warn("[DynamicNav] Cached detail page failed validation:", validation.reason);
          delete this.pageCache[cacheKey]; // Remove invalid cache
        }
      }

      // Use non-streaming for consistent experience with segment pages
      await this.navigateToTopicFallback(segment, topicId);
      return;

      // Legacy non-streaming code (kept for reference but not used)
      this.showLoading();

      try {
        const response = await fetch(`${config.apiEndpoint}/generate-page`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            siteId: config.siteId,
            versionId: config.versionId,
            pageType: "detail",
            segment: segment,
            topic: topicId,
            sessionId: this.sessionId,
            behaviorSignals: config.personaDetectionEnabled ? behaviorTracker.getSignals() : null,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Validate but don't block - just warn
        const validation = this.validatePageHtml(data.html, "detail");
        if (!validation.isValid) {
          console.warn("[DynamicNav] Detail page validation warning:", validation.reason);
        }

        // Cache and display the result
        this.pageCache[cacheKey] = data.html;

        this.displayPage(data.html, `${segment}/${topicId}`);
      } catch (error) {
        console.error("[DynamicNav] Failed to generate detail page:", error);
        this.hideLoading();
        alert("Failed to load page. Please try again.");
      }
    }

    navigateToLanding() {
      // Clear navigation stack when going to landing
      this.navigationStack = [];

      // Restore original landing page (version-specific)
      const cacheKey = "ngw_landing_html_" + config.siteId + "_" + config.versionId;
      const originalHTML = sessionStorage.getItem(cacheKey);
      if (originalHTML) {
        console.log(
          "[DynamicNav] Restoring landing page from cache for version:",
          config.versionId
        );
        this.replaceContent(originalHTML, true); // skipNavInjection=true for landing
        this.currentPage = "landing";

        // Use replaceState to avoid breaking iframe back navigation
        history.replaceState(
          { page: "landing", siteId: config.siteId, versionId: config.versionId },
          "",
          window.location.href.split("#")[0]
        );
        window.scrollTo(0, 0);

        // Re-inject dynamic nav elements after restoring
        this.injectLoadingOverlay();
      } else {
        console.log("[DynamicNav] No cached landing page, reloading");
        // Fallback: reload the page
        window.location.reload();
      }
    }

    /**
     * Handle CTA button actions (demo, signup, contact, etc.)
     * Shows appropriate lead capture forms based on CTA type
     */
    handleCTAAction(ctaType, buttonText) {
      // Track the CTA click
      behaviorTracker.trackClick(`cta-${ctaType}`);
      console.log("[DynamicNav] CTA action:", ctaType, buttonText);

      // Always show lead capture form for CTAs - don't navigate to pages
      this.showLeadCaptureForm(ctaType, buttonText);
    }

    /**
     * Show lead capture form modal for CTA actions
     * Different form types based on CTA: demo, trial, contact, signup
     */
    showLeadCaptureForm(ctaType, buttonText) {
      // Remove existing modal if present
      const existingModal = document.getElementById("ngw-cta-modal");
      if (existingModal) existingModal.remove();

      // Determine form configuration based on CTA type
      const formConfig = this.getFormConfig(ctaType, buttonText);

      const modal = document.createElement("div");
      modal.id = "ngw-cta-modal";
      modal.style.cssText =
        "position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(4px);";
      modal.innerHTML = `
        <div style="background:white;border-radius:20px;padding:0;max-width:480px;width:90%;margin:16px;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:24px 32px;color:white;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
              ${formConfig.icon}
              <h3 style="font-size:24px;font-weight:700;margin:0;">${formConfig.title}</h3>
            </div>
            <p style="margin:0;opacity:0.9;font-size:14px;">${formConfig.subtitle}</p>
          </div>

          <!-- Form -->
          <form id="ngw-lead-form" style="padding:32px;">
            <div style="margin-bottom:20px;">
              <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;">Full Name *</label>
              <input type="text" name="name" required placeholder="John Smith" style="width:100%;padding:12px 16px;border:1px solid #e5e7eb;border-radius:10px;font-size:15px;outline:none;transition:border-color 0.2s;box-sizing:border-box;" onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e5e7eb'">
            </div>

            <div style="margin-bottom:20px;">
              <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;">Work Email *</label>
              <input type="email" name="email" required placeholder="john@company.com" style="width:100%;padding:12px 16px;border:1px solid #e5e7eb;border-radius:10px;font-size:15px;outline:none;transition:border-color 0.2s;box-sizing:border-box;" onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e5e7eb'">
            </div>

            ${
              formConfig.showCompany
                ? `
            <div style="margin-bottom:20px;">
              <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;">Company</label>
              <input type="text" name="company" placeholder="Your Company" style="width:100%;padding:12px 16px;border:1px solid #e5e7eb;border-radius:10px;font-size:15px;outline:none;transition:border-color 0.2s;box-sizing:border-box;" onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e5e7eb'">
            </div>
            `
                : ""
            }

            ${
              formConfig.showMessage
                ? `
            <div style="margin-bottom:20px;">
              <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;">Message</label>
              <textarea name="message" rows="3" placeholder="Tell us about your needs..." style="width:100%;padding:12px 16px;border:1px solid #e5e7eb;border-radius:10px;font-size:15px;outline:none;transition:border-color 0.2s;resize:none;font-family:inherit;box-sizing:border-box;" onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e5e7eb'"></textarea>
            </div>
            `
                : ""
            }

            <div style="display:flex;gap:12px;margin-top:24px;">
              <button type="button" id="ngw-cta-close" style="flex:1;padding:14px 20px;background:#f3f4f6;color:#374151;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:15px;transition:background 0.2s;" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
                Cancel
              </button>
              <button type="submit" style="flex:1;padding:14px 20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:15px;transition:transform 0.2s,box-shadow 0.2s;" onmouseover="this.style.transform='scale(1.02)';this.style.boxShadow='0 4px 12px rgba(102,126,234,0.4)'" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='none'">
                ${formConfig.submitText}
              </button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(modal);

      // Close handlers
      modal.addEventListener("click", (e) => {
        if (e.target === modal || e.target.id === "ngw-cta-close") {
          modal.remove();
        }
      });

      // Form submission
      const form = document.getElementById("ngw-lead-form");
      if (form) {
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const formData = new FormData(form);
          const data = {
            name: formData.get("name"),
            email: formData.get("email"),
            company: formData.get("company") || "",
            message: formData.get("message") || "",
            ctaType: ctaType,
            source: buttonText,
            timestamp: new Date().toISOString(),
          };

          // Submit lead to API
          await this.submitLead(data);

          // Show success message
          this.showFormSuccess(modal, formConfig.successMessage);
        });
      }

      console.log("[DynamicNav] Lead capture form shown for:", ctaType);
    }

    /**
     * Get form configuration based on CTA type
     */
    getFormConfig(ctaType, buttonText) {
      const configs = {
        demo: {
          title: "Schedule a Demo",
          subtitle: "See how we can help transform your business",
          icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
          showCompany: true,
          showMessage: true,
          submitText: "Request Demo",
          successMessage: "Demo request received! We'll contact you within 24 hours to schedule.",
        },
        trial: {
          title: "Start Free Trial",
          subtitle: "Get started with full access - no credit card required",
          icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
          showCompany: true,
          showMessage: false,
          submitText: "Start Free Trial",
          successMessage: "Welcome! Check your email for login instructions.",
        },
        signup: {
          title: "Create Account",
          subtitle: "Join thousands of satisfied customers",
          icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>',
          showCompany: false,
          showMessage: false,
          submitText: "Create Account",
          successMessage: "Account created! Check your email to verify.",
        },
        contact: {
          title: "Contact Us",
          subtitle: "Have questions? We'd love to hear from you",
          icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>',
          showCompany: true,
          showMessage: true,
          submitText: "Send Message",
          successMessage: "Message sent! We'll get back to you soon.",
        },
        pricing: {
          title: "Get Pricing",
          subtitle: "Get a customized quote for your needs",
          icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
          showCompany: true,
          showMessage: true,
          submitText: "Get Quote",
          successMessage: "Quote request received! We'll send pricing details shortly.",
        },
        default: {
          title: buttonText || "Get Started",
          subtitle: "Tell us how we can help",
          icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>',
          showCompany: true,
          showMessage: true,
          submitText: "Submit",
          successMessage: "Thank you! We'll be in touch soon.",
        },
      };

      // Normalize CTA type
      const type = ctaType?.toLowerCase().replace(/[^a-z]/g, "") || "default";

      // Check for keywords in type
      if (type.includes("demo") || type.includes("schedule")) return configs.demo;
      if (type.includes("trial") || type.includes("free")) return configs.trial;
      if (type.includes("signup") || type.includes("register") || type.includes("create"))
        return configs.signup;
      if (type.includes("contact") || type.includes("talk") || type.includes("reach"))
        return configs.contact;
      if (type.includes("price") || type.includes("quote") || type.includes("cost"))
        return configs.pricing;

      return configs[type] || configs.default;
    }

    /**
     * Submit lead to API
     */
    async submitLead(data) {
      try {
        const response = await fetch(`${config.apiEndpoint}/leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteId: config.siteId,
            ...data,
          }),
        });

        if (!response.ok) {
          console.warn("[DynamicNav] Lead submission failed:", response.status);
        } else {
          console.log("[DynamicNav] Lead submitted successfully");
        }
      } catch (error) {
        console.error("[DynamicNav] Error submitting lead:", error);
      }
    }

    /**
     * Show success message after form submission
     */
    showFormSuccess(modal, message) {
      const modalContent = modal.querySelector("div > div");
      if (modalContent) {
        modalContent.innerHTML = `
          <div style="padding:48px 32px;text-align:center;">
            <div style="width:64px;height:64px;margin:0 auto 24px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3 style="font-size:24px;font-weight:700;color:#111;margin:0 0 12px 0;">Thank You!</h3>
            <p style="color:#6b7280;margin:0 0 24px 0;font-size:15px;">${message}</p>
            <button id="ngw-success-close" style="padding:14px 32px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:15px;">
              Done
            </button>
          </div>
        `;

        document
          .getElementById("ngw-success-close")
          ?.addEventListener("click", () => modal.remove());

        // Auto close after 5 seconds
        setTimeout(() => modal.remove(), 5000);
      }
    }

    displayPage(html, pageSlug) {
      // Save original landing HTML if not saved
      if (this.currentPage === "landing") {
        this.saveLandingPage();
      }

      this.replaceContent(html);
      this.currentPage = pageSlug;

      // Update history within iframe context - use hash for segment pages
      const baseUrl = window.location.href.split("#")[0];
      history.pushState(
        {
          page: pageSlug,
          siteId: config.siteId,
          versionId: config.versionId,
          navigationStack: [...this.navigationStack],
        },
        "",
        `${baseUrl}#${pageSlug}`
      );

      this.hideLoading();
      window.scrollTo(0, 0);

      // Re-inject dynamic nav elements after content replacement
      this.injectLoadingOverlay();

      console.log("[DynamicNav] Page displayed:", pageSlug);
    }

    /**
     * Convert slug to human-readable name
     * e.g., "intelligent-enterprise" -> "Intelligent Enterprise"
     */
    slugToName(slug) {
      return slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    /**
     * Build breadcrumb HTML from navigation stack
     */
    buildBreadcrumb() {
      if (this.navigationStack.length === 0) return "";

      const items = this.navigationStack.map((item, i) => {
        const isLast = i === this.navigationStack.length - 1;
        if (isLast) {
          return `<li class="ngw-breadcrumb-current">${item.name}</li>`;
        }
        return `<li><a href="#" data-segment="${item.slug}" class="ngw-breadcrumb-link">${item.name}</a></li>`;
      });

      return `
        <nav class="ngw-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><a href="#" data-action="back-to-landing" class="ngw-breadcrumb-link">Home</a></li>
            <li class="ngw-breadcrumb-separator"><i data-feather="chevron-right"></i></li>
            ${items.join('<li class="ngw-breadcrumb-separator"><i data-feather="chevron-right"></i></li>')}
          </ol>
        </nav>
      `;
    }

    /**
     * Create deterministic navigation bar (injected after AI-generated content)
     */
    createNavigationBar() {
      const nav = document.createElement("div");
      nav.id = "ngw-injected-nav";
      nav.className = "ngw-fixed-nav";
      nav.innerHTML = `
        <div class="ngw-nav-container">
          <a href="#" data-action="back-to-landing" class="ngw-nav-logo">${this.companyName || "Home"}</a>
          ${this.buildBreadcrumb()}
          <button data-action="cta-primary" data-cta-type="demo" class="ngw-nav-cta">Get Started</button>
        </div>
      `;
      return nav;
    }

    replaceContent(html, skipNavInjection = false) {
      // Parse the new HTML
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(html, "text/html");

      // Extract styles and scripts from head
      const newHeadContent = Array.from(newDoc.head.children);

      // Keep essential elements in current head, add new ones
      newHeadContent.forEach((el) => {
        // Skip if it's our skeleton styles
        if (el.id === "ngw-skeleton-styles") return;

        // Add new styles/scripts if they don't exist
        const tagName = el.tagName.toLowerCase();
        if (tagName === "style" || tagName === "link") {
          const existing = document.head.querySelector(
            `${tagName}[href="${el.getAttribute("href")}"]`
          );
          if (!existing) {
            document.head.appendChild(el.cloneNode(true));
          }
        }
      });

      // Ensure dynamic nav styles are loaded
      if (!document.querySelector('link[href*="dynamic-nav/styles.css"]')) {
        const styleLink = document.createElement("link");
        styleLink.rel = "stylesheet";
        styleLink.href = `${config.apiEndpoint.replace("/api/widget", "")}/dynamic-nav/styles.css`;
        document.head.appendChild(styleLink);
      }

      // Ensure Feather icons are loaded
      if (!document.querySelector('script[src*="feather-icons"]')) {
        const featherScript = document.createElement("script");
        featherScript.src = "https://unpkg.com/feather-icons";
        document.head.appendChild(featherScript);
      }

      // Replace body content without destroying event listeners on document
      document.body.innerHTML = newDoc.body.innerHTML;

      // Copy body attributes (class, style, etc.)
      Array.from(newDoc.body.attributes).forEach((attr) => {
        document.body.setAttribute(attr.name, attr.value);
      });

      // Inject deterministic navigation bar (unless skipped for landing page)
      if (!skipNavInjection && this.navigationStack.length > 0) {
        // Remove ALL AI-generated navigation elements to avoid duplication
        // This includes: fixed nav bars, header navs, mobile menus, breadcrumbs
        const elementsToRemove = document.querySelectorAll(
          // Fixed position navs (AI-generated main nav)
          'nav[class*="fixed"], nav[class*="sticky"],' +
            // Header-based navs
            "header > nav, header nav," +
            // Mobile menu overlays (typically have translate-x or inset-0)
            'div[id*="mobile-menu"], div[class*="mobile-menu"],' +
            // Breadcrumb navs (we'll use our own)
            'nav[class*="breadcrumb"], nav.bg-gray-50,' +
            // Any nav with our data attributes (navigation links)
            'nav:has([data-segment]), nav:has([data-action="back-to-landing"])'
        );

        elementsToRemove.forEach((el) => {
          // Don't remove footer navs
          const isInFooter = el.closest("footer");
          if (!isInFooter) {
            el.remove();
          }
        });

        // Also remove any standalone header elements that might contain nav
        const headers = document.querySelectorAll("header:not(footer header)");
        headers.forEach((header) => {
          // Only remove if it's a main nav header (has nav links)
          if (header.querySelector("[data-segment]") || header.querySelector("nav")) {
            header.remove();
          }
        });

        // Inject our deterministic navigation
        const navBar = this.createNavigationBar();
        document.body.insertBefore(navBar, document.body.firstChild);

        // Add class to body for fixed nav padding (defined in styles.css)
        document.body.classList.add("ngw-has-fixed-nav");

        console.log(
          "[DynamicNav] Injected deterministic navigation bar, removed AI-generated navs"
        );
      }

      // Initialize Feather icons after content is replaced
      this.initializeFeatherIcons();

      // Notify chat widget to re-create its elements (they were destroyed by innerHTML replacement)
      window.dispatchEvent(new CustomEvent("ngw-content-replaced"));

      console.log("[DynamicNav] Content replaced without destroying listeners");
    }

    handlePopState(event) {
      console.log("[DynamicNav] PopState event:", event.state);

      if (event.state && event.state.siteId === config.siteId) {
        if (event.state.page === "landing") {
          // Clear navigation stack for landing
          this.navigationStack = [];
          this.navigateToLanding();
        } else {
          // Restore navigation stack from history state if available
          if (event.state.navigationStack) {
            this.navigationStack = event.state.navigationStack;
          } else {
            // Rebuild navigation stack from page path
            this.rebuildNavigationStack(event.state.page);
          }

          // Determine cache key based on page type
          let cacheKey;
          if (event.state.isAnswerPage || event.state.page.startsWith("answer/")) {
            // Answer page
            const questionSlug = event.state.page.replace("answer/", "");
            cacheKey = `answer_${questionSlug}`;
          } else if (event.state.page.includes("/")) {
            // Detail/topic page
            cacheKey = `detail_${event.state.page.replace("/", "_")}`;
          } else {
            // Segment page
            cacheKey = `segment_${event.state.page}`;
          }

          if (this.pageCache[cacheKey]) {
            this.replaceContent(this.pageCache[cacheKey]);
            this.currentPage = event.state.page;
            window.scrollTo(0, 0);

            // Re-inject dynamic nav elements
            this.injectLoadingOverlay();
          } else {
            // Re-fetch the page (answer pages need to go back to landing if not cached)
            if (event.state.isAnswerPage || event.state.page.startsWith("answer/")) {
              // Answer pages can't be re-fetched without the original content
              // Navigate back to landing instead
              console.log("[DynamicNav] Answer page not cached, returning to landing");
              this.navigateToLanding();
            } else if (event.state.page.includes("/")) {
              const [segment, topic] = event.state.page.split("/");
              this.navigateToDetail(segment, topic);
            } else {
              this.navigateToSegment(event.state.page);
            }
          }
        }
      } else if (!event.state) {
        // No state - likely at initial page, restore landing
        this.navigationStack = [];
        this.navigateToLanding();
      }
    }

    /**
     * Rebuild navigation stack from a page path (for popstate events without saved stack)
     */
    rebuildNavigationStack(pagePath) {
      if (pagePath.includes("/")) {
        // Detail page: segment/topic
        const [segment, topic] = pagePath.split("/");
        this.navigationStack = [
          { slug: segment, name: this.slugToName(segment), type: "segment" },
          { slug: topic, name: this.slugToName(topic), type: "topic" },
        ];
      } else {
        // Segment page
        this.navigationStack = [
          { slug: pagePath, name: this.slugToName(pagePath), type: "segment" },
        ];
      }
    }

    /**
     * Handle answer page generation request from chat widget
     * Triggered when user asks a question and relevant content is found
     * Supports pre-generated HTML for faster display (parallel generation)
     */
    async handleAnswerPageRequest(event) {
      const { question, questionSlug, questionTitle, content, preGeneratedHtml } = event.detail;

      console.log("[DynamicNav] Answer page request received:", {
        questionSlug,
        questionTitle,
        contentLength: content?.length || 0,
        hasPreGeneratedHtml: !!preGeneratedHtml,
      });

      // Save current page before navigating
      if (this.currentPage === "landing") {
        this.saveLandingPage();
      }

      // If pre-generated HTML is provided (from parallel generation), display immediately
      if (preGeneratedHtml) {
        console.log("[DynamicNav] Using pre-generated answer page HTML:", questionSlug);

        // Cache the pre-generated HTML
        const cacheKey = `answer_${questionSlug}`;
        this.pageCache[cacheKey] = preGeneratedHtml;

        // Display directly (skip API call)
        this.displayAnswerPage(preGeneratedHtml, questionSlug, questionTitle);
        return;
      }

      // No pre-generated HTML, generate the answer page via API
      await this.generateAnswerPage(question, questionSlug, questionTitle, content);
    }

    /**
     * Generate an answer page for a visitor's question
     * Calls the generate-answer-page API and displays the result
     */
    async generateAnswerPage(question, questionSlug, questionTitle, content) {
      // Check cache first
      const cacheKey = `answer_${questionSlug}`;
      if (this.pageCache[cacheKey]) {
        console.log("[DynamicNav] Using cached answer page:", questionSlug);
        this.displayAnswerPage(this.pageCache[cacheKey], questionSlug, questionTitle);
        return;
      }

      // Show loading overlay
      this.showLoading();

      // Update loading message
      const loadingContent = document.querySelector(".ngw-loading-content h3");
      const loadingDesc = document.querySelector(".ngw-loading-content p");
      if (loadingContent) loadingContent.textContent = "Generating Answer";
      if (loadingDesc) loadingDesc.textContent = "Creating a detailed answer page...";

      try {
        const response = await fetch(`${config.apiEndpoint}/generate-answer-page`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: config.siteId,
            question: question,
            questionSlug: questionSlug,
            questionTitle: questionTitle,
            content: content,
            sessionId: this.sessionId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.html) {
          throw new Error("No HTML content received");
        }

        // Cache the result
        this.pageCache[cacheKey] = data.html;

        console.log("[DynamicNav] Answer page generated:", {
          questionSlug,
          cached: data.cached,
          generationTime: data.generationTime,
          htmlLength: data.html.length,
        });

        // Display the answer page
        this.displayAnswerPage(data.html, questionSlug, questionTitle);
      } catch (error) {
        console.error("[DynamicNav] Failed to generate answer page:", error);
        this.hideLoading();

        // Notify chat widget that generation failed
        window.dispatchEvent(new CustomEvent("ngw-answer-ready", { detail: { error: true } }));

        // Show error message
        alert("Failed to generate answer page. Please try again.");
      }
    }

    /**
     * Display a generated answer page
     * Updates navigation stack and history for breadcrumb navigation
     */
    displayAnswerPage(html, questionSlug, questionTitle) {
      // Update navigation stack for answer page (like a detail page)
      this.navigationStack = [
        { slug: `answer/${questionSlug}`, name: questionTitle, type: "answer" },
      ];

      // Track behavior
      behaviorTracker.trackPageVisit(`answer/${questionSlug}`);

      // Replace content
      this.replaceContent(html);
      this.currentPage = `answer/${questionSlug}`;

      // Update history
      const baseUrl = window.location.href.split("#")[0];
      history.pushState(
        {
          page: `answer/${questionSlug}`,
          siteId: config.siteId,
          versionId: config.versionId,
          navigationStack: [...this.navigationStack],
          isAnswerPage: true,
        },
        "",
        `${baseUrl}#answer/${questionSlug}`
      );

      // Hide all loading indicators (overlay + streaming indicator)
      this.hideLoading();
      this.hideStreamingIndicator();

      window.scrollTo(0, 0);

      // Re-inject dynamic nav elements (creates hidden overlay for future use)
      this.injectLoadingOverlay();

      // Notify chat widget that answer page is ready
      window.dispatchEvent(
        new CustomEvent("ngw-answer-ready", { detail: { success: true, questionSlug } })
      );

      console.log("[DynamicNav] Answer page displayed:", questionSlug);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new DynamicNavController());
  } else {
    new DynamicNavController();
  }
})();
