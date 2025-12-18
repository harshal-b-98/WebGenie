/**
 * NextGenWeb Chat Widget
 * Self-contained chat widget for AI-powered visitor assistance
 * Embeds into generated websites to answer questions about the business
 *
 * Features:
 * - Text-based chat responses
 * - Dynamic answer page generation for relevant questions
 * - Conversation history with page links
 */

(function () {
  "use strict";

  // Widget configuration (set by parent page via NEXTGENWEB_CONFIG)
  const config = window.NEXTGENWEB_CONFIG || {};
  // Auto-detect API endpoint using current origin for same-origin calls (no CORS)
  const API_ENDPOINT = config.apiEndpoint || window.location.origin + "/api/widget";

  class ChatWidget {
    constructor(config) {
      this.projectId = config.projectId;
      this.versionId = config.versionId;
      this.apiEndpoint = config.apiEndpoint || API_ENDPOINT;
      this.messages = [];
      this.isOpen = false;
      this.isTyping = false;
      this.isGeneratingPage = false;

      // Parallel page generation: stores pending page generation promises
      // Key: questionSlug, Value: { promise: Promise, data: object, status: 'pending'|'ready'|'error' }
      this.pendingPages = new Map();

      this.init();
    }

    init() {
      // Create widget elements
      this.createButton();
      this.createPanel();
      this.attachEventListeners();

      // Setup global click handler as backup (survives DOM changes)
      this.setupGlobalClickHandler();

      // Add welcome message
      this.addMessage({
        role: "assistant",
        content:
          config.welcomeMessage ||
          "Hi! I can help answer questions about our products and services. Ask a question and I'll show you a detailed answer page!",
      });

      // Listen for page ready event from nav-controller
      window.addEventListener("ngw-answer-ready", () => {
        this.hideBubbleLoading();
        this.isGeneratingPage = false;
      });

      // Listen for content replacement event - re-create elements if destroyed
      window.addEventListener("ngw-content-replaced", () => {
        this.ensureElementsExist();
      });

      console.log("[NextGenWeb Widget] Initialized with page generation", {
        projectId: this.projectId,
      });
    }

    /**
     * Ensure widget elements exist in the DOM
     * Called after nav-controller replaces content, which destroys our elements
     */
    ensureElementsExist() {
      const buttonExists = document.getElementById("nextgenweb-chat-button");
      const panelExists = document.getElementById("nextgenweb-chat-panel");

      if (!buttonExists) {
        console.log("[NextGenWeb Widget] Re-creating button element");
        this.createButton();
      }

      if (!panelExists) {
        console.log("[NextGenWeb Widget] Re-creating panel element");
        this.createPanel();
        // Re-render messages
        this.renderMessages();
      }

      // IMPORTANT: Update references BEFORE attaching listeners
      this.button = document.getElementById("nextgenweb-chat-button");
      this.panel = document.getElementById("nextgenweb-chat-panel");
      this.messagesContainer = document.getElementById("nextgenweb-chat-messages");
      this.input = document.getElementById("nextgenweb-chat-input");

      // Always re-attach event listeners after content replacement
      // (prevents stale reference issues)
      this.attachEventListeners();

      // Restore open state if it was open
      if (this.isOpen && this.panel) {
        this.panel.style.display = "flex";
        this.panel.classList.add("nextgenweb-chat-panel-open");
        if (this.button) this.button.style.display = "none";
      }

      console.log(
        "[NextGenWeb Widget] Elements ensured - button:",
        !!this.button,
        "panel:",
        !!this.panel
      );
    }

    /**
     * Re-render all messages (used after panel is re-created)
     */
    renderMessages() {
      if (!this.messagesContainer) return;

      // Clear and re-render all messages
      this.messagesContainer.innerHTML = "";
      const messagesToRender = [...this.messages];
      this.messages = []; // Reset so addMessage works correctly

      messagesToRender.forEach((msg) => {
        this.addMessage(msg);
      });
    }

    createButton() {
      const button = document.createElement("button");
      button.id = "nextgenweb-chat-button";
      button.setAttribute("aria-label", "Open chat");

      // Apply position class from config
      const position = config.position || "bottom-right";
      button.classList.add(`position-${position}`);

      button.innerHTML = `
        <svg class="chat-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <svg class="loading-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
          <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32">
            <animate attributeName="stroke-dashoffset" dur="1s" values="32;0;32" repeatCount="indefinite"/>
          </circle>
        </svg>
      `;

      document.body.appendChild(button);
      this.button = button;
    }

    createPanel() {
      const panel = document.createElement("div");
      panel.id = "nextgenweb-chat-panel";
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", "Chat panel");
      panel.style.display = "none";

      // Apply position class from config
      const position = config.position || "bottom-right";
      panel.classList.add(`position-${position}`);

      panel.innerHTML = `
        <div class="nextgenweb-chat-header">
          <h3>Ask a Question</h3>
          <button id="nextgenweb-chat-close" aria-label="Close chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="nextgenweb-chat-messages" id="nextgenweb-chat-messages"></div>
        <div class="nextgenweb-chat-input-container">
          <input
            type="text"
            id="nextgenweb-chat-input"
            placeholder="Ask a question..."
            aria-label="Chat input"
          />
          <button id="nextgenweb-chat-send" aria-label="Send message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      `;

      document.body.appendChild(panel);
      this.panel = panel;
      this.messagesContainer = document.getElementById("nextgenweb-chat-messages");
      this.input = document.getElementById("nextgenweb-chat-input");
    }

    attachEventListeners() {
      // Ensure we have current button reference
      if (!this.button) {
        this.button = document.getElementById("nextgenweb-chat-button");
      }

      if (!this.button) {
        console.error("[NextGenWeb Widget] Cannot attach listeners - button not found in DOM");
        return;
      }

      // Use onclick property to prevent duplicate listeners
      this.button.onclick = (e) => {
        e.stopPropagation();
        console.log("[NextGenWeb Widget] Button clicked!");
        this.toggleChat();
      };

      // Close button
      const closeBtn = document.getElementById("nextgenweb-chat-close");
      if (closeBtn) {
        closeBtn.onclick = () => this.closeChat();
      }

      // Send button
      const sendBtn = document.getElementById("nextgenweb-chat-send");
      if (sendBtn) {
        sendBtn.onclick = () => this.sendMessage();
      }

      // Enter to send
      if (this.input) {
        this.input.onkeypress = (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
          }
        };
      }

      console.log("[NextGenWeb Widget] Event listeners attached to button:", !!this.button);
    }

    /**
     * Setup global click handler using event delegation
     * This survives DOM changes and ensures clicks always work
     */
    setupGlobalClickHandler() {
      // Only set up once
      if (window._ngwClickHandlerAttached) return;
      window._ngwClickHandlerAttached = true;

      document.addEventListener(
        "click",
        (e) => {
          const target = e.target;

          // Chat button click
          if (target.closest && target.closest("#nextgenweb-chat-button")) {
            e.preventDefault();
            e.stopPropagation();
            console.log("[NextGenWeb Widget] Global handler - button clicked");
            this.toggleChat();
            return;
          }

          // Close button click
          if (target.closest && target.closest("#nextgenweb-chat-close")) {
            e.preventDefault();
            this.closeChat();
            return;
          }

          // Send button click
          if (target.closest && target.closest("#nextgenweb-chat-send")) {
            e.preventDefault();
            this.sendMessage();
            return;
          }

          // View page button click
          if (target.closest && target.closest(".nextgenweb-view-page-button")) {
            // Let the inline handler deal with this
            return;
          }
        },
        true
      ); // Use capture phase for priority

      console.log("[NextGenWeb Widget] Global click handler attached");
    }

    toggleChat() {
      if (this.isOpen) {
        this.closeChat();
      } else {
        this.openChat();
      }
    }

    openChat() {
      this.isOpen = true;
      this.panel.style.display = "flex";
      this.button.style.display = "none";
      this.input?.focus();

      // Smooth slide-up animation
      requestAnimationFrame(() => {
        this.panel.classList.add("nextgenweb-chat-panel-open");
      });
    }

    closeChat() {
      this.isOpen = false;
      this.panel.classList.remove("nextgenweb-chat-panel-open");
      setTimeout(() => {
        this.panel.style.display = "none";
        this.button.style.display = "flex";
      }, 300);
    }

    showBubbleLoading() {
      this.button.classList.add("loading");
      const chatIcon = this.button.querySelector(".chat-icon");
      const loadingIcon = this.button.querySelector(".loading-icon");
      if (chatIcon) chatIcon.style.display = "none";
      if (loadingIcon) loadingIcon.style.display = "block";
    }

    hideBubbleLoading() {
      this.button.classList.remove("loading");
      const chatIcon = this.button.querySelector(".chat-icon");
      const loadingIcon = this.button.querySelector(".loading-icon");
      if (chatIcon) chatIcon.style.display = "block";
      if (loadingIcon) loadingIcon.style.display = "none";
    }

    addMessage(message) {
      this.messages.push(message);

      const messageEl = document.createElement("div");
      messageEl.className = `nextgenweb-chat-message nextgenweb-chat-message-${message.role}`;

      const contentEl = document.createElement("div");
      contentEl.className = "nextgenweb-chat-message-content";
      contentEl.textContent = message.content;

      messageEl.appendChild(contentEl);

      // Add "View Answer Page" link if message has page data
      if (message.hasPage && message.pageSlug) {
        const linkEl = document.createElement("a");
        linkEl.className = "nextgenweb-view-page-link";
        linkEl.href = "#";
        linkEl.textContent = "View Answer Page →";
        linkEl.addEventListener("click", (e) => {
          e.preventDefault();
          this.triggerPageGeneration(
            message.question,
            message.pageSlug,
            message.questionTitle,
            message.content
          );
        });
        messageEl.appendChild(linkEl);
      }

      this.messagesContainer?.appendChild(messageEl);

      // Auto-scroll to bottom
      this.scrollToBottom();
    }

    scrollToBottom() {
      if (this.messagesContainer) {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      }
    }

    showTypingIndicator() {
      if (this.isTyping) return;
      this.isTyping = true;

      const typingEl = document.createElement("div");
      typingEl.id = "nextgenweb-typing-indicator";
      typingEl.className = "nextgenweb-chat-message nextgenweb-chat-message-assistant";
      typingEl.innerHTML = `
        <div class="nextgenweb-chat-message-content">
          <div class="nextgenweb-typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      `;

      this.messagesContainer?.appendChild(typingEl);
      this.scrollToBottom();
    }

    hideTypingIndicator() {
      this.isTyping = false;
      const typingEl = document.getElementById("nextgenweb-typing-indicator");
      if (typingEl) {
        typingEl.remove();
      }
    }

    /**
     * Start background page generation (called when chat API returns generatePage: true)
     * This runs in parallel with showing the response to the user
     */
    startBackgroundPageGeneration(completeData) {
      const { question, questionSlug, questionTitle, content } = completeData;

      // Check if already generating or cached
      if (this.pendingPages.has(questionSlug)) {
        console.log("[NextGenWeb Widget] Page already generating/cached:", questionSlug);
        return;
      }

      console.log("[NextGenWeb Widget] Starting background page generation:", questionSlug);

      // Create the pending entry
      const pageEntry = {
        status: "pending",
        data: completeData,
        html: null,
        promise: null,
      };

      // Start the API call
      pageEntry.promise = fetch(`${this.apiEndpoint}/generate-answer-page`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: this.projectId,
          question: question,
          questionSlug: questionSlug,
          questionTitle: questionTitle,
          content: content,
          sessionId: window.NEXTGENWEB_NAV_CONFIG?.sessionId,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const data = await response.json();
          if (!data.html) {
            throw new Error("No HTML content received");
          }

          // Cache the result
          pageEntry.status = "ready";
          pageEntry.html = data.html;
          pageEntry.generationTime = data.generationTime;
          pageEntry.cached = data.cached;

          console.log("[NextGenWeb Widget] Background page ready:", questionSlug, {
            generationTime: data.generationTime,
            cached: data.cached,
          });

          return data;
        })
        .catch((error) => {
          console.error("[NextGenWeb Widget] Background page generation failed:", error);
          pageEntry.status = "error";
          pageEntry.error = error;
          throw error;
        });

      this.pendingPages.set(questionSlug, pageEntry);
    }

    /**
     * Trigger page generation - uses pre-generated page if available
     */
    async triggerPageGeneration(question, questionSlug, questionTitle, content) {
      // Close chat and show loading
      this.closeChat();
      this.showBubbleLoading();
      this.isGeneratingPage = true;

      // Check if page was pre-generated in background
      const pendingPage = this.pendingPages.get(questionSlug);

      if (pendingPage) {
        if (pendingPage.status === "ready" && pendingPage.html) {
          // Page is already generated! Dispatch event with pre-generated HTML
          console.log("[NextGenWeb Widget] Using pre-generated page:", questionSlug);

          window.dispatchEvent(
            new CustomEvent("ngw-generate-answer", {
              detail: {
                question,
                questionSlug,
                questionTitle,
                content,
                preGeneratedHtml: pendingPage.html, // Include pre-generated HTML
              },
            })
          );
          return;
        } else if (pendingPage.status === "pending" && pendingPage.promise) {
          // Page is still generating, wait for it
          console.log("[NextGenWeb Widget] Waiting for pending page generation:", questionSlug);

          try {
            await pendingPage.promise;

            // Now it should be ready
            if (pendingPage.status === "ready" && pendingPage.html) {
              console.log("[NextGenWeb Widget] Pending page now ready:", questionSlug);

              window.dispatchEvent(
                new CustomEvent("ngw-generate-answer", {
                  detail: {
                    question,
                    questionSlug,
                    questionTitle,
                    content,
                    preGeneratedHtml: pendingPage.html,
                  },
                })
              );
              return;
            }
          } catch (error) {
            console.error("[NextGenWeb Widget] Pending page failed:", error);
            // Fall through to generate normally
          }
        }
      }

      // No pre-generated page, dispatch event to generate normally
      console.log("[NextGenWeb Widget] Generating page on-demand:", questionSlug);
      window.dispatchEvent(
        new CustomEvent("ngw-generate-answer", {
          detail: {
            question,
            questionSlug,
            questionTitle,
            content,
          },
        })
      );
    }

    async sendMessage() {
      const message = this.input?.value.trim();
      if (!message || this.isGeneratingPage) return;

      // Clear input
      if (this.input) {
        this.input.value = "";
      }

      // Add user message to UI
      this.addMessage({
        role: "user",
        content: message,
      });

      // Show typing indicator
      this.showTypingIndicator();

      try {
        // Send to chat-with-page API (SSE)
        const response = await fetch(`${this.apiEndpoint}/chat-with-page`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: this.projectId,
            message: message,
            conversationHistory: this.messages.slice(-10),
            sessionId: window.NEXTGENWEB_NAV_CONFIG?.sessionId,
            versionId: this.versionId,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        // Hide typing, prepare for streaming
        this.hideTypingIndicator();

        // Create message element for streaming
        const messageEl = document.createElement("div");
        messageEl.className = "nextgenweb-chat-message nextgenweb-chat-message-assistant";
        const contentEl = document.createElement("div");
        contentEl.className = "nextgenweb-chat-message-content";
        messageEl.appendChild(contentEl);
        this.messagesContainer?.appendChild(messageEl);

        // Process SSE stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = "";
        let completeData = null;

        if (reader) {
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE events
            const events = buffer.split("\n\n");
            buffer = events.pop() || ""; // Keep incomplete event in buffer

            for (const eventBlock of events) {
              if (!eventBlock.trim()) continue;

              const lines = eventBlock.split("\n");
              let eventType = "";
              let eventData = "";

              for (const line of lines) {
                if (line.startsWith("event: ")) {
                  eventType = line.substring(7);
                } else if (line.startsWith("data: ")) {
                  eventData = line.substring(6);
                }
              }

              if (eventType === "summary" && eventData) {
                try {
                  const data = JSON.parse(eventData);
                  if (data.chunk) {
                    assistantMessage += data.chunk;
                    contentEl.textContent = assistantMessage;
                    this.scrollToBottom();
                  }
                } catch (e) {
                  console.error("[NextGenWeb Widget] Failed to parse summary:", e);
                }
              } else if (eventType === "complete" && eventData) {
                try {
                  completeData = JSON.parse(eventData);

                  // Start background page generation immediately if generatePage is true
                  // This runs in parallel while the user reads the text summary
                  if (completeData?.generatePage) {
                    this.startBackgroundPageGeneration(completeData);
                  }
                } catch (e) {
                  console.error("[NextGenWeb Widget] Failed to parse complete:", e);
                }
              } else if (eventType === "error" && eventData) {
                try {
                  const errorData = JSON.parse(eventData);
                  console.error("[NextGenWeb Widget] Stream error:", errorData.message);
                } catch (e) {
                  console.error("[NextGenWeb Widget] Failed to parse error:", e);
                }
              }
            }
          }
        }

        // Store message with page data if available
        const messageData = {
          role: "assistant",
          content: assistantMessage,
        };

        if (completeData?.generatePage) {
          messageData.hasPage = true;
          messageData.pageSlug = completeData.questionSlug;
          messageData.questionTitle = completeData.questionTitle;
          messageData.question = completeData.question;
          messageData.pageContent = completeData.content;

          // Add transition message container
          const pagePromptEl = document.createElement("div");
          pagePromptEl.className = "nextgenweb-page-prompt";
          pagePromptEl.innerHTML = `
            <div class="nextgenweb-page-prompt-text">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span>I can show you a detailed answer page with more information.</span>
            </div>
          `;

          // Add prominent "View Full Answer" button
          const buttonEl = document.createElement("button");
          buttonEl.className = "nextgenweb-view-page-button";
          buttonEl.innerHTML = `
            <span>View Full Answer Page</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          `;
          buttonEl.addEventListener("click", (e) => {
            e.preventDefault();
            // Add generating indicator in chat
            buttonEl.disabled = true;
            buttonEl.innerHTML = `
              <span>Generating page...</span>
              <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="10"></circle>
              </svg>
            `;
            this.triggerPageGeneration(
              completeData.question,
              completeData.questionSlug,
              completeData.questionTitle,
              completeData.content
            );
          });

          pagePromptEl.appendChild(buttonEl);
          messageEl.appendChild(pagePromptEl);

          // Also add a smaller text link for quick access
          const linkEl = document.createElement("a");
          linkEl.className = "nextgenweb-view-page-link";
          linkEl.href = "#";
          linkEl.textContent = "or click here to view →";
          linkEl.addEventListener("click", (e) => {
            e.preventDefault();
            this.triggerPageGeneration(
              completeData.question,
              completeData.questionSlug,
              completeData.questionTitle,
              completeData.content
            );
          });
          messageEl.appendChild(linkEl);
        }

        this.messages.push(messageData);
      } catch (error) {
        this.hideTypingIndicator();
        this.addMessage({
          role: "assistant",
          content:
            "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        });
        console.error("[NextGenWeb Widget] Error:", error);
      }
    }
  }

  // Auto-initialize if config exists
  console.log("[NextGenWeb Widget] Loading with config:", {
    projectId: config.projectId,
    versionId: config.versionId,
    position: config.position,
    apiEndpoint: config.apiEndpoint,
    hasConfig: !!window.NEXTGENWEB_CONFIG,
  });

  if (config.projectId) {
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        console.log("[NextGenWeb Widget] DOM ready, initializing...");
        new ChatWidget(config);
      });
    } else {
      console.log("[NextGenWeb Widget] DOM already ready, initializing...");
      new ChatWidget(config);
    }
  } else {
    console.error(
      "[NextGenWeb Widget] Missing projectId - widget will not initialize. Config:",
      window.NEXTGENWEB_CONFIG
    );
  }
})();
