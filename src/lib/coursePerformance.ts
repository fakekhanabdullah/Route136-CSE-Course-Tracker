export type DayOfWeek = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Sat";

export type AttendanceStatus = "present" | "absent" | "late" | "cancelled" | "unmarked";

export type PenaltyMode = "proportional" | "grace_step";

export interface AttendanceTrackConfig {
  enabled: boolean;
  label: "Theory" | "Lab";
  minRequiredPct: number; // 70 for Theory, 90 for Lab (customizable)
  days: DayOfWeek[];
  startDate: string; // YYYY-MM-DD
  endDate?: string; // Optional YYYY-MM-DD (empty/undefined = TBD)
  markWeight: number; // e.g., 5 for 5% of total course mark
  penaltyMode: PenaltyMode;
  graceThresholdPct: number; // e.g. 90% -> full marks if >= 90% in grace_step mode
  freeAbsences: number; // e.g. 1 free miss before deduction starts
  deductionPerAbsence: number; // marks deducted per miss beyond freeAbsences
  records: Record<string, AttendanceStatus>; // keyed by YYYY-MM-DD
  extraDates: string[]; // makeup/extra classes added manually
}

export type CountingRule =
  | { type: "all" }
  | { type: "best_k"; k: number }
  | { type: "drop_lowest"; k: number };

export interface AssessmentItem {
  id: string;
  name: string;
  obtained: number | null;
  fullMarks: number;
  convertTo: number;
}

export interface AssessmentCategory {
  id: string;
  name: string;
  weightPct: number;
  countingRule: CountingRule;
  isLinkedAttendance?: "theory" | "lab" | null;
  items: AssessmentItem[];
}

export interface CoursePerformanceRecord {
  courseCode: string;
  semesterId: string;
  theoryAttendance: AttendanceTrackConfig;
  labAttendance: AttendanceTrackConfig;
  categories: AssessmentCategory[];
  updatedAt: string;
}

export type CoursePerformanceStore = Record<string, CoursePerformanceRecord>; // key = `${semesterId}::${courseCode}`

export const PERFORMANCE_STORAGE_KEY = "route136_course_performance_v1";

const DAY_INDEX_MAP: Record<DayOfWeek, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Sat: 6,
};

