"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  BookOpen,
  Award,
  SlidersHorizontal,
  Table2,
  Check,
  Clock,
  Ban,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import { COURSES, loadCustomCoursesFromStorage } from "@/app/courses-data";
import {
  ALL_BRACU_DAYS,
  AttendanceStatus,
  AttendanceTrackConfig,
  AssessmentCategory,
  BRACU_GRADE_SCALE,
  CoursePerformanceRecord,
  CoursePerformanceStore,
  CountingRule,
  DayOfWeek,
  computeAttendanceStats,
  computeCourseProjection,
  createDefaultCourseRecord,
  createPresetCategories,
  getTodayISO,
  loadCoursePerformanceStore,
  saveCoursePerformanceStore,
  syncCourseGradeToMainTracker,
} from "@/lib/coursePerformance";

interface StoredCourse {
  code: string;
  grade: string;
  isCompleted: boolean;
}

interface StoredSemester {
  id: string;
  name: string;
  courses: StoredCourse[];
  isRS?: boolean;
}

const uid = () => Math.random().toString(36).slice(2, 9);

const formatDateDDMMYYYY = (iso?: string): string => {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const getWeekdayShort = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return WEEKDAY_NAMES[d.getDay()] || "";
};

const parseDDMMYYYYToISO = (val: string): string | null => {
  const m = val.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const iso = `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime()) || d.getUTCMonth() + 1 !== mm || d.getUTCDate() !== dd) return null;
  return iso;
};

function DateInputDDMMYYYY({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  className = "w-full h-8",
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState<string>(() => formatDateDDMMYYYY(value));
  const hiddenPickerRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setText(formatDateDDMMYYYY(value));
  }, [value]);

  const handleTextChange = (raw: string) => {
    setText(raw);
    if (!raw.trim()) {
      onChange("");
      return;
    }
    const iso = parseDDMMYYYYToISO(raw);
    if (iso) onChange(iso);
  };

  const handleBlur = () => {
    if (!text.trim()) {
      onChange("");
      return;
    }
    const iso = parseDDMMYYYYToISO(text);
    if (iso) {
      onChange(iso);
      setText(formatDateDDMMYYYY(iso));
    } else {
      setText(formatDateDDMMYYYY(value));
    }
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={handleBlur}
        className="w-full h-full pl-2.5 pr-8 rounded-lg bg-white dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#2a2a2a] text-xs font-mono text-[#171717] dark:text-[#ededed] focus:outline-none focus:border-[#0070f3]"
      />
      <button
        type="button"
        onClick={() => {
          const el = hiddenPickerRef.current;
          if (!el) return;
          if (typeof el.showPicker === "function") el.showPicker();
          else el.click();
        }}
        className="absolute right-2 text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] cursor-pointer"
        title="Pick date from calendar"
      >
        <Calendar className="h-3.5 w-3.5" />
      </button>
      <input
        ref={hiddenPickerRef}
        type="date"
        tabIndex={-1}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
    </div>
  );
}

const CATEGORY_QUICK_PRESETS = [
  "Quiz",
  "Lab Quiz",
  "Assignment",
  "Lab Report",
  "Lab Performance",
  "Midterm",
  "Lab Mid",
  "Final Project",
  "Lab Final",
  "Final Exam",
  "Presentation",
];

interface CoursePerformanceWorkspaceProps {
  embedded?: boolean;
  semestersProp?: StoredSemester[];
  currentSemesterNumber?: number;
  onGradeSynced?: (semesterId: string, courseCode: string, grade: string) => void;
  activeTabProp?: "marks" | "attendance";
  onTabChange?: (tab: "marks" | "attendance") => void;
}

export default function CoursePerformanceWorkspace({
  embedded = false,
  semestersProp,
  currentSemesterNumber,
  onGradeSynced,
  activeTabProp,
  onTabChange,
}: CoursePerformanceWorkspaceProps) {
  const [semesters, setSemesters] = useState<StoredSemester[]>(semestersProp || []);
  const [selectedSemId, setSelectedSemId] = useState<string>("");
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>("");
  const [store, setStore] = useState<CoursePerformanceStore>({});
  const [internalWorkspaceTab, setInternalWorkspaceTab] = useState<"marks" | "attendance">("marks");
  const activeWorkspaceTab = activeTabProp ?? internalWorkspaceTab;
  const setActiveWorkspaceTab = (next: "marks" | "attendance") => {
    setInternalWorkspaceTab(next);
    if (onTabChange) onTabChange(next);
  };
  const [activeAttendanceTrack, setActiveAttendanceTrack] = useState<"theory" | "lab">("theory");
  const [extraClassDate, setExtraClassDate] = useState<string>(getTodayISO());
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Sync semesters if passed from parent workspace
  useEffect(() => {
    if (!semestersProp) return;
    setSemesters(semestersProp);
    if (!selectedSemId && semestersProp.length > 0) {
      const curIdx = typeof currentSemesterNumber === "number" ? currentSemesterNumber - 1 : -1;
      const preferred =
        (curIdx >= 0 && semestersProp[curIdx]?.courses?.length > 0
          ? semestersProp[curIdx]
          : semestersProp.find((s) => s.courses?.length > 0)) || semestersProp[0];
      if (preferred) {
        setSelectedSemId(preferred.id);
        if (preferred.courses?.[0]?.code) setSelectedCourseCode(preferred.courses[0].code);
      }
    }
  }, [semestersProp, currentSemesterNumber]);

  // Hydrate theme, custom courses, main tracker semesters, and performance store
  useEffect(() => {
    if (!embedded) {
      try {
        const savedTheme = localStorage.getItem("flow136_theme") as "dark" | "light" | null;
        if (savedTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else if (savedTheme === "light") {
          document.documentElement.classList.remove("dark");
        }
      } catch {}
    }

    loadCustomCoursesFromStorage();

    if (!semestersProp) {
      try {
        const raw = localStorage.getItem("bracu_course_tracker_state");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.semesters)) {
            setSemesters(parsed.semesters);
            const curIdx =
              typeof parsed.onboardingData?.currentSemesterNumber === "number"
                ? parsed.onboardingData.currentSemesterNumber - 1
                : -1;
            const preferred =
              (curIdx >= 0 && parsed.semesters[curIdx]?.courses?.length > 0
                ? parsed.semesters[curIdx]
                : parsed.semesters.find((s: StoredSemester) => s.courses?.length > 0)) ||
              parsed.semesters[0];
            if (preferred) {
              setSelectedSemId(preferred.id);
              if (preferred.courses?.[0]?.code) {
                setSelectedCourseCode(preferred.courses[0].code);
              }
            }
          }
        }
      } catch {}
    }

    setStore(loadCoursePerformanceStore());
    setIsHydrated(true);
  }, []);

  const currentSemester = useMemo(
    () => semesters.find((s) => s.id === selectedSemId) || semesters[0],
    [semesters, selectedSemId]
  );

  const semesterCourses = currentSemester?.courses || [];

  // Ensure selectedCourseCode belongs to currentSemester
  useEffect(() => {
    if (!currentSemester) return;
    const exists = currentSemester.courses.some((c) => c.code === selectedCourseCode);
    if (!exists) {
      setSelectedCourseCode(currentSemester.courses[0]?.code || "");
    }
  }, [currentSemester, selectedCourseCode]);

  const getRecord = (semId: string, code: string): CoursePerformanceRecord => {
    const key = `${semId}::${code}`;
    if (store[key]) return store[key];
    // Hint lab for common BRACU CSE/PHY lab-bearing courses
    const hasLab = ["CSE110", "CSE111", "CSE220", "CSE221", "CSE250", "CSE251", "CSE260", "CSE321", "CSE341", "CSE350", "CSE360", "CSE370", "CSE420", "CSE421", "CSE422", "CSE423", "CSE460", "CSE461", "CSE470", "PHY111", "PHY112"].includes(code);
    return createDefaultCourseRecord(semId, code, hasLab);
  };

  const updateActiveRecord = (updater: (prev: CoursePerformanceRecord) => CoursePerformanceRecord) => {
    if (!currentSemester || !selectedCourseCode) return;
    const key = `${currentSemester.id}::${selectedCourseCode}`;
    setStore((prev) => {
      const base = prev[key] || getRecord(currentSemester.id, selectedCourseCode);
      const nextRecord = { ...updater(base), updatedAt: new Date().toISOString() };
      const nextStore = { ...prev, [key]: nextRecord };
      saveCoursePerformanceStore(nextStore);
      return nextStore;
    });
  };

  const activeRecord = useMemo(() => {
    if (!currentSemester || !selectedCourseCode) return null;
    return getRecord(currentSemester.id, selectedCourseCode);
  }, [store, currentSemester, selectedCourseCode]);

  const activeProjection = useMemo(
    () => (activeRecord ? computeCourseProjection(activeRecord) : null),
    [activeRecord]
  );

  const theoryStats = useMemo(
    () => (activeRecord ? computeAttendanceStats(activeRecord.theoryAttendance) : null),
    [activeRecord]
  );

  const labStats = useMemo(
    () => (activeRecord ? computeAttendanceStats(activeRecord.labAttendance) : null),
    [activeRecord]
  );

  const activeTrackConfig =
    activeRecord && activeAttendanceTrack === "lab"
      ? activeRecord.labAttendance
      : activeRecord?.theoryAttendance;

  const activeTrackStats = activeAttendanceTrack === "lab" ? labStats : theoryStats;

  // Helpers for updating mark distribution categories & items
  const handleAddCategory = (name: string) => {
    updateActiveRecord((rec) => ({
      ...rec,
      categories: [
        ...rec.categories,
        {
          id: uid(),
          name,
          weightPct: 10,
          countingRule: { type: "all" },
          items: [{ id: uid(), name: `${name} 1`, obtained: null, fullMarks: 20, convertTo: 20 }],
        },
      ],
    }));
  };

  const handleUpdateCategory = (catId: string, patch: Partial<AssessmentCategory>) => {
    updateActiveRecord((rec) => ({
      ...rec,
      categories: rec.categories.map((c) => (c.id === catId ? { ...c, ...patch } : c)),
    }));
  };

  const handleDeleteCategory = (catId: string) => {
    updateActiveRecord((rec) => ({
      ...rec,
      categories: rec.categories.filter((c) => c.id !== catId),
    }));
  };

  const handleAddItem = (catId: string) => {
    updateActiveRecord((rec) => ({
      ...rec,
      categories: rec.categories.map((c) => {
        if (c.id !== catId) return c;
        const nextNum = c.items.length + 1;
        const lastFull = c.items[c.items.length - 1]?.fullMarks ?? 20;
        const lastConvert = c.items[c.items.length - 1]?.convertTo ?? lastFull;
        return {
          ...c,
          items: [
            ...c.items,
            {
              id: uid(),
              name: `${c.name} ${nextNum}`,
              obtained: null,
              fullMarks: lastFull,
              convertTo: lastConvert,
            },
          ],
        };
      }),
    }));
  };

  const handleUpdateItem = (
    catId: string,
    itemId: string,
    patch: Partial<{ name: string; obtained: number | null; fullMarks: number; convertTo: number }>
  ) => {
    updateActiveRecord((rec) => ({
      ...rec,
      categories: rec.categories.map((c) => {
        if (c.id !== catId) return c;
        return {
          ...c,
          items: c.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
        };
      }),
    }));
  };

  const handleDeleteItem = (catId: string, itemId: string) => {
    updateActiveRecord((rec) => ({
      ...rec,
      categories: rec.categories.map((c) =>
        c.id === catId ? { ...c, items: c.items.filter((it) => it.id !== itemId) } : c
      ),
    }));
  };

  // Helpers for updating Attendance Track
  const updateTrack = (
    trackKey: "theoryAttendance" | "labAttendance",
    updater: (t: AttendanceTrackConfig) => AttendanceTrackConfig
  ) => {
    updateActiveRecord((rec) => ({
      ...rec,
      [trackKey]: updater(rec[trackKey]),
    }));
  };

  const handleToggleDay = (day: DayOfWeek) => {
    const key = activeAttendanceTrack === "lab" ? "labAttendance" : "theoryAttendance";
    updateTrack(key, (t) => {
      const exists = t.days.includes(day);
      const nextDays = exists ? t.days.filter((d) => d !== day) : [...t.days, day];
      return { ...t, days: nextDays };
    });
  };

  const handleSetSessionStatus = (date: string, status: AttendanceStatus) => {
    const key = activeAttendanceTrack === "lab" ? "labAttendance" : "theoryAttendance";
    updateTrack(key, (t) => {
      const currentStatus = t.records?.[date] || "unmarked";
      const nextStatus: AttendanceStatus = currentStatus === status ? "unmarked" : status;
      return {
        ...t,
        records: { ...t.records, [date]: nextStatus },
      };
    });
  };

  const handleAddExtraSession = () => {
    if (!extraClassDate) return;
    const key = activeAttendanceTrack === "lab" ? "labAttendance" : "theoryAttendance";
    updateTrack(key, (t) => {
      const nextExtra = t.extraDates.includes(extraClassDate)
        ? t.extraDates
        : [...t.extraDates, extraClassDate];
      return {
        ...t,
        extraDates: nextExtra,
        records: { ...t.records, [extraClassDate]: t.records[extraClassDate] || "present" },
      };
    });
  };

  const handleRemoveExtraSession = (date: string) => {
    const key = activeAttendanceTrack === "lab" ? "labAttendance" : "theoryAttendance";
    updateTrack(key, (t) => {
      const nextRecords = { ...t.records };
      delete nextRecords[date];
      return {
        ...t,
        extraDates: t.extraDates.filter((d) => d !== date),
        records: nextRecords,
      };
    });
  };

  const handleSyncToPlanner = () => {
    if (!currentSemester || !selectedCourseCode || !activeProjection) return;
    if (activeProjection.projectedGrade === "—") return;
    const ok = syncCourseGradeToMainTracker(
      currentSemester.id,
      selectedCourseCode,
      activeProjection.projectedGrade
    );
    if (ok && onGradeSynced) {
      onGradeSynced(currentSemester.id, selectedCourseCode, activeProjection.projectedGrade);
    }
    setSyncNotice(
      ok
        ? `Synced ${selectedCourseCode} (${activeProjection.projectedGrade}) to ${currentSemester.name}!`
        : "Could not sync — make sure the course is in your semester planner."
    );
    setTimeout(() => setSyncNotice(null), 3500);
  };

  const renderGitHubBar = (sessions: { date: string; status: AttendanceStatus; isUpcoming: boolean }[]) => {
    const visible = sessions.slice(-28); // Up to last 28 sessions for a clean compact GitHub bar
    if (visible.length === 0) {
      return (
        <div className="h-2.5 w-full rounded-sm bg-[#eaeaea] dark:bg-[#1c1c1c] border border-dashed border-[#d4d4d8] dark:border-[#2a2a2a]" />
      );
    }
    return (
      <div className="flex items-center gap-[3px] flex-wrap">
        {visible.map((s) => {
          const color =
            s.status === "present"
              ? "bg-emerald-500"
              : s.status === "late"
              ? "bg-amber-400"
              : s.status === "absent"
              ? "bg-rose-500"
              : s.status === "cancelled"
              ? "bg-zinc-400/40 dark:bg-zinc-700/60"
              : s.isUpcoming
              ? "bg-[#e4e4e7] dark:bg-[#1e1e20]"
              : "bg-zinc-300 dark:bg-zinc-700";
          return (
            <span
              key={s.date}
              title={`${getWeekdayShort(s.date)}, ${formatDateDDMMYYYY(s.date)}: ${s.status.toUpperCase()}`}
              className={`h-2.5 w-2.5 rounded-[2px] ${color} transition-colors`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className={embedded ? "flex flex-col space-y-5" : "min-h-screen bg-[#fafafa] dark:bg-[#050505] text-[#171717] dark:text-[#ededed] transition-colors flex flex-col"}>
      {/* Top Sticky Header (standalone) or Embedded Semester Bar */}
      {!embedded ? (
        <header className="sticky top-0 z-30 border-b border-[#ebebeb] dark:border-[#1f1f1f] bg-white/85 dark:bg-[#0a0a0a]/85 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#e5e5e5] dark:border-[#242424] bg-white dark:bg-[#111111] hover:bg-[#f5f5f5] dark:hover:bg-[#181818] text-xs font-medium transition shadow-vercel-subtle shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Back to Workspace</span>
                <span className="sm:hidden">Back</span>
              </Link>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#0070f3]/10 text-[#0070f3] border border-[#0070f3]/25 hidden sm:inline-block">
                    PERFORMANCE &amp; ATTENDANCE
                  </span>
                  <h1 className="text-sm sm:text-base font-semibold tracking-tight truncate">
                    Course Performance Studio
                  </h1>
                </div>
                <p className="text-[11px] text-[#666666] dark:text-[#888888] truncate hidden sm:block">
                  Track 70%/90% attendance, quiz N-1/N-2 conversions, lab reports, and live BRACU grade projections.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {semesters.length > 0 && (
                <select
                  value={currentSemester?.id || ""}
                  onChange={(e) => setSelectedSemId(e.target.value)}
                  className="h-8 px-2.5 rounded-lg bg-white dark:bg-[#111111] border border-[#e5e5e5] dark:border-[#262626] text-xs font-medium focus:outline-none focus:border-[#0070f3]"
                >
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.courses?.length || 0})
                    </option>
                  ))}
                </select>
              )}
              <ThemeToggleButton />
            </div>
          </div>
        </header>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#ebebeb] dark:border-[#1f1f1f]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#0070f3]" />
              <h2 className="text-base sm:text-lg font-semibold tracking-tight">
                Course Performance Studio
              </h2>
            </div>
            <p className="text-xs text-[#666666] dark:text-[#888888] mt-0.5">
              Track 70%/90% attendance, quiz N-1/N-2 conversions, lab reports, and live BRACU grade projections.
            </p>
          </div>
          {semesters.length > 0 && (
            <select
              value={currentSemester?.id || ""}
              onChange={(e) => setSelectedSemId(e.target.value)}
              className="h-8 px-2.5 rounded-lg bg-white dark:bg-[#111111] border border-[#e5e5e5] dark:border-[#262626] text-xs font-medium focus:outline-none focus:border-[#0070f3]"
            >
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.courses?.length || 0})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className={embedded ? "w-full space-y-6" : "flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-6"}>
        {!isHydrated ? (
          <div className="p-12 text-center text-xs font-mono text-[#888888]">
            Loading Course Performance Studio...
          </div>
        ) : semesterCourses.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#222222] p-8 sm:p-12 text-center space-y-3 shadow-vercel-card">
            <BookOpen className="h-8 w-8 mx-auto text-[#0070f3]" />
            <h2 className="text-base font-semibold">No courses in {currentSemester?.name || "this semester"} yet</h2>
            <p className="text-xs text-[#666666] dark:text-[#888888] max-w-md mx-auto">
              Add courses to your semester in the main Route136 workspace (or switch to a semester that has courses using the dropdown above).
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#171717] dark:bg-[#ededed] text-white dark:text-[#0a0a0a] text-xs font-semibold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Workspace</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Current Semester Courses Strip with GitHub-Style Attendance Bars */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <h2 className="text-xs font-mono uppercase tracking-wider text-[#666666] dark:text-[#888888]">
                    {currentSemester?.name} — Attendance &amp; Grade Pulse
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono text-[#888888]">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-emerald-500" /> Present</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-amber-400" /> Late</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-rose-500" /> Absent</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {semesterCourses.map((c) => {
                  const rec = getRecord(currentSemester.id, c.code);
                  const tStats = computeAttendanceStats(rec.theoryAttendance);
                  const lStats = computeAttendanceStats(rec.labAttendance);
                  const proj = computeCourseProjection(rec);
                  const courseMeta = COURSES.find((item) => item.code === c.code);
                  const isSelected = c.code === selectedCourseCode;

                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setSelectedCourseCode(c.code)}
                      className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? "bg-white dark:bg-[#111111] border-[#0070f3] ring-2 ring-[#0070f3]/20 shadow-vercel-card"
                          : "bg-white dark:bg-[#0c0c0c] border-[#ebebeb] dark:border-[#222222] hover:border-[#888888]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold">{c.code}</span>
                            {rec.labAttendance.enabled && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/25">
                                +LAB
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#666666] dark:text-[#888888] truncate mt-0.5">
                            {courseMeta?.title || "Course"}
                          </p>
                        </div>

                        <div className="text-right shrink-0 font-mono">
                          <span className="text-xs font-bold text-[#0070f3]">
                            {proj.gradedWeight > 0 ? `${proj.projectedPctOnGraded.toFixed(1)}%` : "—"}
                          </span>
                          <div className="text-[10px] text-[#888888]">
                            Grade: <strong className="text-[#171717] dark:text-[#ededed]">{proj.projectedGrade}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Theory GitHub Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-[#888888]">Theory (≥{rec.theoryAttendance.minRequiredPct}%)</span>
                          <span
                            className={`font-semibold ${
                              tStats.status === "BARRED_RISK"
                                ? "text-rose-500"
                                : tStats.status === "WARNING"
                                ? "text-amber-500"
                                : "text-emerald-500"
                            }`}
                          >
                            {tStats.totalHeld > 0 ? `${tStats.attendancePct.toFixed(0)}%` : "No logs"}
                          </span>
                        </div>
                        {renderGitHubBar(tStats.sessions)}
                      </div>

                      {/* Optional Lab GitHub Bar */}
                      {rec.labAttendance.enabled && (
                        <div className="space-y-1 pt-1 border-t border-[#f0f0f0] dark:border-[#1c1c1c]">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-[#888888]">Lab (≥{rec.labAttendance.minRequiredPct}%)</span>
                            <span
                              className={`font-semibold ${
                                lStats.status === "BARRED_RISK"
                                  ? "text-rose-500"
                                  : lStats.status === "WARNING"
                                  ? "text-amber-500"
                                  : "text-emerald-500"
                              }`}
                            >
                              {lStats.totalHeld > 0 ? `${lStats.attendancePct.toFixed(0)}%` : "No logs"}
                            </span>
                          </div>
                          {renderGitHubBar(lStats.sessions)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Active Course Workspace */}
            {activeRecord && activeProjection && (
              <section className="rounded-2xl bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#242424] shadow-vercel-card overflow-hidden">
                {/* Course Workspace Header */}
                <div className="p-4 sm:p-5 border-b border-[#ebebeb] dark:border-[#222222] bg-[#fafafa] dark:bg-[#101010] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm sm:text-base font-bold">{selectedCourseCode}</span>
                      <span className="text-xs text-[#666666] dark:text-[#888888]">
                        {COURSES.find((c) => c.code === selectedCourseCode)?.title || "Custom Course"}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          Math.abs(activeProjection.totalConfiguredWeight - 100) < 0.01
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                        }`}
                      >
                        Total Weight: {activeProjection.totalConfiguredWeight}%
                      </span>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap text-xs font-mono">
                      <span>
                        Earned:{" "}
                        <strong className="text-[#171717] dark:text-[#ededed]">
                          {activeProjection.earnedWeight.toFixed(2)}
                        </strong>{" "}
                        / {activeProjection.gradedWeight}% graded
                      </span>
                      <span className="text-[#888888]">•</span>
                      <span>
                        Pace:{" "}
                        <strong className="text-[#0070f3]">
                          {activeProjection.gradedWeight > 0
                            ? `${activeProjection.projectedPctOnGraded.toFixed(1)}%`
                            : "—"}
                        </strong>
                      </span>
                      <span className="text-[#888888]">•</span>
                      <span>
                        Projected Grade:{" "}
                        <strong className="text-emerald-500">{activeProjection.projectedGrade}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Action Controls: Presets + Opt-in Sync Grade */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      aria-label="Apply mark distribution preset"
                      defaultValue=""
                      onChange={(e) => {
                        const val = e.target.value as "theory" | "theory_lab" | "blank" | "";
                        if (!val) return;
                        updateActiveRecord((rec) => ({
                          ...rec,
                          labAttendance: {
                            ...rec.labAttendance,
                            enabled: val === "theory_lab" ? true : rec.labAttendance.enabled,
                          },
                          categories: createPresetCategories(val),
                        }));
                        e.target.value = "";
                      }}
                      className="h-8 px-2.5 rounded-lg bg-white dark:bg-[#161616] border border-[#e5e5e5] dark:border-[#262626] text-xs font-medium cursor-pointer"
                    >
                      <option value="" disabled>
                        Load Preset...
                      </option>
                      <option value="theory">BRACU Theory Standard</option>
                      <option value="theory_lab">BRACU Theory + Lab</option>
                      <option value="blank">Blank Custom</option>
                    </select>

                    <button
                      type="button"
                      disabled={activeProjection.projectedGrade === "—"}
                      onClick={handleSyncToPlanner}
                      className="h-8 px-3 rounded-lg bg-[#171717] dark:bg-[#ededed] hover:opacity-90 disabled:opacity-40 text-white dark:text-[#0a0a0a] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Sync Grade to Planner</span>
                    </button>
                  </div>
                </div>

                {syncNotice && (
                  <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{syncNotice}</span>
                  </div>
                )}

                {/* Workspace Tab Switcher */}
                <div className="px-4 sm:px-5 pt-3 border-b border-[#ebebeb] dark:border-[#222222] flex items-center gap-2 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTab("marks")}
                    className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                      activeWorkspaceTab === "marks"
                        ? "border-[#0070f3] text-[#0070f3]"
                        : "border-transparent text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed]"
                    }`}
                  >
                    <Table2 className="h-3.5 w-3.5" />
                    <span>Mark Distribution Spreadsheet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTab("attendance")}
                    className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                      activeWorkspaceTab === "attendance"
                        ? "border-[#0070f3] text-[#0070f3]"
                        : "border-transparent text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed]"
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Attendance &amp; Schedule</span>
                  </button>
                </div>

                {/* TAB 1: SPREADSHEET MARK DISTRIBUTION */}
                {activeWorkspaceTab === "marks" && (
                  <div className="p-4 sm:p-5 space-y-5">
                    {/* Quick Add Assessment Category Bar */}
                    <div className="p-3 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222] space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-[#888888]">
                          + Add Assessment Column
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddCategory("Custom Assessment")}
                          className="text-xs font-semibold text-[#0070f3] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Custom Column</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORY_QUICK_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleAddCategory(preset)}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] hover:border-[#0070f3] text-[11px] font-medium transition cursor-pointer"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Spreadsheet Category Cards */}
                    <div className="space-y-4">
                      {activeRecord.categories.map((cat) => {
                        const catRes = activeProjection.categoryResults[cat.id];
                        const isLinked = cat.isLinkedAttendance === "theory" || cat.isLinkedAttendance === "lab";

                        return (
                          <div
                            key={cat.id}
                            className="rounded-xl border border-[#ebebeb] dark:border-[#242424] bg-white dark:bg-[#111111] overflow-hidden"
                          >
                            {/* Category Config Toolbar */}
                            <div className="p-3 sm:p-3.5 bg-[#fafafa] dark:bg-[#151515] border-b border-[#ebebeb] dark:border-[#222222] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <input
                                  type="text"
                                  value={cat.name}
                                  onChange={(e) => handleUpdateCategory(cat.id, { name: e.target.value })}
                                  className="h-8 px-2.5 rounded-lg bg-white dark:bg-[#1c1c1c] border border-[#e5e5e5] dark:border-[#2a2a2a] text-xs font-semibold w-44 focus:outline-none focus:border-[#0070f3]"
                                />

                                <div className="flex items-center gap-1 bg-white dark:bg-[#1c1c1c] border border-[#e5e5e5] dark:border-[#2a2a2a] rounded-lg px-2 h-8">
                                  <span className="text-[10px] font-mono text-[#888888]">Weight</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.5}
                                    value={cat.weightPct}
                                    onChange={(e) =>
                                      handleUpdateCategory(cat.id, {
                                        weightPct: Math.max(0, Number(e.target.value) || 0),
                                      })
                                    }
                                    className="w-12 bg-transparent text-xs font-mono font-bold text-right focus:outline-none"
                                  />
                                  <span className="text-[10px] font-mono text-[#888888]">%</span>
                                </div>

                                {/* Counting Rule Selector */}
                                {!isLinked && (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <select
                                      value={cat.countingRule.type}
                                      onChange={(e) => {
                                        const t = e.target.value as CountingRule["type"];
                                        if (t === "all") handleUpdateCategory(cat.id, { countingRule: { type: "all" } });
                                        else if (t === "best_k")
                                          handleUpdateCategory(cat.id, { countingRule: { type: "best_k", k: 1 } });
                                        else
                                          handleUpdateCategory(cat.id, {
                                            countingRule: { type: "drop_lowest", k: 1 },
                                          });
                                      }}
                                      className="h-8 px-2 rounded-lg bg-white dark:bg-[#1c1c1c] border border-[#e5e5e5] dark:border-[#2a2a2a] text-xs font-mono cursor-pointer"
                                    >
                                      <option value="all">Count All (Average)</option>
                                      <option value="drop_lowest">Drop Lowest (N-k)</option>
                                      <option value="best_k">Best K Only</option>
                                    </select>

                                    {cat.countingRule.type !== "all" && (
                                      <div className="flex items-center gap-1 bg-white dark:bg-[#1c1c1c] border border-[#e5e5e5] dark:border-[#2a2a2a] rounded-lg px-2 h-8">
                                        <span className="text-[10px] font-mono text-[#888888]">
                                          {cat.countingRule.type === "best_k" ? "Best" : "Drop"}
                                        </span>
                                        <input
                                          type="number"
                                          min={1}
                                          max={20}
                                          value={cat.countingRule.k}
                                          onChange={(e) => {
                                            const k = Math.max(1, parseInt(e.target.value, 10) || 1);
                                            handleUpdateCategory(cat.id, {
                                              countingRule: { type: cat.countingRule.type as "best_k" | "drop_lowest", k },
                                            });
                                          }}
                                          className="w-10 bg-transparent text-xs font-mono font-bold text-center focus:outline-none"
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between lg:justify-end gap-3">
                                <div className="text-xs font-mono">
                                  Earned:{" "}
                                  <strong className="text-[#0070f3]">
                                    {catRes?.hasGradedItems ? catRes.earnedWeight.toFixed(2) : "0.00"}
                                  </strong>{" "}
                                  / {cat.weightPct}%
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  className="p-1.5 rounded-lg text-[#888888] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                                  title="Delete category"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Linked Attendance Banner or Spreadsheet Items Table */}
                            {isLinked ? (
                              <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                <span className="text-[#666666] dark:text-[#888888]">
                                  Auto-synced with{" "}
                                  <strong className="text-[#171717] dark:text-[#ededed]">
                                    {cat.isLinkedAttendance === "lab" ? "Lab" : "Theory"} Attendance Tracker
                                  </strong>
                                  .
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveAttendanceTrack(cat.isLinkedAttendance === "lab" ? "lab" : "theory");
                                    setActiveWorkspaceTab("attendance");
                                  }}
                                  className="text-xs font-mono font-semibold text-[#0070f3] hover:underline cursor-pointer self-start sm:self-auto"
                                >
                                  Open Attendance Log →
                                </button>
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[560px]">
                                  <thead>
                                    <tr className="border-b border-[#ebebeb] dark:border-[#222222] text-[10px] font-mono uppercase tracking-wider text-[#888888]">
                                      <th className="py-2 px-3">Assessment Item</th>
                                      <th className="py-2 px-2 w-24">Obtained</th>
                                      <th className="py-2 px-2 w-24">Full Marks</th>
                                      <th className="py-2 px-2 w-28">Convert To</th>
                                      <th className="py-2 px-2 w-28">Converted</th>
                                      <th className="py-2 px-2 w-28">Rule Status</th>
                                      <th className="py-2 px-2 w-10"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#1e1e1e] text-xs">
                                    {cat.items.map((item) => {
                                      const iRes = catRes?.itemResults[item.id];
                                      const isDropped = iRes && iRes.normalizedPct !== null && !iRes.isCounted;
                                      return (
                                        <tr
                                          key={item.id}
                                          className={isDropped ? "opacity-50 bg-[#fafafa] dark:bg-[#0e0e0e]" : ""}
                                        >
                                          <td className="py-2 px-3">
                                            <input
                                              type="text"
                                              value={item.name}
                                              onChange={(e) =>
                                                handleUpdateItem(cat.id, item.id, { name: e.target.value })
                                              }
                                              className="w-full h-7 px-2 rounded bg-transparent border border-transparent hover:border-[#e5e5e5] dark:hover:border-[#2a2a2a] focus:border-[#0070f3] focus:outline-none text-xs"
                                            />
                                          </td>
                                          <td className="py-2 px-2">
                                            <input
                                              type="number"
                                              step="any"
                                              min={0}
                                              placeholder="—"
                                              value={item.obtained ?? ""}
                                              onChange={(e) =>
                                                handleUpdateItem(cat.id, item.id, {
                                                  obtained: e.target.value === "" ? null : Number(e.target.value),
                                                })
                                              }
                                              className="w-full h-7 px-2 rounded bg-[#fafafa] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#2a2a2a] font-mono text-xs focus:outline-none focus:border-[#0070f3]"
                                            />
                                          </td>
                                          <td className="py-2 px-2">
                                            <input
                                              type="number"
                                              step="any"
                                              min={1}
                                              value={item.fullMarks}
                                              onChange={(e) => {
                                                const fm = Math.max(1, Number(e.target.value) || 1);
                                                handleUpdateItem(cat.id, item.id, { fullMarks: fm });
                                              }}
                                              className="w-full h-7 px-2 rounded bg-[#fafafa] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#2a2a2a] font-mono text-xs focus:outline-none focus:border-[#0070f3]"
                                            />
                                          </td>
                                          <td className="py-2 px-2">
                                            <input
                                              type="number"
                                              step="any"
                                              min={1}
                                              value={item.convertTo}
                                              onChange={(e) =>
                                                handleUpdateItem(cat.id, item.id, {
                                                  convertTo: Math.max(1, Number(e.target.value) || 1),
                                                })
                                              }
                                              className="w-full h-7 px-2 rounded bg-[#fafafa] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#2a2a2a] font-mono text-xs focus:outline-none focus:border-[#0070f3]"
                                            />
                                          </td>
                                          <td className="py-2 px-2 font-mono text-xs">
                                            {iRes?.convertedScore !== null && iRes?.convertedScore !== undefined ? (
                                              <span>
                                                <strong>{iRes.convertedScore.toFixed(2)}</strong> / {item.convertTo}
                                              </span>
                                            ) : (
                                              <span className="text-[#888888]">—</span>
                                            )}
                                          </td>
                                          <td className="py-2 px-2 font-mono text-[10px]">
                                            {iRes?.normalizedPct === null ? (
                                              <span className="text-[#888888]">Pending</span>
                                            ) : iRes?.isCounted ? (
                                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 font-semibold">
                                                Counted ✓
                                              </span>
                                            ) : (
                                              <span className="px-2 py-0.5 rounded bg-zinc-500/10 text-[#888888] border border-zinc-500/20">
                                                Dropped
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2 px-2 text-right">
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteItem(cat.id, item.id)}
                                              className="p-1 text-[#888888] hover:text-rose-500 cursor-pointer"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                                <div className="px-3 py-2 border-t border-[#f0f0f0] dark:border-[#1e1e1e]">
                                  <button
                                    type="button"
                                    onClick={() => handleAddItem(cat.id)}
                                    className="text-xs font-mono text-[#0070f3] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Add Row to {cat.name}</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Target Grade Simulator */}
                    <div className="p-4 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#242424] space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-[#0070f3]" />
                          <h3 className="text-xs font-semibold">What You Need on Remaining {activeProjection.remainingWeight.toFixed(1)}% Weight</h3>
                        </div>
                        <span className="text-[11px] font-mono text-[#888888]">
                          Max Possible: <strong className="text-[#171717] dark:text-[#ededed]">{activeProjection.maxPossiblePct.toFixed(1)}%</strong>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {BRACU_GRADE_SCALE.slice(0, 5).map((g) => {
                          const rem = activeProjection.remainingWeight;
                          const neededOnRem =
                            rem > 0 ? ((g.minPct - activeProjection.earnedWeight) / rem) * 100 : null;
                          const alreadyLocked = activeProjection.earnedWeight >= g.minPct;
                          const impossible = neededOnRem !== null && neededOnRem > 100;

                          return (
                            <div
                              key={g.grade}
                              className="p-2.5 rounded-lg bg-white dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] font-mono space-y-1"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold">{g.grade}</span>
                                <span className="text-[10px] text-[#888888]">{g.minPct}%+</span>
                              </div>
                              <div className="text-xs font-semibold">
                                {alreadyLocked ? (
                                  <span className="text-emerald-500">Locked ✓</span>
                                ) : rem <= 0 ? (
                                  <span className="text-[#888888]">—</span>
                                ) : impossible ? (
                                  <span className="text-rose-500">Maxed Out</span>
                                ) : (
                                  <span className="text-[#0070f3]">{Math.max(0, neededOnRem!).toFixed(1)}% avg</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: ATTENDANCE & SCHEDULE TRACKER */}
                {activeWorkspaceTab === "attendance" && activeTrackConfig && activeTrackStats && (
                  <div className="p-4 sm:p-5 space-y-5">
                    {/* Theory vs Lab Track Switcher */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveAttendanceTrack("theory")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            activeAttendanceTrack === "theory"
                              ? "bg-[#171717] dark:bg-[#ededed] text-white dark:text-[#0a0a0a] border-transparent"
                              : "bg-white dark:bg-[#141414] border-[#ebebeb] dark:border-[#262626] text-[#666666] dark:text-[#a1a1a1]"
                          }`}
                        >
                          Theory Attendance (≥{activeRecord.theoryAttendance.minRequiredPct}%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveAttendanceTrack("lab")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            activeAttendanceTrack === "lab"
                              ? "bg-[#171717] dark:bg-[#ededed] text-white dark:text-[#0a0a0a] border-transparent"
                              : "bg-white dark:bg-[#141414] border-[#ebebeb] dark:border-[#262626] text-[#666666] dark:text-[#a1a1a1]"
                          }`}
                        >
                          Lab Attendance (≥{activeRecord.labAttendance.minRequiredPct}%)
                        </button>
                      </div>

                      {activeAttendanceTrack === "lab" && (
                        <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={activeRecord.labAttendance.enabled}
                            onChange={(e) =>
                              updateTrack("labAttendance", (t) => ({ ...t, enabled: e.target.checked }))
                            }
                            className="rounded accent-[#0070f3]"
                          />
                          <span>Course has a Lab component</span>
                        </label>
                      )}
                    </div>

                    {!activeTrackConfig.enabled ? (
                      <div className="p-8 rounded-xl border border-dashed border-[#d4d4d8] dark:border-[#2a2a2a] text-center text-xs text-[#888888]">
                        Enable &quot;Course has a Lab component&quot; above to track 90% Lab attendance separately.
                      </div>
                    ) : (
                      <>
                        {/* Schedule & Penalty Config Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Schedule Box */}
                          <div className="p-4 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#242424] space-y-3">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-[#888888] block">
                              Class Days &amp; Semester Dates
                            </span>

                            <div className="flex flex-wrap gap-1.5">
                              {ALL_BRACU_DAYS.map((day) => {
                                const active = activeTrackConfig.days.includes(day);
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => handleToggleDay(day)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold border transition cursor-pointer ${
                                      active
                                        ? "bg-[#0070f3] border-[#0070f3] text-white"
                                        : "bg-white dark:bg-[#181818] border-[#e5e5e5] dark:border-[#2a2a2a] text-[#666666] dark:text-[#888888]"
                                    }`}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div className="space-y-1">
                                <label className="text-[10px] font-mono text-[#888888]">
                                  Start Date
                                </label>
                                <DateInputDDMMYYYY
                                  value={activeTrackConfig.startDate}
                                  onChange={(iso) =>
                                    updateTrack(
                                      activeAttendanceTrack === "lab" ? "labAttendance" : "theoryAttendance",
                                      (t) => ({ ...t, startDate: iso })
                                    )
                                  }
                                  className="w-full h-8"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-mono text-[#888888]">
                                  End Date (Optional / TBD)
                                </label>
                                <DateInputDDMMYYYY
                                  value={activeTrackConfig.endDate || ""}
                                  onChange={(iso) =>
                                    updateTrack(
                                      activeAttendanceTrack === "lab" ? "labAttendance" : "theoryAttendance",
                                      (t) => ({ ...t, endDate: iso })
                                    )
                                  }
                                  className="w-full h-8"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Threshold & Mark Deduction Box */}
                          <div className="p-4 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#242424] space-y-3">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-[#888888] block">
                              Barred Threshold &amp; Mark Rules
                            </span>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                              <div className="space-y-1">
                                <label className="text-[10px] font-mono text-[#888888]">Min Required %</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={activeTrackConfig.minRequiredPct}
                                  onChange={(e) =>
                                    updateTrack(
                                      activeAttendanceTrack === "lab" ? "labAttendance" : "theoryAttendance",
                                      (t) => ({ ...t, minRequiredPct: Number(e.target.value) || 70 })
                                    )
                                  }
                                  className="w-full h-8 px-2.5 rounded-lg bg-white dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#2a2a2a] text-xs font-mono"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-mono text-[#888888]">Mark Weight (%)</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={50}
                                  step={0.5}
                                  value={activeTrackConfig.markWeight}
                                  onChange={(e) =>
                                    updateTrack(
                                      activeAttendanceTrack === "lab" ? "labAttendance" : "theoryAttendance",
                                      (t) => ({ ...t, markWeight: Math.max(0, Number(e.target.value) || 0) })
                                    )
                                  }
                                  className="w-full h-8 px-2.5 rounded-lg bg-white dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#2a2a2a] text-xs font-mono"
                                />
                              </div>

                              <div className="space-y-1 col-span-2 sm:col-span-1">
                                <label className="text-[10px] font-mono text-[#888888]">Penalty Mode</label>
                                <select
                                  value={activeTrackConfig.penaltyMode}
                                  onChange={(e) =>
                                    updateTrack(
                                      activeAttendanceTrack === "lab" ? "labAttendance" : "theoryAttendance",
                                      (t) => ({
                                        ...t,
                                        penaltyMode: e.target.value as "proportional" | "grace_step",
                                      })
                                    )
                                  }
                                  className="w-full h-8 px-2 rounded-lg bg-white dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#2a2a2a] text-xs font-mono"
                                >
                                  <option value="proportional">Proportional</option>
                                  <option value="grace_step">Grace &amp; Step</option>
                                </select>
                              </div>
                            </div>

                            {activeTrackConfig.penaltyMode === "grace_step" && (
                              <div className="grid grid-cols-3 gap-2 pt-1">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-[#888888]">Grace %</label>
                                  <input
                                    type="number"
                                    value={activeTrackConfig.graceThresholdPct}
                                    onChange={(e) =>
                                      updateTrack(
                                        activeAttendanceTrack === "lab" ? "labAttendance" : "theoryAttendance",
                                        (t) => ({ ...t, graceThresholdPct: Number(e.target.value) || 85 })
                                      )
                                    }
                                    className="w-full h-7 px-2 rounded bg-white dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#2a2a2a] text-xs font-mono"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-[#888888]">Free Misses</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={activeTrackConfig.freeAbsences}
                                    onChange={(e) =>
                                      updateTrack(
                                        activeAttendanceTrack === "lab" ? "labAttendance" : "theoryAttendance",
                                        (t) => ({ ...t, freeAbsences: Math.max(0, Number(e.target.value) || 0) })
                                      )
                                    }
                                    className="w-full h-7 px-2 rounded bg-white dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#2a2a2a] text-xs font-mono"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono text-[#888888]">-Marks / Miss</label>
                                  <input
                                    type="number"
                                    step={0.5}
                                    min={0}
                                    value={activeTrackConfig.deductionPerAbsence}
                                    onChange={(e) =>
                                      updateTrack(
                                        activeAttendanceTrack === "lab" ? "labAttendance" : "theoryAttendance",
                                        (t) => ({ ...t, deductionPerAbsence: Math.max(0, Number(e.target.value) || 0) })
                                      )
                                    }
                                    className="w-full h-7 px-2 rounded bg-white dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#2a2a2a] text-xs font-mono"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Live GitHub-Style Bar + Barred Status */}
                        <div className="p-4 rounded-xl bg-white dark:bg-[#141414] border border-[#ebebeb] dark:border-[#242424] space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 flex-wrap font-mono text-xs">
                              <span className="text-lg font-bold">
                                {activeTrackStats.totalHeld > 0
                                  ? `${activeTrackStats.attendancePct.toFixed(1)}%`
                                  : "100%"}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  activeTrackStats.status === "BARRED_RISK"
                                    ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                                    : activeTrackStats.status === "WARNING"
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                }`}
                              >
                                {activeTrackStats.status === "BARRED_RISK"
                                  ? `BELOW ${activeTrackConfig.minRequiredPct}% (BARRED RISK)`
                                  : activeTrackStats.status === "WARNING"
                                  ? "CLOSE TO LIMIT"
                                  : "SAFE STANDING"}
                              </span>
                              <span className="text-[#888888]">
                                ({activeTrackStats.presentCount}P / {activeTrackStats.lateCount}L /{" "}
                                {activeTrackStats.absentCount}A)
                              </span>
                            </div>

                            <div className="text-xs font-mono">
                              {activeTrackStats.totalHeld === 0 ? (
                                <span className="text-[#888888]">Mark sessions below to compute buffer</span>
                              ) : activeTrackStats.classesNeededToRecover > 0 ? (
                                <span className="text-rose-500 font-semibold">
                                  Need {activeTrackStats.classesNeededToRecover} consecutive classes to reach{" "}
                                  {activeTrackConfig.minRequiredPct}%
                                </span>
                              ) : (
                                <span className="text-emerald-500 font-semibold">
                                  Can miss {activeTrackStats.allowedMoreAbsences} more class
                                  {activeTrackStats.allowedMoreAbsences === 1 ? "" : "es"} safely
                                </span>
                              )}
                            </div>
                          </div>

                          {renderGitHubBar(activeTrackStats.sessions)}
                        </div>

                        {/* Add Extra / Makeup Class + Session Log */}
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold">
                              Session Log ({activeTrackStats.sessions.length} scheduled dates)
                            </span>
                            <div className="flex items-center gap-2">
                              <DateInputDDMMYYYY
                                value={extraClassDate}
                                onChange={setExtraClassDate}
                                className="w-36 h-8"
                              />
                              <button
                                type="button"
                                onClick={handleAddExtraSession}
                                className="h-8 px-3 rounded-lg bg-[#0070f3] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add Class Date</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                            {activeTrackStats.sessions.map((s) => (
                              <div
                                key={s.date}
                                className="p-2.5 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222] flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="font-mono text-xs font-semibold flex items-center gap-1.5">
                                    <span>{formatDateDDMMYYYY(s.date)}</span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#2a2a2a] text-[#666666] dark:text-[#a1a1a1] font-medium">
                                      {getWeekdayShort(s.date)}
                                    </span>
                                  </div>
                                  <div className="text-[10px] font-mono text-[#888888] mt-0.5">
                                    {s.isExtra ? "Makeup/Extra" : s.isUpcoming ? "Upcoming" : "Scheduled"}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {(
                                    [
                                      { key: "present", label: "P", activeCls: "bg-emerald-500 text-white border-emerald-500" },
                                      { key: "late", label: "L", activeCls: "bg-amber-400 text-black border-amber-400" },
                                      { key: "absent", label: "A", activeCls: "bg-rose-500 text-white border-rose-500" },
                                      { key: "cancelled", label: "Off", activeCls: "bg-zinc-500 text-white border-zinc-500" },
                                    ] as const
                                  ).map((btn) => (
                                    <button
                                      key={btn.key}
                                      type="button"
                                      onClick={() => handleSetSessionStatus(s.date, btn.key)}
                                      className={`px-2 py-1 rounded text-[10px] font-mono font-bold border transition cursor-pointer ${
                                        s.status === btn.key
                                          ? btn.activeCls
                                          : "bg-white dark:bg-[#181818] border-[#e5e5e5] dark:border-[#2a2a2a] text-[#666666] dark:text-[#888888]"
                                      }`}
                                      >
                                        {btn.label}
                                      </button>
                                    ))}
                                    {s.isExtra && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveExtraSession(s.date)}
                                        className="p-1 rounded text-[#888888] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                                        title="Remove manually added class date"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
