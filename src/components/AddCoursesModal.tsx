"use client";

import React, { useState, useMemo, useEffect } from "react";
import { X, Search, Check, Layers, AlertTriangle, BookOpen, Trash2, ChevronDown, ChevronUp, Plus, ArrowRight, Repeat } from "lucide-react";
import { COURSES, registerCustomCourse } from "@/app/courses-data";

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

export interface QueuedCourseAssignment {
  id: string;
  courseCode: string;
  targetSemId: string;
  resolution?: 'move' | 'repeat';
  originalSemId?: string;
}

interface AddCoursesModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesters: Semester[];
  initialSelectedCodes?: string[];
  initialTargetSemesterId?: string | null;
  onCommitAddCourses: (
    assignments: {
      courseCode: string;
      targetSemId: string;
      resolution?: 'move' | 'repeat';
      originalSemId?: string;
    }[]
  ) => void;
  onRemoveCourseFromSemester?: (semesterId: string, courseCode: string) => void;
  onClearSemesterCourses?: (semesterId: string) => void;
}

export default function AddCoursesModal({
  isOpen,
  onClose,
  semesters,
  initialSelectedCodes,
  initialTargetSemesterId,
  onCommitAddCourses,
  onRemoveCourseFromSemester,
  onClearSemesterCourses,
}: AddCoursesModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Multi-semester queued items (can hold the same courseCode across different semesters for retakes!)
  const [queuedItems, setQueuedItems] = useState<QueuedCourseAssignment[]>([]);

  // Active semester tab for multi-semester assignment & capacity review
  const [activeSemId, setActiveSemId] = useState<string>("");
  const [isDrawerExpanded, setIsDrawerExpanded] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Prompt state when a user clicks a course that is ALREADY queued or enrolled in another semester
  const [repeatPrompt, setRepeatPrompt] = useState<{
    courseCode: string;
    targetSemId: string;
    existingSemIds: string[];
    sourceType: 'queued' | 'enrolled';
  } | null>(null);

  // Manual/Custom Course form state when search returns no matches
  const [showCustomForm, setShowCustomForm] = useState<boolean>(false);
  const [customCode, setCustomCode] = useState<string>("");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [customCredits, setCustomCredits] = useState<number>(3);
  const [customCategory, setCustomCategory] = useState<string>("CSE Major Elective");
  const [customCourseVersion, setCustomCourseVersion] = useState<number>(0);

  // Helper to determine the best default semester to assign to
  const getDefaultSemesterId = () => {
    if (!semesters || semesters.length === 0) return "";
    if (initialTargetSemesterId && semesters.some(s => s.id === initialTargetSemesterId)) {
      return initialTargetSemesterId;
    }
    const openSem = semesters.find(s => s.courses.length < 5);
    return openSem?.id || semesters[0]?.id || "";
  };

  useEffect(() => {
    if (isOpen) {
      const defaultSem = getDefaultSemesterId();
      setActiveSemId(defaultSem);
      setIsDrawerExpanded(false);
      setShowClearConfirm(false);
      setRepeatPrompt(null);

      if (initialSelectedCodes && initialSelectedCodes.length > 0) {
        const initQueue: QueuedCourseAssignment[] = initialSelectedCodes.map(code => ({
          id: `${code}::${defaultSem}`,
          courseCode: code,
          targetSemId: defaultSem,
        }));
        setQueuedItems(initQueue);
      } else {
        setQueuedItems([]);
      }
    } else {
      setQueuedItems([]);
      setSearchQuery("");
      setCategoryFilter("ALL");
      setShowClearConfirm(false);
      setRepeatPrompt(null);
      setShowCustomForm(false);
      setCustomCode("");
      setCustomTitle("");
      setCustomCredits(3);
      setCustomCategory("CSE Major Elective");
    }
  }, [isOpen, initialSelectedCodes, initialTargetSemesterId]);

  // Active target semester object
  const currentReviewSemester = useMemo(() => {
    return semesters.find(s => s.id === activeSemId) || semesters[0];
  }, [semesters, activeSemId]);

  // Current courses enrolled in the active review semester
  const enrolledCourses = currentReviewSemester?.courses || [];

  const enrolledCredits = useMemo(() => {
    return enrolledCourses.reduce((sum, c) => {
      const co = COURSES.find(item => item.code === c.code);
      return sum + (co?.category === "Non-Credit" ? 0 : (co?.credits ?? 3));
    }, 0);
  }, [enrolledCourses]);

  // Courses queued in modal that are assigned to the active semester
  const pendingAssignedToActive = useMemo(() => {
    return queuedItems.filter(item => item.targetSemId === currentReviewSemester?.id);
  }, [queuedItems, currentReviewSemester]);

  const pendingCreditsForActive = useMemo(() => {
    return pendingAssignedToActive.reduce((sum, item) => {
      const co = COURSES.find(c => c.code === item.courseCode);
      return sum + (co?.category === "Non-Credit" ? 0 : (co?.credits ?? 3));
    }, 0);
  }, [pendingAssignedToActive]);

  const projectedCredits = enrolledCredits + pendingCreditsForActive;
  const isOverloaded = projectedCredits > 18;

  // Group queued courses by semester so users can see multi-semester additions at a glance
  const queuedBySemester = useMemo(() => {
    const map: Record<string, string[]> = {};
    queuedItems.forEach(item => {
      if (!map[item.targetSemId]) map[item.targetSemId] = [];
      map[item.targetSemId].push(item.courseCode);
    });
    return map;
  }, [queuedItems]);

  const distinctTargetSemesterCount = Object.keys(queuedBySemester).length;

  // Filtered courses for selection
  const filteredCourses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return COURSES.filter(course => {
      const matchText =
        course.code.toLowerCase().includes(q) ||
        course.title.toLowerCase().includes(q) ||
        (course.category && course.category.toLowerCase().includes(q));

      if (!matchText) return false;

      if (categoryFilter === "CSE") return course.code.startsWith("CSE");
      if (categoryFilter === "MAT") return course.code.startsWith("MAT") || course.code.startsWith("STA");
      if (categoryFilter === "PHY") return course.code.startsWith("PHY");
      if (categoryFilter === "ENG") return course.code.startsWith("ENG");
      if (categoryFilter === "RS") return ["EMB101", "HUM103", "BNG103", "ENG102", "BU201"].includes(course.code);
      if (categoryFilter === "GED") return course.category?.includes("GenEd");

      return true;
    }).slice(0, 60);
  }, [searchQuery, categoryFilter, customCourseVersion]);

  const handleOpenCustomForm = () => {
    const guessCode = searchQuery.trim().toUpperCase().replace(/\s+/g, "");
    setCustomCode(guessCode);
    setCustomTitle("");
    setCustomCredits(3);
    setCustomCategory("CSE Major Elective");
    setShowCustomForm(true);
  };

  const handleCreateAndQueueCustomCourse = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCode = customCode.trim().toUpperCase();
    if (!normalizedCode) return;

    registerCustomCourse({
      code: normalizedCode,
      title: customTitle.trim() || `Custom Course (${normalizedCode})`,
      credits: customCategory === "Non-Credit" ? 0 : customCredits,
      category: customCategory,
      mandatory: false,
    });
    setCustomCourseVersion(v => v + 1);
    setShowCustomForm(false);
    setSearchQuery("");
    setCategoryFilter("ALL");
    toggleSelectCourse(normalizedCode);
  };

  if (!isOpen) return null;

  // Find if a course is already enrolled in any semester
  const findExistingSemestersForCourse = (courseCode: string) => {
    return semesters.filter(sem => sem.courses.some(c => c.code === courseCode));
  };

  // Helper to get short semester label (e.g. "Sem 1", "RS", "Sem 4")
  const getShortSemLabel = (sem?: Semester, index?: number) => {
    if (!sem) return "Term";
    if (sem.isRS) return "RS";
    const numMatch = sem.name.match(/^(\d+)/);
    if (numMatch) return `Sem ${numMatch[1]}`;
    if (typeof index === "number") return `Sem ${index + 1}`;
    return sem.name;
  };

  // Clicking a course in the catalog:
  // 1) If already queued for the CURRENT active semester -> unselects it from this semester
  // 2) If already queued for ANOTHER semester in this batch OR already enrolled in another semester ->
  //    opens the "Repeat Course or Move Course?" prompt so the user can add it as a repeat in one go!
  // 3) Otherwise -> queues it into the active semester immediately
  const toggleSelectCourse = (code: string) => {
    const targetSem = activeSemId || getDefaultSemesterId();
    if (!targetSem) return;

    // Case 1: Already queued in the current active semester -> remove it
    const alreadyInTargetQueue = queuedItems.find(
      item => item.courseCode === code && item.targetSemId === targetSem
    );
    if (alreadyInTargetQueue) {
      setQueuedItems(prev => prev.filter(item => item.id !== alreadyInTargetQueue.id));
      return;
    }

    // Case 2: Already enrolled in the current active semester -> no-op
    const targetSemObj = semesters.find(s => s.id === targetSem);
    if (targetSemObj?.courses.some(c => c.code === code)) {
      return;
    }

    // Case 3: Check if already queued in a DIFFERENT semester in this batch
    const queuedInOtherSems = queuedItems.filter(
      item => item.courseCode === code && item.targetSemId !== targetSem
    );
    if (queuedInOtherSems.length > 0) {
      setRepeatPrompt({
        courseCode: code,
        targetSemId: targetSem,
        existingSemIds: queuedInOtherSems.map(q => q.targetSemId),
        sourceType: 'queued',
      });
      return;
    }

    // Case 4: Check if already enrolled in a DIFFERENT semester in the plan
    const enrolledInOtherSems = findExistingSemestersForCourse(code).filter(s => s.id !== targetSem);
    if (enrolledInOtherSems.length > 0) {
      setRepeatPrompt({
        courseCode: code,
        targetSemId: targetSem,
        existingSemIds: enrolledInOtherSems.map(s => s.id),
        sourceType: 'enrolled',
      });
      return;
    }

    // Case 5: Brand new selection -> add to queue for activeSemId
    setQueuedItems(prev => [
      ...prev,
      {
        id: `${code}::${targetSem}`,
        courseCode: code,
        targetSemId: targetSem,
      }
    ]);
  };

  // Confirm repeat/retake or move from the inline prompt
  const handleResolveRepeatPrompt = (action: 'repeat' | 'move') => {
    if (!repeatPrompt) return;
    const { courseCode, targetSemId, existingSemIds, sourceType } = repeatPrompt;

    if (sourceType === 'queued') {
      if (action === 'repeat') {
        // Keep the existing queued assignment(s) AND add a second queued assignment as a repeat!
        setQueuedItems(prev => [
          ...prev,
          {
            id: `${courseCode}::${targetSemId}`,
            courseCode,
            targetSemId,
            resolution: 'repeat',
          }
        ]);
      } else {
        // Move: replace the earlier queued semester with the new targetSemId
        setQueuedItems(prev => [
          ...prev.filter(item => item.courseCode !== courseCode),
          {
            id: `${courseCode}::${targetSemId}`,
            courseCode,
            targetSemId,
          }
        ]);
      }
    } else {
      // Enrolled in another semester already
      setQueuedItems(prev => [
        ...prev,
        {
          id: `${courseCode}::${targetSemId}`,
          courseCode,
          targetSemId,
          resolution: action,
          originalSemId: existingSemIds[0],
        }
      ]);
    }

    setRepeatPrompt(null);
  };

  const handleCommit = () => {
    const assignments = queuedItems.map(item => ({
      courseCode: item.courseCode,
      targetSemId: item.targetSemId,
      resolution: item.resolution,
      originalSemId: item.originalSemId,
    }));

    onCommitAddCourses(assignments);
    setQueuedItems([]);
    setRepeatPrompt(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0c0c0c] border border-[#e5e5e5] dark:border-[#242424] rounded-2xl shadow-vercel-modal overflow-hidden text-[#171717] dark:text-[#ededed] relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Window Chrome Bar (Landing Page Vercel Developer Platform Aesthetic) */}
        <div className="px-4 py-2.5 bg-[#fafafa] dark:bg-[#111111] border-b border-[#ebebeb] dark:border-[#222222] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
          </div>
          <div className="px-3 py-0.5 rounded-md bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] text-[10px] font-mono text-[#888888] flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0070f3]" />
            <span>route136.app/course-assignment</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-6 w-6 rounded-md bg-white dark:bg-[#181818] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] border border-[#e5e5e5] dark:border-[#2a2a2a] flex items-center justify-center text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Title & Multi-Semester Quick Switcher Bar */}
        <div className="p-4 sm:px-5 sm:py-4 border-b border-[#ebebeb] dark:border-[#222222] bg-white dark:bg-[#0c0c0c] space-y-3.5 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#fafafa] dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#0070f3] shadow-vercel-subtle shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-[#171717] dark:text-[#ededed] tracking-tight flex items-center gap-2 flex-wrap">
                  <span>Multi-Semester Course Builder</span>
                  {queuedItems.length > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-mono font-medium bg-[#0070f3]/10 text-[#0070f3] border border-[#0070f3]/25">
                      {queuedItems.length} queued across {distinctTargetSemesterCount} term{distinctTargetSemesterCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-[#666666] dark:text-[#888888] mt-0.5">
                  1. Click a semester tab below &rarr; 2. Click courses to assign &rarr; 3. Switch tabs anytime (supports retakes across terms).
                </p>
              </div>
            </div>

            {/* Active Target Semester Capacity Pill */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 border ${
                isOverloaded
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                  : projectedCredits > 15
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                  : "bg-[#fafafa] dark:bg-[#141414] text-[#171717] dark:text-[#ededed] border-[#ebebeb] dark:border-[#262626]"
              }`}>
                <span className="text-[#888888]">{getShortSemLabel(currentReviewSemester)}:</span>
                <span>{enrolledCredits} Cr</span>
                {pendingCreditsForActive > 0 && (
                  <span className="text-[#0070f3] font-semibold">+{pendingCreditsForActive} Cr</span>
                )}
                <span className="text-[#888888] font-normal">/ 18</span>
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerExpanded(prev => !prev)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#fafafa] dark:bg-[#141414] hover:bg-[#f0f0f0] dark:hover:bg-[#1d1d1d] text-[#171717] dark:text-[#ededed] border border-[#ebebeb] dark:border-[#262626] transition flex items-center gap-1 cursor-pointer"
              >
                <span>Enrolled ({enrolledCourses.length})</span>
                {isDrawerExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {enrolledCourses.length > 0 && onClearSemesterCourses && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="px-2 py-1 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition flex items-center gap-1 cursor-pointer"
                  title="Clear all courses from this semester"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Horizontal Multi-Semester Switcher Tabs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#888888] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#0070f3]" />
                <span>Active Target Semester (Click to switch &amp; assign courses to multiple terms):</span>
              </span>
              <span className="text-[#0070f3] font-semibold">
                Assigning to: {currentReviewSemester?.name}
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
              {semesters.map((sem, idx) => {
                const isActive = sem.id === currentReviewSemester?.id;
                const pendingCount = (queuedBySemester[sem.id] || []).length;
                const totalCount = sem.courses.length + pendingCount;

                return (
                  <button
                    key={sem.id}
                    type="button"
                    onClick={() => {
                      setActiveSemId(sem.id);
                      setShowClearConfirm(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      isActive
                        ? "bg-[#171717] dark:bg-[#ededed] border-[#171717] dark:border-[#ededed] text-white dark:text-[#0a0a0a] shadow-vercel-subtle font-semibold"
                        : pendingCount > 0
                        ? "bg-[#0070f3]/10 border-[#0070f3]/35 text-[#171717] dark:text-[#ededed]"
                        : "bg-[#fafafa] dark:bg-[#141414] border-[#ebebeb] dark:border-[#242424] text-[#666666] dark:text-[#a1a1a1] hover:border-[#888888]"
                    }`}
                  >
                    <span>{getShortSemLabel(sem, idx)}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isActive
                        ? "bg-white/20 dark:bg-black/15 text-white dark:text-[#0a0a0a]"
                        : "bg-white dark:bg-[#1e1e1e] text-[#888888]"
                    }`}>
                      {totalCount}
                    </span>
                    {pendingCount > 0 && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-[#0070f3] text-white">
                        +{pendingCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Repeat / Retake Course Confirmation Prompt Banner */}
          {repeatPrompt && (() => {
            const targetSemObj = semesters.find(s => s.id === repeatPrompt.targetSemId);
            const existingNames = repeatPrompt.existingSemIds
              .map(id => semesters.find(s => s.id === id)?.name || "another semester")
              .join(", ");
            return (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <Repeat className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#171717] dark:text-[#ededed]">
                      Repeat <span className="font-mono text-amber-600 dark:text-amber-400">{repeatPrompt.courseCode}</span> in {targetSemObj?.name}?
                    </p>
                    <p className="text-[11px] text-[#666666] dark:text-[#a1a1a1] mt-0.5">
                      <strong>{repeatPrompt.courseCode}</strong> is already {repeatPrompt.sourceType === 'queued' ? 'queued in' : 'enrolled in'} <strong>{existingNames}</strong>. Do you want to repeat (retake) it in <strong>{targetSemObj?.name}</strong> or move it?
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleResolveRepeatPrompt('repeat')}
                    className="h-8 px-3 rounded-lg bg-[#0070f3] hover:bg-[#0060df] text-white font-medium text-xs shadow-vercel-subtle cursor-pointer transition flex items-center gap-1.5"
                  >
                    <Repeat className="w-3 h-3" />
                    <span>Yes, Repeat Course</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolveRepeatPrompt('move')}
                    className="h-8 px-3 rounded-lg bg-[#171717] dark:bg-[#ededed] text-white dark:text-[#0a0a0a] font-medium text-xs shadow-vercel-subtle cursor-pointer transition"
                  >
                    Move Instead
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepeatPrompt(null)}
                    className="h-8 px-2.5 rounded-lg bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#2a2a2a] text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] text-xs cursor-pointer transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Overload Alert Warning if > 18 credits */}
          {isOverloaded && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <strong>Overload Warning:</strong> <strong>{currentReviewSemester?.name}</strong> is at <strong>{projectedCredits} credits</strong>, exceeding the standard 18-credit limit.
              </span>
            </div>
          )}

          {/* Clear Confirmation Prompt */}
          {showClearConfirm && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Remove all <strong>{enrolledCourses.length} enrolled courses</strong> from <strong>{currentReviewSemester?.name}</strong>?
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (currentReviewSemester && onClearSemesterCourses) {
                      onClearSemesterCourses(currentReviewSemester.id);
                    }
                    setShowClearConfirm(false);
                  }}
                  className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs cursor-pointer transition"
                >
                  Yes, Clear Term
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1 rounded-md bg-white dark:bg-[#1a1a1a] text-[#888888] border border-[#ebebeb] dark:border-[#262626] font-medium text-xs cursor-pointer transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Expandable Enrolled Courses Drawer for Active Semester */}
          {isDrawerExpanded && (
            <div className="pt-2.5 border-t border-[#ebebeb] dark:border-[#222222] space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#888888] uppercase tracking-wider">
                <span>Currently Enrolled in {currentReviewSemester?.name}</span>
                <span>{enrolledCourses.length} courses ({enrolledCredits} Cr)</span>
              </div>

              {enrolledCourses.length === 0 ? (
                <div className="p-2.5 rounded-lg bg-[#fafafa] dark:bg-[#121212] border border-dashed border-[#ebebeb] dark:border-[#262626] text-center text-xs text-[#888888]">
                  No courses enrolled in {currentReviewSemester?.name} yet.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                  {enrolledCourses.map((c, cIdx) => (
                    <span
                      key={`${c.code}-${cIdx}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#fafafa] dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] text-xs font-mono"
                    >
                      <span className="font-semibold text-[#171717] dark:text-[#ededed]">{c.code}</span>
                      {onRemoveCourseFromSemester && (
                        <button
                          type="button"
                          onClick={() => {
                            if (currentReviewSemester) {
                              onRemoveCourseFromSemester(currentReviewSemester.id, c.code);
                            }
                          }}
                          className="text-[#888888] hover:text-rose-500 transition cursor-pointer"
                          title={`Remove ${c.code}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* Special Residential Semester (RS) Quick Course Banner when Active Tab is RS */}
          {currentReviewSemester?.isRS && (
            <div className="p-3.5 rounded-xl bg-indigo-500/[0.05] dark:bg-indigo-500/[0.08] border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-mono font-semibold">
                    RESIDENTIAL SEMESTER (RS)
                  </span>
                  <span className="text-xs font-semibold text-[#171717] dark:text-[#ededed]">
                    Mandatory Savar Campus Bundle + 4th Course Choice
                  </span>
                </div>
                <p className="text-[11px] text-[#666666] dark:text-[#888888] mt-1">
                  RS includes <strong>EMB101</strong>, <strong>HUM103</strong>, and <strong>BNG103</strong>, plus your choice of <strong>ENG102</strong> or <strong>BU201</strong>.
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                {["EMB101", "HUM103", "BNG103", "ENG102", "BU201"].map(rsCode => {
                  const alreadyInRS = enrolledCourses.some(c => c.code === rsCode) ||
                    queuedItems.some(item => item.courseCode === rsCode && item.targetSemId === currentReviewSemester.id);
                  return (
                    <button
                      key={rsCode}
                      type="button"
                      onClick={() => toggleSelectCourse(rsCode)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border transition cursor-pointer flex items-center gap-1 ${
                        alreadyInRS
                          ? "bg-[#0070f3] border-[#0070f3] text-white"
                          : "bg-white dark:bg-[#181818] border-[#e5e5e5] dark:border-[#2a2a2a] text-[#171717] dark:text-[#ededed] hover:border-[#0070f3]"
                      }`}
                    >
                      {alreadyInRS ? <Check className="w-3 h-3 stroke-[3]" /> : <Plus className="w-3 h-3" />}
                      <span>{rsCode}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Multi-Semester Queued Staging Strip */}
          {queuedItems.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#242424] space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#171717] dark:text-[#ededed]">
                  Queued Course Assignments ({queuedItems.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setQueuedItems([]);
                    setRepeatPrompt(null);
                  }}
                  className="text-[#888888] hover:text-rose-500 text-[11px] font-mono underline cursor-pointer"
                >
                  Clear queue
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                {queuedItems.map(item => {
                  const courseInfo = COURSES.find(c => c.code === item.courseCode);
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg bg-white dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-between gap-2 shadow-vercel-subtle"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono font-semibold text-xs text-[#171717] dark:text-[#ededed]">{item.courseCode}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#f5f5f5] dark:bg-[#222222] text-[#888888] font-mono shrink-0">
                          {courseInfo?.credits ?? 3} Cr
                        </span>
                        {item.resolution === 'repeat' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono font-semibold">
                            RETAKE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <select
                          value={item.targetSemId}
                          onChange={e => {
                            const newSemId = e.target.value;
                            setQueuedItems(prev => prev.map(q => q.id === item.id ? { ...q, id: `${q.courseCode}::${newSemId}`, targetSemId: newSemId } : q));
                          }}
                          className="bg-[#fafafa] dark:bg-[#111111] border border-[#e5e5e5] dark:border-[#2a2a2a] rounded-md px-2 py-0.5 text-[11px] text-[#0070f3] font-mono font-semibold focus:outline-none cursor-pointer"
                        >
                          {semesters.map((sem, idx) => (
                            <option key={sem.id} value={sem.id} className="bg-white dark:bg-[#141414] text-[#171717] dark:text-[#ededed]">
                              &rarr; {getShortSemLabel(sem, idx)} ({sem.name})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setQueuedItems(prev => prev.filter(q => q.id !== item.id))}
                          className="p-1 text-[#888888] hover:text-rose-500 rounded transition-colors cursor-pointer"
                          title="Remove from queue"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Course Catalog Browser */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Instant Search Input */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder={`Search courses to add to ${currentReviewSemester?.name || 'semester'} (e.g. CSE220, MAT120, PHY112)...`}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 bg-[#fafafa] dark:bg-[#141414] border border-[#e5e5e5] dark:border-[#262626] rounded-lg text-xs text-[#171717] dark:text-[#ededed] placeholder-[#888888] focus:outline-none focus:border-[#0070f3] transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar p-1 bg-[#f5f5f5] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#242424] rounded-lg shrink-0">
                {["ALL", "CSE", "MAT", "PHY", "ENG", "RS", "GED"].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setCategoryFilter(tag)}
                    className={`px-2.5 py-1 rounded-md font-mono font-medium text-[11px] transition-all cursor-pointer ${
                      categoryFilter === tag
                        ? "bg-white dark:bg-[#242424] text-[#171717] dark:text-[#ededed] font-semibold shadow-vercel-subtle"
                        : "text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Course Catalog Grid or Empty-Search Manual Course Builder */}
            {filteredCourses.length === 0 ? (
              <div className="p-5 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-dashed border-[#d4d4d8] dark:border-[#2a2a2a] space-y-4">
                {!showCustomForm ? (
                  <div className="text-center space-y-3 py-2">
                    <div className="mx-auto h-9 w-9 rounded-lg bg-white dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#888888]">
                      <Search className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm font-semibold text-[#171717] dark:text-[#ededed]">
                        Couldn&apos;t find what you are looking for?
                      </p>
                      <p className="text-xs text-[#666666] dark:text-[#888888]">
                        No courses matched {searchQuery ? <strong className="font-mono text-[#171717] dark:text-[#ededed]">&quot;{searchQuery}&quot;</strong> : "your filter"}. Would you like to add it manually?
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenCustomForm}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white text-white dark:text-[#0a0a0a] text-xs font-semibold shadow-vercel-subtle transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Course Manually</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCreateAndQueueCustomCourse} className="space-y-3.5">
                    <div className="flex items-center justify-between border-b border-[#ebebeb] dark:border-[#222222] pb-2.5">
                      <div>
                        <h4 className="text-xs font-semibold text-[#171717] dark:text-[#ededed]">
                          Add Manual Course
                        </h4>
                        <p className="text-[11px] text-[#666666] dark:text-[#888888]">
                          Enter the course code, credits, and category to add it to {currentReviewSemester?.name || "this semester"}.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCustomForm(false)}
                        className="text-xs text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-[#888888]">
                          Course Code *
                        </label>
                        <input
                          type="text"
                          required
                          value={customCode}
                          onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                          placeholder="e.g. BUS101 or CSE499"
                          className="w-full h-9 px-3 rounded-lg bg-white dark:bg-[#161616] border border-[#e5e5e5] dark:border-[#2a2a2a] text-xs font-mono text-[#171717] dark:text-[#ededed] focus:outline-none focus:border-[#0070f3]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-[#888888]">
                          Course Title (Optional)
                        </label>
                        <input
                          type="text"
                          value={customTitle}
                          onChange={(e) => setCustomTitle(e.target.value)}
                          placeholder="e.g. Special Topics"
                          className="w-full h-9 px-3 rounded-lg bg-white dark:bg-[#161616] border border-[#e5e5e5] dark:border-[#2a2a2a] text-xs text-[#171717] dark:text-[#ededed] focus:outline-none focus:border-[#0070f3]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-[#888888]">
                          Credits
                        </label>
                        <div className="flex items-center gap-1.5">
                          {[0, 1, 2, 3, 4].map((cr) => (
                            <button
                              key={cr}
                              type="button"
                              onClick={() => setCustomCredits(cr)}
                              className={`flex-1 h-9 rounded-lg font-mono text-xs font-semibold border transition cursor-pointer ${
                                (customCategory === "Non-Credit" ? 0 : customCredits) === cr
                                  ? "bg-[#0070f3] border-[#0070f3] text-white"
                                  : "bg-white dark:bg-[#161616] border-[#e5e5e5] dark:border-[#2a2a2a] text-[#666666] dark:text-[#a1a1a1] hover:border-[#888888]"
                              }`}
                            >
                              {cr}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-[#888888]">
                          Course Type / Category
                        </label>
                        <select
                          value={customCategory}
                          onChange={(e) => {
                            const nextCat = e.target.value;
                            setCustomCategory(nextCat);
                            if (nextCat === "Non-Credit") setCustomCredits(0);
                            else if (customCredits === 0) setCustomCredits(3);
                          }}
                          className="w-full h-9 px-3 rounded-lg bg-white dark:bg-[#161616] border border-[#e5e5e5] dark:border-[#2a2a2a] text-xs text-[#171717] dark:text-[#ededed] focus:outline-none focus:border-[#0070f3]"
                        >
                          <option value="CSE Program Core">CSE Program Core</option>
                          <option value="School Core (Math & Sciences)">School Core (Math &amp; Sciences)</option>
                          <option value="CSE Major Elective">CSE Major Elective</option>
                          <option value="GenEd Stream 1">GenEd Stream 1 (Writing)</option>
                          <option value="GenEd Stream 2">GenEd Stream 2 (Math &amp; Sciences)</option>
                          <option value="GenEd Stream 3">GenEd Stream 3 (Arts &amp; Humanities)</option>
                          <option value="GenEd Stream 4">GenEd Stream 4 (Social Sciences)</option>
                          <option value="GenEd Stream 5">GenEd Stream 5 (CST)</option>
                          <option value="Non-Credit">Non-Credit / Remedial</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowCustomForm(false)}
                        className="h-8 px-3 rounded-lg text-xs font-medium border border-[#e5e5e5] dark:border-[#2a2a2a] bg-white dark:bg-[#161616] text-[#666666] dark:text-[#a1a1a1] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!customCode.trim()}
                        className="h-8 px-4 rounded-lg bg-[#0070f3] hover:bg-[#0060df] text-white text-xs font-semibold transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add &amp; Queue Course</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {filteredCourses.map(course => {
                const queuedForThisCourse = queuedItems.filter(q => q.courseCode === course.code);
                const isSelected = queuedForThisCourse.length > 0;
                const isAssignedToActive = queuedForThisCourse.some(q => q.targetSemId === currentReviewSemester?.id);

                const existingSems = findExistingSemestersForCourse(course.code);
                const existingSem = existingSems[0];
                const existingSemIndex = existingSem ? semesters.findIndex(s => s.id === existingSem.id) : -1;

                return (
                  <div
                    key={course.code}
                    onClick={() => toggleSelectCourse(course.code)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      isAssignedToActive
                        ? "bg-[#0070f3]/10 border-[#0070f3]/45 text-[#171717] dark:text-[#ededed] shadow-vercel-subtle"
                        : isSelected
                        ? "bg-emerald-500/[0.07] border-emerald-500/35 text-[#171717] dark:text-[#ededed]"
                        : existingSem
                        ? "bg-[#fafafa]/60 dark:bg-[#111111]/60 border-[#ebebeb] dark:border-[#222222] opacity-85 hover:opacity-100"
                        : "bg-[#fafafa] dark:bg-[#111111] border-[#ebebeb] dark:border-[#242424] hover:border-[#171717]/40 dark:hover:border-[#ededed]/40"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-semibold text-xs text-[#171717] dark:text-[#ededed]">
                          {course.code}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white dark:bg-[#1a1a1a] text-[#888888] border border-[#ebebeb] dark:border-[#262626] font-mono">
                          {course.credits} Cr
                        </span>
                        {queuedForThisCourse.map(q => {
                          const sIdx = semesters.findIndex(s => s.id === q.targetSemId);
                          const sObj = sIdx >= 0 ? semesters[sIdx] : undefined;
                          const isThisActive = q.targetSemId === currentReviewSemester?.id;
                          return (
                            <span
                              key={q.id}
                              className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                                isThisActive
                                  ? "bg-[#0070f3] text-white"
                                  : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30"
                              }`}
                            >
                              &rarr; {getShortSemLabel(sObj, sIdx)}{q.resolution === 'repeat' ? ' (Retake)' : ''}
                            </span>
                          );
                        })}
                        {!isSelected && existingSem && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                            In {getShortSemLabel(existingSem, existingSemIndex)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#666666] dark:text-[#888888] truncate mt-0.5">
                        {course.title}
                      </p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isAssignedToActive
                          ? "bg-[#0070f3] border-[#0070f3] text-white"
                          : isSelected
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-[#e5e5e5] dark:border-[#2a2a2a] bg-white dark:bg-[#161616]"
                      }`}
                    >
                      {isAssignedToActive ? <Check className="w-3 h-3 stroke-[3]" /> : <Plus className="w-3 h-3 text-[#888888]" />}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-5 py-3.5 border-t border-[#ebebeb] dark:border-[#222222] bg-[#fafafa] dark:bg-[#111111] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="text-xs text-[#666666] dark:text-[#888888] flex items-center gap-2 flex-wrap">
            {queuedItems.length === 0 ? (
              <span>Click any course above to queue it into <strong className="text-[#171717] dark:text-[#ededed]">{currentReviewSemester?.name}</strong></span>
            ) : (
              <>
                <span>Ready to commit:</span>
                {Object.entries(queuedBySemester).map(([semId, codes]) => {
                  const semIdx = semesters.findIndex(s => s.id === semId);
                  const semObj = semIdx >= 0 ? semesters[semIdx] : undefined;
                  return (
                    <span
                      key={semId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#2a2a2a] text-[11px] font-mono text-[#171717] dark:text-[#ededed]"
                    >
                      <strong className="text-[#0070f3]">{getShortSemLabel(semObj, semIdx)}:</strong>
                      <span>{codes.length}</span>
                    </span>
                  );
                })}
              </>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3.5 rounded-lg text-xs font-medium border border-[#e5e5e5] dark:border-[#2a2a2a] bg-white dark:bg-[#161616] text-[#666666] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-[#ededed] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={queuedItems.length === 0}
              onClick={handleCommit}
              className="h-9 px-5 rounded-lg bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white text-white dark:text-[#0a0a0a] font-medium text-xs shadow-vercel-subtle active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Commit {queuedItems.length > 0 ? `${queuedItems.length} Course${queuedItems.length !== 1 ? 's' : ''}` : 'Courses'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
