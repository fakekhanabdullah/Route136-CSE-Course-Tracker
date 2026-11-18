"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Target,
  BookOpen,
  TrendingUp,
  Camera,
  CheckCircle2,
  Sparkles,
  Lock,
  ArrowRight,
  Award,
  Download,
} from "lucide-react";

const FEATURE_SLIDES = [
  {
    id: "prereq-chain",
    badge: "PRE-REQ CHAIN",
    title: "Interactive Prerequisite Chains",
    subtitle: "Visualize every CSE, MNS & BIL dependency sequence and see how many courses remain in each chain.",
    icon: GitBranch,
    accent: "text-emerald-500",
    url: "route136.app/prereq-chains",
  },
  {
    id: "trajectory-engine",
    badge: "TRAJECTORY ENGINE",
    title: "CGPA Charts, Solver & Retake ROI",
    subtitle: "Track term-by-term SGPA bars against your target line, solve required future GPA, and rank retake boosts.",
    icon: TrendingUp,
    accent: "text-[#0070f3]",
    url: "route136.app/trajectory",
  },
  {
    id: "course-performance",
    badge: "PERFORMANCE STUDIO",
    title: "Course Performance & Attendance",
    subtitle: "Track 70%/90% attendance with GitHub-style bars and customize quiz N-1/N-2 conversions & mark weights.",
    icon: Target,
    accent: "text-cyan-500",
    url: "route136.app/performance",
  },
  {
    id: "gened-matrix",
    badge: "UNIVERSITY CORE",
    title: "39-Credit GenEd Matrix",
    subtitle: "Tracks all 5 mandatory GenEd streams, Residential Semester (RS) courses, and free elective caps automatically.",
    icon: BookOpen,
    accent: "text-purple-500",
    url: "route136.app/gened-matrix",
  },
  {
    id: "snapshot",
    badge: "4K SNAPSHOT EXPORT",
    title: "Grade Sheet PNG Snapshot",
    subtitle: "Export a clean, shareable dark-mode transcript card with detailed category progress bars for advising.",
    icon: Camera,
    accent: "text-cyan-500",
    url: "route136.app/snapshot",
  },
];

