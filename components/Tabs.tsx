"use client";

import { ReactNode } from "react";
import { theme } from "@/lib/theme";

interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
  controls?: ReactNode;
}

export default function Tabs({ tabs, activeTab, onChange, controls }: TabsProps) {
  return (
    <div className="border-b overflow-x-auto overflow-y-hidden" style={{ borderColor: theme.borderGray }}>
      <div className="px-4 sm:px-6 flex items-center min-w-max">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className="px-3 py-3 sm:px-4 text-xs sm:text-sm font-medium transition-colors duration-150 whitespace-nowrap font-sans min-h-[44px] cursor-pointer"
              style={{
                color: activeTab === tab.key ? theme.black : theme.gray,
                borderBottom: activeTab === tab.key ? `2px solid ${theme.black}` : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {controls && (
          <div className="ml-auto pl-4 flex items-center gap-2 shrink-0">
            {controls}
          </div>
        )}
      </div>
    </div>
  );
}
