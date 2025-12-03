import { Metadata } from "next";

export const metadata: Metadata = {
  title: "NextGenWeb - AI-Powered Website Builder",
  description:
    "Build beautiful, professional websites through conversation with AI. No coding or design skills required. Start for free.",
  keywords: [
    "AI website builder",
    "website generator",
    "no code website",
    "AI web design",
    "automated website creation",
  ],
  openGraph: {
    title: "NextGenWeb - Build Websites by Conversation",
    description: "AI-powered website builder. Describe your needs, get a professional website.",
    type: "website",
    url: "https://webgenie.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "NextGenWeb - AI Website Builder",
    description: "Build websites through conversation with AI",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
