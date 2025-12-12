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
      if (!sessionStorage.getItem(cacheKey)) {
        sessionStorage.setItem(cacheKey, document.documentElement.outerHTML);
        console.log("[DynamicNav] Landing page saved for version:", config.versionId);
      }
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
          this.navigateToTopicWithStreaming(parentSegment, topic);
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
          this.navigateToTopicWithStreaming(currentSegment, itemId);
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

        <!-- Streaming Indicator -->
        <div id="streaming-indicator" class="fixed bottom-6 right-6 bg-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 z-50">
          <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span class="text-sm text-gray-600">Generating content...</span>
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
          // If skeleton was streaming, we're replacing partial content with complete
          if (skeleton.dataset.streaming) {
            console.log(`[DynamicNav] Replacing streamed content for ${sectionId}`);
          }
          skeleton.replaceWith(newSection);
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
          }
        }
      }
    }

    /**
     * Hide streaming indicator
     */
    hideStreamingIndicator() {
      const indicator = document.getElementById("streaming-indicator");
      if (indicator) {
        indicator.style.opacity = "0";
        setTimeout(() => indicator.remove(), 300);
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
        let fullHtml =
          '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-50">';
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

                case "section-chunk":
                  // Progressive display: show content as it streams
                  const skeletonEl = document.querySelector(`[data-skeleton="${data.id}"]`);
                  if (skeletonEl) {
                    // First chunk: clear skeleton and start showing content
                    if (!skeletonEl.dataset.streaming) {
                      skeletonEl.dataset.streaming = "true";
                      skeletonEl.innerHTML = "";
                      skeletonEl.style.background = "transparent";
                      skeletonEl.style.minHeight = "auto";
                    }
                    // Append chunk - shows content character by character
                    skeletonEl.insertAdjacentHTML("beforeend", data.chunk);
                  }
                  break;

                case "section-complete":
                  // Final reveal - replace with complete section
                  sectionHtml[data.id] = data.html;
                  this.revealSection(data.id, data.html);
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
                    { page: segment, siteId: config.siteId, versionId: config.versionId },
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

      behaviorTracker.trackPageVisit(segment);
      behaviorTracker.trackClick(`segment-${segment}`);

      // Check cache first
      const cacheKey = `segment_${segment}`;
      if (this.pageCache[cacheKey]) {
        this.displayPage(this.pageCache[cacheKey], segment);
        return;
      }

      // Use streaming if enabled
      if (config.useStreaming) {
        await this.navigateToSegmentStreaming(segment);
      } else {
        await this.navigateToSegmentFallback(segment);
      }
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
        let fullHtml =
          '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><script src="https://cdn.tailwindcss.com"></script></head><body>';
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
                case "section-chunk":
                  const skeletonEl = document.querySelector(`[data-skeleton="${data.id}"]`);
                  if (skeletonEl) {
                    if (!skeletonEl.dataset.streaming) {
                      skeletonEl.dataset.streaming = "true";
                      skeletonEl.innerHTML = "";
                      skeletonEl.style.background = "transparent";
                    }
                    skeletonEl.insertAdjacentHTML("beforeend", data.chunk);
                  }
                  break;
                case "section-complete":
                  sectionHtml[data.id] = data.html;
                  this.revealSection(data.id, data.html);
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
                    { page: pageSlug, siteId: config.siteId, versionId: config.versionId },
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
      // Restore original landing page (version-specific)
      const cacheKey = "ngw_landing_html_" + config.siteId + "_" + config.versionId;
      const originalHTML = sessionStorage.getItem(cacheKey);
      if (originalHTML) {
        console.log(
          "[DynamicNav] Restoring landing page from cache for version:",
          config.versionId
        );
        this.replaceContent(originalHTML);
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
        { page: pageSlug, siteId: config.siteId, versionId: config.versionId },
        "",
        `${baseUrl}#${pageSlug}`
      );

      this.hideLoading();
      window.scrollTo(0, 0);

      // Re-inject dynamic nav elements after content replacement
      this.injectLoadingOverlay();

      console.log("[DynamicNav] Page displayed:", pageSlug);
    }

    replaceContent(html) {
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

      // Replace body content without destroying event listeners on document
      document.body.innerHTML = newDoc.body.innerHTML;

      // Copy body attributes (class, style, etc.)
      Array.from(newDoc.body.attributes).forEach((attr) => {
        document.body.setAttribute(attr.name, attr.value);
      });

      console.log("[DynamicNav] Content replaced without destroying listeners");
    }

    handlePopState(event) {
      console.log("[DynamicNav] PopState event:", event.state);

      if (event.state && event.state.siteId === config.siteId) {
        if (event.state.page === "landing") {
          this.navigateToLanding();
        } else {
          // Check if we have this page cached
          const cacheKey = event.state.page.includes("/")
            ? `detail_${event.state.page.replace("/", "_")}`
            : `segment_${event.state.page}`;

          if (this.pageCache[cacheKey]) {
            this.replaceContent(this.pageCache[cacheKey]);
            this.currentPage = event.state.page;
            window.scrollTo(0, 0);

            // Re-inject dynamic nav elements
            this.injectLoadingOverlay();
          } else {
            // Re-fetch the page
            if (event.state.page.includes("/")) {
              const [segment, topic] = event.state.page.split("/");
              this.navigateToDetail(segment, topic);
            } else {
              this.navigateToSegment(event.state.page);
            }
          }
        }
      } else if (!event.state) {
        // No state - likely at initial page, restore landing
        this.navigateToLanding();
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new DynamicNavController());
  } else {
    new DynamicNavController();
  }
})();
