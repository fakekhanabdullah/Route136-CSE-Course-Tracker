"use client";

import React, { useState, useMemo } from "react";
import { X, Search, CheckCircle2, Lock, Clock, Layers, ArrowRight, GitBranch, Sparkles, Plus, Info } from "lucide-react";
import { COURSES, PREREQUISITES } from "@/app/courses-data";

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

export interface PrereqChainDefinition {
  id: string;
  title: string;
  subtitle: string;
  department: 'CSE' | 'MNS' | 'ENG';
  accentColor: string;
  badgeClass: string;
  description: string;
  stages: {
    stageLabel: string;
    codes: string[];
  }[];
}

export const PREREQ_CHAINS: PrereqChainDefinition[] = [
  {
    id: "cse-core-backbone",
    title: "1. Programming, Algorithms & Systems Backbone",
    subtitle: "CSE110 → CSE111 → CSE220 → CSE221 → Systems / DB / AI / Compilers → CSE400",
    department: "CSE",
    accentColor: "#0070f3",
    badgeClass: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-300",
    description: "The central 13-course computing chain. Clearing CSE221 (Algorithms) unlocks Operating Systems, Databases, AI, and Automata, which lead into Compiler Design, Software Engineering, and your Final Thesis (CSE400).",
    stages: [
      { stageLabel: "Stage 1: Foundations", codes: ["CSE110", "CSE230"] },
      { stageLabel: "Stage 2: OOP", codes: ["CSE111"] },
      { stageLabel: "Stage 3: Data Structures", codes: ["CSE220"] },
      { stageLabel: "Stage 4: Algorithms Gate", codes: ["CSE221"] },
      { stageLabel: "Stage 5: Core Systems & AI", codes: ["CSE321", "CSE370", "CSE331", "CSE422"] },
      { stageLabel: "Stage 6: Advanced & SE", codes: ["CSE420", "CSE470", "CSE471"] },
      { stageLabel: "Stage 7: Capstone", codes: ["CSE400"] },
    ],
  },
  {
    id: "mns-calculus-chain",
    title: "2. MNS Calculus, Linear Algebra & Applied Computing Chain",
    subtitle: "MAT091 → MAT092 → MAT110 → MAT120 → MAT216 → MAT215 / CSE330 / CSE423",
    department: "MNS",
    accentColor: "#06b6d4",
    badgeClass: "bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-300",
    description: "The Mathematics & School Core dependency chain. MAT216 (Linear Algebra & Fourier Analysis) is a critical gate that unlocks Complex Variables (MAT215), Numerical Methods (CSE330), and Computer Graphics (CSE423).",
    stages: [
      { stageLabel: "Stage 1: Calculus I", codes: ["MAT110"] },
      { stageLabel: "Stage 2: Calculus II", codes: ["MAT120"] },
      { stageLabel: "Stage 3: Linear Algebra Gate", codes: ["MAT216"] },
      { stageLabel: "Stage 4: Unlocked Math & CSE", codes: ["MAT215", "CSE330", "CSE423"] },
    ],
  },
  {
    id: "hardware-architecture-chain",
    title: "3. Physics, Electronics, Architecture & Robotics Chain",
    subtitle: "PHY111 → PHY112 ⇢ CSE250 → CSE251 → CSE260 / CSE350 → CSE340 / CSE460 / CSE461 → CSE341 → CSE360",
    department: "CSE",
    accentColor: "#8b5cf6",
    badgeClass: "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-300",
    description: "Starts from Physics I & II (soft prerequisite into Circuits CSE250), progressing through Electronic Devices (CSE251) and Digital Logic Design (CSE260) into Computer Architecture, Microprocessors, VLSI, and Robotics.",
    stages: [
      { stageLabel: "Stage 1: Physics I", codes: ["PHY111"] },
      { stageLabel: "Stage 2: Physics II", codes: ["PHY112"] },
      { stageLabel: "Stage 3: Circuits", codes: ["CSE250"] },
      { stageLabel: "Stage 4: Electronics", codes: ["CSE251"] },
      { stageLabel: "Stage 5: Digital Logic & Pulse", codes: ["CSE260", "CSE350"] },
      { stageLabel: "Stage 6: Arch, VLSI & Robotics", codes: ["CSE340", "CSE460", "CSE461"] },
      { stageLabel: "Stage 7: Microprocessors", codes: ["CSE341"] },
      { stageLabel: "Stage 8: Interfacing", codes: ["CSE360"] },
    ],
  },
  {
    id: "networks-comm-chain",
    title: "4. Data Communications & Computer Networks Chain",
    subtitle: "CSE320 ⇢ CSE421 → CSE490",
    department: "CSE",
    accentColor: "#10b981",
    badgeClass: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300",
    description: "Data Communications (CSE320) serves as the advisory soft prerequisite for Computer Networks (CSE421) and hard prerequisite for WAN Routing / Special Topics (CSE490).",
    stages: [
      { stageLabel: "Stage 1: Data Comm", codes: ["CSE320"] },
      { stageLabel: "Stage 2: Computer Networks", codes: ["CSE421"] },
    ],
  },
  {
    id: "english-writing-chain",
    title: "5. BIL English & Technical Communication Chain",
    subtitle: "ENG091 → ENG101 → ENG102 → ENG103 / CSE390",
    department: "ENG",
    accentColor: "#0ea5e9",
    badgeClass: "bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-300",
    description: "University Core Stream 1 Writing Comprehension sequence. Completing ENG102 unlocks ENG103 (for direct ENG102 freshers) and CSE390 (Technical Communication).",
    stages: [
      { stageLabel: "Stage 1: Fundamentals", codes: ["ENG101"] },
      { stageLabel: "Stage 2: Composition I", codes: ["ENG102"] },
    ],
  },
  {
    id: "elective-prereq-gates",
    title: "6. CSE Major Elective Prerequisite Gates (23 Electives)",
    subtitle: "How Core & MNS courses unlock specialized AI/ML, Systems, Web & Signal Electives",
    department: "CSE",
    accentColor: "#f59e0b",
    badgeClass: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-300",
    description: "Every CSE Major Elective is gated by specific Program Core or MNS courses (such as CSE221 + STA201 + MAT216 for Machine Learning CSE427).",
    stages: [
      { stageLabel: "Unlocked by CSE111 / CSE220", codes: ["CSE310", "CSE391", "CSE474"] },
      { stageLabel: "Unlocked by CSE221 (+ STA201 / MAT216)", codes: ["CSE419", "CSE424", "CSE425", "CSE426", "CSE427", "CSE428", "CSE429", "CSE431", "CSE432", "CSE473"] },
      { stageLabel: "Unlocked by CSE321 / CSE340 / CSE370", codes: ["CSE342", "CSE371", "CSE410", "CSE462", "CSE472", "CSE490"] },
      { stageLabel: "Unlocked by MAT215 + MAT216 / ENG102", codes: ["CSE390", "CSE392", "CSE430"] },
    ],
  },
];

