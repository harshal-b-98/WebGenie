"use client";

import { Button } from "@/components/ui/button";

type DeviceType = "desktop" | "tablet" | "mobile";

interface DeviceToggleProps {
  currentDevice: DeviceType;
  onDeviceChange: (device: DeviceType) => void;
}

export function DeviceToggle({ currentDevice, onDeviceChange }: DeviceToggleProps) {
  const devices: { type: DeviceType; label: string; icon: React.ReactNode }[] = [
    {
      type: "desktop",
      label: "Desktop",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      type: "tablet",
      label: "Tablet",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      type: "mobile",
      label: "Mobile",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1">
      {devices.map((device) => (
        <Button
          key={device.type}
          variant={currentDevice === device.type ? "default" : "ghost"}
          size="sm"
          onClick={() => onDeviceChange(device.type)}
          className="gap-2"
        >
          {device.icon}
          <span className="hidden sm:inline">{device.label}</span>
        </Button>
      ))}
    </div>
  );
}
