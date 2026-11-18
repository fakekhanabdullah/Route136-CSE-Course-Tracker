"use client";

import React, { useState, useRef, useEffect } from "react";
import { TrendingUp, Target, Award, Zap, ChevronLeft, ChevronRight } from "lucide-react";

interface SemesterStat {
  id: string;
  credits: number;
  gpa: number | null;
  hasGrades: boolean;
}

interface CgpaSemesterGraphProps {
  semesters: { id: string; name: string; isRS?: boolean; courses: any[] }[];
  semesterStats: SemesterStat[];
  cumulativeStats: {
    completedCredits: number;
    cgpa: number;
    standing: string;
  };
  targetCgpa: string;
  onOpenQuickGrades?: () => void;
  onSelectSemester?: (semId: string) => void;
}

export default function CgpaSemesterGraph({
  semesters,
  semesterStats,
  cumulativeStats,
  targetCgpa,
  onOpenQuickGrades,
  onSelectSemester,
}: CgpaSemesterGraphProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const targetNum = parseFloat(targetCgpa) || 3.0;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [semesters]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Compute best semester
  const gradedSemesters = semesterStats
    .map((s, idx) => ({ ...s, name: semesters[idx]?.name || `Sem ${idx + 1}`, idx }))
    .filter(s => s.gpa !== null && s.gpa > 0);

  const bestSem = gradedSemesters.length > 0
    ? gradedSemesters.reduce((prev, curr) => ((curr.gpa || 0) > (prev.gpa || 0) ? curr : prev), gradedSemesters[0])
    : null;

  const maxGpa = 4.0;
  const targetYPct = Math.max(0, Math.min(100, 100 - (targetNum / maxGpa) * 100));

  return (
    <div className="w-full bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#262626] rounded-xl p-4 sm:p-6 shadow-vercel-card relative overflow-hidden transition-all duration-200 text-[#171717] dark:text-[#ededed]">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#ebebeb] dark:border-[#262626] relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626] text-[#0070f3] flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[#171717] dark:text-[#ededed] uppercase tracking-wider">
              Semester CGPA Performance
            </h3>
            <p className="text-[11px] text-[#888888] mt-0.5">
              Visual SGPA trajectory vs. graduation target benchmark
            </p>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Current CGPA Badge */}
          <div className="h-8 bg-[#f5f5f5] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] px-3 rounded-full flex items-center gap-1.5 shadow-vercel-subtle">
            <span className="text-[10px] font-mono text-[#888888] uppercase">CGPA</span>
            <span className="text-xs font-mono font-semibold text-[#171717] dark:text-[#ededed]">
              {cumulativeStats.cgpa > 0 ? cumulativeStats.cgpa.toFixed(2) : "0.00"}
            </span>
            <span className="text-[10px] text-[#888888] font-mono">/ 4.00</span>
          </div>

          {/* Target Delta */}
          <div className="h-8 bg-[#f5f5f5] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] px-3 rounded-full flex items-center gap-1.5 shadow-vercel-subtle">
            <Target className="h-3 w-3 text-amber-500" />
            <span className="text-[11px] text-[#888888]">
              Goal: <strong className="font-mono text-[#171717] dark:text-[#ededed] font-medium">{targetNum.toFixed(2)}</strong>
            </span>
          </div>

          {/* Quick Grade action button */}
          {onOpenQuickGrades && (
            <button
              type="button"
              onClick={onOpenQuickGrades}
              className="h-8 px-3.5 bg-[#171717] dark:bg-[#ededed] text-white dark:text-black hover:bg-black/90 dark:hover:bg-white font-medium text-xs rounded-full shadow-vercel-subtle active:scale-95 transition flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
            >
              <Zap className="h-3 w-3 fill-current" />
              <span>Quick Grades</span>
            </button>
          )}

          {/* Scroll navigation arrows for horizontal slider */}
          <div className="h-8 bg-[#f5f5f5] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] px-1 rounded-full flex items-center gap-0.5 shadow-vercel-subtle">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[#888888] hover:text-[#171717] dark:hover:text-white disabled:opacity-20 transition-all cursor-pointer"
              title="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[#888888] hover:text-[#171717] dark:hover:text-white disabled:opacity-20 transition-all cursor-pointer"
              title="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="pt-4 sm:pt-6 relative z-10 w-full">
        {/* Mobile Swipe Hint */}
        <div className="sm:hidden flex items-center justify-between pb-2 text-[10px] text-[#888888]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0070f3]" />
            Swipe horizontally to inspect terms
          </span>
          <span className="font-mono">{semesters.length} terms</span>
        </div>

        {/* Chart Grid & Bars Row */}
        <div className="flex items-start w-full relative">
          
          {/* 1. Left Y-Axis Labels Gutter */}
          <div className="w-8 sm:w-10 shrink-0 pt-6 select-none border-r border-[#ebebeb] dark:border-[#262626]">
            <div className="h-44 sm:h-52 relative flex flex-col justify-between items-end pr-1.5 sm:pr-2 font-mono text-[10px] text-[#888888]">
              <span className="-translate-y-1/2">4.00</span>
              <span className="-translate-y-1/2">3.00</span>
              <span className="-translate-y-1/2 text-[#ee0000] font-medium">2.00</span>
              <span className="translate-y-1/2">0.00</span>
            </div>
          </div>

          {/* 2. Center Plot Canvas */}
          <div className="relative flex-1 min-w-0">
            
            {/* Horizontal Background Grid Lines */}
            <div className="absolute inset-x-0 top-6 h-44 sm:h-52 pointer-events-none z-0">
              <div className="absolute inset-x-0 top-0 border-b border-dashed border-[#ebebeb] dark:border-[#262626]" />
              <div className="absolute inset-x-0 top-1/4 border-b border-dashed border-[#ebebeb] dark:border-[#262626]" />
              <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-red-500/30" />
              <div className="absolute inset-x-0 bottom-0 border-b border-[#ebebeb] dark:border-[#262626]" />

              {/* Target CGPA Reference Line */}
              {targetNum > 0 && targetNum <= 4.0 && (
                <div
                  style={{ top: `${targetYPct}%` }}
                  className="absolute inset-x-0 border-b border-dashed border-amber-500/70 z-20 pointer-events-none transition-all duration-300 flex items-center justify-end"
                >
                  <span className="font-mono text-[9px] sm:text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-white/95 dark:bg-[#0c0c0c]/95 px-1.5 py-0.5 rounded border border-amber-500/30 -translate-y-1/2 mr-1.5 shadow-vercel-subtle">
                    Target {targetNum.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Scrollable Bars Track: Fluid touch swiping & no artificial spacing gaps */}
            <div
              ref={scrollContainerRef}
              onScroll={checkScroll}
              className="relative flex items-end gap-2.5 sm:gap-3 px-2 sm:px-3 w-full z-10 overflow-x-auto overflow-y-visible custom-scrollbar select-none scroll-smooth touch-pan-x"
            >
              <div className="flex items-end gap-2.5 sm:gap-3 justify-start">
                {semesters.map((sem, idx) => {
                  const stat = semesterStats[idx] || { credits: 0, gpa: null, hasGrades: false };
                  const gpa = stat.gpa;
                  const hasGpa = gpa !== null && gpa > 0;
                  const barHeightPct = hasGpa ? Math.min(100, Math.max(0, (gpa / maxGpa) * 100)) : 0;
                  const isHovered = hoveredIdx === idx;
                  const isTargetMet = hasGpa && gpa >= targetNum;

                  const shortName = sem.isRS
                    ? "RS"
                    : sem.name.replace("Semester", "Sem").replace("residential semester", "RS").trim();

                  return (
                    <div
                      key={sem.id}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      onClick={() => onSelectSemester?.(sem.id)}
                      className="w-12 sm:w-13 shrink-0 flex flex-col items-center group cursor-pointer relative"
                    >
                      {/* Hover Tooltip Popup */}
                      {isHovered && (
                        <div className="absolute -top-12 bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#262626] rounded-md p-1.5 shadow-vercel-modal text-center pointer-events-none z-50 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
                          <p className="text-[10px] font-semibold text-[#171717] dark:text-[#ededed]">{sem.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px]">
                            <span className="text-[#0070f3] font-medium">
                              SGPA: {hasGpa ? gpa.toFixed(2) : "Not Graded"}
                            </span>
                            <span className="text-[#888888]">
                              ({stat.credits} cr)
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Top Value Label */}
                      <div className="h-6 flex items-center justify-center transition-transform duration-150">
                        <span
                          className={`font-mono text-[10px] sm:text-[11px] font-medium ${
                            hasGpa
                              ? isTargetMet
                                ? "text-[#0070f3] font-semibold"
                                : "text-[#171717] dark:text-[#d4d4d8]"
                              : "text-[#888888]"
                          }`}
                        >
                          {hasGpa ? gpa.toFixed(2) : "—"}
                        </span>
                      </div>

                      {/* The Bar Track */}
                      <div className="w-8 sm:w-10 h-44 sm:h-52 bg-[#f5f5f5] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] rounded-md overflow-hidden flex flex-col justify-end transition-all duration-150 group-hover:border-[#888888] relative">
                        {/* Empty track baseline indicator */}
                        {!hasGpa && (
                          <div className="absolute inset-x-1.5 bottom-1 h-0.5 rounded-full bg-[#ebebeb] dark:border-[#262626]" />
                        )}

                        {/* The Fill Bar (Off-white in dark mode so it is never harsh/blinding) */}
                        {hasGpa && (
                          <div
                            style={{ height: `${barHeightPct}%` }}
                            className={`w-full rounded-t-sm transition-all duration-500 ease-out relative ${
                              isTargetMet
                                ? "bg-[#0070f3]"
                                : "bg-[#27272a] dark:bg-[#d4d4d8] group-hover:dark:bg-[#e4e4e7]"
                            }`}
                          />
                        )}
                      </div>

                      {/* Bottom Semester Label & Credit Load */}
                      <div className="mt-2 text-center h-8 w-full px-0.5">
                        <p
                          className={`text-[10px] font-medium truncate ${
                            isHovered
                              ? "text-[#0070f3]"
                              : sem.isRS
                              ? "text-[#0070f3] font-mono font-semibold"
                              : "text-[#888888]"
                          }`}
                        >
                          {shortName}
                        </p>
                        <p className="text-[9px] font-mono text-[#888888] -mt-0.5">
                          {stat.credits}cr
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legend & Best Semester Info */}
        <div className="mt-4 pt-3 border-t border-[#ebebeb] dark:border-[#262626] flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#888888]">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#27272a] dark:bg-[#d4d4d8]" />
              <span>Semester SGPA</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 border-t border-dashed border-amber-500" />
              <span className="text-amber-600 dark:text-amber-400">Target Goal</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 border-t border-dashed border-red-500" />
              <span className="text-[#ee0000]">Pass Threshold (2.00)</span>
            </span>
          </div>

          {bestSem && (
            <div className="flex items-center gap-1.5 bg-[#f5f5f5] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] px-2.5 py-0.5 rounded-full font-medium text-[#171717] dark:text-[#ededed]">
              <Award className="h-3.5 w-3.5 text-[#0070f3]" />
              <span>
                Peak Term: <strong>{bestSem.name}</strong> ({bestSem.gpa?.toFixed(2)})
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
