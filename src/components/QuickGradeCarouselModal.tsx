"use client";

import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight, Award, Check, BookOpen } from "lucide-react";
import { COURSES } from "@/app/courses-data";

interface SelectedCourse {
  code: string;
  grade: string;
  isCompleted: boolean;
  isRepeat?: boolean;
}

interface Semester {
  id: string;
  name: string;
  courses: SelectedCourse[];
  isRS?: boolean;
  term?: 'Spring' | 'Summer' | 'Fall';
  year?: number;
  isCollapsed?: boolean;
}

const GRADING_SCALE: Record<string, number> = {
  "A+": 4.0,
  "A": 4.0,
  "A-": 3.7,
  "B+": 3.3,
  "B": 3.0,
  "B-": 2.7,
  "C+": 2.3,
  "C": 2.0,
  "C-": 1.7,
  "D+": 1.3,
  "D": 1.0,
  "D-": 0.7,
  "F": 0.0,
};

const GRADE_OPTIONS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];

interface QuickGradeCarouselModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesters: Semester[];
  initialSemesterIdx?: number;
  onUpdateGrade: (semId: string, courseCode: string, newGrade: string) => void;
}

export default function QuickGradeCarouselModal({
  isOpen,
  onClose,
  semesters,
  initialSemesterIdx = 0,
  onUpdateGrade,
}: QuickGradeCarouselModalProps) {
  const [activeIdx, setActiveIdx] = useState<number>(initialSemesterIdx);

  if (!isOpen || semesters.length === 0) return null;

  // Bound index safely
  const currentIdx = Math.max(0, Math.min(semesters.length - 1, activeIdx));
  const currentSem = semesters[currentIdx];

  // Calculate SGPA for current semester
  let totalGradePoints = 0;
  let totalGradedCredits = 0;
  let totalSemesterCredits = 0;

  currentSem.courses.forEach(c => {
    const courseInfo = COURSES.find(item => item.code === c.code);
    const cr = courseInfo?.credits || 3;
    totalSemesterCredits += cr;

    if (c.grade && GRADING_SCALE[c.grade] !== undefined) {
      totalGradePoints += GRADING_SCALE[c.grade] * cr;
      totalGradedCredits += cr;
    }
  });

  const sgpa = totalGradedCredits > 0 ? (totalGradePoints / totalGradedCredits).toFixed(2) : "0.00";
  const hasGrades = totalGradedCredits > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0c0c0c] border border-[#e5e5e5] dark:border-[#242424] rounded-2xl shadow-vercel-modal overflow-hidden text-[#171717] dark:text-[#ededed]"
        onClick={e => e.stopPropagation()}
      >
        {/* Window Chrome Bar */}
        <div className="px-4 py-2 bg-[#fafafa] dark:bg-[#111111] border-b border-[#ebebeb] dark:border-[#222222] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
          </div>
          <div className="px-3 py-0.5 rounded-md bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] text-[10px] font-mono text-[#888888] flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0070f3]" />
            <span>route136.app/quick-grades</span>
          </div>
          <span className="text-[10px] font-mono text-[#0070f3] bg-[#0070f3]/10 border border-[#0070f3]/20 px-2 py-0.5 rounded">
            SGPA ENTRY
          </span>
        </div>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#ebebeb] dark:border-[#262626] flex items-center justify-between bg-white dark:bg-[#0c0c0c]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#0070f3] shadow-vercel-subtle">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">
                Quick Grade Entry
              </h3>
              <p className="text-xs text-[#888888]">
                Slide across semesters and tap grades for instant SGPA updates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] bg-[#fafafa] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Semester Tabs Carousel Navigation */}
        <div className="bg-[#fafafa] dark:bg-[#111111] border-b border-[#ebebeb] dark:border-[#262626] px-3 py-2 flex items-center justify-between gap-2">
          <button
            onClick={() => setActiveIdx(prev => Math.max(0, prev - 1))}
            disabled={currentIdx === 0}
            className="p-1 rounded-md text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0 cursor-pointer"
            title="Previous Semester"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Scrollable Semester Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5 px-1">
            {semesters.map((sem, idx) => {
              const isActive = idx === currentIdx;
              return (
                <button
                  key={sem.id}
                  onClick={() => setActiveIdx(idx)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-[#171717] dark:bg-[#ededed] text-white dark:text-black shadow-vercel-subtle"
                      : "bg-white dark:bg-[#1a1a1a] text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] border border-[#ebebeb] dark:border-[#262626]"
                  }`}
                >
                  <span>{sem.name}</span>
                  {sem.courses.length > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isActive 
                          ? "bg-white/20 dark:bg-black/20 text-current" 
                          : "bg-[#f0f0f0] dark:bg-[#262626] text-[#888888]"
                      }`}
                    >
                      {sem.courses.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setActiveIdx(prev => Math.min(semesters.length - 1, prev + 1))}
            disabled={currentIdx === semesters.length - 1}
            className="p-1 rounded-md text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0 cursor-pointer"
            title="Next Semester"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Current Semester Summary Card */}
        <div className="px-4 py-2.5 bg-white dark:bg-[#0c0c0c] border-b border-[#ebebeb] dark:border-[#262626] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[#171717] dark:text-[#ededed]">{currentSem.name}</span>
            {currentSem.term && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#f5f5f5] dark:bg-[#161616] text-[#888888] border border-[#ebebeb] dark:border-[#262626] font-mono">
                {currentSem.term} {currentSem.year || ''}
              </span>
            )}
            {currentSem.isRS && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-[#0070f3] border border-blue-500/20 font-mono font-medium uppercase">
                RS
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#fafafa] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626]">
              <span className="text-[#888888]">Credits:</span>
              <strong className="text-[#171717] dark:text-[#ededed] font-mono">{totalSemesterCredits}</strong>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#fafafa] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626]">
              <span className="text-[#888888]">SGPA:</span>
              <strong className={`font-mono ${hasGrades ? "text-[#0070f3]" : "text-[#888888]"}`}>
                {sgpa}
              </strong>
            </div>
          </div>
        </div>

        {/* Courses List & Interactive Grade Chips */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 custom-scrollbar">
          {currentSem.courses.length === 0 ? (
            <div className="py-12 text-center rounded-xl border border-dashed border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#111111]">
              <BookOpen className="w-8 h-8 mx-auto text-[#888888] mb-2" />
              <p className="text-xs font-medium text-[#171717] dark:text-[#ededed]">No courses in {currentSem.name}</p>
              <p className="text-[11px] text-[#888888] mt-1">Use Add Courses to populate this semester first</p>
            </div>
          ) : (
            currentSem.courses.map(c => {
              const courseInfo = COURSES.find(item => item.code === c.code);
              const cr = courseInfo?.credits || 3;
              const currentGrade = c.grade || "";

              return (
                <div
                  key={c.code}
                  className="p-3 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] space-y-2 shadow-vercel-subtle"
                >
                  {/* Course Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[#171717] dark:text-[#ededed] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626]">
                        {c.code}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-[#1a1a1a] text-[#888888] border border-[#ebebeb] dark:border-[#262626] font-mono">
                        {cr} cr
                      </span>
                      {c.isRepeat && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                          Retake
                        </span>
                      )}
                      <span className="text-xs text-[#888888] truncate max-w-[200px] hidden sm:inline">
                        {courseInfo?.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[#888888] text-[11px]">Grade:</span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-mono font-medium ${
                          currentGrade
                            ? "bg-blue-500/10 text-[#0070f3] border border-blue-500/20"
                            : "bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#888888] border border-[#ebebeb] dark:border-[#262626]"
                        }`}
                      >
                        {currentGrade || "Not Set"}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Grade Selector Chips */}
                  <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5">
                    {/* Clear / Unset Chip */}
                    <button
                      onClick={() => onUpdateGrade(currentSem.id, c.code, "")}
                      className={`h-7 px-2.5 rounded text-xs font-mono transition-all flex-shrink-0 cursor-pointer ${
                        currentGrade === ""
                          ? "bg-[#171717] dark:bg-[#ededed] text-white dark:text-black font-semibold shadow-vercel-subtle"
                          : "bg-white dark:bg-[#1a1a1a] text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] border border-[#ebebeb] dark:border-[#262626]"
                      }`}
                      title="Clear grade"
                    >
                      —
                    </button>

                    {GRADE_OPTIONS.map(g => {
                      const isSelected = currentGrade === g;
                      const isF = g === "F";

                      return (
                        <button
                          key={g}
                          onClick={() => onUpdateGrade(currentSem.id, c.code, g)}
                          className={`h-7 px-2.5 rounded text-xs font-mono transition-all flex-shrink-0 cursor-pointer ${
                            isSelected
                              ? isF
                                ? "bg-rose-500 text-white font-semibold shadow-vercel-subtle"
                                : "bg-[#0070f3] text-white font-semibold shadow-vercel-subtle"
                              : "bg-white dark:bg-[#1a1a1a] text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] border border-[#ebebeb] dark:border-[#262626]"
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#111111] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveIdx(prev => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] bg-white dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ← Prev
            </button>
            <button
              onClick={() => setActiveIdx(prev => Math.min(semesters.length - 1, prev + 1))}
              disabled={currentIdx === semesters.length - 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] bg-white dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Next →
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white text-white dark:text-black font-medium text-xs shadow-vercel-subtle active:scale-95 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
