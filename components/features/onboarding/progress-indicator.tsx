"use client";

import { Check } from "lucide-react";

interface Step {
  id: number;
  title: string;
  description: string;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function ProgressIndicator({ steps, currentStep }: ProgressIndicatorProps) {
  return (
    <nav aria-label="Progress" className="py-4">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isUpcoming = step.id > currentStep;

          return (
            <li key={step.id} className="relative flex-1">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={`absolute top-4 left-1/2 w-full h-0.5 ${
                    isCompleted ? "bg-indigo-600" : "bg-gray-200"
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Step indicator */}
              <div className="relative flex flex-col items-center group">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    isCompleted
                      ? "bg-indigo-600 text-white"
                      : isCurrent
                        ? "bg-indigo-600 text-white ring-2 ring-indigo-600 ring-offset-2"
                        : "bg-gray-200 text-gray-500"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </span>

                {/* Step label */}
                <span
                  className={`mt-2 text-xs font-medium text-center ${
                    isCurrent ? "text-indigo-600" : isUpcoming ? "text-gray-400" : "text-gray-700"
                  }`}
                >
                  {step.title}
                </span>
                <span
                  className={`text-xs text-center hidden sm:block ${
                    isCurrent ? "text-indigo-500" : "text-gray-400"
                  }`}
                >
                  {step.description}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
