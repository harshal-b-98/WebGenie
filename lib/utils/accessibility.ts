/**
 * Accessibility Utilities
 *
 * WCAG AA compliant utility functions and hooks for accessibility.
 */

/**
 * Calculate contrast ratio between two colors
 * Returns a value between 1 and 21
 * WCAG AA requires:
 * - 4.5:1 for normal text
 * - 3:1 for large text (18px+ or 14px+ bold)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 */
export function meetsContrastRequirements(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const required = isLargeText ? 3 : 4.5;
  return ratio >= required;
}

/**
 * Get relative luminance of a color
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Generate accessible color pair
 * Returns a foreground color that has sufficient contrast with the background
 */
export function getAccessibleForeground(background: string): string {
  const whiteLuminance = getLuminance("#FFFFFF");
  const blackLuminance = getLuminance("#000000");
  const bgLuminance = getLuminance(background);

  const whiteContrast = (whiteLuminance + 0.05) / (bgLuminance + 0.05);
  const blackContrast = (bgLuminance + 0.05) / (blackLuminance + 0.05);

  return whiteContrast > blackContrast ? "#FFFFFF" : "#000000";
}

/**
 * ARIA live region announcer
 * Announces messages to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite"
): void {
  if (typeof document === "undefined") return;

  // Find or create live region
  let liveRegion = document.getElementById("sr-announcer");

  if (!liveRegion) {
    liveRegion = document.createElement("div");
    liveRegion.id = "sr-announcer";
    liveRegion.setAttribute("aria-live", priority);
    liveRegion.setAttribute("aria-atomic", "true");
    liveRegion.className = "sr-only";
    liveRegion.style.cssText =
      "position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;";
    document.body.appendChild(liveRegion);
  }

  // Update priority if different
  liveRegion.setAttribute("aria-live", priority);

  // Clear and set message (triggers announcement)
  liveRegion.textContent = "";
  setTimeout(() => {
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }, 100);
}

/**
 * Focus trap utility for modals and dialogs
 */
export function createFocusTrap(container: HTMLElement): {
  activate: () => void;
  deactivate: () => void;
} {
  const focusableSelectors = [
    "button:not([disabled])",
    "a[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(", ");

  let previouslyFocused: HTMLElement | null = null;

  function getFocusableElements(): HTMLElement[] {
    return Array.from(container.querySelectorAll(focusableSelectors));
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key !== "Tab") return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return {
    activate: () => {
      previouslyFocused = document.activeElement as HTMLElement;
      container.addEventListener("keydown", handleKeyDown);

      // Focus first focusable element
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    },
    deactivate: () => {
      container.removeEventListener("keydown", handleKeyDown);

      // Restore focus
      if (previouslyFocused) {
        previouslyFocused.focus();
      }
    },
  };
}

/**
 * Generate unique IDs for accessibility relationships
 */
let idCounter = 0;
export function generateA11yId(prefix: string = "a11y"): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-contrast: more)").matches;
}

/**
 * Keyboard navigation helpers
 */
export const KeyboardKeys = {
  ENTER: "Enter",
  SPACE: " ",
  ESCAPE: "Escape",
  TAB: "Tab",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  HOME: "Home",
  END: "End",
} as const;

/**
 * Handle keyboard navigation for a list of items
 */
export function handleListKeyboardNav(
  e: React.KeyboardEvent,
  currentIndex: number,
  itemCount: number,
  onSelect: (index: number) => void
): void {
  let newIndex = currentIndex;

  switch (e.key) {
    case KeyboardKeys.ARROW_DOWN:
      e.preventDefault();
      newIndex = (currentIndex + 1) % itemCount;
      break;
    case KeyboardKeys.ARROW_UP:
      e.preventDefault();
      newIndex = (currentIndex - 1 + itemCount) % itemCount;
      break;
    case KeyboardKeys.HOME:
      e.preventDefault();
      newIndex = 0;
      break;
    case KeyboardKeys.END:
      e.preventDefault();
      newIndex = itemCount - 1;
      break;
    default:
      return;
  }

  onSelect(newIndex);
}

/**
 * Format text for screen readers
 */
export function formatForScreenReader(text: string, options?: { punctuate?: boolean }): string {
  let formatted = text;

  // Add periods after items for better pauses
  if (options?.punctuate) {
    formatted = formatted.replace(/([a-zA-Z0-9])$/gm, "$1.");
  }

  return formatted;
}

/**
 * Get descriptive text for loading states
 */
export function getLoadingDescription(itemName: string, isLoading: boolean): string {
  return isLoading ? `Loading ${itemName}, please wait.` : `${itemName} loaded.`;
}

/**
 * Semantic role helpers
 */
export const AriaRoles = {
  ALERT: "alert",
  ALERTDIALOG: "alertdialog",
  BUTTON: "button",
  CHECKBOX: "checkbox",
  DIALOG: "dialog",
  GRID: "grid",
  GRIDCELL: "gridcell",
  LINK: "link",
  LIST: "list",
  LISTBOX: "listbox",
  LISTITEM: "listitem",
  MENU: "menu",
  MENUITEM: "menuitem",
  NAVIGATION: "navigation",
  PROGRESSBAR: "progressbar",
  RADIO: "radio",
  RADIOGROUP: "radiogroup",
  REGION: "region",
  SEARCH: "search",
  SLIDER: "slider",
  STATUS: "status",
  TAB: "tab",
  TABLIST: "tablist",
  TABPANEL: "tabpanel",
  TEXTBOX: "textbox",
  TOOLTIP: "tooltip",
  TREE: "tree",
  TREEITEM: "treeitem",
} as const;