export const ALL_BRACU_DAYS: DayOfWeek[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Sat"];

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function createDefaultAttendanceTrack(label: "Theory" | "Lab", enabled: boolean): AttendanceTrackConfig {
  return {
    enabled,
    label,
    minRequiredPct: label === "Lab" ? 90 : 70,
    days: label === "Lab" ? ["Thu"] : ["Sun", "Tue"],
    startDate: getTodayISO(),
    endDate: "",
    markWeight: label === "Theory" ? 5 : 0,
    penaltyMode: "proportional",
    graceThresholdPct: label === "Lab" ? 90 : 85,
    freeAbsences: 1,
    deductionPerAbsence: 1,
    records: {},
    extraDates: [],
  };
}

export function createPresetCategories(preset: "theory" | "theory_lab" | "blank"): AssessmentCategory[] {
  const uid = () => Math.random().toString(36).slice(2, 9);

  if (preset === "blank") {
    return [
      {
        id: uid(),
        name: "Quiz",
        weightPct: 15,
        countingRule: { type: "drop_lowest", k: 1 },
        items: [
          { id: uid(), name: "Quiz 1", obtained: null, fullMarks: 20, convertTo: 20 },
          { id: uid(), name: "Quiz 2", obtained: null, fullMarks: 20, convertTo: 20 },
        ],
      },
    ];
  }

  if (preset === "theory_lab") {
    return [
      {
        id: uid(),
        name: "Attendance",
        weightPct: 5,
        countingRule: { type: "all" },
        isLinkedAttendance: "theory",
        items: [],
      },
      {
        id: uid(),
        name: "Quiz",
        weightPct: 15,
        countingRule: { type: "drop_lowest", k: 1 },
        items: [
          { id: uid(), name: "Quiz 1", obtained: null, fullMarks: 15, convertTo: 20 },
          { id: uid(), name: "Quiz 2", obtained: null, fullMarks: 20, convertTo: 20 },
          { id: uid(), name: "Quiz 3", obtained: null, fullMarks: 20, convertTo: 20 },
        ],
      },
      {
        id: uid(),
        name: "Assignment",
        weightPct: 5,
        countingRule: { type: "all" },
        items: [
          { id: uid(), name: "Assignment 1", obtained: null, fullMarks: 10, convertTo: 10 },
        ],
      },
      {
        id: uid(),
        name: "Lab Performance & Quiz",
        weightPct: 10,
        countingRule: { type: "all" },
        items: [
          { id: uid(), name: "Lab Performance", obtained: null, fullMarks: 10, convertTo: 10 },
          { id: uid(), name: "Lab Quiz", obtained: null, fullMarks: 15, convertTo: 15 },
        ],
      },
      {
        id: uid(),
        name: "Lab Reports",
        weightPct: 5,
        countingRule: { type: "best_k", k: 1 },
        items: [
          { id: uid(), name: "Lab Report 1 (Pre-Mid)", obtained: null, fullMarks: 10, convertTo: 10 },
          { id: uid(), name: "Lab Report 2 (Pre-Final)", obtained: null, fullMarks: 10, convertTo: 10 },
        ],
      },
      {
        id: uid(),
        name: "Lab Mid / Final",
        weightPct: 10,
        countingRule: { type: "all" },
        items: [
          { id: uid(), name: "Lab Final", obtained: null, fullMarks: 20, convertTo: 20 },
        ],
      },
      {
        id: uid(),
        name: "Midterm",
        weightPct: 20,
        countingRule: { type: "all" },
        items: [{ id: uid(), name: "Midterm Exam", obtained: null, fullMarks: 100, convertTo: 100 }],
      },
      {
        id: uid(),
        name: "Final Exam",
        weightPct: 30,
        countingRule: { type: "all" },
        items: [{ id: uid(), name: "Final Exam", obtained: null, fullMarks: 100, convertTo: 100 }],
      },
    ];
  }

  // BRACU Theory Standard
  return [
    {
      id: uid(),
      name: "Attendance",
      weightPct: 5,
      countingRule: { type: "all" },
      isLinkedAttendance: "theory",
      items: [],
    },
    {
      id: uid(),
      name: "Quiz",
      weightPct: 15,
      countingRule: { type: "drop_lowest", k: 1 },
      items: [
        { id: uid(), name: "Quiz 1", obtained: null, fullMarks: 20, convertTo: 20 },
        { id: uid(), name: "Quiz 2", obtained: null, fullMarks: 20, convertTo: 20 },
        { id: uid(), name: "Quiz 3", obtained: null, fullMarks: 20, convertTo: 20 },
      ],
    },
    {
      id: uid(),
      name: "Assignment",
      weightPct: 10,
      countingRule: { type: "all" },
      items: [
        { id: uid(), name: "Assignment 1", obtained: null, fullMarks: 10, convertTo: 10 },
        { id: uid(), name: "Assignment 2", obtained: null, fullMarks: 10, convertTo: 10 },
      ],
    },
    {
      id: uid(),
      name: "Midterm",
      weightPct: 25,
      countingRule: { type: "all" },
      items: [{ id: uid(), name: "Midterm Exam", obtained: null, fullMarks: 100, convertTo: 100 }],
    },
    {
      id: uid(),
      name: "Final Exam",
      weightPct: 45,
      countingRule: { type: "all" },
      items: [{ id: uid(), name: "Final Exam", obtained: null, fullMarks: 100, convertTo: 100 }],
    },
  ];
}

export function createDefaultCourseRecord(
  semesterId: string,
  courseCode: string,
  hasLabHint = false
): CoursePerformanceRecord {
  return {
    courseCode,
    semesterId,
    theoryAttendance: createDefaultAttendanceTrack("Theory", true),
    labAttendance: createDefaultAttendanceTrack("Lab", hasLabHint),
    categories: createPresetCategories(hasLabHint ? "theory_lab" : "theory"),
    updatedAt: new Date().toISOString(),
  };
}

export interface SessionEntry {
  date: string;
  status: AttendanceStatus;
  isUpcoming: boolean;
  isExtra: boolean;
}

export interface AttendanceStats {
  sessions: SessionEntry[];
  presentCount: number;
  lateCount: number;
  absentCount: number;
  cancelledCount: number;
  unmarkedCount: number;
  totalHeld: number;
  attendancePct: number;
  status: "SAFE" | "WARNING" | "BARRED_RISK" | "NO_DATA";
  allowedMoreAbsences: number;
  classesNeededToRecover: number;
  earnedMarks: number;
}

export function generateScheduledDates(track: AttendanceTrackConfig): SessionEntry[] {
  if (!track.enabled || !track.startDate) return [];

  const today = getTodayISO();
  const start = new Date(`${track.startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return [];

  // If endDate is set, generate up to endDate (capped at 180 days to prevent runaway loops);
  // if endDate is TBD, generate up to today (or at least 14 days if startDate is in the future).
  const rawEndStr = track.endDate && track.endDate.trim() ? track.endDate : today;
  const end = new Date(`${rawEndStr}T00:00:00`);
  if (Number.isNaN(end.getTime())) return [];

  const maxEnd = new Date(start);
  maxEnd.setDate(maxEnd.getDate() + 180);
  const effectiveEnd = end > maxEnd ? maxEnd : end;

  const targetDayNums = new Set(track.days.map((d) => DAY_INDEX_MAP[d]));
  const dateSet = new Set<string>();

  if (effectiveEnd >= start) {
    const cursor = new Date(start);
    while (cursor <= effectiveEnd) {
      if (targetDayNums.has(cursor.getDay())) {
        const y = cursor.getFullYear();
        const m = String(cursor.getMonth() + 1).padStart(2, "0");
        const d = String(cursor.getDate()).padStart(2, "0");
        dateSet.add(`${y}-${m}-${d}`);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const extraSet = new Set(track.extraDates || []);
  extraSet.forEach((d) => {
    if (d) dateSet.add(d);
  });

  // Also include any manually recorded dates
  Object.keys(track.records || {}).forEach((d) => {
    if (d) dateSet.add(d);
  });

  return Array.from(dateSet)
    .sort()
    .map((date) => ({
      date,
      status: track.records?.[date] || "unmarked",
      isUpcoming: date > today,
      isExtra: extraSet.has(date),
    }));
}

export function computeAttendanceStats(track: AttendanceTrackConfig): AttendanceStats {
  const sessions = generateScheduledDates(track);
  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;
  let cancelledCount = 0;
  let unmarkedCount = 0;

  sessions.forEach((s) => {
    if (s.status === "present") presentCount++;
    else if (s.status === "late") lateCount++;
    else if (s.status === "absent") absentCount++;
    else if (s.status === "cancelled") cancelledCount++;
    else if (!s.isUpcoming) unmarkedCount++;
  });

  // Late counts as 0.5 or 1? Standard BRACU attendance counts late as present (or 0.5); we count present + 0.5*late for %
  const effectivePresent = presentCount + lateCount * 0.5;
  const totalHeld = presentCount + lateCount + absentCount;

  if (totalHeld === 0) {
    return {
      sessions,
      presentCount,
      lateCount,
      absentCount,
      cancelledCount,
      unmarkedCount,
      totalHeld: 0,
      attendancePct: 100,
      status: "NO_DATA",
      allowedMoreAbsences: 0,
      classesNeededToRecover: 0,
      earnedMarks: track.markWeight,
    };
  }

  const attendancePct = (effectivePresent / totalHeld) * 100;
  const minReq = track.minRequiredPct || 70;

  let status: AttendanceStats["status"] = "SAFE";
  if (attendancePct < minReq) {
    status = "BARRED_RISK";
  } else if (attendancePct < minReq + 7) {
    status = "WARNING";
  }

  // How many MORE consecutive absences before dropping below minReq?
  // (effectivePresent / (totalHeld + x)) >= minReq / 100  =>  x <= (100 * effectivePresent / minReq) - totalHeld
  const maxTotalAllowed = (100 * effectivePresent) / minReq;
  const allowedMoreAbsences = Math.max(0, Math.floor(maxTotalAllowed - totalHeld));

  // If currently below minReq, how many consecutive presents needed to reach minReq?
  // (effectivePresent + y) / (totalHeld + y) >= minReq / 100  =>  y >= (minReq * totalHeld - 100 * effectivePresent) / (100 - minReq)
  let classesNeededToRecover = 0;
  if (attendancePct < minReq && minReq < 100) {
    classesNeededToRecover = Math.max(
      1,
      Math.ceil((minReq * totalHeld - 100 * effectivePresent) / (100 - minReq))
    );
  }

  let earnedMarks = 0;
  if (track.markWeight > 0) {
    if (track.penaltyMode === "proportional") {
      earnedMarks = (attendancePct / 100) * track.markWeight;
    } else {
      // Grace & Step Deduction
      if (attendancePct >= track.graceThresholdPct || absentCount <= track.freeAbsences) {
        earnedMarks = track.markWeight;
      } else {
        const chargeableAbsences = Math.max(0, absentCount - track.freeAbsences);
        earnedMarks = Math.max(0, track.markWeight - chargeableAbsences * track.deductionPerAbsence);
      }
    }
  }

  return {
    sessions,
    presentCount,
    lateCount,
    absentCount,
    cancelledCount,
    unmarkedCount,
    totalHeld,
    attendancePct,
    status,
    allowedMoreAbsences,
    classesNeededToRecover,
    earnedMarks,
  };
}

export interface ComputedItemResult {
  itemId: string;
  normalizedPct: number | null; // 0..100
  convertedScore: number | null; // out of convertTo
  isCounted: boolean;
}

export interface ComputedCategoryResult {
  categoryId: string;
  itemResults: Record<string, ComputedItemResult>;
  categoryPct: number | null; // 0..100
  earnedWeight: number;
  hasGradedItems: boolean;
}

export function computeCategoryScore(
  cat: AssessmentCategory,
  theoryStats: AttendanceStats,
  labStats: AttendanceStats
): ComputedCategoryResult {
  if (cat.isLinkedAttendance === "theory" || cat.isLinkedAttendance === "lab") {
    const stats = cat.isLinkedAttendance === "lab" ? labStats : theoryStats;
    const weight = cat.weightPct;
    if (stats.totalHeld === 0) {
      return {
        categoryId: cat.id,
        itemResults: {},
        categoryPct: 100,
        earnedWeight: weight,
        hasGradedItems: false,
      };
    }
    const pct = stats.attendancePct;
    const earned =
      stats.totalHeld > 0 && cat.weightPct > 0
        ? Math.min(cat.weightPct, (stats.earnedMarks / Math.max(0.0001, (cat.isLinkedAttendance === "lab" ? labStats : theoryStats).earnedMarks || cat.weightPct)) * cat.weightPct)
        : 0;
    // Simpler & exact: use track.earnedMarks scaled to cat.weightPct if track.markWeight > 0, else pct * cat.weightPct
    return {
      categoryId: cat.id,
      itemResults: {},
      categoryPct: pct,
      earnedWeight: (pct / 100) * weight,
      hasGradedItems: true,
    };
  }

  const itemResults: Record<string, ComputedItemResult> = {};
  const gradedEntries: { id: string; pct: number; converted: number; convertTo: number }[] = [];

  cat.items.forEach((item) => {
    const full = item.fullMarks > 0 ? item.fullMarks : 1;
    const target = item.convertTo > 0 ? item.convertTo : full;
    if (item.obtained === null || Number.isNaN(item.obtained)) {
      itemResults[item.id] = {
        itemId: item.id,
        normalizedPct: null,
        convertedScore: null,
        isCounted: true,
      };
    } else {
      const pct = Math.max(0, (item.obtained / full) * 100);
      const converted = (pct / 100) * target;
      gradedEntries.push({ id: item.id, pct, converted, convertTo: target });
      itemResults[item.id] = {
        itemId: item.id,
        normalizedPct: pct,
        convertedScore: converted,
        isCounted: true,
      };
    }
  });

  if (gradedEntries.length === 0) {
    return {
      categoryId: cat.id,
      itemResults,
      categoryPct: null,
      earnedWeight: 0,
      hasGradedItems: false,
    };
  }

  // Sort descending by normalized percentage to decide which items are counted vs dropped
  const sortedDesc = [...gradedEntries].sort((a, b) => b.pct - a.pct);
  let keepCount = sortedDesc.length;

  if (cat.countingRule.type === "best_k") {
    keepCount = Math.max(1, Math.min(sortedDesc.length, cat.countingRule.k));
  } else if (cat.countingRule.type === "drop_lowest") {
    keepCount = Math.max(1, sortedDesc.length - Math.max(0, cat.countingRule.k));
  }

  const keptIds = new Set(sortedDesc.slice(0, keepCount).map((e) => e.id));
  gradedEntries.forEach((e) => {
    itemResults[e.id].isCounted = keptIds.has(e.id);
  });

  const counted = sortedDesc.slice(0, keepCount);
  const sumConverted = counted.reduce((s, e) => s + e.converted, 0);
  const sumTarget = counted.reduce((s, e) => s + e.convertTo, 0);
  const categoryPct = sumTarget > 0 ? (sumConverted / sumTarget) * 100 : 0;
  const earnedWeight = (categoryPct / 100) * cat.weightPct;

  return {
    categoryId: cat.id,
    itemResults,
    categoryPct,
    earnedWeight,
    hasGradedItems: true,
  };
}

export const BRACU_GRADE_SCALE: { grade: string; minPct: number; gpa: number }[] = [
  { grade: "A", minPct: 90, gpa: 4.0 },
  { grade: "A-", minPct: 85, gpa: 3.7 },
  { grade: "B+", minPct: 80, gpa: 3.3 },
  { grade: "B", minPct: 75, gpa: 3.0 },
  { grade: "B-", minPct: 70, gpa: 2.7 },
  { grade: "C+", minPct: 65, gpa: 2.3 },
  { grade: "C", minPct: 60, gpa: 2.0 },
  { grade: "C-", minPct: 57, gpa: 1.7 },
  { grade: "D+", minPct: 55, gpa: 1.3 },
  { grade: "D", minPct: 52, gpa: 1.0 },
  { grade: "D-", minPct: 50, gpa: 0.7 },
  { grade: "F", minPct: 0, gpa: 0.0 },
];

export function getBracuGradeForPct(pct: number): { grade: string; gpa: number } {
  for (const row of BRACU_GRADE_SCALE) {
    if (pct >= row.minPct) return { grade: row.grade, gpa: row.gpa };
  }
  return { grade: "F", gpa: 0.0 };
}

export interface CourseProjection {
  totalConfiguredWeight: number;
  gradedWeight: number;
  remainingWeight: number;
  earnedWeight: number;
  projectedPctOnGraded: number; // pace % across graded categories
  maxPossiblePct: number;
  projectedGrade: string;
  projectedGpa: number;
  categoryResults: Record<string, ComputedCategoryResult>;
}

export function computeCourseProjection(record: CoursePerformanceRecord): CourseProjection {
  const theoryStats = computeAttendanceStats(record.theoryAttendance);
  const labStats = computeAttendanceStats(record.labAttendance);

  let totalConfiguredWeight = 0;
  let gradedWeight = 0;
  let earnedWeight = 0;
  const categoryResults: Record<string, ComputedCategoryResult> = {};

  record.categories.forEach((cat) => {
    totalConfiguredWeight += cat.weightPct;
    let res: ComputedCategoryResult;

    if (cat.isLinkedAttendance === "theory" || cat.isLinkedAttendance === "lab") {
      const track = cat.isLinkedAttendance === "lab" ? record.labAttendance : record.theoryAttendance;
      const stats = cat.isLinkedAttendance === "lab" ? labStats : theoryStats;
      if (stats.totalHeld === 0) {
        res = {
          categoryId: cat.id,
          itemResults: {},
          categoryPct: null,
          earnedWeight: 0,
          hasGradedItems: false,
        };
      } else {
        const earned =
          track.markWeight > 0
            ? (stats.earnedMarks / track.markWeight) * cat.weightPct
            : (stats.attendancePct / 100) * cat.weightPct;
        res = {
          categoryId: cat.id,
          itemResults: {},
          categoryPct: cat.weightPct > 0 ? (earned / cat.weightPct) * 100 : stats.attendancePct,
          earnedWeight: earned,
          hasGradedItems: true,
        };
      }
    } else {
      res = computeCategoryScore(cat, theoryStats, labStats);
    }

    categoryResults[cat.id] = res;
    if (res.hasGradedItems) {
      gradedWeight += cat.weightPct;
      earnedWeight += res.earnedWeight;
    }
  });

  const remainingWeight = Math.max(0, totalConfiguredWeight - gradedWeight);
  const projectedPctOnGraded = gradedWeight > 0 ? (earnedWeight / gradedWeight) * 100 : 0;
  const maxPossiblePct = earnedWeight + remainingWeight;
  const gradeInfo = getBracuGradeForPct(gradedWeight > 0 ? projectedPctOnGraded : 0);

  return {
    totalConfiguredWeight,
    gradedWeight,
    remainingWeight,
    earnedWeight,
    projectedPctOnGraded,
    maxPossiblePct,
    projectedGrade: gradedWeight > 0 ? gradeInfo.grade : "—",
    projectedGpa: gradedWeight > 0 ? gradeInfo.gpa : 0,
    categoryResults,
  };
}

export function loadCoursePerformanceStore(): CoursePerformanceStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PERFORMANCE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCoursePerformanceStore(store: CoursePerformanceStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PERFORMANCE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors
  }
}

export function syncCourseGradeToMainTracker(
  semesterId: string,
  courseCode: string,
  grade: string
): boolean {
  if (typeof window === "undefined" || !grade || grade === "—") return false;
  try {
    const raw = window.localStorage.getItem("bracu_course_tracker_state");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.semesters)) return false;

    let updated = false;
    parsed.semesters = parsed.semesters.map((sem: any) => {
      if (sem.id !== semesterId || !Array.isArray(sem.courses)) return sem;
      return {
        ...sem,
        courses: sem.courses.map((c: any) => {
          if (c.code !== courseCode) return c;
          updated = true;
          return { ...c, grade, isCompleted: true };
        }),
      };
    });

    if (updated) {
      window.localStorage.setItem("bracu_course_tracker_state", JSON.stringify(parsed));
    }
    return updated;
  } catch {
    return false;
  }
}
