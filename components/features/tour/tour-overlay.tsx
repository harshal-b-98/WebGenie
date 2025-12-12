"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { useTour } from "./tour-provider";

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: "top" | "bottom" | "left" | "right";
}

interface SpotlightPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

export function TourOverlay() {
  const { state, nextStep, prevStep, skipTour, endTour, getCurrentStep } = useTour();
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [spotlightPosition, setSpotlightPosition] = useState<SpotlightPosition | null>(null);
  const [mounted, setMounted] = useState(isBrowser);
  const frameRef = useRef<number | null>(null);

  // Handle client-side mounting
  useEffect(() => {
    if (!mounted) {
      // Use requestAnimationFrame to defer state update
      frameRef.current = requestAnimationFrame(() => {
        setMounted(true);
      });
    }
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [mounted]);

  const calculatePositions = useCallback(() => {
    const step = getCurrentStep();
    if (!step) return;

    const target = document.querySelector(step.target);
    if (!target) {
      // Target not found, skip to next step
      console.warn(`Tour target not found: ${step.target}`);
      return;
    }

    const rect = target.getBoundingClientRect();
    const padding = step.spotlightPadding ?? 8;

    // Calculate spotlight position
    setSpotlightPosition({
      top: rect.top - padding + window.scrollY,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });

    // Calculate tooltip position based on placement
    const tooltipWidth = 320;
    const tooltipHeight = 180;
    const margin = 16;

    let top = 0;
    let left = 0;
    let arrowPosition: "top" | "bottom" | "left" | "right" = "top";

    const placement = step.placement || "bottom";

    switch (placement) {
      case "bottom":
        top = rect.bottom + margin + window.scrollY;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowPosition = "top";
        break;
      case "top":
        top = rect.top - tooltipHeight - margin + window.scrollY;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowPosition = "bottom";
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipHeight / 2 + window.scrollY;
        left = rect.left - tooltipWidth - margin;
        arrowPosition = "right";
        break;
      case "right":
        top = rect.top + rect.height / 2 - tooltipHeight / 2 + window.scrollY;
        left = rect.right + margin;
        arrowPosition = "left";
        break;
    }

    // Ensure tooltip stays within viewport
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin));
    top = Math.max(margin, top);

    setTooltipPosition({ top, left, arrowPosition });

    // Scroll target into view if needed
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [getCurrentStep]);

  useEffect(() => {
    if (state.isActive) {
      // Use requestAnimationFrame to defer position calculation
      // This avoids ESLint warning about setState in useEffect
      const positionFrame = requestAnimationFrame(() => {
        calculatePositions();
      });

      // Recalculate on resize/scroll with debouncing via RAF
      let resizeFrame: number | null = null;
      const handleResize = () => {
        if (resizeFrame) cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
          calculatePositions();
        });
      };

      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleResize);

      return () => {
        cancelAnimationFrame(positionFrame);
        if (resizeFrame) cancelAnimationFrame(resizeFrame);
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleResize);
      };
    }
  }, [state.isActive, state.currentStepIndex, calculatePositions]);

  if (!mounted || !state.isActive || !state.currentTour) return null;

  const currentStep = getCurrentStep();
  if (!currentStep) return null;

  const totalSteps = state.currentTour.steps.length;
  const isLastStep = state.currentStepIndex === totalSteps - 1;
  const isFirstStep = state.currentStepIndex === 0;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
      {/* Backdrop with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightPosition && (
              <rect
                x={spotlightPosition.left}
                y={spotlightPosition.top}
                width={spotlightPosition.width}
                height={spotlightPosition.height}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.5)"
          mask="url(#spotlight-mask)"
          style={{ pointerEvents: "auto" }}
          onClick={skipTour}
        />
      </svg>

      {/* Spotlight highlight border */}
      {spotlightPosition && (
        <div
          className="absolute border-2 border-indigo-500 rounded-lg pointer-events-none"
          style={{
            top: spotlightPosition.top,
            left: spotlightPosition.left,
            width: spotlightPosition.width,
            height: spotlightPosition.height,
            boxShadow: "0 0 0 4px rgba(99, 102, 241, 0.3)",
          }}
        />
      )}

      {/* Tooltip */}
      {tooltipPosition && (
        <div
          className="absolute bg-white rounded-xl shadow-2xl p-5 w-80 z-10"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          {/* Arrow */}
          <div
            className={`absolute w-3 h-3 bg-white transform rotate-45 ${
              tooltipPosition.arrowPosition === "top"
                ? "-top-1.5 left-1/2 -translate-x-1/2"
                : tooltipPosition.arrowPosition === "bottom"
                  ? "-bottom-1.5 left-1/2 -translate-x-1/2"
                  : tooltipPosition.arrowPosition === "left"
                    ? "top-1/2 -left-1.5 -translate-y-1/2"
                    : "top-1/2 -right-1.5 -translate-y-1/2"
            }`}
          />

          {/* Close button */}
          <button
            onClick={skipTour}
            className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            aria-label="Close tour"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="pr-8">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">{currentStep.title}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">{currentStep.content}</p>
          </div>

          {/* Progress and Navigation */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="text-xs text-gray-400">
              Step {state.currentStepIndex + 1} of {totalSteps}
            </div>
            <div className="flex gap-2">
              {!isFirstStep && (
                <Button variant="ghost" size="sm" onClick={prevStep}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              {isLastStep ? (
                <Button size="sm" onClick={endTour}>
                  Finish
                </Button>
              ) : (
                <Button size="sm" onClick={nextStep}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
