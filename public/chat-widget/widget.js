/**
 * NextGenWeb Chat Widget
 * Self-contained chat widget for AI-powered visitor assistance
 * Embeds into generated websites to answer questions about the business
 */

(function () {
  "use strict";

  // Widget configuration (set by parent page via NEXTGENWEB_CONFIG)
  const config = window.NEXTGENWEB_CONFIG || {};
  const API_ENDPOINT = config.apiEndpoint || "http://localhost:1729/api/widget";

  class ChatWidget {
    constructor(config) {
      this.projectId = config.projectId;
      this.versionId = config.versionId;
      this.apiEndpoint = config.apiEndpoint || API_ENDPOINT;
      this.messages = [];
      this.isOpen = false;
      this.isTyping = false;

      this.init();
    }

    init() {
      // Create widget elements
      this.createButton();
      this.createPanel();
      this.attachEventListeners();

      // Add welcome message
      this.addMessage({
        role: "assistant",
        content:
          config.welcomeMessage ||
          "Hi! I can help answer questions about our products and services. What would you like to know?",
      });

      console.log("[NextGenWeb Widget] Initialized", { projectId: this.projectId });
    }

    createButton() {
      const button = document.createElement("button");
      button.id = "nextgenweb-chat-button";
      button.setAttribute("aria-label", "Open chat");

      // Apply position class from config
      const position = config.position || "bottom-right";
      button.classList.add(`position-${position}`);

      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
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
          <h3>Chat with Us</h3>
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
      // Toggle chat
      this.button.addEventListener("click", () => this.toggleChat());

      // Close button
      document
        .getElementById("nextgenweb-chat-close")
        ?.addEventListener("click", () => this.toggleChat());

      // Send message
      document
        .getElementById("nextgenweb-chat-send")
        ?.addEventListener("click", () => this.sendMessage());

      // Enter to send
      this.input?.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    toggleChat() {
      this.isOpen = !this.isOpen;

      if (this.isOpen) {
        this.panel.style.display = "flex";
        this.button.style.display = "none";
        this.input?.focus();

        // Smooth slide-up animation
        requestAnimationFrame(() => {
          this.panel.classList.add("nextgenweb-chat-panel-open");
        });
      } else {
        this.panel.classList.remove("nextgenweb-chat-panel-open");
        setTimeout(() => {
          this.panel.style.display = "none";
          this.button.style.display = "flex";
        }, 300);
      }
    }

    addMessage(message) {
      this.messages.push(message);

      const messageEl = document.createElement("div");
      messageEl.className = `nextgenweb-chat-message nextgenweb-chat-message-${message.role}`;

      const contentEl = document.createElement("div");
      contentEl.className = "nextgenweb-chat-message-content";
      contentEl.textContent = message.content;

      messageEl.appendChild(contentEl);
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

    async sendMessage() {
      const message = this.input?.value.trim();
      if (!message) return;

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
        // Send to API
        const response = await fetch(`${this.apiEndpoint}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: this.projectId,
            message: message,
            conversationHistory: this.messages.slice(-10), // Last 10 messages for context
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        // Stream response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = "";

        // Hide typing, prepare for streaming
        this.hideTypingIndicator();

        // Create message element for streaming
        const messageEl = document.createElement("div");
        messageEl.className = "nextgenweb-chat-message nextgenweb-chat-message-assistant";
        const contentEl = document.createElement("div");
        contentEl.className = "nextgenweb-chat-message-content";
        messageEl.appendChild(contentEl);
        this.messagesContainer?.appendChild(messageEl);

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("0:")) {
                // Parse SSE data
                const data = line.substring(2).trim();
                if (data) {
                  assistantMessage += data;
                  contentEl.textContent = assistantMessage;
                  this.scrollToBottom();
                }
              }
            }
          }
        }

        // Add complete message to history
        this.messages.push({
          role: "assistant",
          content: assistantMessage,
        });
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
