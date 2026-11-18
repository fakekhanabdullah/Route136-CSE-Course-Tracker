"use client";

import React, { useState, useMemo } from "react";
import { X, Search, Plus, Trash2, BookOpen, Check, Layers } from "lucide-react";
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

interface AddSemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  semester: Semester | null;
  onAddCourseToSemester: (semId: string, courseCode: string) => void;
  onRemoveCourseFromSemester: (semId: string, courseCode: string) => void;
  allSemesters?: Semester[];
}

export default function AddSemesterModal({
  isOpen,
  onClose,
  semester,
  onAddCourseToSemester,
  onRemoveCourseFromSemester,
  allSemesters = [],
}: AddSemesterModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");

  // Filter available courses
  const filteredCourses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return COURSES.filter(course => {
      const matchesSearch =
        course.code.toLowerCase().includes(q) ||
        course.title.toLowerCase().includes(q) ||
        (course.category && course.category.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (selectedFilter === "CSE") return course.code.startsWith("CSE");
      if (selectedFilter === "MAT") return course.code.startsWith("MAT");
      if (selectedFilter === "ENG") return course.code.startsWith("ENG");
      if (selectedFilter === "RS") return ["EMB101", "HUM103", "BNG103"].includes(course.code);
      if (selectedFilter === "GED") return course.category?.includes("GenEd");

      return true;
    }).slice(0, 40);
  }, [searchQuery, selectedFilter]);

  if (!isOpen || !semester) return null;

  // Calculate current credits in this semester
  const currentCredits = semester.courses.reduce((sum, c) => {
    const found = COURSES.find(item => item.code === c.code);
    return sum + (found?.credits || 3);
  }, 0);

  // Set of courses currently in this semester
  const semesterCourseCodes = new Set(semester.courses.map(c => c.code));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#262626] rounded-2xl shadow-vercel-modal overflow-hidden transition-all text-[#171717] dark:text-[#ededed]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#ebebeb] dark:border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#0070f3]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight text-[#171717] dark:text-white">{semester.name}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#f5f5f5] dark:bg-[#141414] text-[#888888] border border-[#ebebeb] dark:border-[#262626]">
                  {semester.courses.length} courses • {currentCredits} cr
                </span>
              </div>
              <p className="text-[11px] text-[#888888] mt-0.5">
                {semester.term ? `${semester.term} ${semester.year || ''}` : "Newly Added Semester"} — Add courses below
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#888888] hover:text-[#171717] dark:hover:text-white bg-[#fafafa] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          
          {/* Currently Added Courses in this Semester */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#888888] mb-2 flex items-center justify-between">
              <span>Courses in this semester ({semester.courses.length})</span>
              <span className="text-[10px] text-[#888888] font-normal">Recommended: 15-18 credits</span>
            </div>
            
            {semester.courses.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#111111] text-center">
                <BookOpen className="w-5 h-5 mx-auto text-[#888888] mb-1" />
                <p className="text-xs text-[#171717] dark:text-[#ededed] font-medium">No courses added yet</p>
                <p className="text-[11px] text-[#888888]">Search and click &ldquo;+ Add&rdquo; below to enroll courses</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {semester.courses.map(c => {
                  const courseInfo = COURSES.find(item => item.code === c.code);
                  return (
                    <div
                      key={c.code}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] transition-all shadow-vercel-subtle"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-[#171717] dark:text-white font-mono">{c.code}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white dark:bg-[#1a1a1a] text-[#888888] border border-[#ebebeb] dark:border-[#262626]">
                            {courseInfo?.credits || 3}cr
                          </span>
                          {c.isRepeat && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Retake
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#888888] truncate mt-0.5">
                          {courseInfo?.title || c.code}
                        </p>
                      </div>
                      <button
                        onClick={() => onRemoveCourseFromSemester(semester.id, c.code)}
                        className="p-1 text-[#888888] hover:text-[#ee0000] hover:bg-red-500/10 rounded-md transition-colors flex-shrink-0"
                        title="Remove Course"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search & Filter Header */}
          <div className="pt-2 border-t border-[#ebebeb] dark:border-[#262626]">
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search courses (e.g. CSE220, Data Structures)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-2 bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] rounded-full text-xs text-[#171717] dark:text-white placeholder-[#888888] focus:outline-none focus:border-[#171717] dark:focus:border-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#171717] dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter tags */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {["ALL", "CSE", "MAT", "ENG", "RS", "GED"].map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedFilter(tag)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedFilter === tag
                      ? "bg-[#171717] dark:bg-[#ededed] text-white dark:text-black shadow-vercel-subtle"
                      : "bg-[#f5f5f5] dark:bg-[#141414] text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] border border-[#ebebeb] dark:border-[#262626]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Search Results List */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {filteredCourses.length === 0 ? (
              <p className="text-center py-6 text-xs text-[#888888]">No matching courses found</p>
            ) : (
              filteredCourses.map(course => {
                const isAdded = semesterCourseCodes.has(course.code);
                const alreadyInOtherSem = allSemesters.find(
                  s => s.id !== semester.id && s.courses.some(c => c.code === course.code)
                );

                return (
                  <div
                    key={course.code}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                      isAdded
                        ? "bg-[#f5f5f5] dark:bg-[#141414] border-[#171717] dark:border-white"
                        : "bg-[#fafafa] dark:bg-[#111111] hover:bg-white dark:hover:bg-[#161616] border-[#ebebeb] dark:border-[#262626]"
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#171717] dark:text-white font-mono">{course.code}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-[#1a1a1a] text-[#888888] border border-[#ebebeb] dark:border-[#262626]">
                          {course.credits} cr
                        </span>
                        {course.category && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-[#1a1a1a] text-[#888888] border border-[#ebebeb] dark:border-[#262626]">
                            {course.category}
                          </span>
                        )}
                        {alreadyInOtherSem && !isAdded && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            In {alreadyInOtherSem.name}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#888888] truncate mt-0.5">{course.title}</p>
                    </div>

                    <button
                      onClick={() => {
                        if (isAdded) {
                          onRemoveCourseFromSemester(semester.id, course.code);
                        } else {
                          onAddCourseToSemester(semester.id, course.code);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-all shadow-vercel-subtle flex-shrink-0 cursor-pointer ${
                        isAdded
                          ? "bg-red-500/10 text-[#ee0000] border border-red-500/20 hover:bg-red-500/20"
                          : "bg-[#171717] dark:bg-[#ededed] text-white dark:text-black hover:bg-black/90 dark:hover:bg-white active:scale-95"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3 h-3" /> Added
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" /> Add
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#111111] flex items-center justify-between">
          <div className="text-xs text-[#888888]">
            Total: <span className="font-semibold text-[#171717] dark:text-[#ededed] font-mono">{semester.courses.length}</span> courses (
            <span className="font-semibold text-[#171717] dark:text-[#ededed] font-mono">{currentCredits}</span> cr)
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#171717] dark:bg-[#ededed] text-white dark:text-black hover:bg-black/90 dark:hover:bg-white font-medium text-xs shadow-vercel-subtle active:scale-95 transition-all cursor-pointer"
          >
            Done &amp; Save
          </button>
        </div>
      </div>
    </div>
  );
}
