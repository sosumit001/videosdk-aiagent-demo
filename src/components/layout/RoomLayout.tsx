import React from "react";
import { AgentSettings } from "../agent-meeting/types";

interface RoomLayoutProps {
  children: React.ReactNode;
  agentSettings: AgentSettings;
  onSettingsChange?: (settings: AgentSettings) => void;
}

export const RoomLayout: React.FC<RoomLayoutProps> = ({
  children,
  agentSettings,
  onSettingsChange,
}) => {
  return (
    <div className="min-h-screen text-white flex flex-col">
      {/* Simplified layout - just the main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {children}
      </div>
    </div>
  );
};
