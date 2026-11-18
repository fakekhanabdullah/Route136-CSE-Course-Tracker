"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, X, Layers, BookPlus, Award, Zap } from "lucide-react";

interface SpeedDialMenuProps {
  onAddSemester: () => void;
  onAddCourses: () => void;
  onQuickGrades: () => void;
  isCgpaMode?: boolean;
  isOpenControlled?: boolean;
  onCloseControlled?: () => void;
  isMobileSheet?: boolean;
}

export default function SpeedDialMenu({
  onAddSemester,
  onAddCourses,
  onQuickGrades,
  isCgpaMode = false,
  isOpenControlled,
  onCloseControlled,
  isMobileSheet = false,
}: SpeedDialMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = isOpenControlled !== undefined;
  const isOpen = isControlled ? isOpenControlled : internalOpen;

  const handleToggle = () => {
    if (isControlled) {
      if (isOpen && onCloseControlled) onCloseControlled();
    } else {
      setInternalOpen(prev => !prev);
    }
  };

  const handleClose = () => {
    if (isControlled && onCloseControlled) {
      onCloseControlled();
    } else {
      setInternalOpen(false);
    }
  };

  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // If this is rendered as a standalone mobile modal/sheet
  if (isMobileSheet) {
    if (!isOpen) return null;
    return (
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={handleClose}
      >
        <div 
          className="w-full max-w-sm bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#262626] rounded-2xl p-5 shadow-vercel-modal space-y-4 animate-in slide-in-from-bottom duration-200 text-[#171717] dark:text-[#ededed]"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#ebebeb] dark:border-[#262626]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626] text-[#0070f3] flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm">Quick Actions</h3>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-md text-[#888888] hover:text-[#171717] dark:hover:text-white bg-[#fafafa] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {/* Action 1: Add Semester */}
            <button
              onClick={() => {
                handleClose();
                onAddSemester();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#fafafa] dark:bg-[#111111] hover:bg-white dark:hover:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] text-left transition shadow-vercel-subtle group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-md bg-white dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-white shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs text-[#171717] dark:text-white group-hover:text-[#0070f3] transition-colors">
                  Add Semester
                </div>
                <div className="text-[11px] text-[#888888] truncate">
                  Create term &amp; open course search
                </div>
              </div>
            </button>

            {/* Action 2: Add Courses */}
            <button
              onClick={() => {
                handleClose();
                onAddCourses();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#fafafa] dark:bg-[#111111] hover:bg-white dark:hover:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] text-left transition shadow-vercel-subtle group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-md bg-white dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-white shrink-0">
                <BookPlus className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs text-[#171717] dark:text-white group-hover:text-[#0070f3] transition-colors">
                  Add Courses
                </div>
                <div className="text-[11px] text-[#888888] truncate">
                  Pick courses &amp; assign to semesters
                </div>
              </div>
            </button>

            {/* Action 3: Quick Grades */}
            <button
              onClick={() => {
                handleClose();
                onQuickGrades();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#fafafa] dark:bg-[#111111] hover:bg-white dark:hover:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] text-left transition shadow-vercel-subtle group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-md bg-white dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-white shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs text-[#171717] dark:text-white group-hover:text-[#0070f3] transition-colors">
                    Quick Grade Entry
                  </span>
                  {isCgpaMode && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-[#0070f3] border border-blue-500/20">
                      CGPA
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#888888] truncate">
                  Slide across semesters to assign grades
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Floating Action Button (bottom right)
  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-40 hidden md:block">
      {/* Expanded Speed Dial Menu */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 mb-2 w-60 p-2 rounded-xl bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#262626] shadow-vercel-modal space-y-1 animate-in slide-in-from-bottom-2 duration-150 text-[#171717] dark:text-[#ededed]">
          <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#888888] border-b border-[#ebebeb] dark:border-[#262626] mb-1">
            Quick Actions
          </div>

          <button
            onClick={() => {
              handleClose();
              onAddSemester();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#fafafa] dark:hover:bg-[#141414] text-left text-[#171717] dark:text-[#ededed] transition-all group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-md bg-[#f5f5f5] dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-white">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-medium">Add Semester</div>
              <div className="text-[10px] text-[#888888]">Create term &amp; enroll courses</div>
            </div>
          </button>

          <button
            onClick={() => {
              handleClose();
              onAddCourses();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#fafafa] dark:hover:bg-[#141414] text-left text-[#171717] dark:text-[#ededed] transition-all group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-md bg-[#f5f5f5] dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-white">
              <BookPlus className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-medium">Add Courses</div>
              <div className="text-[10px] text-[#888888]">Pick courses &amp; assign</div>
            </div>
          </button>

          <button
            onClick={() => {
              handleClose();
              onQuickGrades();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#fafafa] dark:hover:bg-[#141414] text-left text-[#171717] dark:text-[#ededed] transition-all group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-md bg-[#f5f5f5] dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-white">
              <Award className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium">Quick Grades</span>
                {isCgpaMode && (
                  <span className="text-[9px] font-mono px-1 rounded bg-blue-500/10 text-[#0070f3]">
                    CGPA
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#888888]">Slide carousel &amp; tap grades</div>
            </div>
          </button>
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        onClick={handleToggle}
        className={`w-11 h-11 rounded-full flex items-center justify-center shadow-vercel-float border border-[#ebebeb] dark:border-[#262626] transition-all duration-200 cursor-pointer ${
          isOpen
            ? "bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-white rotate-45 scale-95"
            : "bg-[#171717] dark:bg-white text-white dark:text-black hover:opacity-90 active:scale-95"
        }`}
        title="Add Semester, Courses, or Grades"
        aria-label="Add Semester, Courses, or Grades"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
      </button>
    </div>
  );
}
