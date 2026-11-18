"use client";

import React from "react";
import { Calendar, TrendingUp, Plus, Layers, Menu } from "lucide-react";

export type MobileTab = "planner" | "cgpa" | "categories" | "tools" | "semesters" | "curriculum" | "profile";

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  onOpenSpeedDial?: () => void;
  onOpenAddCourses?: () => void;
  onOpenTools?: () => void;
  isCgpaMode?: boolean;
}

export default function MobileBottomNav({
  activeTab,
  onTabChange,
  onOpenSpeedDial,
  onOpenAddCourses,
  onOpenTools,
  isCgpaMode = false,
}: MobileBottomNavProps) {
  const isPlannerActive = activeTab === "planner" || activeTab === "semesters";
  const isCgpaActive = activeTab === "cgpa" || isCgpaMode;
  const isCategoriesActive = activeTab === "categories" || activeTab === "curriculum";
  const isToolsActive = activeTab === "tools";

  const handleCenterAddClick = () => {
    if (onOpenSpeedDial) {
      onOpenSpeedDial();
    } else if (onOpenAddCourses) {
      onOpenAddCourses();
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-[#ebebeb] dark:border-[#262626] px-3 py-2 safe-area-pb shadow-vercel-modal transition-colors">
      <div className="flex items-center justify-between max-w-md mx-auto">
        
        {/* Tab 1: Extra Tools (Menu Hamburger) */}
        <button
          type="button"
          onClick={() => {
            if (onOpenTools) onOpenTools();
            onTabChange("tools");
          }}
          className={`flex flex-col items-center justify-center flex-1 py-0.5 transition-all cursor-pointer ${
            isToolsActive
              ? "text-[#0070f3] scale-105"
              : "text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed]"
          }`}
          title="Extra Tools"
        >
          <Menu className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-medium mt-1">Tools</span>
        </button>

        {/* Tab 2: CGPA (TrendingUp) */}
        <button
          type="button"
          onClick={() => onTabChange("cgpa")}
          className={`flex flex-col items-center justify-center flex-1 py-0.5 transition-all cursor-pointer ${
            isCgpaActive
              ? "text-[#0070f3] scale-105"
              : "text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed]"
          }`}
          title="CGPA & Trajectory"
        >
          <TrendingUp className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-medium mt-1">CGPA</span>
        </button>

        {/* Center Floating Plus: Quick Actions */}
        <div className="flex flex-col items-center justify-center flex-1">
          <button
            type="button"
            onClick={handleCenterAddClick}
            className="-mt-5 w-11 h-11 rounded-full bg-[#171717] dark:bg-[#ededed] text-white dark:text-black flex items-center justify-center shadow-vercel-float border-2 border-white dark:border-[#0a0a0a] active:scale-95 transition-all cursor-pointer"
            aria-label="Quick Actions"
            title="Quick Actions"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
          <span className="text-[10px] font-medium text-[#171717] dark:text-[#ededed] mt-1">Add</span>
        </div>

        {/* Tab 4: Categories / Curriculum (Layers) */}
        <button
          type="button"
          onClick={() => onTabChange("categories")}
          className={`flex flex-col items-center justify-center flex-1 py-0.5 transition-all cursor-pointer ${
            isCategoriesActive
              ? "text-[#0070f3] scale-105"
              : "text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed]"
          }`}
          title="Category Requirements"
        >
          <Layers className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-medium mt-1">Categories</span>
        </button>

        {/* Tab 5: Planner (Calendar) */}
        <button
          type="button"
          onClick={() => onTabChange("planner")}
          className={`flex flex-col items-center justify-center flex-1 py-0.5 transition-all cursor-pointer ${
            isPlannerActive
              ? "text-[#0070f3] scale-105"
              : "text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed]"
          }`}
          title="Semester Planner"
        >
          <Calendar className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-medium mt-1">Planner</span>
        </button>
      </div>
    </nav>
  );
}
