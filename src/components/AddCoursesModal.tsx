"use client";

import React, { useState, useMemo, useEffect } from "react";
import { X, Search, Check, Layers, AlertTriangle, BookOpen, Trash2, ChevronDown, ChevronUp } from "lucide-react";
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

interface AddCoursesModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesters: Semester[];
  initialSelectedCodes?: string[];
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
  onCommitAddCourses,
  onRemoveCourseFromSemester,
  onClearSemesterCourses,
}: AddCoursesModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  
  // Selected course codes
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  
  // Mapping of courseCode -> chosen semesterId
  const [targetSemesters, setTargetSemesters] = useState<Record<string, string>>({});
  
  // Mapping of courseCode -> duplicate resolution ('move' | 'repeat')
  const [duplicateResolutions, setDuplicateResolutions] = useState<Record<string, 'move' | 'repeat'>>({});

  // Active semester for capacity review & drawer
  const [activeSemId, setActiveSemId] = useState<string>("");
  const [isDrawerExpanded, setIsDrawerExpanded] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Helper to determine the best default semester to assign to
  const getDefaultSemesterId = () => {
    if (!semesters || semesters.length === 0) return "";
    const openSem = semesters.find(s => s.courses.length < 5);
    return openSem?.id || semesters[0]?.id || "";
  };

  useEffect(() => {
    if (isOpen) {
      const defaultSem = getDefaultSemesterId();
      setActiveSemId(defaultSem);
      setIsDrawerExpanded(false);
      setShowClearConfirm(false);

      if (initialSelectedCodes && initialSelectedCodes.length > 0) {
        setSelectedCodes(initialSelectedCodes);
        const initialTargets: Record<string, string> = {};
        initialSelectedCodes.forEach(code => {
          initialTargets[code] = defaultSem;
        });
        setTargetSemesters(initialTargets);
      }
    } else {
      setSelectedCodes([]);
      setTargetSemesters({});
      setDuplicateResolutions({});
      setSearchQuery("");
      setCategoryFilter("ALL");
      setShowClearConfirm(false);
    }
  }, [isOpen, initialSelectedCodes, semesters]);

  // Active target semester object
  const currentReviewSemester = useMemo(() => {
    return semesters.find(s => s.id === activeSemId) || semesters[0];
  }, [semesters, activeSemId]);

  // Current courses enrolled in the active review semester
  const enrolledCourses = currentReviewSemester?.courses || [];

  const enrolledCredits = useMemo(() => {
    return enrolledCourses.reduce((sum, c) => {
      const co = COURSES.find(item => item.code === c.code);
      return sum + (co?.credits || 3);
    }, 0);
  }, [enrolledCourses]);

  // Courses selected in modal that are assigned to this semester
  const pendingAssignedToActive = useMemo(() => {
    return selectedCodes.filter(code => (targetSemesters[code] || getDefaultSemesterId()) === currentReviewSemester?.id);
  }, [selectedCodes, targetSemesters, currentReviewSemester]);

  const pendingCreditsForActive = useMemo(() => {
    return pendingAssignedToActive.reduce((sum, code) => {
      const co = COURSES.find(item => item.code === code);
      return sum + (co?.credits || 3);
    }, 0);
  }, [pendingAssignedToActive]);

  const projectedCredits = enrolledCredits + pendingCreditsForActive;
  const isOverloaded = projectedCredits > 18;

  const handleAssignAllToActive = () => {
    if (!currentReviewSemester) return;
    setTargetSemesters(prev => {
      const next = { ...prev };
      selectedCodes.forEach(code => {
        next[code] = currentReviewSemester.id;
      });
      return next;
    });
  };

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
      if (categoryFilter === "MAT") return course.code.startsWith("MAT");
      if (categoryFilter === "ENG") return course.code.startsWith("ENG");
      if (categoryFilter === "RS") return ["EMB101", "HUM103", "BNG103"].includes(course.code);
      if (categoryFilter === "GED") return course.category?.includes("GenEd");

      return true;
    }).slice(0, 50);
  }, [searchQuery, categoryFilter]);

  if (!isOpen) return null;

  const toggleSelectCourse = (code: string) => {
    if (selectedCodes.includes(code)) {
      setSelectedCodes(prev => prev.filter(c => c !== code));
      setTargetSemesters(prev => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
      setDuplicateResolutions(prev => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
    } else {
      setSelectedCodes(prev => [...prev, code]);
      const defaultSem = getDefaultSemesterId();
      setTargetSemesters(prev => ({ ...prev, [code]: defaultSem }));
    }
  };

  // Find if a course is already in another semester
  const findExistingSemesterForCourse = (courseCode: string) => {
    return semesters.find(sem => sem.courses.some(c => c.code === courseCode));
  };

  const handleCommit = () => {
    const assignments = selectedCodes.map(code => {
      const targetSemId = targetSemesters[code] || semesters[0]?.id;
      const existingSem = findExistingSemesterForCourse(code);
      const isDuplicate = existingSem && existingSem.id !== targetSemId;
      const resolution = isDuplicate ? duplicateResolutions[code] || 'repeat' : undefined;

      return {
        courseCode: code,
        targetSemId,
        resolution,
        originalSemId: isDuplicate ? existingSem?.id : undefined,
      };
    });

    onCommitAddCourses(assignments);
    // Reset state & close
    setSelectedCodes([]);
    setTargetSemesters({});
    setDuplicateResolutions({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#262626] rounded-2xl shadow-vercel-modal overflow-hidden text-[#171717] dark:text-[#ededed]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#0c0c0c] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#0070f3] shadow-vercel-subtle">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#171717] dark:text-[#ededed] tracking-tight flex items-center gap-2">
                Add &amp; Assign Courses
                {selectedCodes.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium bg-blue-500/10 text-[#0070f3] border border-blue-500/20">
                    {selectedCodes.length} selected
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#888888] mt-0.5">
                Select courses and assign them to your target semester
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          
          {/* Top Panel: Interactive Semester Review Drawer & Overload Safeguard */}
          <div className="bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] rounded-xl p-3.5 sm:p-4 space-y-3 shadow-vercel-subtle relative overflow-hidden">
            {/* Header row: Semester Selector + Credit Load Badges + Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0070f3] shrink-0" />
                  <span className="text-xs font-medium uppercase tracking-wider text-[#888888]">
                    Reviewing Semester:
                  </span>
                </div>
                <select
                  value={currentReviewSemester?.id || ""}
                  onChange={e => {
                    setActiveSemId(e.target.value);
                    setShowClearConfirm(false);
                  }}
                  className="bg-white dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] text-[#171717] dark:text-[#ededed] font-medium text-xs rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer shadow-vercel-subtle"
                >
                  {semesters.map(s => (
                    <option key={s.id} value={s.id} className="bg-white dark:bg-[#161616] text-[#171717] dark:text-[#ededed]">
                      {s.name} {s.term ? `(${s.term} ${s.year || ''})` : ''} — {s.courses.length} enrolled
                    </option>
                  ))}
                </select>
              </div>

              {/* Capacity Meter & Credit Load Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 border ${
                  isOverloaded
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    : projectedCredits > 15
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    : "bg-[#f5f5f5] dark:bg-[#161616] text-[#171717] dark:text-[#ededed] border-[#ebebeb] dark:border-[#262626]"
                }`}>
                  <span>{enrolledCredits}cr</span>
                  {pendingCreditsForActive > 0 && (
                    <span className="text-[#0070f3] font-semibold">+{pendingCreditsForActive}cr new</span>
                  )}
                  <span className="text-[#888888] font-normal">/ 18cr max</span>
                </div>

                {/* Drawer Toggle */}
                <button
                  type="button"
                  onClick={() => setIsDrawerExpanded(prev => !prev)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-[#161616] hover:bg-[#f0f0f0] dark:hover:bg-[#202020] text-[#171717] dark:text-[#ededed] border border-[#ebebeb] dark:border-[#262626] transition flex items-center gap-1 cursor-pointer shadow-vercel-subtle"
                >
                  <span>Enrolled ({enrolledCourses.length})</span>
                  {isDrawerExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {/* Clear Semester Button */}
                {enrolledCourses.length > 0 && onClearSemesterCourses && (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-[#ee0000] border border-rose-500/20 transition flex items-center gap-1 cursor-pointer shadow-vercel-subtle"
                    title="Clear all courses from this semester"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Term</span>
                  </button>
                )}
              </div>
            </div>

            {/* Overload Alert Warning if > 18 credits */}
            {isOverloaded && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Overload Warning:</strong> Adding these courses pushes <strong>{currentReviewSemester?.name}</strong> to <strong>{projectedCredits} credits</strong> ({enrolledCourses.length + pendingAssignedToActive.length} courses), exceeding the standard 18-credit limit.
                </span>
              </div>
            )}

            {/* Clear Confirmation Prompt */}
            {showClearConfirm && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Remove all <strong>{enrolledCourses.length} courses</strong> from <strong>{currentReviewSemester?.name}</strong>?
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
                    className="px-3 py-1 rounded-md bg-[#ee0000] hover:bg-rose-700 text-white font-medium text-xs shadow-vercel-subtle cursor-pointer transition"
                  >
                    Yes, Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3 py-1 rounded-md bg-white dark:bg-[#1a1a1a] hover:bg-[#f5f5f5] dark:hover:bg-[#222] text-[#888888] border border-[#ebebeb] dark:border-[#262626] font-medium text-xs cursor-pointer transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Expandable Enrolled Courses Drawer */}
            {isDrawerExpanded && (
              <div className="pt-2.5 border-t border-[#ebebeb] dark:border-[#262626] space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[11px] font-medium text-[#888888] uppercase tracking-wider">
                  <span>Enrolled Courses in {currentReviewSemester?.name}</span>
                  <span className="font-mono">{enrolledCourses.length} total</span>
                </div>

                {enrolledCourses.length === 0 ? (
                  <div className="p-3 rounded-lg bg-white dark:bg-[#161616] border border-dashed border-[#ebebeb] dark:border-[#262626] text-center text-xs text-[#888888]">
                    This semester is currently empty. Use the catalog below to add courses!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {enrolledCourses.map((c, cIdx) => {
                      const courseInfo = COURSES.find(item => item.code === c.code);
                      return (
                        <div
                          key={`${c.code}-${cIdx}`}
                          className="p-2.5 rounded-lg bg-white dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-between gap-2 shadow-vercel-subtle"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-semibold text-xs text-[#171717] dark:text-[#ededed]">{c.code}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#f5f5f5] dark:bg-[#202020] text-[#888888] font-mono">
                                {courseInfo?.credits || 3}cr
                              </span>
                              {c.grade && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-blue-500/10 text-[#0070f3] border border-blue-500/20">
                                  {c.grade}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#888888] truncate mt-0.5">
                              {courseInfo?.title || c.code}
                            </p>
                          </div>

                          {onRemoveCourseFromSemester && (
                            <button
                              type="button"
                              onClick={() => {
                                if (currentReviewSemester) {
                                  onRemoveCourseFromSemester(currentReviewSemester.id, c.code);
                                }
                              }}
                              className="p-1.5 text-[#888888] hover:text-[#ee0000] rounded-md hover:bg-rose-500/10 transition cursor-pointer"
                              title={`Remove ${c.code} from ${currentReviewSemester?.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 1: Selected Courses & Target Semesters Dropdown */}
          {selectedCodes.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] space-y-3 shadow-vercel-subtle">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#171717] dark:text-[#ededed] flex-wrap gap-2">
                <span>Selected Courses &amp; Target Semesters ({selectedCodes.length})</span>
                <div className="flex items-center gap-2">
                  {currentReviewSemester && (
                    <button
                      type="button"
                      onClick={handleAssignAllToActive}
                      className="text-[11px] font-medium text-[#0070f3] hover:underline px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 transition cursor-pointer"
                      title={`Assign all selected to ${currentReviewSemester.name}`}
                    >
                      Assign all to {currentReviewSemester.name}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCodes([]);
                      setTargetSemesters({});
                      setDuplicateResolutions({});
                    }}
                    className="text-[#888888] hover:text-[#ee0000] text-[11px] underline cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {selectedCodes.map(code => {
                  const courseInfo = COURSES.find(c => c.code === code);
                  const chosenSemId = targetSemesters[code] || semesters[0]?.id;
                  const existingSem = findExistingSemesterForCourse(code);
                  const isAlreadyInSem = existingSem && existingSem.id !== chosenSemId;
                  const resolution = duplicateResolutions[code] || 'repeat';

                  return (
                    <div
                      key={code}
                      className="p-3 rounded-lg bg-white dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] space-y-2 shadow-vercel-subtle"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[#171717] dark:text-[#ededed] font-mono">{code}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f5f5f5] dark:bg-[#202020] text-[#888888] font-mono">
                            {courseInfo?.credits || 3}cr
                          </span>
                          <span className="text-xs text-[#888888] truncate max-w-[200px]">
                            {courseInfo?.title}
                          </span>
                        </div>

                        {/* Semester Select Dropdown */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-[#888888] whitespace-nowrap">Semester:</label>
                          <select
                            value={chosenSemId}
                            onChange={e => {
                              const newSemId = e.target.value;
                              setTargetSemesters(prev => ({ ...prev, [code]: newSemId }));
                            }}
                            className="bg-[#fafafa] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] rounded-md px-2 py-1 text-xs text-[#171717] dark:text-[#ededed] font-medium focus:outline-none"
                          >
                            {semesters.map(sem => (
                              <option key={sem.id} value={sem.id} className="bg-white dark:bg-[#141414] text-[#171717] dark:text-[#ededed]">
                                {sem.name} {sem.term ? `(${sem.term} ${sem.year || ''})` : ''}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => toggleSelectCourse(code)}
                            className="p-1 text-[#888888] hover:text-[#ee0000] rounded-md transition-colors cursor-pointer"
                            title="Remove from selection"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Duplicate prompt if already in another semester */}
                      {isAlreadyInSem && (
                        <div className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>
                              <strong>{code}</strong> is currently in <strong>{existingSem.name}</strong>.
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setDuplicateResolutions(prev => ({ ...prev, [code]: 'move' }))
                              }
                              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                                resolution === 'move'
                                  ? 'bg-[#171717] dark:bg-[#ededed] text-white dark:text-black font-semibold'
                                  : 'bg-white dark:bg-[#141414] text-[#888888] border border-[#ebebeb] dark:border-[#262626]'
                              }`}
                            >
                              Move Course
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDuplicateResolutions(prev => ({ ...prev, [code]: 'repeat' }))
                              }
                              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                                resolution === 'repeat'
                                  ? 'bg-[#0070f3] text-white font-semibold'
                                  : 'bg-white dark:bg-[#141414] text-[#888888] border border-[#ebebeb] dark:border-[#262626]'
                              }`}
                            >
                              Keep Both (Retake)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Search & Filter Course Catalog */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#171717] dark:text-[#ededed] mb-2">
              Browse Course Catalog
            </div>

            <div className="relative mb-2.5">
              <Search className="w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by code or title (e.g. CSE320, Statistics, PHY112)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-[#fafafa] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] rounded-lg text-xs text-[#171717] dark:text-[#ededed] placeholder-[#888888] focus:outline-none focus:border-[#0070f3] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter tags */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs mb-3">
              {["ALL", "CSE", "MAT", "ENG", "RS", "GED"].map(tag => (
                <button
                  key={tag}
                  onClick={() => setCategoryFilter(tag)}
                  className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all cursor-pointer ${
                    categoryFilter === tag
                      ? "bg-[#171717] dark:bg-[#ededed] text-white dark:text-black font-semibold shadow-vercel-subtle"
                      : "bg-[#fafafa] dark:bg-[#141414] text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] border border-[#ebebeb] dark:border-[#262626]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Course Catalog Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {filteredCourses.map(course => {
                const isSelected = selectedCodes.includes(course.code);
                const existingSem = findExistingSemesterForCourse(course.code);

                return (
                  <div
                    key={course.code}
                    onClick={() => toggleSelectCourse(course.code)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-blue-500/10 border-blue-500/30 text-[#171717] dark:text-[#ededed] shadow-vercel-subtle"
                        : "bg-[#fafafa] dark:bg-[#111111] border-[#ebebeb] dark:border-[#262626] hover:border-[#888888] dark:hover:border-[#555]"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#171717] dark:text-[#ededed] font-mono">{course.code}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-[#1a1a1a] text-[#888888] border border-[#ebebeb] dark:border-[#262626] font-mono">
                          {course.credits}cr
                        </span>
                        {existingSem && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                            {existingSem.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#888888] truncate mt-0.5">{course.title}</p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? "bg-[#0070f3] border-[#0070f3] text-white shadow-vercel-subtle"
                          : "border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#161616]"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#111111] flex items-center justify-between">
          <div className="text-xs text-[#888888]">
            {selectedCodes.length === 0 ? (
              <span>Select courses above to assign</span>
            ) : (
              <span>
                Ready to assign <strong className="text-[#171717] dark:text-[#ededed] font-mono">{selectedCodes.length}</strong> course{selectedCodes.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={selectedCodes.length === 0}
              onClick={handleCommit}
              className="px-5 py-1.5 rounded-lg bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white text-white dark:text-black font-medium text-xs shadow-vercel-subtle active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Add to Semesters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
