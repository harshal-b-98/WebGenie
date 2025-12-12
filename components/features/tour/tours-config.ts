import type { TourConfig } from "./tour-provider";

/**
 * Dashboard Tour - Introduction to the main dashboard
 */
export const DASHBOARD_TOUR: TourConfig = {
  id: "dashboard-intro",
  name: "Dashboard Introduction",
  steps: [
    {
      id: "welcome",
      target: "[data-tour='header-logo']",
      title: "Welcome to NextGenWeb!",
      content:
        "This is your AI-powered website builder. Let me show you around and help you create your first website.",
      placement: "bottom",
    },
    {
      id: "create-project",
      target: "[data-tour='create-project']",
      title: "Create a New Project",
      content:
        "Click here to start a new website project. Our guided wizard will help you set up everything you need.",
      placement: "left",
    },
    {
      id: "projects-grid",
      target: "[data-tour='projects-grid']",
      title: "Your Projects",
      content:
        "All your website projects appear here. Click on any project to view, edit, or generate your website.",
      placement: "top",
    },
    {
      id: "search",
      target: "[data-tour='search-input']",
      title: "Search Projects",
      content: "As your projects grow, use the search bar to quickly find what you're looking for.",
      placement: "bottom",
    },
  ],
};

/**
 * Site Overview Tour - Introduction to a specific site
 */
export const SITE_OVERVIEW_TOUR: TourConfig = {
  id: "site-overview",
  name: "Site Overview",
  steps: [
    {
      id: "site-header",
      target: "[data-tour='site-name']",
      title: "Your Project",
      content:
        "This is your project dashboard. From here you can manage all aspects of your website.",
      placement: "bottom",
    },
    {
      id: "site-nav",
      target: "[data-tour='site-nav']",
      title: "Navigation",
      content:
        "Use these tabs to navigate between different sections: Chat with AI, Documents, Preview, and Settings.",
      placement: "bottom",
    },
    {
      id: "site-preview",
      target: "[data-tour='preview-button']",
      title: "Preview Your Website",
      content:
        "Click here to see a live preview of your generated website. You can view it on different device sizes.",
      placement: "left",
    },
    {
      id: "site-settings",
      target: "[data-tour='settings-link']",
      title: "Site Settings",
      content: "Configure your brand assets, logo, social media links, and other settings here.",
      placement: "left",
    },
  ],
};

/**
 * Generate Page Tour - How to generate a website
 */
export const GENERATE_TOUR: TourConfig = {
  id: "generate-website",
  name: "Generate Website",
  steps: [
    {
      id: "generate-intro",
      target: "[data-tour='generate-header']",
      title: "Website Generation",
      content:
        "This is where the magic happens! Our AI will create a stunning website based on your content.",
      placement: "bottom",
    },
    {
      id: "generate-content",
      target: "[data-tour='content-summary']",
      title: "Your Content",
      content:
        "We'll use the documents and information you've provided to generate relevant, accurate content.",
      placement: "right",
    },
    {
      id: "generate-button",
      target: "[data-tour='generate-button']",
      title: "Generate!",
      content:
        "Click this button to start the AI generation process. It usually takes 30-60 seconds to create your website.",
      placement: "top",
    },
  ],
};

/**
 * Chat Interface Tour - How to use AI chat
 */
export const CHAT_TOUR: TourConfig = {
  id: "chat-interface",
  name: "AI Chat",
  steps: [
    {
      id: "chat-intro",
      target: "[data-tour='chat-messages']",
      title: "AI Conversation",
      content:
        "Chat with our AI assistant to refine your website. Ask questions, request changes, or get suggestions.",
      placement: "right",
    },
    {
      id: "chat-input",
      target: "[data-tour='chat-input']",
      title: "Send Messages",
      content:
        "Type your message here. You can ask for specific changes like 'make the header blue' or 'add more testimonials'.",
      placement: "top",
    },
    {
      id: "chat-requirements",
      target: "[data-tour='requirements-panel']",
      title: "Requirements Summary",
      content:
        "This panel shows what the AI has learned about your website needs from your conversation.",
      placement: "left",
    },
  ],
};

/**
 * Documents Tour - How to manage documents
 */
export const DOCUMENTS_TOUR: TourConfig = {
  id: "documents",
  name: "Documents",
  steps: [
    {
      id: "docs-intro",
      target: "[data-tour='documents-header']",
      title: "Your Documents",
      content:
        "Upload documents containing your business information. The AI will extract and use this content.",
      placement: "bottom",
    },
    {
      id: "docs-upload",
      target: "[data-tour='upload-button']",
      title: "Upload Documents",
      content:
        "Click here to upload PDFs, Word docs, or text files. We support most common document formats.",
      placement: "left",
    },
    {
      id: "docs-list",
      target: "[data-tour='documents-list']",
      title: "Document List",
      content:
        "Your uploaded documents appear here. Click on any document to view its extracted content and embeddings.",
      placement: "top",
    },
  ],
};

/**
 * All available tours
 */
export const ALL_TOURS = {
  dashboard: DASHBOARD_TOUR,
  siteOverview: SITE_OVERVIEW_TOUR,
  generate: GENERATE_TOUR,
  chat: CHAT_TOUR,
  documents: DOCUMENTS_TOUR,
};
