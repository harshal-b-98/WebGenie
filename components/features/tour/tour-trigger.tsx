"use client";

import { Button } from "@/components/ui/button";
import { HelpCircle, RefreshCw } from "lucide-react";
import { useTour, TourConfig } from "./tour-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface TourTriggerProps {
  tours: TourConfig[];
  className?: string;
}

export function TourTrigger({ tours, className }: TourTriggerProps) {
  const { startTour, isTourCompleted, restartTour } = useTour();

  const handleStartTour = (tour: TourConfig) => {
    if (isTourCompleted(tour.id)) {
      restartTour(tour.id);
    }
    startTour(tour);
  };

  if (tours.length === 1) {
    const tour = tours[0];
    const isCompleted = isTourCompleted(tour.id);

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleStartTour(tour)}
        className={className}
      >
        {isCompleted ? (
          <RefreshCw className="w-4 h-4 mr-2" />
        ) : (
          <HelpCircle className="w-4 h-4 mr-2" />
        )}
        {isCompleted ? "Replay Tour" : "Take a Tour"}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <HelpCircle className="w-4 h-4 mr-2" />
          Help Tours
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {tours.map((tour, index) => {
          const isCompleted = isTourCompleted(tour.id);
          return (
            <div key={tour.id}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={() => handleStartTour(tour)}>
                {isCompleted ? (
                  <RefreshCw className="w-4 h-4 mr-2 text-gray-400" />
                ) : (
                  <HelpCircle className="w-4 h-4 mr-2 text-indigo-600" />
                )}
                <span className={isCompleted ? "text-gray-500" : ""}>
                  {tour.name}
                  {isCompleted && " (completed)"}
                </span>
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
