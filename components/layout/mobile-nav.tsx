"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, Home, Globe, FileText, Settings, LogOut, ChevronRight } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { toast } from "sonner";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
}

interface MobileNavProps {
  siteId?: string;
  siteName?: string;
}

export function MobileNav({ siteId, siteName }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close menu when a link is clicked
  const closeMenu = () => setIsOpen(false);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      window.location.href = "/";
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const mainNavItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <Home className="w-5 h-5" />,
      description: "View all your sites",
    },
  ];

  const siteNavItems: NavItem[] = siteId
    ? [
        {
          href: `/dashboard/sites/${siteId}`,
          label: "Overview",
          icon: <Globe className="w-5 h-5" />,
          description: "Site overview",
        },
        {
          href: `/dashboard/sites/${siteId}/chat`,
          label: "Chat",
          icon: <FileText className="w-5 h-5" />,
          description: "AI conversation",
        },
        {
          href: `/dashboard/sites/${siteId}/preview`,
          label: "Preview",
          icon: <Globe className="w-5 h-5" />,
          description: "Preview website",
        },
        {
          href: `/dashboard/sites/${siteId}/settings`,
          label: "Settings",
          icon: <Settings className="w-5 h-5" />,
          description: "Site settings",
        },
      ]
    : [];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden p-2"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        aria-controls="mobile-nav-menu"
      >
        <Menu className="w-6 h-6" />
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Menu */}
      <nav
        id="mobile-nav-menu"
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onKeyDown={handleKeyDown}
        role="navigation"
        aria-label="Mobile navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <span className="text-lg font-bold text-gray-900">NextGenWeb</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation menu"
            className="p-2"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Site Context */}
        {siteId && siteName && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Current Site</p>
            <p className="text-sm font-medium text-gray-900 truncate">{siteName}</p>
          </div>
        )}

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* Main Navigation */}
          <div className="px-4 mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Main</p>
            <ul role="list" className="space-y-1">
              {mainNavItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                      isActive(item.href)
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    {item.icon}
                    <div className="flex-1 min-w-0">
                      <span className="block font-medium">{item.label}</span>
                      {item.description && (
                        <span className="block text-xs text-gray-500">{item.description}</span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Site Navigation */}
          {siteNavItems.length > 0 && (
            <div className="px-4 mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Site</p>
              <ul role="list" className="space-y-1">
                {siteNavItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeMenu}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                        isActive(item.href)
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      aria-current={isActive(item.href) ? "page" : undefined}
                    >
                      {item.icon}
                      <div className="flex-1 min-w-0">
                        <span className="block font-medium">{item.label}</span>
                        {item.description && (
                          <span className="block text-xs text-gray-500">{item.description}</span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 hover:bg-gray-100"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </nav>
    </>
  );
}