interface PrereqChainsModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesters: Semester[];
  isCSE400Passed: boolean;
  onQuickAddCourse?: (courseCode: string) => void;
  isFullPage?: boolean;
  embedded?: boolean;
  deptFilterProp?: 'ALL' | 'CSE' | 'MNS' | 'ENG';
  onDeptFilterChange?: (filter: 'ALL' | 'CSE' | 'MNS' | 'ENG') => void;
}

export default function PrereqChainsModal({
  isOpen,
  onClose,
  semesters,
  isCSE400Passed,
  onQuickAddCourse,
  isFullPage = false,
  embedded = false,
  deptFilterProp,
  onDeptFilterChange,
}: PrereqChainsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [internalDeptFilter, setInternalDeptFilter] = useState<'ALL' | 'CSE' | 'MNS' | 'ENG'>('ALL');
  const deptFilter = deptFilterProp ?? internalDeptFilter;
  const setDeptFilter = (next: 'ALL' | 'CSE' | 'MNS' | 'ENG') => {
    setInternalDeptFilter(next);
    if (onDeptFilterChange) onDeptFilterChange(next);
  };
  const [selectedCourseInspector, setSelectedCourseInspector] = useState<string | null>(null);

  // Compute completion & planned map across all user semesters
  const courseStatusMap = useMemo(() => {
    const map: Record<
      string,
      {
        status: 'completed' | 'planned' | 'unlocked' | 'locked';
        semesterName?: string;
        grade?: string;
        missingHp: string[];
        missingSp: string[];
      }
    > = {};

    const completedSet = new Set<string>();
    const plannedMap = new Map<string, { semName: string; grade: string }>();

    semesters.forEach(sem => {
      sem.courses.forEach(c => {
        const isComp = c.isCompleted || (c.grade !== "" && c.grade !== "F");
        if (isComp) {
          completedSet.add(c.code);
        }
        if (!plannedMap.has(c.code) || isComp) {
          plannedMap.set(c.code, { semName: sem.name, grade: c.grade });
        }
      });
    });

    if (isCSE400Passed) {
      completedSet.add("CSE400");
      if (!plannedMap.has("CSE400")) {
        plannedMap.set("CSE400", { semName: "Capstone", grade: "PASS" });
      }
    }

    COURSES.forEach(co => {
      const rule = PREREQUISITES[co.code] || { hp: [], sp: [] };
      // Ignore remedial ENG091 / MAT091 / MAT092 in hard-lock check if student didn't take remedial
      const effectiveHp = rule.hp.filter(req => !["ENG091", "MAT091", "MAT092"].includes(req));
      const missingHp = effectiveHp.filter(req => !completedSet.has(req));
      const missingSp = rule.sp.filter(req => !completedSet.has(req));

      if (completedSet.has(co.code)) {
        const info = plannedMap.get(co.code);
        map[co.code] = {
          status: 'completed',
          semesterName: info?.semName,
          grade: info?.grade,
          missingHp,
          missingSp,
        };
      } else if (plannedMap.has(co.code)) {
        const info = plannedMap.get(co.code);
        map[co.code] = {
          status: 'planned',
          semesterName: info?.semName,
          grade: info?.grade,
          missingHp,
          missingSp,
        };
      } else if (missingHp.length === 0) {
        map[co.code] = {
          status: 'unlocked',
          missingHp,
          missingSp,
        };
      } else {
        map[co.code] = {
          status: 'locked',
          missingHp,
          missingSp,
        };
      }
    });

    return map;
  }, [semesters, isCSE400Passed]);

  // Compute overall mandatory chain metrics (Chains 1 - 5)
  const mandatoryChainStats = useMemo(() => {
    const mandatoryChains = PREREQ_CHAINS.slice(0, 5);
    const allCodes = new Set<string>();
    mandatoryChains.forEach(ch => ch.stages.forEach(st => st.codes.forEach(c => allCodes.add(c))));

    let completedCount = 0;
    let plannedCount = 0;
    let unlockedCount = 0;

    allCodes.forEach(code => {
      const st = courseStatusMap[code]?.status;
      if (st === 'completed') completedCount++;
      else if (st === 'planned') plannedCount++;
      else if (st === 'unlocked') unlockedCount++;
    });

    return {
      total: allCodes.size,
      completed: completedCount,
      remaining: Math.max(0, allCodes.size - completedCount),
      planned: plannedCount,
      unlocked: unlockedCount,
      pct: allCodes.size > 0 ? Math.round((completedCount / allCodes.size) * 100) : 0,
    };
  }, [courseStatusMap]);

  if (!isOpen) return null;

  const q = searchQuery.toLowerCase().trim();

  const visibleChains = PREREQ_CHAINS.filter(chain => {
    if (deptFilter !== 'ALL' && chain.department !== deptFilter) return false;
    if (!q) return true;
    if (chain.title.toLowerCase().includes(q) || chain.subtitle.toLowerCase().includes(q)) return true;
    return chain.stages.some(st =>
      st.codes.some(code => {
        const cInfo = COURSES.find(c => c.code === code);
        return code.toLowerCase().includes(q) || (cInfo && cInfo.title.toLowerCase().includes(q));
      })
    );
  });

  // Helper to find what courses a given course code unlocks (both HP and SP)
  const getDownstreamUnlocks = (code: string) => {
    const hardUnlocks: string[] = [];
    const softUnlocks: string[] = [];
    Object.entries(PREREQUISITES).forEach(([targetCode, rule]) => {
      if (rule.hp.includes(code)) hardUnlocks.push(targetCode);
      if (rule.sp.includes(code)) softUnlocks.push(targetCode);
    });
    return { hardUnlocks, softUnlocks };
  };

  return (
    <div
      className={
        embedded
          ? "w-full flex flex-col text-[#171717] dark:text-[#ededed]"
          : isFullPage
          ? "min-h-screen w-full flex flex-col bg-[#fafafa] dark:bg-[#050505] text-[#171717] dark:text-[#ededed]"
          : "fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      }
      onClick={isFullPage || embedded ? undefined : onClose}
    >
      <div
        className={
          embedded
            ? "w-full flex flex-col bg-transparent overflow-hidden text-[#171717] dark:text-[#ededed]"
            : isFullPage
            ? "w-full flex-1 flex flex-col bg-white dark:bg-[#0c0c0c] overflow-hidden text-[#171717] dark:text-[#ededed]"
            : "w-full max-w-[96vw] md:max-w-6xl max-h-[94vh] flex flex-col bg-white dark:bg-[#0c0c0c] border border-[#e5e5e5] dark:border-[#242424] rounded-2xl shadow-vercel-modal overflow-hidden text-[#171717] dark:text-[#ededed]"
        }
        onClick={isFullPage || embedded ? undefined : (e) => e.stopPropagation()}
      >
        {/* Window Chrome Bar (hidden when embedded inside main Degree Workspace frame) */}
        {!embedded && (
        <div className="px-4 py-2 bg-[#fafafa] dark:bg-[#111111] border-b border-[#ebebeb] dark:border-[#222222] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
          </div>
          <div className="px-3 py-0.5 rounded-md bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] text-[10px] font-mono text-[#888888] flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0070f3]" />
            <span>route136.app/prereq-chains</span>
          </div>
          <span className="text-[10px] font-mono text-[#0070f3] bg-[#0070f3]/10 border border-[#0070f3]/20 px-2 py-0.5 rounded">
            DEPENDENCY ENGINE
          </span>
        </div>
        )}

        {/* Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#ebebeb] dark:border-[#262626] flex items-center justify-between gap-3 bg-white dark:bg-[#0c0c0c] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-[#0070f3]/10 border border-[#0070f3]/25 flex items-center justify-center text-[#0070f3] shrink-0">
              <GitBranch className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-[#171717] dark:text-[#ededed] tracking-tight truncate">
                CSE &amp; MNS Prerequisite Sequence Chains
              </h3>
              <p className="text-[11px] text-[#666666] dark:text-[#888888] font-mono mt-0.5 truncate">
                Live progress &amp; remaining courses across every Hard (HP) and Soft (SP) prerequisite sequence
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#fafafa] dark:bg-[#181818] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] border border-[#e5e5e5] dark:border-[#2a2a2a] flex items-center justify-center text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] transition cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Top Executive Summary Strip & Filter Controls */}
        <div className="px-4 sm:px-6 py-3 border-b border-[#ebebeb] dark:border-[#222222] bg-[#fafafa] dark:bg-[#111111] flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
          {/* Live Chain Progress Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] flex items-center gap-2 text-xs font-mono">
              <span className="text-[#888888]">Core Chain Progress:</span>
              <strong className="text-[#0070f3]">{mandatoryChainStats.completed}/{mandatoryChainStats.total} Done ({mandatoryChainStats.pct}%)</strong>
              <span className="text-[#cccccc] dark:text-[#333333]">|</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{mandatoryChainStats.remaining} Left</span>
            </div>

            {/* Status Legend Pills */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> Completed
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#0070f3]/10 border border-[#0070f3]/30 text-[#0070f3]">
                <Clock className="w-3 h-3" /> Planned
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                <Sparkles className="w-3 h-3" /> Ready Next
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#f0f0f0] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#2a2a2a] text-[#888888]">
                <Lock className="w-3 h-3" /> Locked (HP)
              </span>
            </div>
          </div>

          {/* Filter Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] rounded-lg">
              {(['ALL', 'CSE', 'MNS', 'ENG'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setDeptFilter(tab)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition cursor-pointer ${
                    deptFilter === tab
                      ? 'bg-[#171717] dark:bg-[#ededed] text-white dark:text-[#0a0a0a] font-semibold'
                      : 'text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed]'
                  }`}
                >
                  {tab === 'ALL' ? 'All' : tab}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="h-3.5 w-3.5 text-[#888888] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search course (e.g. CSE221)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-[#161616] border border-[#e5e5e5] dark:border-[#262626] text-xs pl-8 pr-7 py-1.5 rounded-lg text-[#171717] dark:text-[#ededed] placeholder:text-[#888888] outline-none focus:border-[#0070f3] transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Selected Course Dependency Inspector Drawer (When any course node is clicked) */}
        {selectedCourseInspector && (() => {
          const courseObj = COURSES.find(c => c.code === selectedCourseInspector);
          const rule = PREREQUISITES[selectedCourseInspector] || { hp: [], sp: [] };
          const statusObj = courseStatusMap[selectedCourseInspector];
          const { hardUnlocks, softUnlocks } = getDownstreamUnlocks(selectedCourseInspector);

          return (
            <div className="px-4 sm:px-6 py-3 bg-[#0070f3]/[0.06] dark:bg-[#0070f3]/[0.1] border-b border-[#0070f3]/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 animate-in fade-in duration-150">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[#0070f3] text-white">
                    {selectedCourseInspector}
                  </span>
                  <span className="text-xs font-semibold text-[#171717] dark:text-[#ededed]">
                    {courseObj?.title} ({courseObj?.credits ?? 3} Cr)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] text-[#666666] dark:text-[#a1a1a1]">
                    Status: <strong className="uppercase text-[#171717] dark:text-[#ededed]">{statusObj?.status}</strong>
                    {statusObj?.semesterName ? ` (${statusObj.semesterName}${statusObj.grade ? ` • ${statusObj.grade}` : ''})` : ''}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono">
                  <span>
                    <strong className="text-[#171717] dark:text-[#ededed]">Hard Prereqs (HP):</strong>{" "}
                    {rule.hp.length > 0 ? rule.hp.join(" + ") : "None"}
                  </span>
                  <span>
                    <strong className="text-[#171717] dark:text-[#ededed]">Soft Prereqs (SP):</strong>{" "}
                    {rule.sp.length > 0 ? rule.sp.join(" + ") : "None"}
                  </span>
                  <span>
                    <strong className="text-emerald-600 dark:text-emerald-400">Unlocks Next (HP):</strong>{" "}
                    {hardUnlocks.length > 0 ? hardUnlocks.join(", ") : "Terminal Course"}
                  </span>
                  {softUnlocks.length > 0 && (
                    <span>
                      <strong className="text-amber-600 dark:text-amber-400">Unlocks (SP):</strong>{" "}
                      {softUnlocks.join(", ")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onQuickAddCourse && statusObj?.status !== 'completed' && statusObj?.status !== 'planned' && (
                  <button
                    type="button"
                    onClick={() => onQuickAddCourse(selectedCourseInspector)}
                    className="h-8 px-3 rounded-lg bg-[#0070f3] hover:bg-[#0060df] text-white text-xs font-medium flex items-center gap-1.5 shadow-vercel-subtle cursor-pointer transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add {selectedCourseInspector} to Plan</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedCourseInspector(null)}
                  className="h-8 px-2.5 rounded-lg bg-white dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#2a2a2a] text-xs text-[#666666] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-[#ededed] cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          );
        })()}

        {/* Scrollable Chains Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          {visibleChains.map(chain => {
            // Calculate chain-specific completion stats
            const chainCodes: string[] = [];
            chain.stages.forEach(st => st.codes.forEach(c => chainCodes.push(c)));
            const totalInChain = chainCodes.length;
            const completedInChain = chainCodes.filter(c => courseStatusMap[c]?.status === 'completed').length;
            const plannedInChain = chainCodes.filter(c => courseStatusMap[c]?.status === 'planned').length;
            const remainingInChain = Math.max(0, totalInChain - completedInChain);
            const pct = totalInChain > 0 ? Math.round((completedInChain / totalInChain) * 100) : 0;

            // Find immediate next unlocked courses in this chain
            const readyNextCourses = chainCodes.filter(c => courseStatusMap[c]?.status === 'unlocked');

            return (
              <div
                key={chain.id}
                className="rounded-2xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#242424] p-4 sm:p-5 space-y-4 shadow-vercel-subtle"
              >
                {/* Chain Header & Progress Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#ebebeb] dark:border-[#222222]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${chain.badgeClass}`}>
                        {chain.department} CHAIN
                      </span>
                      <h4 className="text-sm sm:text-base font-semibold text-[#171717] dark:text-[#ededed]">
                        {chain.title}
                      </h4>
                    </div>
                    <p className="text-xs text-[#666666] dark:text-[#888888] leading-relaxed">
                      {chain.description}
                    </p>
                  </div>

                  {/* Chain Remaining & Progress Counter Box */}
                  <div className="w-full md:w-64 shrink-0 p-3 rounded-xl bg-white dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#171717] dark:text-[#ededed] font-semibold">
                        {completedInChain} / {totalInChain} Completed
                      </span>
                      <span className={remainingInChain === 0 ? "text-emerald-500 font-bold" : "text-[#0070f3] font-semibold"}>
                        {remainingInChain === 0 ? "CHAIN COMPLETE ✓" : `${remainingInChain} Left (${pct}%)`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#eaeaea] dark:bg-[#242424] overflow-hidden">
                      <div
                        style={{ width: `${pct}%`, backgroundColor: chain.accentColor }}
                        className="h-full rounded-full transition-all duration-300"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#888888]">
                      <span>Planned: {plannedInChain}</span>
                      <span>
                        Ready Next:{" "}
                        <strong className="text-amber-600 dark:text-amber-400">
                          {readyNextCourses.length > 0 ? readyNextCourses.slice(0, 3).join(", ") : "None"}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Horizontal Stage-by-Stage Flowchart Pipeline */}
                <div className="overflow-x-auto custom-scrollbar pb-2">
                  <div className="flex items-stretch gap-2.5 min-w-max">
                    {chain.stages.map((stage, sIdx) => (
                      <React.Fragment key={stage.stageLabel}>
                        {/* Stage Column */}
                        <div className="w-52 sm:w-56 rounded-xl bg-white dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] p-3 flex flex-col justify-between gap-2.5">
                          <div className="flex items-center justify-between border-b border-[#f0f0f0] dark:border-[#222222] pb-1.5">
                            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#888888] truncate">
                              {stage.stageLabel}
                            </span>
                            <span className="text-[10px] font-mono text-[#888888]">
                              {stage.codes.filter(c => courseStatusMap[c]?.status === 'completed').length}/{stage.codes.length}
                            </span>
                          </div>

                          <div className="space-y-2 flex-1 flex flex-col justify-center">
                            {stage.codes.map(code => {
                              const cInfo = COURSES.find(c => c.code === code);
                              const rule = PREREQUISITES[code] || { hp: [], sp: [] };
                              const stObj = courseStatusMap[code];
                              const st = stObj?.status || 'unlocked';
                              const isHighlighted = q && (code.toLowerCase().includes(q) || (cInfo && cInfo.title.toLowerCase().includes(q)));
                              const isInspected = selectedCourseInspector === code;

                              let cardStyle = "bg-[#fafafa] dark:bg-[#121212] border-[#e5e5e5] dark:border-[#262626] text-[#888888]";
                              let badgeEl = (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#eaeaea] dark:bg-[#222222] text-[#888888]">
                                  <Lock className="w-2.5 h-2.5" /> Locked
                                </span>
                              );

                              if (st === 'completed') {
                                cardStyle = "bg-emerald-500/[0.07] dark:bg-emerald-500/[0.1] border-emerald-500/40 text-[#171717] dark:text-[#ededed]";
                                badgeEl = (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                    <CheckCircle2 className="w-2.5 h-2.5" /> {stObj?.grade || "Done"}
                                  </span>
                                );
                              } else if (st === 'planned') {
                                cardStyle = "bg-[#0070f3]/[0.07] dark:bg-[#0070f3]/[0.12] border-[#0070f3]/45 text-[#171717] dark:text-[#ededed]";
                                badgeEl = (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-[#0070f3]/15 text-[#0070f3] border border-[#0070f3]/30">
                                    <Clock className="w-2.5 h-2.5" /> {stObj?.semesterName?.replace("Semester", "Sem") || "Planned"}
                                  </span>
                                );
                              } else if (st === 'unlocked') {
                                cardStyle = "bg-amber-500/[0.06] dark:bg-amber-500/[0.09] border-amber-500/40 text-[#171717] dark:text-[#ededed]";
                                badgeEl = (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                    <Sparkles className="w-2.5 h-2.5" /> Ready
                                  </span>
                                );
                              }

                              return (
                                <div
                                  key={code}
                                  onClick={() => setSelectedCourseInspector(code)}
                                  className={`p-2 rounded-lg border transition-all cursor-pointer select-none space-y-1 ${cardStyle} ${
                                    isInspected || isHighlighted ? "ring-2 ring-[#0070f3]" : "hover:border-[#0070f3]/60"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-mono font-bold text-xs text-[#171717] dark:text-[#ededed]">
                                      {code}
                                    </span>
                                    {badgeEl}
                                  </div>
                                  <p className="text-[11px] text-[#555555] dark:text-[#a1a1a1] truncate font-medium" title={cInfo?.title}>
                                    {cInfo?.title || code}
                                  </p>
                                  <div className="pt-1 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[9px] font-mono text-[#888888]">
                                    <span className="truncate">
                                      HP: {rule.hp.length > 0 ? rule.hp.join("+") : "—"}
                                    </span>
                                    {rule.sp.length > 0 && (
                                      <span className="text-amber-600 dark:text-amber-400 shrink-0 ml-1">
                                        SP: {rule.sp.join("+")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Connector Arrow between stages */}
                        {sIdx < chain.stages.length - 1 && (
                          <div className="flex flex-col items-center justify-center px-0.5 text-[#888888] shrink-0">
                            <div className="h-7 w-7 rounded-full bg-white dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center shadow-vercel-subtle">
                              <ArrowRight className="w-3.5 h-3.5 text-[#0070f3]" />
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-[#ebebeb] dark:border-[#222222] bg-[#fafafa] dark:bg-[#111111] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#666666] dark:text-[#888888] shrink-0">
          <div className="flex items-center gap-2 font-mono text-[10px] flex-wrap justify-center sm:justify-start">
            <Info className="w-3.5 h-3.5 text-[#0070f3] shrink-0" />
            <span><strong>HP (Hard Prereq):</strong> Must complete before next course</span>
            <span>•</span>
            <span><strong>SP (Soft Prereq):</strong> Advisory course that helps with next course</span>
          </div>
          {!embedded && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 rounded-lg bg-[#171717] dark:bg-[#ededed] text-white dark:text-[#0a0a0a] font-medium text-xs shadow-vercel-subtle cursor-pointer transition shrink-0"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
