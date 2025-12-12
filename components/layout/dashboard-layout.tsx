"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MobileNav } from "./mobile-nav";

interface DashboardLayoutProps {
  children: React.ReactNode;
  siteId?: string;
  siteName?: string;
}

export function DashboardLayout({ children, siteId, siteName }: DashboardLayoutProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Failed to sign out");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-30" role="banner">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left side - Logo and Mobile Nav */}
          <div className="flex items-center gap-2 sm:gap-4">
            <MobileNav siteId={siteId} siteName={siteName} />
            <Link
              href="/dashboard"
              className="text-lg sm:text-xl font-bold text-gray-900 hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-sm"
              aria-label="NextGenWeb - Go to Dashboard"
            >
              NextGenWeb
            </Link>
          </div>

          {/* Right side - Desktop Sign Out */}
          <div className="hidden md:flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              aria-label="Sign out of your account"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        id="main-content"
        className="mx-auto max-w-7xl px-4 py-6 sm:py-8 sm:px-6 lg:px-8"
        role="main"
        tabIndex={-1}
      >
        {children}
      </main>

      {/* Footer for accessibility */}
      <footer className="border-t border-gray-200 bg-white mt-auto" role="contentinfo">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} NextGenWeb. All rights reserved.</p>
            <nav aria-label="Footer navigation">
              <ul className="flex gap-4">
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-sm"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-sm"
                  >
                    Terms
                  </Link>
                </li>
                <li>
                  <Link
                    href="/accessibility"
                    className="hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-sm"
                  >
                    Accessibility
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
