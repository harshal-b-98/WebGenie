"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export interface TourStep {
  id: string;
  target: string; // CSS selector for the target element
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
  spotlightPadding?: number;
  action?: "click" | "hover" | "none";
}

export interface TourConfig {
  id: string;
  name: string;
  steps: TourStep[];
  onComplete?: () => void;
}

interface TourState {
  isActive: boolean;
  currentTour: TourConfig | null;
  currentStepIndex: number;
  completedTours: string[];
}

interface TourContextType {
  state: TourState;
  startTour: (tour: TourConfig) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  endTour: () => void;
  restartTour: (tourId: string) => void;
  isTourCompleted: (tourId: string) => boolean;
  getCurrentStep: () => TourStep | null;
}

const TourContext = createContext<TourContextType | null>(null);

const STORAGE_KEY = "nextgenweb_completed_tours";

// Load completed tours from localStorage (runs once at module load)
function getInitialCompletedTours(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TourState>(() => ({
    isActive: false,
    currentTour: null,
    currentStepIndex: 0,
    completedTours: getInitialCompletedTours(),
  }));

  // Save completed tours to localStorage
  const saveCompletedTours = useCallback((tours: string[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tours));
    }
  }, []);

  const startTour = useCallback((tour: TourConfig) => {
    setState((prev) => ({
      ...prev,
      isActive: true,
      currentTour: tour,
      currentStepIndex: 0,
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      if (!prev.currentTour) return prev;

      const nextIndex = prev.currentStepIndex + 1;
      if (nextIndex >= prev.currentTour.steps.length) {
        // Tour completed
        const newCompletedTours = [...prev.completedTours, prev.currentTour.id];
        saveCompletedTours(newCompletedTours);
        prev.currentTour.onComplete?.();

        return {
          ...prev,
          isActive: false,
          currentTour: null,
          currentStepIndex: 0,
          completedTours: newCompletedTours,
        };
      }

      return {
        ...prev,
        currentStepIndex: nextIndex,
      };
    });
  }, [saveCompletedTours]);

  const prevStep = useCallback(() => {
    setState((prev) => {
      if (!prev.currentTour || prev.currentStepIndex === 0) return prev;
      return {
        ...prev,
        currentStepIndex: prev.currentStepIndex - 1,
      };
    });
  }, []);

  const skipTour = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: false,
      currentTour: null,
      currentStepIndex: 0,
    }));
  }, []);

  const endTour = useCallback(() => {
    setState((prev) => {
      if (!prev.currentTour) return prev;

      const newCompletedTours = [...prev.completedTours, prev.currentTour.id];
      saveCompletedTours(newCompletedTours);
      prev.currentTour.onComplete?.();

      return {
        ...prev,
        isActive: false,
        currentTour: null,
        currentStepIndex: 0,
        completedTours: newCompletedTours,
      };
    });
  }, [saveCompletedTours]);

  const restartTour = useCallback(
    (tourId: string) => {
      setState((prev) => {
        const newCompletedTours = prev.completedTours.filter((id) => id !== tourId);
        saveCompletedTours(newCompletedTours);
        return {
          ...prev,
          completedTours: newCompletedTours,
        };
      });
    },
    [saveCompletedTours]
  );

  const isTourCompleted = useCallback(
    (tourId: string) => {
      return state.completedTours.includes(tourId);
    },
    [state.completedTours]
  );

  const getCurrentStep = useCallback(() => {
    if (!state.currentTour) return null;
    return state.currentTour.steps[state.currentStepIndex] || null;
  }, [state.currentTour, state.currentStepIndex]);

  return (
    <TourContext.Provider
      value={{
        state,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        endTour,
        restartTour,
        isTourCompleted,
        getCurrentStep,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}