export default function LandingFeatureShowcase() {
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [animTick, setAnimTick] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Auto-cycle slides every 6s unless user is hovering/interacting
  useEffect(() => {
    if (isPaused) return;
    const slideTimer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % FEATURE_SLIDES.length);
    }, 6000);
    return () => clearInterval(slideTimer);
  }, [isPaused]);

  // Sub-animation tick inside each slide (toggles 0 <-> 1)
  useEffect(() => {
    setAnimTick(0);
    const initialDelay = activeSlide === 4 ? 950 : 450;
    const t1 = setTimeout(() => setAnimTick(1), initialDelay);
    const t2 = setInterval(() => {
      setAnimTick(prev => (prev === 0 ? 1 : 0));
    }, 2800);
    return () => {
      clearTimeout(t1);
      clearInterval(t2);
    };
  }, [activeSlide]);

  const handleManualSnapshot = () => {
    setAnimTick(0);
    setTimeout(() => setAnimTick(1), 420);
  };

  const handlePrev = () => {
    setActiveSlide(prev => (prev - 1 + FEATURE_SLIDES.length) % FEATURE_SLIDES.length);
  };

  const handleNext = () => {
    setActiveSlide(prev => (prev + 1) % FEATURE_SLIDES.length);
  };

  const current = FEATURE_SLIDES[activeSlide];
  const IconComp = current.icon;

  return (
    <div
      className="space-y-6"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Section Header + Back/Forward Arrows */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#ebebeb] dark:border-[#222222] pb-4">
        <div>
          <span className="text-[11px] font-mono text-[#0070f3] uppercase tracking-wider">
            [ System Capabilities ]
          </span>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed] mt-1">
            Built specifically for BRACU CSE degree rules.
          </h2>
        </div>

        {/* Slide Controls (Prev / Counter / Next) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-mono text-[#888888] mr-1">
            {activeSlide + 1} / {FEATURE_SLIDES.length}
          </span>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous feature"
            className="h-8 w-8 rounded-lg bg-white dark:bg-[#111111] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-[#ededed] transition shadow-vercel-subtle cursor-pointer active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next feature"
            className="h-8 w-8 rounded-lg bg-white dark:bg-[#111111] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-[#ededed] transition shadow-vercel-subtle cursor-pointer active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Feature Selector Pill Bar (Single Row on Desktop, Zero Scrollbar) */}
      <div className="flex flex-wrap items-center justify-center lg:justify-between gap-2 w-full">
        {FEATURE_SLIDES.map((slide, idx) => {
          const isActive = idx === activeSlide;
          const SlideIcon = slide.icon;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveSlide(idx)}
              className={`px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                isActive
                  ? "bg-[#171717] dark:bg-[#ededed] border-[#171717] dark:border-[#ededed] text-white dark:text-[#0a0a0a] shadow-vercel-subtle font-semibold"
                  : "bg-white dark:bg-[#0c0c0c] border-[#ebebeb] dark:border-[#242424] text-[#666666] dark:text-[#a1a1a1] hover:border-[#888888]"
              }`}
            >
              <SlideIcon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[#0070f3]" : slide.accent}`} />
              <span>{slide.title}</span>
            </button>
          );
        })}
      </div>

      {/* Small-Screen Aspect Showcase Window */}
      <div className="max-w-5xl mx-auto w-full">
        {/* Main Interactive Showcase Window */}
        <div className="rounded-2xl bg-white dark:bg-[#0c0c0c] border border-[#e5e5e5] dark:border-[#242424] shadow-vercel-modal overflow-hidden">
        {/* Window Chrome Bar */}
        <div className="px-4 py-2.5 bg-[#fafafa] dark:bg-[#111111] border-b border-[#ebebeb] dark:border-[#222222] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
          </div>
          <div className="px-3 py-0.5 rounded-md bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] text-[10px] font-mono text-[#888888] flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0070f3]" />
            <span>{current.url}</span>
          </div>
          <span className="text-[10px] font-mono text-[#0070f3] bg-[#0070f3]/10 border border-[#0070f3]/20 px-2 py-0.5 rounded">
            {current.badge}
          </span>
        </div>

        {/* Showcase Content: Top Feature Header + Full-Width Small-Screen Preview Stage */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Top Feature Copy + Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-[#f0f0f0] dark:border-[#1d1d1d]">
            <div className="flex items-start gap-3 max-w-xl">
              <div className="h-9 w-9 rounded-xl bg-[#fafafa] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center shadow-vercel-subtle shrink-0 mt-0.5">
                <IconComp className={`h-4 w-4 ${current.accent}`} />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#0070f3]">
                  Feature 0{activeSlide + 1} / 0{FEATURE_SLIDES.length}
                </span>
                <h3 className="text-base sm:text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">
                  {current.title}
                </h3>
                <p className="text-xs text-[#666666] dark:text-[#888888] leading-relaxed">
                  {current.subtitle}
                </p>
              </div>
            </div>

            {/* Slide Indicator Dots + Quick Arrow Controls */}
            <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
              <div className="flex items-center gap-1.5">
                {FEATURE_SLIDES.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === activeSlide
                        ? "w-5 bg-[#0070f3]"
                        : "w-1.5 bg-[#d4d4d8] dark:bg-[#2a2a2a] hover:bg-[#888888]"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-[#fafafa] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] hover:border-[#888888] text-[#171717] dark:text-[#ededed] transition cursor-pointer"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-[#fafafa] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] hover:border-[#888888] text-[#171717] dark:text-[#ededed] transition cursor-pointer"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>

          {/* Compact Small-Screen Live Animated Preview Stage */}
          <div className="rounded-xl bg-gradient-to-b from-[#fafafa] to-[#f4f4f5] dark:from-[#0f0f10] dark:to-[#09090a] border border-[#ebebeb] dark:border-[#222222] p-4 sm:p-5 min-h-[290px] sm:min-h-[320px] flex flex-col justify-center relative overflow-hidden">
            {/* Subtle Ambient Spotlight */}
            <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-80 rounded-full bg-[#0070f3]/[0.07] blur-3xl" />

            {/* SLIDE 0: PRE-REQ CHAIN ANIMATION */}
            {activeSlide === 0 && (
              <div className="space-y-3.5 animate-in fade-in duration-300 relative z-10">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-[#171717] dark:text-[#ededed]">
                      Programming &amp; Algorithms Chain
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] text-emerald-500 font-semibold">
                      {animTick === 0 ? "3 / 6 Done • 3 Left" : "4 / 6 Done • 2 Left"}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full rounded-full bg-[#e5e5e5] dark:bg-[#1e1e1e] overflow-hidden">
                  <div
                    style={{ width: animTick === 0 ? "50%" : "66.7%" }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-[#0070f3] rounded-full transition-all duration-700"
                  />
                </div>

                {/* Connected Sequence Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { code: "CSE110", name: "Programming I", status: "done", cr: "3 Cr" },
                    { code: "CSE111", name: "Programming II", status: "done", cr: "3 Cr" },
                    { code: "CSE220", name: "Data Structures", status: "done", cr: "3 Cr" },
                    { code: "CSE221", name: "Algorithms", status: animTick === 1 ? "done" : "ready", cr: "3 Cr" },
                    { code: "CSE321", name: "Operating Systems", status: animTick === 1 ? "ready" : "locked", cr: "3 Cr" },
                    { code: "CSE400", name: "Capstone Thesis", status: "locked", cr: "4 Cr" },
                  ].map((node) => (
                    <div
                      key={node.code}
                      className={`p-3 rounded-xl border transition-all duration-500 shadow-sm ${
                        node.status === "done"
                          ? "bg-white dark:bg-[#141414] border-emerald-500/40"
                          : node.status === "ready"
                          ? "bg-white dark:bg-[#141414] border-amber-500/60 ring-2 ring-amber-500/20"
                          : "bg-white/60 dark:bg-[#121212]/70 border-[#ebebeb] dark:border-[#222222] opacity-65"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#171717] dark:text-[#ededed]">{node.code}</span>
                        {node.status === "done" ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-500 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Done
                          </span>
                        ) : node.status === "ready" ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono text-amber-500 font-semibold animate-pulse">
                            <Sparkles className="h-3 w-3" /> Ready
                          </span>
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-[#888888]" />
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[10px] text-[#666666] dark:text-[#888888] truncate">{node.name}</p>
                        <span className="text-[9px] font-mono text-[#888888] shrink-0 ml-1">{node.cr}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Unlocks Strip */}
                <div className="px-3 py-2 rounded-lg bg-white dark:bg-[#141414] border border-[#ebebeb] dark:border-[#242424] flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#888888]">
                    Next Unlock:{" "}
                    <strong className="text-[#171717] dark:text-[#ededed]">
                      {animTick === 0 ? "Complete CSE221 → Unlocks CSE321, CSE330" : "CSE321 Ready • 2 Courses Remaining"}
                    </strong>
                  </span>
                  <span className="text-[#0070f3] font-semibold hidden sm:inline">100% Rule-Checked</span>
                </div>
              </div>
            )}

            {/* SLIDE 1: COMBINED CGPA CHARTS, TARGET SOLVER & RETAKE ROI */}
            {activeSlide === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 animate-in fade-in duration-300 relative z-10 items-stretch">
                {/* Left 7 cols: Compact SGPA Bar Chart */}
                <div className="md:col-span-7 bg-white dark:bg-[#141414] border border-[#ebebeb] dark:border-[#242424] rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#171717] dark:text-[#ededed]">
                      SGPA Trajectory (Sem 1–8)
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-500 font-semibold">
                        Goal: 3.60
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#0070f3]/10 border border-[#0070f3]/25 text-[#0070f3] font-semibold">
                        Peak: 3.92
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex flex-col justify-between h-32 text-[9px] font-mono text-[#888888] py-0.5 select-none">
                      <span>4.0</span>
                      <span>3.5</span>
                      <span>3.0</span>
                      <span>2.5</span>
                    </div>

                    <div className="flex-1 flex flex-col">
                      <div className="relative h-32 border-b border-[#e5e5e5] dark:border-[#262626] flex items-end gap-1.5 px-1">
                        <div className="absolute inset-x-0 top-0 border-b border-[#f2f2f2] dark:border-[#1e1e1e] pointer-events-none" />
                        <div className="absolute inset-x-0 top-1/3 border-b border-[#f2f2f2] dark:border-[#1e1e1e] pointer-events-none" />
                        <div className="absolute inset-x-0 top-2/3 border-b border-[#f2f2f2] dark:border-[#1e1e1e] pointer-events-none" />
                        <div
                          style={{ bottom: "73.3%" }}
                          className="absolute inset-x-0 border-b border-dashed border-amber-500/80 pointer-events-none z-10"
                        />

                        {[
                          { sem: "S1", gpa: "3.45", h0: "42%", h1: "63%" },
                          { sem: "S2", gpa: "3.62", h0: "50%", h1: "75%", hit: true },
                          { sem: "RS", gpa: "3.75", h0: "56%", h1: "83%", hit: true },
                          { sem: "S4", gpa: "3.55", h0: "46%", h1: "70%" },
                          { sem: "S5", gpa: "3.92", h0: "64%", h1: "95%", hit: true, peak: true },
                          { sem: "S6", gpa: "3.83", h0: "58%", h1: "89%", hit: true },
                          { sem: "S7", gpa: "3.71", h0: "52%", h1: "81%", hit: true },
                          { sem: "S8", gpa: "3.86", h0: "60%", h1: "91%", hit: true },
                        ].map((b) => (
                          <div key={b.sem} className="flex-1 h-full flex flex-col items-center justify-end z-20">
                            <div
                              style={{ height: animTick === 0 ? b.h0 : b.h1 }}
                              className={`w-full rounded-t-md transition-all duration-700 relative ${
                                b.peak
                                  ? "bg-gradient-to-t from-[#0070f3] to-cyan-400 shadow-[0_0_12px_rgba(0,112,243,0.45)]"
                                  : b.hit
                                  ? "bg-[#0070f3]/85"
                                  : "bg-[#27272a] dark:bg-[#3f3f46]"
                              }`}
                            >
                              <span
                                className={`absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-mono font-semibold whitespace-nowrap ${
                                  b.peak ? "text-cyan-400" : b.hit ? "text-[#0070f3]" : "text-[#888888]"
                                }`}
                              >
                                {b.gpa}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 px-1 pt-1.5">
                        {["S1", "S2", "RS", "S4", "S5", "S6", "S7", "S8"].map((label) => (
                          <span key={label} className="flex-1 text-center text-[9px] font-mono text-[#888888]">
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right 5 cols: Target Solver + Retake ROI */}
                <div className="md:col-span-5 flex flex-col justify-between gap-2.5">
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#141414] border border-[#ebebeb] dark:border-[#242424] space-y-2 shadow-sm">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[#888888]">TARGET SOLVER</span>
                      <span className="text-[#0070f3] font-semibold">GOAL: 3.75</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-mono font-bold text-[#171717] dark:text-[#ededed] transition-all duration-500">
                        {animTick === 0 ? "3.88" : "3.81"} <span className="text-xs text-[#0070f3]">(A-)</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-500 font-semibold">
                        3.52 → {animTick === 0 ? "3.59" : "3.68"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#141414] border border-[#ebebeb] dark:border-[#242424] space-y-2 shadow-sm">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[#888888]">RETAKE ROI BOOST</span>
                      <span className="text-emerald-500 font-semibold">
                        {animTick === 0 ? "+0.07" : "+0.16"} CGPA
                      </span>
                    </div>
                    {[
                      { code: "CSE220", path: "B- → A", boost: "+0.09", active: animTick === 1 },
                      { code: "MAT120", path: "B → A", boost: "+0.07", active: true },
                    ].map((r) => (
                      <div
                        key={r.code}
                        className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-[11px] font-mono transition-all duration-500 ${
                          r.active
                            ? "bg-[#0070f3]/[0.08] border-[#0070f3]/40"
                            : "bg-[#fafafa] dark:bg-[#191919] border-[#ebebeb] dark:border-[#242424] opacity-75"
                        }`}
                      >
                        <span>
                          <strong className="text-[#171717] dark:text-[#ededed]">{r.code}</strong>{" "}
                          <span className="text-[#888888]">{r.path}</span>
                        </span>
                        <span className="text-emerald-500 font-semibold">{r.boost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 2: COURSE PERFORMANCE & ATTENDANCE STUDIO */}
            {activeSlide === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 animate-in fade-in duration-300 relative z-10 items-stretch">
                {/* Left 5 cols: GitHub-Style Attendance & Barred-Risk Tracker */}
                <div className="md:col-span-5 p-4 rounded-xl bg-white dark:bg-[#141414] border border-[#ebebeb] dark:border-[#242424] flex flex-col justify-between space-y-3 shadow-sm">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#888888]">ATTENDANCE PULSE</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 font-semibold">
                      SAFE STANDING
                    </span>
                  </div>

                  {/* Theory Bar (70% Min) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-semibold text-[#171717] dark:text-[#ededed]">Theory (≥70%)</span>
                      <span className="text-emerald-500 font-bold">{animTick === 0 ? "85.7%" : "87.5%"}</span>
                    </div>
                    <div className="flex items-center gap-[3px] flex-wrap">
                      {["p","p","a","p","p","l","p","p","p","p","p","p","p", animTick === 1 ? "p" : "u"].map((st, idx) => (
                        <span
                          key={idx}
                          className={`h-2.5 w-2.5 rounded-[2px] transition-colors duration-500 ${
                            st === "p"
                              ? "bg-emerald-500"
                              : st === "l"
                              ? "bg-amber-400"
                              : st === "a"
                              ? "bg-rose-500"
                              : "bg-[#e4e4e7] dark:bg-[#242426]"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Lab Bar (90% Min) */}
                  <div className="space-y-1.5 pt-2 border-t border-[#f0f0f0] dark:border-[#202020]">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-semibold text-[#171717] dark:text-[#ededed]">Lab (≥90%)</span>
                      <span className="text-emerald-500 font-bold">91.7%</span>
                    </div>
                    <div className="flex items-center gap-[3px] flex-wrap">
                      {["p","p","p","p","p","p","a","p","p","p","p","p"].map((st, idx) => (
                        <span
                          key={idx}
                          className={`h-2.5 w-2.5 rounded-[2px] ${
                            st === "p" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] font-mono text-[#888888] pt-0.5">
                      Can miss <strong className="text-emerald-500">{animTick === 0 ? "2" : "3"} more</strong> theory classes safely
                    </p>
                  </div>
                </div>

                {/* Right 7 cols: Spreadsheet Mark Distribution */}
                <div className="md:col-span-7 p-4 rounded-xl bg-white dark:bg-[#141414] border border-[#ebebeb] dark:border-[#242424] flex flex-col justify-between space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#888888]">MARK SPREADSHEET • QUIZ (15% • DROP N-1)</span>
                    <span className="text-[#0070f3] font-semibold">
                      Projected: {animTick === 0 ? "84.2% (B+)" : "86.4% (A-)"}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] font-mono">
                    {[
                      { name: "Quiz 1", raw: "13 / 15", conv: "17.33 / 20", counted: true },
                      { name: "Quiz 2", raw: animTick === 0 ? "16 / 20" : "18 / 20", conv: animTick === 0 ? "16.00 / 20" : "18.00 / 20", counted: true },
                      { name: "Quiz 3", raw: "10 / 20", conv: "10.00 / 20", counted: false },
                    ].map((row) => (
                      <div
                        key={row.name}
                        className={`px-3 py-2 rounded-lg border flex items-center justify-between gap-2 transition-all duration-500 ${
                          row.counted
                            ? "bg-[#fafafa] dark:bg-[#191919] border-[#ebebeb] dark:border-[#242424]"
                            : "bg-[#fafafa]/50 dark:bg-[#121212] border-[#ebebeb] dark:border-[#202020] opacity-55"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-[#171717] dark:text-[#ededed]">{row.name}</span>
                          <span className="text-[#888888]">{row.raw}</span>
                          <span className="text-[#0070f3]">→ {row.conv}</span>
                        </div>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-semibold ${
                            row.counted
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/25"
                              : "bg-zinc-500/10 text-[#888888] border border-zinc-500/20"
                          }`}
                        >
                          {row.counted ? "Counted ✓" : "Dropped"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 3: 39-CREDIT GENED MATRIX */}
            {activeSlide === 3 && (
              <div className="space-y-3.5 animate-in fade-in duration-300 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    <span className="text-xs font-semibold text-[#171717] dark:text-[#ededed]">
                      University Core Matrix (39 Credits)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-white dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] text-[#0070f3]">
                    {animTick === 0 ? "30 / 39 Cr" : "39 / 39 Cr Complete ✓"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { label: "S1: Writing", sub: "ENG101 • ENG102", cr: "6/6 Cr", pct: "100%", bar: "bg-sky-400", text: "text-sky-500" },
                    { label: "S2: Math/Sci", sub: "MAT • PHY • STA", cr: "9/9 Cr", pct: "100%", bar: "bg-purple-400", text: "text-purple-500" },
                    { label: "S3: Arts/Hum", sub: "EMB101 • HUM103", cr: animTick === 0 ? "6/9 Cr" : "9/9 Cr", pct: animTick === 0 ? "66%" : "100%", bar: "bg-indigo-400", text: "text-indigo-500" },
                    { label: "S4: Social Sci", sub: "ECO • SOC • POL", cr: "6/6 Cr", pct: "100%", bar: "bg-teal-400", text: "text-teal-500" },
                    { label: "S5: CST", sub: "CSE110 / ENV103", cr: animTick === 0 ? "0/3 Cr" : "3/3 Cr", pct: animTick === 0 ? "0%" : "100%", bar: "bg-rose-400", text: "text-rose-500" },
                    { label: "Free GenEd", sub: "Open Stream Electives", cr: animTick === 0 ? "3/6 Cr" : "6/6 Cr", pct: animTick === 0 ? "50%" : "100%", bar: "bg-emerald-400", text: "text-emerald-500" },
                  ].map((st) => (
                    <div
                      key={st.label}
                      className="p-3 rounded-xl bg-white dark:bg-[#141414] border border-[#ebebeb] dark:border-[#242424] space-y-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className={`font-semibold ${st.text}`}>{st.label}</span>
                        <span className="text-[#171717] dark:text-[#ededed] font-semibold">{st.cr}</span>
                      </div>
                      <p className="text-[10px] text-[#888888] truncate">{st.sub}</p>
                      <div className="h-1.5 w-full rounded-full bg-[#eaeaea] dark:bg-[#222222] overflow-hidden">
                        <div
                          style={{ width: st.pct }}
                          className={`h-full ${st.bar} rounded-full transition-all duration-700`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SLIDE 4: GRADE SHEET PNG SNAPSHOT */}
            {activeSlide === 4 && (
              <div className="space-y-3 animate-in fade-in duration-300">
                {/* Workspace Action Bar with Take Snapshot Button */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-[#171717] dark:text-[#ededed]">
                      Degree Audit Snapshot Generator
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleManualSnapshot}
                    className={`relative inline-flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded-lg font-semibold transition-all duration-300 cursor-pointer ${
                      animTick === 0
                        ? "bg-[#0070f3] text-white scale-95 ring-4 ring-[#0070f3]/30 shadow-md"
                        : "bg-[#171717] dark:bg-[#ededed] text-white dark:text-[#0a0a0a] hover:opacity-90"
                    }`}
                  >
                    <Camera className="h-3 w-3" />
                    <span>{animTick === 0 ? "Taking Snapshot..." : "Take Snapshot"}</span>
                  </button>
                </div>

                {/* Before Click / Capturing State vs Generated Snapshot Preview */}
                {animTick === 0 ? (
                  <div className="rounded-xl bg-[#050505] border border-[#242424] p-8 text-center space-y-3 min-h-[340px] flex flex-col items-center justify-center">
                    <div className="h-11 w-11 rounded-xl bg-[#0070f3]/15 border border-[#0070f3]/30 flex items-center justify-center text-[#0070f3] animate-pulse">
                      <Camera className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-mono text-[#ededed] font-semibold">
                      Capturing Official Degree Audit Snapshot...
                    </p>
                    <p className="text-xs font-mono text-[#888888] max-w-md">
                      Rendering 136-credit progress, Core/GenEd matrix &amp; completed coursework
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-[#050505] border border-[#242424] p-4 sm:p-5 text-[#ededed] space-y-4 animate-in fade-in zoom-in-95 duration-500 shadow-lg">
                    {/* Snapshot Header */}
                    <div className="flex items-center justify-between gap-3 flex-wrap border-b border-[#1d1d1d] pb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-[#ededed] text-[#0a0a0a] flex items-center justify-center font-mono text-xs font-bold shrink-0">
                          &lt;/&gt;
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base font-bold text-white tracking-tight">Route136</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#141414] border border-[#262626] text-[#a1a1aa]">
                              BRACU CSE • 136 Cr
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-[#888888] mt-0.5">
                            Academic Progress &amp; Official Degree Audit Snapshot
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          GOOD STANDING
                        </span>
                        <p className="text-[10px] font-mono text-[#888888] mt-1">
                          Intake: Spring 2025
                        </p>
                      </div>
                    </div>

                    {/* 3 Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Card 1: Degree Progress + CGPA */}
                      <div className="p-3 rounded-lg bg-[#0b0b0b] border border-[#1f1f1f] space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-[#888888]">DEGREE PROGRESS</span>
                          <span className="text-[#0070f3] font-semibold">50.7%</span>
                        </div>
                        <div className="flex items-baseline justify-between font-mono">
                          <span className="text-base font-bold text-white">
                            69 <span className="text-[11px] font-normal text-[#888888]">/ 136 Cr</span>
                          </span>
                          <span className="text-[10px] text-[#888888]">67 Cr left</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div className="h-full w-[50.7%] bg-[#0070f3] rounded-full" />
                        </div>
                        <div className="pt-2 border-t border-[#181818] flex items-center justify-between font-mono">
                          <div>
                            <div className="text-[9px] text-[#888888]">CUMULATIVE GPA</div>
                            <div className="text-base font-bold text-white">
                              3.44 <span className="text-[10px] font-normal text-[#888888]">/ 4.00</span>
                            </div>
                          </div>
                          <div className="text-right text-[10px]">
                            <div className="text-emerald-400 font-semibold">UGC 4.00</div>
                            <div className="text-[#888888]">
                              Goal: <span className="text-[#0070f3] font-semibold">3.50</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Core & Electives */}
                      <div className="p-3 rounded-lg bg-[#0b0b0b] border border-[#1f1f1f] space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-[#888888]">CORE &amp; ELECTIVES</span>
                          <span className="text-white font-semibold">36 / 97 Cr</span>
                        </div>
                        {[
                          { label: "Program Core", val: "27/75 Cr", w: "36%", text: "text-[#0070f3]", bar: "bg-[#0070f3]" },
                          { label: "School Core (MNS)", val: "9/12 Cr", w: "75%", text: "text-cyan-400", bar: "bg-cyan-400" },
                          { label: "Major Electives", val: "0/6 Cr", w: "0%", text: "text-amber-400", bar: "bg-amber-400" },
                          { label: "Capstone Thesis", val: "0/4 Cr", w: "0%", text: "text-purple-400", bar: "bg-purple-400" },
                        ].map((row) => (
                          <div key={row.label} className="space-y-1">
                            <div className="flex justify-between text-[9.5px] font-mono">
                              <span className={row.text}>{row.label}</span>
                              <span className="text-[#a1a1aa]">{row.val}</span>
                            </div>
                            <div className="h-1 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                              <div style={{ width: row.w }} className={`h-full ${row.bar} rounded-full`} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Card 3: University Core (GenEd) */}
                      <div className="p-3 rounded-lg bg-[#0b0b0b] border border-[#1f1f1f] space-y-2.5">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-[#888888]">UNIVERSITY CORE</span>
                          <span className="text-white font-semibold">33 / 39 Cr</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
                          {[
                            { label: "S1: Writing", val: "6/6", w: "100%", text: "text-sky-400", bar: "bg-sky-400" },
                            { label: "S2: Math/Sci", val: "9/9", w: "100%", text: "text-purple-400", bar: "bg-purple-400" },
                            { label: "S3: Arts/Hum", val: "6/9", w: "66%", text: "text-indigo-400", bar: "bg-indigo-400" },
                            { label: "S4: Social Sci", val: "6/6", w: "100%", text: "text-teal-400", bar: "bg-teal-400" },
                            { label: "S5: CST", val: "0/3", w: "0%", text: "text-rose-400", bar: "bg-rose-400" },
                            { label: "Free GenEd", val: "6/6", w: "100%", text: "text-emerald-400", bar: "bg-emerald-400" },
                          ].map((g) => (
                            <div key={g.label} className="space-y-1">
                              <div className="flex justify-between text-[9px] font-mono">
                                <span className={`${g.text} truncate`}>{g.label}</span>
                                <span className="text-[#a1a1aa]">{g.val}</span>
                              </div>
                              <div className="h-1 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                                <div style={{ width: g.w }} className={`h-full ${g.bar} rounded-full`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Completed Coursework Mini Table */}
                    <div className="rounded-lg bg-[#0b0b0b] border border-[#1f1f1f] overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#181818] text-[10px] font-mono">
                        <span className="text-white font-semibold flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#0070f3]" />
                          COMPLETED COURSEWORK
                        </span>
                        <span className="text-[#888888]">12 Terms Planned</span>
                      </div>
                      <div className="divide-y divide-[#161616] text-[10px] font-mono">
                        {[
                          { code: "ENG101", title: "English Fundamentals", cr: "3 Cr", grade: "B+", badge: "text-rose-400 border-rose-500/30 bg-rose-500/10" },
                          { code: "PHY111", title: "Principles of Physics I", cr: "3 Cr", grade: "B+", badge: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10" },
                          { code: "CSE110", title: "Programming Language I", cr: "3 Cr", grade: "B-", badge: "text-[#ededed] border-[#2e2e2e] bg-[#161616]" },
                        ].map((row) => (
                          <div key={row.code} className="flex items-center justify-between px-3 py-2 gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`px-2 py-0.5 rounded border text-[9.5px] font-semibold shrink-0 ${row.badge}`}>
                                {row.code}
                              </span>
                              <span className="text-[#ededed] truncate font-sans text-[11px]">{row.title}</span>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0 text-[9.5px]">
                              <span className="px-1.5 py-0.5 rounded bg-[#141414] border border-[#242424] text-[#888888]">{row.cr}</span>
                              <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#242424] text-white font-semibold">{row.grade}</span>
                              <span className="hidden sm:inline text-[#888888]">1st Sem (Spring 2025)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
