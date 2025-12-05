import { ContentSection } from "@/types";

interface AIResponse {
  message: string;
  section?: ContentSection;
}

const MOCK_DELAY = 1000;

export const generateResponse = async (userMessage: string): Promise<AIResponse> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lowerMsg = userMessage.toLowerCase();

      if (lowerMsg.includes("feature") || lowerMsg.includes("what can you do")) {
        resolve({
          message:
            "Here are some of the key features of our platform. We focus on dynamic content generation and seamless user experience.",
          section: {
            id: "features-" + Date.now(),
            type: "features",
            data: {
              title: "Key Features",
              items: [
                {
                  title: "Dynamic Content",
                  description: "Content changes based on user interaction.",
                },
                { title: "AI Powered", description: "Simulated AI understands your intent." },
                { title: "Seamless UI", description: "Smooth transitions and modern design." },
              ],
            },
          },
        });
      } else if (lowerMsg.includes("price") || lowerMsg.includes("cost")) {
        resolve({
          message:
            "We offer flexible pricing plans to suit your needs. Check out our options below.",
          section: {
            id: "pricing-" + Date.now(),
            type: "pricing",
            data: {
              plans: [
                {
                  name: "Starter",
                  price: "$0/mo",
                  features: ["Basic Features", "Community Support"],
                },
                {
                  name: "Pro",
                  price: "$29/mo",
                  features: ["All Features", "Priority Support", "Analytics"],
                },
              ],
            },
          },
        });
      } else if (
        lowerMsg.includes("sign up") ||
        lowerMsg.includes("join") ||
        lowerMsg.includes("contact")
      ) {
        resolve({
          message: "Great! Let's get you started. Please fill out the form below.",
          section: {
            id: "form-" + Date.now(),
            type: "form",
            data: {
              fields: [
                { name: "email", label: "Email Address", type: "email" },
                { name: "name", label: "Full Name", type: "text" },
              ],
            },
          },
        });
      } else {
        resolve({
          message:
            "I can help you with features, pricing, or signing up. What would you like to know?",
          // No section for generic responses, or maybe a default hero?
          // Let's keep it simple for now.
        });
      }
    }, MOCK_DELAY);
  });
};
