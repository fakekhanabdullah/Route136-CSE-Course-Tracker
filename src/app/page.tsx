"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toBlob } from "html-to-image";
import { 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Award, 
  Info, 
  Calendar, 
  GraduationCap, 
  Filter, 
  ArrowRightLeft,
  X,
  PlusCircle,
  HelpCircle,
  Lock,
  Target,
  TrendingUp,
  TrendingDown,
  FileText,
  Camera,
  List,
  Columns,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronsUpDown,
  ChevronsDownUp,
  Calculator,
  Sparkles,
  CheckCircle2,
  Crosshair,
  Repeat,
  Layers,
  BadgeCheck,
  Gauge,
  Zap,
  Search,
  Compass,
  Cloud,
  CloudOff,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Key,
  User,
  ExternalLink,
  Menu,
  Sun,
  Moon,
  GitBranch
} from "lucide-react";
import { COURSES, PREREQUISITES, Course, PrereqRule } from "./courses-data";
import {
  CloudUser,
  DriveBackupPayload,
  SyncStatus,
  BRACU_STUDENT_DOMAIN,
  DEFAULT_GSI_CLIENT_ID,
  STORAGE_KEYS,
  isAuthorizedBRACUStudent,
  loadGoogleGsiScript,
  requestGoogleAccessToken,
  fetchGoogleUserProfile,
  revokeGoogleToken,
  findDriveBackupFile,
  saveDriveBackup,
  loadDriveBackup,
  simulateStudentLogin,
  saveDemoDriveBackup,
  loadDemoDriveBackup,
  formatSyncTimestamp,
  isGoogleTokenExpired
} from "@/lib/googleDriveSync";
import CgpaSemesterGraph from "@/components/CgpaSemesterGraph";
import AddSemesterModal from "@/components/AddSemesterModal";
import AddCoursesModal from "@/components/AddCoursesModal";
import QuickGradeCarouselModal from "@/components/QuickGradeCarouselModal";
import SpeedDialMenu from "@/components/SpeedDialMenu";
import MobileBottomNav, { MobileTab } from "@/components/MobileBottomNav";
import PrereqChainsModal from "@/components/PrereqChainsModal";


// Prerequisite Helper functions
const getCoursePrereqs = (courseCode: string, pathway: 'foundation' | 'credit' | null, creditOption?: 'opt1' | 'opt2' | null) => {
  const rule = PREREQUISITES[courseCode] || { hp: [], sp: [] };
  let hp = rule.hp || [];
  let sp = rule.sp || [];

  if (pathway === 'credit') {
    hp = hp.filter(code => !["ENG091", "MAT091", "MAT092"].includes(code));
    sp = sp.filter(code => !["ENG091", "MAT091", "MAT092"].includes(code));
    if (creditOption === 'opt2') {
      hp = hp.filter(code => code !== "ENG101");
      sp = sp.filter(code => code !== "ENG101");
    }
  }

  return { hp, sp };
};

const isCourseCompletedPrior = (courseCode: string, targetSemIdx: number, semestersList: Semester[], appMode: 'tracker' | 'gpa') => {
  for (let idx = 0; idx < targetSemIdx; idx++) {
    const sem = semestersList[idx];
    const found = sem.courses.find(c => c.code === courseCode);
    if (found) {
      const isComp = appMode === 'tracker' 
        ? found.isCompleted 
        : (found.grade !== "" && found.grade !== "F");
      if (isComp) return true;
    }
  }
  return false;
};

const calculateSemesterIntakes = (semestersList: Semester[], starting: { term: 'Spring' | 'Summer' | 'Fall'; year: number }) => {
  const result: { term: 'Spring' | 'Summer' | 'Fall'; year: number }[] = [];
  
  let currentTerm = starting.term;
  let currentYear = starting.year;

  semestersList.forEach((sem) => {
    if (sem.term && sem.year) {
      currentTerm = sem.term;
      currentYear = sem.year;
    }
    
    result.push({ term: currentTerm, year: currentYear });

    if (currentTerm === 'Spring') {
      currentTerm = 'Summer';
    } else if (currentTerm === 'Summer') {
      currentTerm = 'Fall';
    } else if (currentTerm === 'Fall') {
      currentTerm = 'Spring';
      currentYear += 1;
    }
  });

  return result;
};

// Type definitions
interface SelectedCourse {
  code: string;
  grade: string;      // Mode B: 'A', 'A-', 'B+', etc. or '' (Not Taken Yet)
  isCompleted: boolean; // Mode A: simple checkbox completion
  isRepeat?: boolean;   // Flag for retaken / repeated course
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

interface OnboardingData {
  pathway: 'foundation' | 'credit' | null;
  foundationOption: 'opt1' | 'opt2' | 'opt3' | null;
  remedialEng091Checked: boolean;
  remedialMat091Checked: boolean;
  remedialMat092Checked: boolean;
  creditOption: 'opt1' | 'opt2' | null;
  rsTerm: string; // e.g. '3rd Semester'..'12th Semester' or 'not_sure'
  engStatusPriorToRS: 'caseA' | 'caseB' | 'caseC' | 'caseD' | null;
  startingTerm: 'Spring' | 'Summer' | 'Fall';
  startingYear: number;
  currentSemesterNumber?: number;
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
  "F": 0.0
};

const GRADING_SYSTEM_INFO = [
  { marks: "97 - 100*", grade: "A+", points: "4.0", remark: "Exceptional" },
  { marks: "90 - <97*", grade: "A", points: "4.0", remark: "Excellent" },
  { marks: "85 - <90", grade: "A-", points: "3.7", remark: "" },
  { marks: "80 - <85", grade: "B+", points: "3.3", remark: "" },
  { marks: "75 - <80", grade: "B", points: "3.0", remark: "Good" },
  { marks: "70 - <75", grade: "B-", points: "2.7", remark: "" },
  { marks: "65 - <70", grade: "C+", points: "2.3", remark: "" },
  { marks: "60 - <65", grade: "C", points: "2.0", remark: "Fair" },
  { marks: "57 - <60", grade: "C-", points: "1.7", remark: "" },
  { marks: "55 - <57", grade: "D+", points: "1.3", remark: "" },
  { marks: "52 - <55", grade: "D", points: "1.0", remark: "Poor" },
  { marks: "50 - <52", grade: "D-", points: "0.7", remark: "" },
  { marks: "<50", grade: "F", points: "0.0", remark: "Failure" },
];

// Deduplicate courses within a semester, preserving whichever attempt has a grade or is completed
const dedupeSemesterCourses = (courses: SelectedCourse[]): SelectedCourse[] => {
  const seen = new Map<string, SelectedCourse>();
  for (const c of courses) {
    if (!seen.has(c.code)) {
      seen.set(c.code, c);
    } else {
      const existing = seen.get(c.code)!;
      // If the newly encountered one has a grade or is completed, prioritize it over an empty/incomplete one
      if ((c.grade || c.isCompleted) && (!existing.grade && !existing.isCompleted)) {
        seen.set(c.code, c);
      }
    }
  }
  return Array.from(seen.values());
};

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);

  // Vercel Dual-Mode Theme (Dark / Light)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('flow136_theme') as 'dark' | 'light' | null;
      if (savedTheme) {
        setTheme(savedTheme);
        if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = isDark ? 'dark' : 'light';
        setTheme(initialTheme);
        if (initialTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    } catch {}
    // Preload Google Identity Services script so sign-in popup opens synchronously on click
    loadGoogleGsiScript().catch(() => {});
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('flow136_theme', next);
      } catch {}
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  // App settings/modes (Unified Always-On Course + CGPA mode)
  const [mode, setMode] = useState<'tracker' | 'gpa'>('gpa');
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  
  // Onboarding Wizard state
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    pathway: null,
    foundationOption: null,
    remedialEng091Checked: false,
    remedialMat091Checked: false,
    remedialMat092Checked: false,
    creditOption: null,
    rsTerm: "3rd Semester",
    engStatusPriorToRS: null,
    startingTerm: "Spring",
    startingYear: 2025,
    currentSemesterNumber: 1
  });

  // Semesters state
  const [semesters, setSemesters] = useState<Semester[]>([]);

  // Thesis/Capstone state
  const [thesisTrack, setThesisTrack] = useState<'thesis' | 'project' | 'internship'>('thesis');
  const [thesisSteps, setThesisSteps] = useState({
    step1: false, // Proposal submitted & supervisor assigned
    step2: false, // Mid-term defense cleared
    step3: false  // Final thesis defended
  });
  const [projectCompleted, setProjectCompleted] = useState(false);
  const [internshipCompleted, setInternshipCompleted] = useState(false);

  // UI state
  const [activeCourseSelectorSemesterId, setActiveCourseSelectorSemesterId] = useState<string | null>(null);
  const [swappingCourseCode, setSwappingCourseCode] = useState<string | null>(null);
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [courseSearchFilter, setCourseSearchFilter] = useState("All");
  const [activeCategorySelectorKey, setActiveCategorySelectorKey] = useState<string | null>(null);
  const [selectedCategoryCourseCode, setSelectedCategoryCourseCode] = useState<string>("");
  const [selectedCategoryTargetSemesterId, setSelectedCategoryTargetSemesterId] = useState<string>("");
  const [categoryCourseSearchQuery, setCategoryCourseSearchQuery] = useState<string>("");

  useEffect(() => {
    if (activeCategorySelectorKey && semesters.length > 0) {
      setSelectedCategoryTargetSemesterId(semesters[semesters.length - 1].id);
      setSelectedCategoryCourseCode("");
      setCategoryCourseSearchQuery("");
    }
  }, [activeCategorySelectorKey, semesters]);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState<boolean>(false);
  const [showDataDropdown, setShowDataDropdown] = useState<boolean>(false);
  const [backupFileError, setBackupFileError] = useState<string | null>(null);
  const [targetCgpa, setTargetCgpa] = useState<string>("3.50");

  // Floating Action / Speed Dial & Dynamic Modals state
  const [isAddSemesterModalOpen, setIsAddSemesterModalOpen] = useState<boolean>(false);
  const [focusedSemesterForModal, setFocusedSemesterForModal] = useState<Semester | null>(null);
  const [isAddCoursesModalOpen, setIsAddCoursesModalOpen] = useState<boolean>(false);
  const [addCoursesPreselected, setAddCoursesPreselected] = useState<string[]>([]);
  const [addCoursesTargetSemesterId, setAddCoursesTargetSemesterId] = useState<string | null>(null);
  const [activeCourseMenuKey, setActiveCourseMenuKey] = useState<string | null>(null);
  const [activeSemesterMenuId, setActiveSemesterMenuId] = useState<string | null>(null);
  const [isQuickGradesModalOpen, setIsQuickGradesModalOpen] = useState<boolean>(false);
  const [quickGradesInitialSemIdx, setQuickGradesInitialSemIdx] = useState<number>(0);
  const [isMobileSpeedDialOpen, setIsMobileSpeedDialOpen] = useState<boolean>(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<MobileTab>("semesters");
  const [isExtraSidebarOpen, setIsExtraSidebarOpen] = useState<boolean>(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>("");
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  const globalFilteredCourses = useMemo(() => {
    if (!globalSearchQuery.trim()) return [];
    const q = globalSearchQuery.toLowerCase().trim();
    return COURSES.filter(c => 
      c.code.toLowerCase().includes(q) || 
      c.title.toLowerCase().includes(q) || 
      (c.category && c.category.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [globalSearchQuery]);


  // Keep focusedSemesterForModal synced with live semesters state
  useEffect(() => {
    if (focusedSemesterForModal) {
      const refreshed = semesters.find(s => s.id === focusedSemesterForModal.id);
      if (refreshed) {
        setFocusedSemesterForModal(refreshed);
      }
    }
  }, [semesters]);

  const [showRoiModal, setShowRoiModal] = useState<boolean>(false);
  const [showPrereqChainsModal, setShowPrereqChainsModal] = useState<boolean>(false);
  const [roiThresholdGrade, setRoiThresholdGrade] = useState<string>("B-");
  const [selectedRoiCourses, setSelectedRoiCourses] = useState<Record<string, boolean>>({});
  const [roiTargetGrades, setRoiTargetGrades] = useState<Record<string, string>>({});
  const [showGradingSystemModal, setShowGradingSystemModal] = useState<boolean>(false);
  const [isCapstoneCollapsed, setIsCapstoneCollapsed] = useState<boolean>(true);
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState<boolean>(false);
  const [showGradeSheetModal, setShowGradeSheetModal] = useState<boolean>(false);
  const [snapshotScale, setSnapshotScale] = useState<number>(1);
  const [snapshotHeight, setSnapshotHeight] = useState<number>(700);

  // Cloud Sync & Auth Gatekeeper State
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<SyncStatus>('unauthenticated');
  const [cloudLastSync, setCloudLastSync] = useState<string | null>(null);
  const [cloudFileId, setCloudFileId] = useState<string | null>(null);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState<boolean>(true);
  const [showCloudModal, setShowCloudModal] = useState<boolean>(false);
  const [gatekeeperError, setGatekeeperError] = useState<string | null>(null);
  const [customClientId, setCustomClientId] = useState<string>('');
  const [showClientIdInput, setShowClientIdInput] = useState<boolean>(false);
  const [cloudToastMessage, setCloudToastMessage] = useState<string | null>(null);
  const [cloudConflictPayload, setCloudConflictPayload] = useState<DriveBackupPayload | null>(null);
  const [showCloudConflictModal, setShowCloudConflictModal] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const cloudSyncDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Dynamic scaling for the Academic Progress Snapshot Preview Modal
  useEffect(() => {
    if (!showGradeSheetModal) return;

    const updateScaling = () => {
      const element = document.getElementById("flow136-grade-sheet-export-node");
      if (!element) return;
      
      const naturalHeight = element.offsetHeight || 700;
      setSnapshotHeight(naturalHeight);

      // Parent container width calculation
      const scrollParent = element.closest('.overflow-y-auto') as HTMLElement | null;
      const containerWidth = scrollParent ? scrollParent.clientWidth : window.innerWidth;
      // Subtract internal padding (16px left + 16px right = 32px safe margin)
      const availableWidth = Math.max(260, (containerWidth || window.innerWidth) - 32);
      
      const scaleVal = Math.min(1, Math.max(0.25, availableWidth / 750));
      setSnapshotScale(scaleVal);
    };

    // Run layout measuring after render
    const timer = setTimeout(updateScaling, 60);
    window.addEventListener("resize", updateScaling);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateScaling);
    };
  }, [showGradeSheetModal, semesters, mode]);

  const [showRoadmapModal, setShowRoadmapModal] = useState<boolean>(false);
  const [roadmapActiveTab, setRoadmapActiveTab] = useState<'all' | 'dept' | 'outside' | 'gened'>('all');
  const [roadmapSearch, setRoadmapSearch] = useState<string>('');
  const [showDashboard, setShowDashboard] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [semesterSortOrder, setSemesterSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [draggingCourseCode, setDraggingCourseCode] = useState<string | null>(null);
  const [draggingSourceSemesterId, setDraggingSourceSemesterId] = useState<string | null>(null);
  const [dragOverSemesterId, setDragOverSemesterId] = useState<string | null>(null);

  // Kanban board top-scrollbar synchronization refs
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const topScrollBarRef = useRef<HTMLDivElement>(null);
  const [kanbanScrollWidth, setKanbanScrollWidth] = useState<number>(0);
  const isSyncingScroll = useRef<boolean>(false);

  useEffect(() => {
    if (viewMode !== 'kanban') return;
    const el = boardContainerRef.current;
    if (!el) return;

    const updateWidth = () => {
      if (boardContainerRef.current) {
        setKanbanScrollWidth(boardContainerRef.current.scrollWidth);
      }
    };

    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    window.addEventListener('resize', updateWidth);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [viewMode, semesters, semesterSortOrder]);

  const handleTopScroll = () => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (boardContainerRef.current && topScrollBarRef.current) {
      boardContainerRef.current.scrollLeft = topScrollBarRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const handleBoardScroll = () => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (topScrollBarRef.current && boardContainerRef.current) {
      topScrollBarRef.current.scrollLeft = boardContainerRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  // Kanban mouse wheel & drag-to-scroll support
  const isPointerDownRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);

  const handleBoardMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('select') || target.closest('input') || target.closest('[draggable="true"]')) {
      return;
    }
    isPointerDownRef.current = true;
    dragStartXRef.current = e.pageX;
    dragScrollLeftRef.current = boardContainerRef.current?.scrollLeft || 0;
  };

  const handleBoardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current || !boardContainerRef.current) return;
    e.preventDefault();
    const walk = (e.pageX - dragStartXRef.current) * 1.4;
    boardContainerRef.current.scrollLeft = dragScrollLeftRef.current - walk;
  };

  const handleBoardMouseUp = () => {
    isPointerDownRef.current = false;
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isPointerDownRef.current = false;
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const handleBoardWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (currentLayout === 'kanban' && boardContainerRef.current) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        boardContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  // Monitor screen width for responsive features
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Register Service Worker for PWA (Progressive Web App) support
  useEffect(() => {
    if (
      typeof window !== 'undefined' && 
      'serviceWorker' in navigator && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1' && 
      !window.location.hostname.startsWith('192.168.')
    ) {
      const registerSW = async () => {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered successfully with scope:', reg.scope);
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      };
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  // Hydration fix & LocalStorage Loader & Service Worker Uninstaller for Dev
  useEffect(() => {
    setIsMounted(true);

    // Programmatically unregister and purge any cached files from previous localhost service worker installations
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' || 
        window.location.hostname.startsWith('192.168.')
      ) {
        const devPurgeKey = 'flow136_dev_purged';
        if (!sessionStorage.getItem(devPurgeKey)) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            if (registrations.length > 0) {
              for (let registration of registrations) {
                registration.unregister();
              }
              if ('caches' in window) {
                caches.keys().then((names) => {
                  for (let name of names) {
                    caches.delete(name);
                  }
                });
              }
              sessionStorage.setItem(devPurgeKey, 'true');
              window.location.reload(); // Refresh once to pull fresh uncached client resources
            }
          });
        }
      }
    }

    try {
      const savedView = localStorage.getItem("flow136_view_mode");
      if (savedView === "list" || savedView === "kanban") {
        setViewMode(savedView);
      }

      const savedSort = localStorage.getItem("flow136_semester_sort");
      if (savedSort === "asc" || savedSort === "desc") {
        setSemesterSortOrder(savedSort);
      }

      const savedState = localStorage.getItem("bracu_course_tracker_state");
      if (savedState) {
        const parsed = JSON.parse(savedState);
        setMode('gpa');
        if (parsed.isOnboarded !== undefined) setIsOnboarded(parsed.isOnboarded);
        if (parsed.semesters && Array.isArray(parsed.semesters)) {
          const sanitized = parsed.semesters.map((s: Semester) => ({
            ...s,
            courses: dedupeSemesterCourses(s.courses || [])
          }));
          setSemesters(sanitized);
        }
        if (parsed.thesisTrack) setThesisTrack(parsed.thesisTrack);
        if (parsed.thesisSteps) setThesisSteps(parsed.thesisSteps);
        if (parsed.projectCompleted !== undefined) setProjectCompleted(parsed.projectCompleted);
        if (parsed.internshipCompleted !== undefined) setInternshipCompleted(parsed.internshipCompleted);
        if (parsed.onboardingData) {
          setOnboardingData({
            currentSemesterNumber: 1,
            ...parsed.onboardingData
          });
        }
      }

      // Hydrate Cloud Sync session & Guest Mode
      const savedCloudUser = localStorage.getItem(STORAGE_KEYS.USER);
      const savedLastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      const savedFileId = localStorage.getItem(STORAGE_KEYS.FILE_ID);
      const savedAutoSync = localStorage.getItem(STORAGE_KEYS.AUTO_SYNC);
      const savedCustomClientId = localStorage.getItem(STORAGE_KEYS.CUSTOM_CLIENT_ID);
      const savedIsGuest = localStorage.getItem(STORAGE_KEYS.IS_GUEST);
      const savedDemoMode = localStorage.getItem(STORAGE_KEYS.DEMO_MODE);

      if (savedIsGuest === 'true') {
        setIsGuest(true);
        setShowDashboard(true);
      }
      if (savedCustomClientId) setCustomClientId(savedCustomClientId);
      if (savedAutoSync !== null) setIsAutoSyncEnabled(savedAutoSync === 'true');
      if (savedFileId) setCloudFileId(savedFileId);
      if (savedLastSync) setCloudLastSync(savedLastSync);

      if (savedCloudUser) {
        try {
          const userObj = JSON.parse(savedCloudUser);
          if (userObj && isAuthorizedBRACUStudent(userObj.email)) {
            const isDemo = savedDemoMode === 'true';
            const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
            if (isDemo) {
              setCloudUser(userObj);
              setShowDashboard(true);
              setCloudSyncStatus('synced');
            } else if (savedToken && !isGoogleTokenExpired()) {
              setCloudUser(userObj);
              setShowDashboard(true);
              setCloudSyncStatus('synced');
            } else {
              // Token expired — clear cloud session and send user back to homepage
              localStorage.removeItem(STORAGE_KEYS.USER);
              localStorage.removeItem(STORAGE_KEYS.TOKEN);
              localStorage.removeItem(STORAGE_KEYS.TOKEN_EXP);
              localStorage.removeItem(STORAGE_KEYS.FILE_ID);
              localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
              localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
              localStorage.removeItem(STORAGE_KEYS.IS_GUEST);
              // User stays on homepage (showDashboard remains false)
            }
          } else {
            localStorage.removeItem(STORAGE_KEYS.USER);
          }
        } catch {
          localStorage.removeItem(STORAGE_KEYS.USER);
        }
      }
    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
    }
  }, []);

  // Periodic session-expiry guard: if the Google token expires while the user is
  // using the tracker, automatically sign them out and return to the landing page.
  useEffect(() => {
    if (!isMounted || !cloudUser) return;
    const isDemo = localStorage.getItem(STORAGE_KEYS.DEMO_MODE) === 'true';
    if (isDemo) return; // demo sessions never expire

    const checkInterval = setInterval(() => {
      if (isGoogleTokenExpired()) {
        clearInterval(checkInterval);
        // Full logout — mirrors handleCloudSignOut
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        if (token) revokeGoogleToken(token).catch(() => {});
        setCloudUser(null);
        setIsGuest(false);
        setCloudSyncStatus('unauthenticated');
        setCloudLastSync(null);
        setCloudFileId(null);
        setGatekeeperError(null);
        setShowDashboard(false);
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.TOKEN_EXP);
        localStorage.removeItem(STORAGE_KEYS.FILE_ID);
        localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
        localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
        localStorage.removeItem(STORAGE_KEYS.IS_GUEST);
        showCloudToast("Session expired. Please sign in again or continue as guest.");
      }
    }, 60_000); // check every 60 seconds

    return () => clearInterval(checkInterval);
  }, [isMounted, cloudUser]);

  // Sync state to LocalStorage
  const saveStateToLocalStorage = (
    currentMode: 'tracker' | 'gpa',
    currentOnboarded: boolean,
    currentSemesters: Semester[],
    currentThesisTrack: 'thesis' | 'project' | 'internship',
    currentThesisSteps: typeof thesisSteps,
    currentProjectCompleted: boolean,
    currentInternshipCompleted: boolean,
    currentOnboardingData: OnboardingData
  ) => {
    try {
      localStorage.setItem("bracu_course_tracker_state", JSON.stringify({
        mode: currentMode,
        isOnboarded: currentOnboarded,
        semesters: currentSemesters,
        thesisTrack: currentThesisTrack,
        thesisSteps: currentThesisSteps,
        projectCompleted: currentProjectCompleted,
        internshipCompleted: currentInternshipCompleted,
        onboardingData: currentOnboardingData
      }));
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
    }
  };

  const updateSemesters = (newSemesters: Semester[]) => {
    const sanitized = newSemesters.map(s => ({
      ...s,
      courses: dedupeSemesterCourses(s.courses || [])
    }));
    setSemesters(sanitized);
    saveStateToLocalStorage(
      mode,
      isOnboarded,
      sanitized,
      thesisTrack,
      thesisSteps,
      projectCompleted,
      internshipCompleted,
      onboardingData
    );
  };

  const handleModeToggle = () => {
    const nextMode = 'gpa';
    setMode(nextMode);
    saveStateToLocalStorage(
      nextMode,
      isOnboarded,
      semesters,
      thesisTrack,
      thesisSteps,
      projectCompleted,
      internshipCompleted,
      onboardingData
    );
  };

  // Build or refresh the 12 default semesters for Step 3 of the Setup Wizard
  const buildTwelveDefaultSemesters = (existingSems?: Semester[]): Semester[] => {
    const semNames = [
      "1st Semester",
      "2nd Semester",
      "3rd Semester",
      "4th Semester",
      "5th Semester",
      "6th Semester",
      "7th Semester",
      "8th Semester",
      "9th Semester",
      "10th Semester",
      "11th Semester",
      "12th Semester"
    ];
    let rsIndex = -1;
    if (onboardingData.rsTerm && onboardingData.rsTerm !== "not_sure") {
      const parsed = parseInt(onboardingData.rsTerm, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
        rsIndex = parsed - 1;
      }
    }
    const currentSemNum = onboardingData.currentSemesterNumber || 1;

    const draftSemesters: Semester[] = [];
    for (let i = 0; i < 12; i++) {
      const isRS = i === rsIndex;
      const semName = isRS ? "Residential Semester (RS)" : semNames[i];
      const existing = existingSems && existingSems[i];
      draftSemesters.push({
        id: `sem-${i + 1}`,
        name: semName,
        courses: existing ? [...existing.courses] : [],
        isRS
      });
    }

    // Track all courses already present across draftSemesters so we never duplicate
    const addedCourses = new Set<string>();
    draftSemesters.forEach(s => s.courses.forEach(c => addedCourses.add(c.code)));

    const addUniqueToSem = (semIdx: number, courseObj: SelectedCourse) => {
      if (addedCourses.has(courseObj.code)) return;
      draftSemesters[semIdx].courses.push(courseObj);
      addedCourses.add(courseObj.code);
    };

    // 1st Semester baseline from Step 2 (Pathway)
    if (onboardingData.pathway === 'foundation') {
      if (onboardingData.remedialEng091Checked) {
        addUniqueToSem(0, { code: "ENG091", grade: "A", isCompleted: true });
      }
      if (onboardingData.remedialMat091Checked) {
        addUniqueToSem(0, { code: "MAT091", grade: "A", isCompleted: true });
      }
      if (onboardingData.remedialMat092Checked) {
        addUniqueToSem(0, { code: "MAT092", grade: "A", isCompleted: true });
      }
    } else if (onboardingData.pathway === 'credit') {
      if (onboardingData.creditOption === 'opt1') {
        addUniqueToSem(0, { code: "ENG101", grade: "", isCompleted: currentSemNum > 1 });
      } else if (onboardingData.creditOption === 'opt2') {
        addUniqueToSem(0, { code: "ENG102", grade: "", isCompleted: currentSemNum > 1 });
      }
    }

    // Only pre-populate the 3 mandatory RS courses (EMB101, HUM103, BNG103) if user chose an RS semester and has reached or passed it.
    // The 4th RS course (ENG102 vs. BU201) is chosen by the user directly on the RS card in Step 3.
    if (rsIndex >= 0 && currentSemNum >= rsIndex + 1) {
      const rsCompleted = currentSemNum > rsIndex + 1;
      addUniqueToSem(rsIndex, { code: "EMB101", grade: "", isCompleted: rsCompleted });
      addUniqueToSem(rsIndex, { code: "HUM103", grade: "", isCompleted: rsCompleted });
      addUniqueToSem(rsIndex, { code: "BNG103", grade: "", isCompleted: rsCompleted });
    }

    return draftSemesters;
  };

  // Transition from Step 2 to Step 3: prepare 12 semesters without auto-dumping courses
  const handleProceedToWizardStep3 = () => {
    const initialized = buildTwelveDefaultSemesters(semesters.length === 12 ? semesters : undefined);
    setSemesters(initialized);
    setWizardStep(3);
  };

  // Finalize Onboarding Plan (12 Semesters, preserving user-added courses and leaving future semesters clean)
  const generateInitialPlan = () => {
    const finalSemesters = semesters.length === 12
      ? semesters.map(s => ({ ...s, courses: dedupeSemesterCourses(s.courses || []) }))
      : buildTwelveDefaultSemesters();

    setSemesters(finalSemesters);
    setMode('gpa');
    setIsOnboarded(true);
    setWizardStep(1);

    // Sync
    saveStateToLocalStorage(
      'gpa',
      true,
      finalSemesters,
      thesisTrack,
      thesisSteps,
      projectCompleted,
      internshipCompleted,
      onboardingData
    );
  };

  // Reset all app data
  const handleResetData = () => {
    localStorage.removeItem("bracu_course_tracker_state");
    localStorage.removeItem("bracu_cse_tracker_welcome_shown");
    localStorage.removeItem("flow136_view_mode");
    window.location.reload();
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const stateExport = {
      mode,
      isOnboarded,
      semesters,
      thesisTrack,
      thesisSteps,
      projectCompleted,
      internshipCompleted,
      onboardingData
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stateExport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "Route136_Backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Generate & Download Academic Progress Snapshot PNG Image
  const handleGenerateGradeSheet = async () => {
    setIsGeneratingSnapshot(true);
    try {
      const node = document.getElementById("flow136-grade-sheet-export-node");
      if (!node) {
        setIsGeneratingSnapshot(false);
        return;
      }

      // Micro-delay to let DOM state settle
      await new Promise(res => setTimeout(res, 50));

      const scrollParent = (node.closest(".overflow-y-auto") || node.parentElement) as HTMLElement;
      const originalScrollTop = scrollParent ? scrollParent.scrollTop : 0;
      const originalScrollLeft = scrollParent ? scrollParent.scrollLeft : 0;

      // Temporarily scroll parent container to top to prevent html-to-image cropping bug
      if (scrollParent) {
        scrollParent.scrollTop = 0;
        scrollParent.scrollLeft = 0;
      }

      const width = node.offsetWidth || 750;
      const height = node.offsetHeight || node.scrollHeight;

      toBlob(node, {
        cacheBust: true,
        skipFonts: false,
        pixelRatio: 2.0, // Clean, high-definition output
        backgroundColor: '#050507',
        width: width,
        height: height,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          maxHeight: 'none',
          overflow: 'visible',
          transform: 'none',
          margin: '0 auto'
        }
      } as any).then((blob) => {
        // Restore parent scroll positions immediately after canvas paint completes
        if (scrollParent) {
          scrollParent.scrollTop = originalScrollTop;
          scrollParent.scrollLeft = originalScrollLeft;
        }

        if (!blob) {
          throw new Error("Blob generation failed");
        }
        // Programmatic fast-download
        const url = URL.createObjectURL(blob);
        const filename = `Route136_Progress_${cumulativeStats.completedCredits}cr.png`;
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        // Cleanup memory
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setIsGeneratingSnapshot(false);
      }).catch((err) => {
        // Guarantee parent scroll state recovery in error path
        if (scrollParent) {
          scrollParent.scrollTop = originalScrollTop;
          scrollParent.scrollLeft = originalScrollLeft;
        }
        console.error('Image export failed:', err);
        setIsGeneratingSnapshot(false);
      });

    } catch (err) {
      console.error("Failed to generate grade sheet snapshot image:", err);
      setIsGeneratingSnapshot(false);
    }
  };

  // Toggle view mode preference
  const handleToggleViewMode = (mode: 'list' | 'kanban') => {
    setViewMode(mode);
    localStorage.setItem("flow136_view_mode", mode);
  };

  // Toggle semester sort order (First to Last vs Last to First)
  const handleToggleSemesterSort = (order?: 'asc' | 'desc') => {
    const nextOrder = order || (semesterSortOrder === 'asc' ? 'desc' : 'asc');
    setSemesterSortOrder(nextOrder);
    try {
      localStorage.setItem("flow136_semester_sort", nextOrder);
    } catch {}
  };

  // Move a course from one semester to another via drag-and-drop (Atomic state transition)
  const handleDragMoveCourse = (courseCode: string, sourceSemesterId: string, targetSemesterId: string) => {
    if (sourceSemesterId === targetSemesterId) return;

    const targetSem = semesters.find(s => s.id === targetSemesterId);
    if (targetSem && targetSem.courses.some(c => c.code === courseCode)) {
      setDragOverSemesterId(null);
      return;
    }

    const sourceSem = semesters.find(s => s.id === sourceSemesterId);
    const courseObj = sourceSem?.courses.find(c => c.code === courseCode);
    if (!courseObj) return;

    handleMoveCourse(sourceSemesterId, targetSemesterId, courseObj);
    setDragOverSemesterId(null);
  };

  // Import JSON Backup
  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    setBackupFileError(null);
    const fileReader = new FileReader();
    const files = event.target.files;
    
    if (!files || files.length === 0) return;
    
    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.semesters && Array.isArray(parsed.semesters)) {
          if (parsed.mode) setMode(parsed.mode);
          if (parsed.isOnboarded !== undefined) setIsOnboarded(parsed.isOnboarded);
          setSemesters(parsed.semesters);
          if (parsed.thesisTrack) setThesisTrack(parsed.thesisTrack);
          if (parsed.thesisSteps) setThesisSteps(parsed.thesisSteps);
          if (parsed.projectCompleted !== undefined) setProjectCompleted(parsed.projectCompleted);
          if (parsed.internshipCompleted !== undefined) setInternshipCompleted(parsed.internshipCompleted);
          if (parsed.onboardingData) setOnboardingData(parsed.onboardingData);

          // Save
          saveStateToLocalStorage(
            parsed.mode || mode,
            parsed.isOnboarded !== undefined ? parsed.isOnboarded : isOnboarded,
            parsed.semesters,
            parsed.thesisTrack || thesisTrack,
            parsed.thesisSteps || thesisSteps,
            parsed.projectCompleted !== undefined ? parsed.projectCompleted : projectCompleted,
            parsed.internshipCompleted !== undefined ? parsed.internshipCompleted : internshipCompleted,
            parsed.onboardingData || onboardingData
          );
        } else {
          setBackupFileError("Invalid backup file: Missing semesters layout.");
        }
      } catch (err) {
        setBackupFileError("Failed to parse the backup file. Please ensure it is a valid JSON file.");
      }
    };
    fileReader.readAsText(files[0]);
  };

  // Capstone completion logic based on selected Track and active Mode
  const isCSE400Passed = useMemo(() => {
    let milestonesDone = false;
    if (thesisTrack === 'thesis') {
      milestonesDone = !!(thesisSteps.step1 && thesisSteps.step2 && thesisSteps.step3);
    } else if (thesisTrack === 'project') {
      milestonesDone = !!projectCompleted;
    } else {
      milestonesDone = !!internshipCompleted;
    }

    if (!milestonesDone) return false;

    if (mode === 'gpa') {
      let capstoneGrade = "";
      for (const sem of semesters) {
        const found = sem.courses.find(c => c.code === "CSE400");
        if (found) {
          capstoneGrade = found.grade || "";
          break;
        }
      }
      return capstoneGrade !== "" && capstoneGrade !== "F";
    }

    return true;
  }, [thesisTrack, thesisSteps, projectCompleted, internshipCompleted, mode, semesters]);

  // Master completion rule: if final thesis defended is checked, check step 1 and step 2
  const handleThesisStep3Toggle = (checked: boolean) => {
    const newSteps = {
      step1: checked ? true : thesisSteps.step1,
      step2: checked ? true : thesisSteps.step2,
      step3: checked
    };
    setThesisSteps(newSteps);
    
    // Update grade logic for CSE400 if passed
    const updated = semesters.map(sem => ({
      ...sem,
      courses: sem.courses.map(c => {
        if (c.code === "CSE400") {
          return {
            ...c,
            isCompleted: checked
          };
        }
        return c;
      })
    }));
    updateSemesters(updated);
  };

  const simulatedSemesters = semesters;

  // Semesters ordered for UI display according to user preference (First to Last vs Last to First)
  const displayedSemesters = useMemo(() => {
    const list = simulatedSemesters.map((sem, originalIdx) => ({ sem, originalIdx }));
    if (semesterSortOrder === 'desc') {
      return list.slice().reverse();
    }
    return list;
  }, [simulatedSemesters, semesterSortOrder]);

  // Unique courses dictionary representing the most recent attempts
  // Needed for "Math Rule" (factoring in only newest attempt into credit count and cumulative CGPA)
  const newestCourseAttempts = useMemo(() => {
    const result: Record<string, { semesterIdx: number; course: SelectedCourse }> = {};

    simulatedSemesters.forEach((sem, semIdx) => {
      sem.courses.forEach(c => {
        const existing = result[c.code];
        if (!existing) {
          result[c.code] = { semesterIdx: semIdx, course: c };
        } else {
          // Check if current or existing attempt has a grade or is completed
          const currentHasGrade = !!(c.grade && GRADING_SCALE[c.grade] !== undefined);
          const existingHasGrade = !!(existing.course.grade && GRADING_SCALE[existing.course.grade] !== undefined);

          const currentIsActive = mode === 'tracker'
            ? c.isCompleted
            : (c.isCompleted || currentHasGrade);
          const existingIsActive = mode === 'tracker'
            ? existing.course.isCompleted
            : (existing.course.isCompleted || existingHasGrade);

          if (currentIsActive) {
            // A newer active (graded/completed) attempt replaces any prior attempt
            result[c.code] = { semesterIdx: semIdx, course: c };
          } else if (!existingIsActive) {
            // If neither attempt is active/graded, track the latest placeholder
            result[c.code] = { semesterIdx: semIdx, course: c };
          }
          // If existing is active (graded) and current is an untaken placeholder in a later semester,
          // PRESERVE the existing active attempt so planned future courses do not wipe out completed grades!
        }
      });
    });

    return result;
  }, [simulatedSemesters, mode]);

  const isCourseMandatory = useCallback((code: string) => {
    const c = COURSES.find(co => co.code === code);
    if (!c) return false;

    // Scenario B English overrides
    const isScenarioB = onboardingData.pathway === 'credit' && (onboardingData.creditOption === 'opt2' || onboardingData.engStatusPriorToRS === 'caseD');
    if (isScenarioB) {
      if (code === "ENG101") return false;
      if (code === "ENG103") return true;
    } else {
      if (code === "ENG103") return false;
    }

    if (c.category === "School Core (Math & Sciences)") return true;

    return c.mandatory;
  }, [onboardingData.pathway, onboardingData.creditOption, onboardingData.engStatusPriorToRS]);

  const renderMandatoryBadge = useCallback((code: string) => {
    const isScenarioB = onboardingData.pathway === 'credit' && (onboardingData.creditOption === 'opt2' || onboardingData.engStatusPriorToRS === 'caseD');
    
    if (code === "ENG103" && isScenarioB) {
      return (
        <span 
          title="Mandatory Requirement: Because you placed directly into ENG102, ENG103 is required to fulfill your 6-credit GenEd Stream 1 writing comprehension requirement."
          className="text-[9px] font-extrabold border border-amber-500/30 text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider cursor-help select-none shadow-sm"
        >
          Mandatory Core
        </span>
      );
    }

    const isMand = isCourseMandatory(code);
    if (isMand) {
      return (
        <span className="text-[9px] font-extrabold border border-amber-500/30 text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider select-none shadow-sm">
          Mandatory Core
        </span>
      );
    } else {
      return (
        <span className="text-[9px] font-extrabold border border-slate-700/60 text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded-full uppercase tracking-wider select-none">
          Elective
        </span>
      );
    }
  }, [onboardingData.pathway, onboardingData.creditOption, onboardingData.engStatusPriorToRS, isCourseMandatory]);

  const getCategoryTheme = useCallback((category?: string, code?: string) => {
    let cat = category;
    if (!cat && code) {
      const found = COURSES.find(c => c.code === code);
      cat = found?.category || "";
    }
    switch (cat) {
      case "Program Core":
        return {
          label: "Program Core",
          badge: "bg-blue-500/15 border-blue-500/30 text-blue-300",
          cardBorder: "border-blue-500/25 hover:border-blue-500/50",
          cardGlow: "shadow-[0_0_15px_rgba(59,130,246,0.06)]",
          codePill: "text-blue-300 border-blue-500/30 bg-blue-950/40",
          accentColor: "#3b82f6",
          leftBar: "bg-blue-500"
        };
      case "School Core (Math & Sciences)":
        return {
          label: "School Core",
          badge: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          cardBorder: "border-cyan-500/25 hover:border-cyan-500/50",
          cardGlow: "shadow-[0_0_15px_rgba(6,182,212,0.06)]",
          codePill: "text-cyan-300 border-cyan-500/30 bg-cyan-950/40",
          accentColor: "#06b6d4",
          leftBar: "bg-cyan-500"
        };
      case "Capstone (Thesis / Project / Internship)":
        return {
          label: "Capstone",
          badge: "bg-purple-500/15 border-purple-500/30 text-purple-300",
          cardBorder: "border-purple-500/25 hover:border-purple-500/50",
          cardGlow: "shadow-[0_0_15px_rgba(168,85,247,0.06)]",
          codePill: "text-purple-300 border-purple-500/30 bg-purple-950/40",
          accentColor: "#a855f7",
          leftBar: "bg-purple-500"
        };
      case "CSE Major Elective":
        return {
          label: "CSE Elective",
          badge: "bg-amber-500/15 border-amber-500/30 text-amber-300",
          cardBorder: "border-amber-500/25 hover:border-amber-500/50",
          cardGlow: "shadow-[0_0_15px_rgba(245,158,11,0.06)]",
          codePill: "text-amber-300 border-amber-500/30 bg-amber-950/40",
          accentColor: "#f59e0b",
          leftBar: "bg-amber-500"
        };
      case "GenEd Stream 1":
        return {
          label: "Stream 1",
          badge: "bg-rose-500/15 border-rose-500/30 text-rose-300",
          cardBorder: "border-rose-500/25 hover:border-rose-500/50",
          cardGlow: "shadow-[0_0_15px_rgba(244,63,94,0.06)]",
          codePill: "text-rose-300 border-rose-500/30 bg-rose-950/40",
          accentColor: "#f43f5e",
          leftBar: "bg-rose-500"
        };
      case "GenEd Stream 2":
        return {
          label: "Stream 2",
          badge: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300",
          cardBorder: "border-indigo-500/25 hover:border-indigo-500/50",
          cardGlow: "shadow-[0_0_15px_rgba(99,102,241,0.06)]",
          codePill: "text-indigo-300 border-indigo-500/30 bg-indigo-950/40",
          accentColor: "#6366f1",
          leftBar: "bg-indigo-500"
        };
      case "GenEd Stream 3":
        return {
          label: "Stream 3",
          badge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
          cardBorder: "border-emerald-500/25 hover:border-emerald-500/50",
          cardGlow: "shadow-[0_0_15px_rgba(16,185,129,0.06)]",
          codePill: "text-emerald-300 border-emerald-500/30 bg-emerald-950/40",
          accentColor: "#10b981",
          leftBar: "bg-emerald-500"
        };
      case "GenEd Stream 4":
        return {
          label: "Stream 4",
          badge: "bg-violet-500/15 border-violet-500/30 text-violet-300",
          cardBorder: "border-violet-500/25 hover:border-violet-500/50",
          cardGlow: "shadow-[0_0_15px_rgba(139,92,246,0.06)]",
          codePill: "text-violet-300 border-violet-500/30 bg-violet-950/40",
          accentColor: "#8b5cf6",
          leftBar: "bg-violet-500"
        };
      case "GenEd Stream 5":
        return {
          label: "Stream 5",
          badge: "bg-teal-500/15 border-teal-500/30 text-teal-300",
          cardBorder: "border-teal-500/25 hover:border-teal-500/50",
          cardGlow: "shadow-[0_0_15px_rgba(20,184,166,0.06)]",
          codePill: "text-teal-300 border-teal-500/30 bg-teal-950/40",
          accentColor: "#14b8a6",
          leftBar: "bg-teal-500"
        };
      case "Non-Credit":
        return {
          label: "Non-Credit",
          badge: "bg-zinc-800/50 border-zinc-700/60 text-slate-400",
          cardBorder: "border-zinc-800/80 hover:border-zinc-700/80",
          cardGlow: "",
          codePill: "text-slate-300 border-zinc-700/60 bg-zinc-900/60",
          accentColor: "#64748b",
          leftBar: "bg-slate-600"
        };
      default:
        return {
          label: "Elective",
          badge: "bg-zinc-800/50 border-zinc-700/60 text-slate-400",
          cardBorder: "border-zinc-800/80 hover:border-zinc-700/80",
          cardGlow: "",
          codePill: "text-slate-300 border-zinc-700/60 bg-zinc-900/60",
          accentColor: "#64748b",
          leftBar: "bg-slate-600"
        };
    }
  }, []);

  // Chronological term/year calculation for semesters
  const semesterIntakes = useMemo(() => {
    return calculateSemesterIntakes(semesters, {
      term: onboardingData.startingTerm || 'Spring',
      year: onboardingData.startingYear || 2025
    });
  }, [semesters, onboardingData.startingTerm, onboardingData.startingYear]);

  // Repeat ROI Recommendations & Multi-Course Simulation for Mode B
  const roiAnalysis = useMemo(() => {
    if (mode !== 'gpa') return {
      currentCgpa: 0,
      totalCgpaCredits: 0,
      candidates: [],
      combinedSelectedCount: 0,
      combinedSelectedCredits: 0,
      combinedNewCgpa: 0,
      combinedDelta: 0,
      hasDecreases: false,
      hasIncreases: false,
    };

    let totalCgpaCredits = 0;
    let totalCgpaPoints = 0;

    Object.keys(newestCourseAttempts).forEach(code => {
      const { course } = newestCourseAttempts[code];
      const courseData = COURSES.find(co => co.code === code);
      const credits = code === "CSE400" ? 4 : (courseData?.credits ?? 3);

      if (courseData?.category === "Non-Credit" || (courseData?.credits ?? 0) === 0) return;

      if (course.isCompleted && course.grade && GRADING_SCALE[course.grade] !== undefined) {
        totalCgpaCredits += credits;
        totalCgpaPoints += GRADING_SCALE[course.grade] * credits;
      }
    });

    const currentCgpa = totalCgpaCredits > 0 ? (totalCgpaPoints / totalCgpaCredits) : 0.00;

    const thresholdGp = roiThresholdGrade === 'all'
      ? 4.0
      : (GRADING_SCALE[roiThresholdGrade] ?? 2.7);

    const candidates: {
      code: string;
      title: string;
      credits: number;
      currentGrade: string;
      currentGp: number;
      targetGrade: string;
      targetGp: number;
      isSelected: boolean;
      delta: number;
      newCgpa: number;
      isF: boolean;
    }[] = [];

    Object.keys(newestCourseAttempts).forEach(code => {
      const { course } = newestCourseAttempts[code];
      const courseData = COURSES.find(co => co.code === code);
      const credits = code === "CSE400" ? 4 : (courseData?.credits ?? 3);

      if (courseData?.category === "Non-Credit" || (courseData?.credits ?? 0) === 0) return;

      if (course.isCompleted && course.grade && GRADING_SCALE[course.grade] !== undefined) {
        const currentGp = GRADING_SCALE[course.grade];
        const isF = course.grade === 'F';

        // Courses with F are always automatically included; other courses check against threshold
        const isEligible = isF || (roiThresholdGrade === 'all' ? currentGp < 4.0 : currentGp <= thresholdGp);

        if (isEligible) {
          const targetGrade = roiTargetGrades[code] || "A";
          const targetGp = GRADING_SCALE[targetGrade] ?? 4.0;
          const isSelected = selectedRoiCourses[code] ?? true;

          // Single course delta
          const singleNewPoints = totalCgpaPoints - (currentGp * credits) + (targetGp * credits);
          const singleNewCgpa = totalCgpaCredits > 0 ? (singleNewPoints / totalCgpaCredits) : 0;
          const delta = singleNewCgpa - currentCgpa;

          candidates.push({
            code,
            title: courseData?.title || code,
            credits,
            currentGrade: course.grade,
            currentGp,
            targetGrade,
            targetGp,
            isSelected,
            delta,
            newCgpa: singleNewCgpa,
            isF
          });
        }
      }
    });

    // Sort candidates by potential boost with target grade
    candidates.sort((a, b) => b.delta - a.delta);

    // Calculate combined effect for selected courses
    let combinedPointDelta = 0;
    let combinedSelectedCount = 0;
    let combinedSelectedCredits = 0;
    let hasDecreases = false;
    let hasIncreases = false;

    candidates.forEach(c => {
      if (c.isSelected) {
        combinedSelectedCount++;
        combinedSelectedCredits += c.credits;
        const ptDelta = (c.targetGp - c.currentGp) * c.credits;
        combinedPointDelta += ptDelta;
        if (c.targetGp < c.currentGp) {
          hasDecreases = true;
        } else if (c.targetGp > c.currentGp) {
          hasIncreases = true;
        }
      }
    });

    const combinedNewPoints = totalCgpaPoints + combinedPointDelta;
    const combinedNewCgpa = totalCgpaCredits > 0 ? (combinedNewPoints / totalCgpaCredits) : 0;
    const combinedDelta = combinedNewCgpa - currentCgpa;

    return {
      currentCgpa,
      totalCgpaCredits,
      candidates,
      combinedSelectedCount,
      combinedSelectedCredits,
      combinedNewCgpa,
      combinedDelta,
      hasDecreases,
      hasIncreases
    };
  }, [newestCourseAttempts, mode, roiThresholdGrade, roiTargetGrades, selectedRoiCourses]);

  const roiRecommendations = roiAnalysis.candidates;



  // Semester GPA calculations (all courses taken in that semester count)
  const semesterStats = useMemo(() => {
    return simulatedSemesters.map(sem => {
      let totalLoad = 0;
      let gradableCredits = 0;
      let totalPoints = 0;
      let hasGrades = false;

      sem.courses.forEach(c => {
        if (c.code === "CSE400") return;
        const courseData = COURSES.find(co => co.code === c.code);
        const credits = courseData?.credits ?? 3;
        
        // Non-credit courses carry 0 credits
        if (courseData?.category === "Non-Credit") return;

        totalLoad += credits;

        let isComp = c.isCompleted;
        if (mode === 'gpa' && (isComp || !!c.grade) && c.grade && GRADING_SCALE[c.grade] !== undefined) {
          gradableCredits += credits;
          totalPoints += GRADING_SCALE[c.grade] * credits;
          hasGrades = true;
        }
      });

      return {
        id: sem.id,
        credits: totalLoad,
        gpa: gradableCredits > 0 ? (totalPoints / gradableCredits) : null,
        hasGrades
      };
    });
  }, [semesters, mode]);

  // Cumulative Stats using the Math Rule (newest attempt only)
  const cumulativeStats = useMemo(() => {
    // 1. Total Degree Credits Engine: count unique credit-bearing courses completed/passed in ANY semester
    const completedUniqueCourses = new Set<string>();
    semesters.forEach(sem => {
      sem.courses.forEach(c => {
        const courseData = COURSES.find(co => co.code === c.code);
        if (courseData?.category === "Non-Credit" || (courseData?.credits ?? 0) === 0) return;

        let isComp = mode === 'tracker' 
          ? c.isCompleted 
          : ((c.isCompleted || !!c.grade) && c.grade !== "" && c.grade !== "F");
        if (c.code === "CSE400") {
          isComp = isCSE400Passed;
        }

        if (isComp) {
          completedUniqueCourses.add(c.code);
        }
      });
    });

    let totalCompletedCredits = 0;
    completedUniqueCourses.forEach(code => {
      const courseData = COURSES.find(co => co.code === code);
      const credits = code === "CSE400" ? 4 : (courseData?.credits ?? 3);
      totalCompletedCredits += credits;
    });

    // 2. Cumulative CGPA Engine: includes only the latest graded attempt
    let totalCgpaCredits = 0;
    let totalCgpaPoints = 0;

    Object.keys(newestCourseAttempts).forEach(code => {
      const { course } = newestCourseAttempts[code];
      const courseData = COURSES.find(co => co.code === code);
      const credits = code === "CSE400" ? 4 : (courseData?.credits ?? 3);

      if (courseData?.category === "Non-Credit") return;

      if (code === "CSE400") {
        if (mode === 'gpa' && isCSE400Passed && course.grade && GRADING_SCALE[course.grade] !== undefined) {
          totalCgpaCredits += credits;
          totalCgpaPoints += GRADING_SCALE[course.grade] * credits;
        }
        return;
      }

      if (mode === 'gpa' && course.grade && GRADING_SCALE[course.grade] !== undefined) {
        totalCgpaCredits += credits;
        totalCgpaPoints += GRADING_SCALE[course.grade] * credits;
      }
    });

    return {
      completedCredits: totalCompletedCredits,
      cgpa: totalCgpaCredits > 0 ? (totalCgpaPoints / totalCgpaCredits) : 0.00
    };
  }, [semesters, newestCourseAttempts, mode, isCSE400Passed]);

  // Target CGPA Solver calculation for Mode B
  const targetSolverResult = useMemo(() => {
    const targetVal = parseFloat(targetCgpa) || 0;
    const completedCredits = cumulativeStats.completedCredits;
    const currentCgpa = cumulativeStats.cgpa;
    const remainingCredits = Math.max(0, 136 - completedCredits);

    if (remainingCredits <= 0) {
      return {
        isAchieved: true,
        requiredGpa: 0,
        maxPossibleCgpa: currentCgpa,
        remainingCredits: 0
      };
    }

    const requiredGpa = ((targetVal * 136) - (currentCgpa * completedCredits)) / remainingCredits;
    const maxPossibleCgpa = ((currentCgpa * completedCredits) + (4.00 * remainingCredits)) / 136;

    let letterEquivalent = "A";
    if (requiredGpa > 3.7) letterEquivalent = "A";
    else if (requiredGpa > 3.3) letterEquivalent = "A-";
    else if (requiredGpa > 3.0) letterEquivalent = "B+";
    else if (requiredGpa > 2.7) letterEquivalent = "B";
    else if (requiredGpa > 2.3) letterEquivalent = "B-";
    else if (requiredGpa > 2.0) letterEquivalent = "C+";
    else if (requiredGpa > 1.7) letterEquivalent = "C";
    else if (requiredGpa > 1.3) letterEquivalent = "C-";
    else if (requiredGpa > 1.0) letterEquivalent = "D+";
    else if (requiredGpa > 0.7) letterEquivalent = "D";
    else if (requiredGpa > 0.0) letterEquivalent = "D-";
    else letterEquivalent = "F";

    return {
      isAchieved: false,
      requiredGpa,
      maxPossibleCgpa,
      remainingCredits,
      letterEquivalent
    };
  }, [targetCgpa, cumulativeStats]);

  // First semester GPA alert (Standing rule: Semester 1 GPA < 1.00 triggers warning)
  const firstSemesterGpa = useMemo(() => {
    const sem1 = semesterStats.find(s => s.id === "sem-1");
    return sem1?.gpa ?? null;
  }, [semesterStats]);

  // Prerequisite validations
  // Checks hard and soft prerequisites for each course scheduled in each semester card
  const prerequisiteWarnings = useMemo(() => {
    const warnings: Record<string, { type: 'hard' | 'soft'; missing: string[] }> = {};

    semesters.forEach((sem, semIdx) => {
      sem.courses.forEach(c => {
        const { hp, sp } = getCoursePrereqs(c.code, onboardingData.pathway, onboardingData.creditOption);

        // Check Hard Prerequisites (blocking)
        const missingHp = hp.filter(code => !isCourseCompletedPrior(code, semIdx, semesters, mode));
        if (missingHp.length > 0) {
          warnings[`${sem.id}_${c.code}`] = { type: 'hard', missing: missingHp };
          return; // Hard warning takes priority
        }

        // Check Soft Prerequisites (advisory)
        const missingSp = sp.filter(code => !isCourseCompletedPrior(code, semIdx, semesters, mode));
        if (missingSp.length > 0) {
          warnings[`${sem.id}_${c.code}`] = { type: 'soft', missing: missingSp };
        }
      });
    });

    return warnings;
  }, [semesters, mode, onboardingData.pathway, onboardingData.creditOption]);

  // Retake & Repeat Badges and Warnings
  // Evaluates every course row contextually
  const courseAttemptStats = useMemo(() => {
    const history: Record<string, SelectedCourse[]> = {};
    const result: Record<string, { badge: string; isError: boolean; statusText: string }> = {};

    semesters.forEach(sem => {
      sem.courses.forEach(c => {
        if (!history[c.code]) {
          history[c.code] = [];
        }
        history[c.code].push(c);
        
        const attempts = history[c.code];
        const attemptIndex = attempts.length; // 1-indexed

        if (attemptIndex === 1) {
          result[`${sem.id}_${c.code}`] = { badge: "", isError: false, statusText: "" };
        } else {
          // Repeat/Retake checks
          // Check if previous attempts failed (all F or not completed)
          const allPreviousFailed = attempts.slice(0, -1).every(prev => {
            return mode === 'tracker' ? !prev.isCompleted : prev.grade === 'F';
          });

          if (allPreviousFailed) {
            // It's a Retake
            if (attemptIndex === 2) {
              result[`${sem.id}_${c.code}`] = { 
                badge: "Retake (1 of 2 used)", 
                isError: false, 
                statusText: "Second attempt after failing previously." 
              };
            } else if (attemptIndex === 3) {
              result[`${sem.id}_${c.code}`] = { 
                badge: "Retake (2 of 2 used)", 
                isError: false, 
                statusText: "Final allowed retake attempt." 
              };
            } else {
              result[`${sem.id}_${c.code}`] = { 
                badge: "Max retakes exceeded", 
                isError: true, 
                statusText: "Max retakes exceeded. Special department head permission required." 
              };
            }
          } else {
            // It's a Repeat (some previous attempt passed)
            if (attemptIndex === 2) {
              result[`${sem.id}_${c.code}`] = { 
                badge: "Repeat (Grade Improvement)", 
                isError: false, 
                statusText: "Grade Improvement repeat (limit once)." 
              };
            } else {
              result[`${sem.id}_${c.code}`] = { 
                badge: "Repeat limit exceeded", 
                isError: true, 
                statusText: "Course has already been repeated once after passing." 
              };
            }
          }
        }
      });
    });

    return result;
  }, [semesters, mode]);

  // Curriculum category-wise credit counts and progress
  const curriculumProgress = useMemo(() => {
    // Set of course codes completed
    const completedCodes = new Set<string>();

    semesters.forEach(sem => {
      sem.courses.forEach(c => {
        let isComp = mode === 'tracker'
          ? c.isCompleted
          : (c.isCompleted && c.grade !== "" && c.grade !== "F");
        if (c.code === "CSE400") {
          isComp = isCSE400Passed;
        }
        if (isComp) {
          completedCodes.add(c.code);
        }
      });
    });

    const isScenarioB = onboardingData.pathway === 'credit' && (onboardingData.creditOption === 'opt2' || onboardingData.engStatusPriorToRS === 'caseD');

    // 1. Program Core (Mandatory): Target = 75 Credits (CSE400 Thesis is tracked separately)
    let coreCompleted = 0;
    COURSES.forEach(c => {
      if (c.code === "CSE400") return; // Tracked separately
      if (c.category === "CSE Program Core" && c.mandatory) {
        if (completedCodes.has(c.code)) {
          coreCompleted += c.credits;
        }
      }
    });

    // 2. School Core (Math & Sciences): Target = 12 Credits (4 courses)
    let schoolCoreCompleted = 0;
    const schoolCoreList = ["MAT120", "MAT215", "MAT216", "PHY112"];
    schoolCoreList.forEach(code => {
      if (completedCodes.has(code)) {
        schoolCoreCompleted += 3;
      }
    });

    // 3. CSE Major Electives: Target = 6 Credits
    let electiveCompleted = 0;
    COURSES.forEach(c => {
      if (c.category === "CSE Major Elective" && completedCodes.has(c.code)) {
        electiveCompleted += c.credits;
      }
    });

    // 4. GenEd Stream 1 (Writing Comprehension): Target = 6 Credits (2 courses)
    let stream1Completed = 0;
    if (isScenarioB) {
      if (completedCodes.has("ENG102")) stream1Completed += 3;
      if (completedCodes.has("ENG103")) stream1Completed += 3;
    } else {
      if (completedCodes.has("ENG101")) stream1Completed += 3;
      if (completedCodes.has("ENG102")) stream1Completed += 3;
    }

    // 5. GenEd Stream 2 (Math & Natural Sciences): Target = 9 Credits (3 courses)
    // Mandatory for CSE: MAT110, PHY111, STA201
    let stream2Completed = 0;
    const stream2CoreList = ["MAT110", "PHY111", "STA201"];
    stream2CoreList.forEach(code => {
      if (completedCodes.has(code)) {
        stream2Completed += 3;
      }
    });

    // 6. GenEd Stream 3 (Arts & Humanities): Target = 9 Credits (3 courses)
    // Mandatory: BNG103, HUM103. Elective: 1 course from stream 3.
    let stream3Completed = 0;
    if (completedCodes.has("BNG103")) stream3Completed += 3;
    if (completedCodes.has("HUM103")) stream3Completed += 3;

    const stream3ElectivePool = [
      "ENG110", "ENG113", "ENG114", "ENG115", "ENG333", "HST102", "HST103", "HST104",
      "HUM101", "HUM102", "HUM207", "HUM210", "HUM301"
    ];
    const stream3ElectivesCompleted: string[] = [];
    stream3ElectivePool.forEach(code => {
      if (completedCodes.has(code)) {
        stream3ElectivesCompleted.push(code);
      }
    });
    if (stream3ElectivesCompleted.length > 0) {
      stream3Completed += 3;
    }
    const stream3OverflowCount = Math.max(0, stream3ElectivesCompleted.length - 1);

    // 7. GenEd Stream 4 (Social Sciences): Target = 6 Credits (2 courses)
    // Mandatory: EMB101 only. Elective: 1 course from stream 4.
    let stream4Completed = 0;
    if (completedCodes.has("EMB101")) stream4Completed += 3;

    const stream4ElectivePool = [
      "ANT101", "ANT342", "ANT351", "BUS102", "BUS201", "BUS333", "BUS335",
      "DEV104", "DEV201", "ECO101", "ECO102", "ECO105", "POL101", "POL102",
      "POL103", "POL201", "POL202", "POL203", "POL210", "PSY101", "PSY102",
      "SOC101", "SOC201", "BU201"
    ];
    const stream4ElectivesCompleted: string[] = [];
    stream4ElectivePool.forEach(code => {
      if (completedCodes.has(code)) {
        stream4ElectivesCompleted.push(code);
      }
    });
    if (stream4ElectivesCompleted.length > 0) {
      stream4Completed += 3;
    }
    const stream4OverflowCount = Math.max(0, stream4ElectivesCompleted.length - 1);

    // 8. GenEd Stream 5 (CST): Target = 3 Credits (1 course)
    // Elective: 1 course from stream 5.
    let stream5Completed = 0;
    const stream5ElectivePool = [
      "CST201", "CST204", "CST301", "CST302", "CST303", "CST304", "CST305",
      "CST306", "CST307", "CST308", "CST309", "CST310", "CST314", "CST333", "BUS334"
    ];
    const stream5ElectivesCompleted: string[] = [];
    stream5ElectivePool.forEach(code => {
      if (completedCodes.has(code)) {
        stream5ElectivesCompleted.push(code);
      }
    });
    if (stream5ElectivesCompleted.length > 0) {
      stream5Completed += 3;
    }
    const stream5OverflowCount = Math.max(0, stream5ElectivesCompleted.length - 1);

    // 9. GenEd Electives (Free Choice): Target = 6 Credits (2 courses)
    // Overflow Rule: Track all completed courses already counted for primary stream requirements
    const alreadyCountedCodes = new Set<string>();

    // Stream 1 primary
    if (isScenarioB) {
      if (completedCodes.has("ENG102")) alreadyCountedCodes.add("ENG102");
      if (completedCodes.has("ENG103")) alreadyCountedCodes.add("ENG103");
    } else {
      if (completedCodes.has("ENG101")) alreadyCountedCodes.add("ENG101");
      if (completedCodes.has("ENG102")) alreadyCountedCodes.add("ENG102");
    }

    // Stream 2 primary
    stream2CoreList.forEach(code => {
      if (completedCodes.has(code)) alreadyCountedCodes.add(code);
    });

    // Stream 3 primary
    if (completedCodes.has("BNG103")) alreadyCountedCodes.add("BNG103");
    if (completedCodes.has("HUM103")) alreadyCountedCodes.add("HUM103");
    const firstStream3Elective = stream3ElectivePool.find(code => completedCodes.has(code));
    if (firstStream3Elective) alreadyCountedCodes.add(firstStream3Elective);

    // Stream 4 primary
    if (completedCodes.has("EMB101")) alreadyCountedCodes.add("EMB101");
    const firstStream4Elective = stream4ElectivePool.find(code => completedCodes.has(code));
    if (firstStream4Elective) alreadyCountedCodes.add(firstStream4Elective);

    // Stream 5 primary
    const firstStream5Elective = stream5ElectivePool.find(code => completedCodes.has(code));
    if (firstStream5Elective) alreadyCountedCodes.add(firstStream5Elective);

    let overflowCredits = 0;
    completedCodes.forEach(code => {
      if (alreadyCountedCodes.has(code)) return;
      if (code.startsWith("CSE")) return;
      if (schoolCoreList.includes(code)) return;
      if (["CSE101", "MAT101", "PHY101", "STA101"].includes(code)) return;

      const courseInfo = COURSES.find(co => co.code === code);
      const cr = courseInfo ? courseInfo.credits : 3;
      if (cr === 0) return;

      overflowCredits += cr;
    });

    const freeGenEdCredits = Math.min(6, overflowCredits);

    return {
      coreCompleted,
      coreTotal: 75,
      schoolCoreCompleted,
      schoolCoreTotal: 12,
      electiveCompleted,
      electiveTotal: 6,
      stream1Completed,
      stream1Total: 6,
      stream2Completed,
      stream2Total: 9,
      stream3Completed,
      stream3Total: 9,
      stream4Completed,
      stream4Total: 6,
      stream5Completed,
      stream5Total: 3,
      freeGenEdCredits,
      freeGenEdTotal: 6,
      thesisCompleted: isCSE400Passed ? 4 : 0,
      thesisTotal: 4
    };
  }, [semesters, mode, isCSE400Passed, onboardingData.pathway, onboardingData.creditOption, onboardingData.engStatusPriorToRS]);

  // Helper for English ordinal suffixes (1st, 2nd, 3rd, 4th, etc.)
  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const nextPredictedIntake = useMemo(() => {
    const lastSemIdx = semesters.length - 1;
    const lastIntake = semesterIntakes[lastSemIdx];
    if (!lastIntake) {
      return { term: (onboardingData.startingTerm || 'Spring') as 'Spring' | 'Summer' | 'Fall', year: onboardingData.startingYear || 2025 };
    }
    if (lastIntake.term === 'Spring') {
      return { term: 'Summer' as const, year: lastIntake.year };
    } else if (lastIntake.term === 'Summer') {
      return { term: 'Fall' as const, year: lastIntake.year };
    } else {
      return { term: 'Spring' as const, year: lastIntake.year + 1 };
    }
  }, [semesters, semesterIntakes, onboardingData.startingTerm, onboardingData.startingYear]);

  // Semester cards operations
  const handleAddSemester = () => {
    const nextIdx = semesters.length + 1;
    const newSem: Semester = {
      id: `sem-custom-${Date.now()}`,
      name: `${getOrdinal(nextIdx)} Semester`,
      term: nextPredictedIntake.term,
      year: nextPredictedIntake.year,
      courses: [],
      isCollapsed: false,
    };
    updateSemesters([...semesters, newSem]);
  };

  // Floating Action: Add Semester and open unified AddCoursesModal targeted to the new semester
  const handleTriggerAddSemester = () => {
    const nextIdx = semesters.length + 1;
    const newSem: Semester = {
      id: `sem-custom-${Date.now()}`,
      name: `${getOrdinal(nextIdx)} Semester`,
      term: nextPredictedIntake.term,
      year: nextPredictedIntake.year,
      courses: [],
      isCollapsed: false,
    };
    const nextSemesters = [...semesters, newSem];
    updateSemesters(nextSemesters);
    setAddCoursesTargetSemesterId(newSem.id);
    setAddCoursesPreselected([]);
    setIsAddCoursesModalOpen(true);
  };

  // Floating Action: Commit Add Courses with duplicate move/retake resolution
  const handleCommitAddCourses = (
    assignments: {
      courseCode: string;
      targetSemId: string;
      resolution?: 'move' | 'repeat';
      originalSemId?: string;
    }[]
  ) => {
    let nextSemesters = [...semesters];

    assignments.forEach(({ courseCode, targetSemId, resolution, originalSemId }) => {
      // If resolution is 'move' and originalSemId exists, remove from original semester
      if (resolution === 'move' && originalSemId) {
        nextSemesters = nextSemesters.map(s => {
          if (s.id === originalSemId) {
            return {
              ...s,
              courses: s.courses.filter(c => c.code !== courseCode)
            };
          }
          return s;
        });
      }

      // Add to targetSemId
      nextSemesters = nextSemesters.map(s => {
        if (s.id === targetSemId) {
          const exists = s.courses.some(c => c.code === courseCode);
          if (exists) return s;

          return {
            ...s,
            courses: [
              ...s.courses,
              {
                code: courseCode,
                grade: "",
                isCompleted: false,
                isRepeat: resolution === 'repeat'
              }
            ]
          };
        }
        return s;
      });
    });

    updateSemesters(nextSemesters);
  };

  const isAnyExpanded = useMemo(() => {
    return semesters.some(sem => !sem.isCollapsed) || !isCapstoneCollapsed;
  }, [semesters, isCapstoneCollapsed]);

  const handleToggleSemesterCollapse = (semId: string) => {
    setSemesters(prev => {
      const updated = prev.map(s => s.id === semId ? { ...s, isCollapsed: !s.isCollapsed } : s);
      setTimeout(() => {
        try {
          saveStateToLocalStorage(
            mode,
            isOnboarded,
            updated,
            thesisTrack,
            thesisSteps,
            projectCompleted,
            internshipCompleted,
            onboardingData
          );
        } catch {}
      }, 0);
      return updated;
    });
  };

  const handleToggleAllCollapse = () => {
    const targetState = isAnyExpanded;
    setSemesters(prev => {
      const updated = prev.map(sem => ({
        ...sem,
        isCollapsed: targetState
      }));
      setTimeout(() => {
        try {
          saveStateToLocalStorage(
            mode,
            isOnboarded,
            updated,
            thesisTrack,
            thesisSteps,
            projectCompleted,
            internshipCompleted,
            onboardingData
          );
        } catch {}
      }, 0);
      return updated;
    });
    setIsCapstoneCollapsed(targetState);
  };

  const handleOverrideIntake = (semId: string, term: 'Spring' | 'Summer' | 'Fall', year: number) => {
    const updated = semesters.map(sem => {
      if (sem.id === semId) {
        return { ...sem, term, year };
      }
      return sem;
    });
    updateSemesters(updated);
  };

  const handleMarkAsRS = (semId: string) => {
    const targetIdx = semesters.findIndex(s => s.id === semId);
    if (targetIdx === -1) return;

    let eng102CompletedBefore = false;
    for (let i = 0; i < targetIdx; i++) {
      const found = semesters[i].courses.find(c => c.code === "ENG102");
      if (found) {
        const isComp = mode === 'tracker'
          ? found.isCompleted
          : (found.isCompleted && found.grade !== "" && found.grade !== "F");
        if (isComp) {
          eng102CompletedBefore = true;
          break;
        }
      }
    }

    const fourthCourse = eng102CompletedBefore ? "BU201" : "ENG102";

    const updated = semesters.map((sem, idx) => {
      if (sem.id === semId) {
        return {
          ...sem,
          name: "Residential Semester (RS)",
          isRS: true,
          courses: [
            { code: "EMB101", grade: "", isCompleted: false },
            { code: "BNG103", grade: "", isCompleted: false },
            { code: "HUM103", grade: "", isCompleted: false },
            { code: fourthCourse, grade: "", isCompleted: false }
          ]
        };
      } else if (sem.isRS) {
        return {
          ...sem,
          name: `${idx + 1}th Semester`,
          isRS: false
        };
      }
      return sem;
    });

    updateSemesters(updated);
  };

  const handleDeleteSemester = (id: string) => {
    const updated = semesters.filter(s => s.id !== id);
    // Auto-adjust names to maintain clean index order if they are custom numbered
    const autoAdjusted = updated.map((sem, idx) => {
      if (sem.name.endsWith("Semester") && !sem.isRS) {
        return {
          ...sem,
          name: `${idx + 1}th Semester`
        };
      }
      return sem;
    });
    updateSemesters(autoAdjusted);
  };

  const handleRemoveCourse = (semId: string, courseCode: string, courseIdx?: number) => {
    const updated = semesters.map(sem => {
      if (sem.id === semId) {
        return {
          ...sem,
          courses: typeof courseIdx === 'number'
            ? sem.courses.filter((_, idx) => idx !== courseIdx)
            : sem.courses.filter(c => c.code !== courseCode)
        };
      }
      return sem;
    });
    updateSemesters(updated);
  };

  const handleClearSemesterCourses = (semId: string) => {
    const updated = semesters.map(sem => {
      if (sem.id === semId) {
        return {
          ...sem,
          courses: []
        };
      }
      return sem;
    });
    updateSemesters(updated);
  };

  const handleAddCourseToSemester = (semId: string, courseCode: string) => {
    const targetSem = semesters.find(s => s.id === semId);
    if (!targetSem) return;

    // Strict duplicate check: if the semester already has this course, don't allow duplicate!
    if (swappingCourseCode) {
      if (courseCode !== swappingCourseCode && targetSem.courses.some(c => c.code === courseCode)) {
        return;
      }
    } else {
      if (targetSem.courses.some(c => c.code === courseCode)) {
        return;
      }
    }

    const updated = semesters.map(sem => {
      if (sem.id === semId) {
        if (swappingCourseCode) {
          return {
            ...sem,
            courses: sem.courses.map(c => {
              if (c.code === swappingCourseCode) {
                return { code: courseCode, grade: "", isCompleted: false };
              }
              return c;
            })
          };
        } else {
          return {
            ...sem,
            courses: [...sem.courses, { code: courseCode, grade: "", isCompleted: false }]
          };
        }
      }
      return sem;
    });
    updateSemesters(updated);
    setActiveCourseSelectorSemesterId(null);
    setSwappingCourseCode(null);
    setCourseSearchQuery("");
  };

  const handleAddCategoryCourse = () => {
    if (!selectedCategoryCourseCode || !selectedCategoryTargetSemesterId) return;
    setSwappingCourseCode(null);
    handleAddCourseToSemester(selectedCategoryTargetSemesterId, selectedCategoryCourseCode);
    setActiveCategorySelectorKey(null);
    setSelectedCategoryCourseCode("");
    setCategoryCourseSearchQuery("");
  };

  const handleMoveCourse = (sourceSemId: string, destSemId: string, course: SelectedCourse) => {
    const destSem = semesters.find(s => s.id === destSemId);
    if (destSem && destSem.courses.some(c => c.code === course.code)) {
      return; // Already in destination semester!
    }
    const updated = semesters.map(sem => {
      // Remove from source
      if (sem.id === sourceSemId) {
        return {
          ...sem,
          courses: sem.courses.filter(c => c.code !== course.code)
        };
      }
      // Add to dest
      if (sem.id === destSemId) {
        if (sem.courses.some(c => c.code === course.code)) return sem;
        return {
          ...sem,
          courses: [...sem.courses, course]
        };
      }
      return sem;
    });
    updateSemesters(updated);
  };

  // Cloud Sync Helpers & Action Handlers
  const showCloudToast = (msg: string) => {
    setCloudToastMessage(msg);
    setTimeout(() => {
      setCloudToastMessage(prev => prev === msg ? null : prev);
    }, 4000);
  };

  const performCloudSync = async (options?: { silent?: boolean; customPayload?: DriveBackupPayload }) => {
    if (!cloudUser) return;

    const isDemo = localStorage.getItem(STORAGE_KEYS.DEMO_MODE) === 'true';
    if (!isDemo) {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (!token || isGoogleTokenExpired()) {
        // Session expired — auto-logout back to homepage
        if (token) revokeGoogleToken(token).catch(() => {});
        setCloudUser(null);
        setIsGuest(false);
        setCloudSyncStatus('unauthenticated');
        setCloudLastSync(null);
        setCloudFileId(null);
        setShowDashboard(false);
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.TOKEN_EXP);
        localStorage.removeItem(STORAGE_KEYS.FILE_ID);
        localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
        localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
        localStorage.removeItem(STORAGE_KEYS.IS_GUEST);
        showCloudToast("Session expired. Please sign in again or continue as guest.");
        return;
      }
    }

    setCloudSyncStatus('syncing');

    try {
      const payload: DriveBackupPayload = options?.customPayload || {
        version: 1,
        updatedAt: new Date().toISOString(),
        userEmail: cloudUser.email,
        mode,
        isOnboarded,
        semesters,
        thesisTrack,
        thesisSteps,
        projectCompleted,
        internshipCompleted,
        onboardingData,
        deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Device',
        statsSummary: {
          totalCredits: 136,
          completedCredits: cumulativeStats?.completedCredits ?? 0,
          cgpa: cumulativeStats?.cgpa ?? null
        }
      };

      let resultFileId = cloudFileId;
      let syncTimestamp = new Date().toISOString();

      if (isDemo) {
        const demoRes = saveDemoDriveBackup(payload);
        resultFileId = demoRes.fileId;
        syncTimestamp = demoRes.modifiedTime;
      } else {
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        if (!token) {
          setCloudSyncStatus('unauthenticated');
          throw new Error("Google access token expired or missing. Please sign in again.");
        }
        const driveRes = await saveDriveBackup(token, payload, cloudFileId || undefined);
        resultFileId = driveRes.fileId;
        syncTimestamp = driveRes.modifiedTime;
      }

      setCloudFileId(resultFileId);
      setCloudLastSync(syncTimestamp);
      setCloudSyncStatus('synced');
      localStorage.setItem(STORAGE_KEYS.FILE_ID, resultFileId || '');
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, syncTimestamp);

      if (!options?.silent) {
        showCloudToast("Progress successfully synced to Google Drive!");
      }
    } catch (err: any) {
      console.warn("Cloud Sync status:", err?.message || err);
      if (err?.isAuthError) {
        // Auth error — auto-logout back to homepage
        const staleToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
        if (staleToken) revokeGoogleToken(staleToken).catch(() => {});
        setCloudUser(null);
        setIsGuest(false);
        setCloudSyncStatus('unauthenticated');
        setCloudLastSync(null);
        setCloudFileId(null);
        setShowDashboard(false);
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.TOKEN_EXP);
        localStorage.removeItem(STORAGE_KEYS.FILE_ID);
        localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
        localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
        localStorage.removeItem(STORAGE_KEYS.IS_GUEST);
        showCloudToast("Session expired. Please sign in again or continue as guest.");
      } else if (err?.isOffline) {
        setCloudSyncStatus('offline');
        if (!options?.silent) {
          showCloudToast("You are currently offline. Changes are saved locally.");
        }
      } else {
        setCloudSyncStatus('error');
        if (!options?.silent) {
          showCloudToast(err?.message || "Cloud sync encountered an issue.");
        }
      }
    }
  };

  // Auto-Sync Debounce: automatically updates Google Drive when state changes
  useEffect(() => {
    if (!isMounted || !cloudUser || !isAutoSyncEnabled || cloudSyncStatus === 'unauthenticated' || cloudSyncStatus === 'error') return;

    if (cloudSyncDebounceTimer.current) {
      clearTimeout(cloudSyncDebounceTimer.current);
    }

    cloudSyncDebounceTimer.current = setTimeout(() => {
      performCloudSync({ silent: true });
    }, 4000);

    return () => {
      if (cloudSyncDebounceTimer.current) {
        clearTimeout(cloudSyncDebounceTimer.current);
      }
    };
  }, [
    isMounted,
    cloudUser,
    cloudSyncStatus,
    isAutoSyncEnabled,
    semesters,
    mode,
    isOnboarded,
    thesisTrack,
    thesisSteps,
    projectCompleted,
    internshipCompleted,
    onboardingData
  ]);

  const handleCloudSignIn = async (simulatedEmail?: string) => {
    setGatekeeperError(null);
    setIsAuthenticating(true);

    try {
      if (simulatedEmail) {
        // Simulation / Demo Mode (tests @g.bracu.ac.bd validation or rejection)
        const user = simulateStudentLogin(simulatedEmail);
        setCloudUser(user);
        setCloudSyncStatus('synced');
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEYS.DEMO_MODE, 'true');

        const existing = loadDemoDriveBackup();
        if (existing) {
          setCloudConflictPayload(existing);
          setShowCloudConflictModal(true);
        } else {
          saveDemoDriveBackup({
            version: 1,
            updatedAt: new Date().toISOString(),
            userEmail: user.email,
            mode,
            isOnboarded,
            semesters,
            thesisTrack,
            thesisSteps,
            projectCompleted,
            internshipCompleted,
            onboardingData
          });
          const nowIso = new Date().toISOString();
          setCloudLastSync(nowIso);
          localStorage.setItem(STORAGE_KEYS.LAST_SYNC, nowIso);
        }

        showCloudToast(`Welcome, ${user.name}! Connected to Google Drive.`);
        setIsGuest(false);
        try {
          localStorage.removeItem(STORAGE_KEYS.IS_GUEST);
        } catch {}
        setShowDashboard(true);
        setIsAuthenticating(false);
        return;
      }

      // Real Google Identity Services Flow
      const activeClientId = customClientId.trim() || DEFAULT_GSI_CLIENT_ID;
      if (!activeClientId) {
        setShowClientIdInput(true);
        throw new Error("Google OAuth Client ID is required. Enter your Google Client ID below or try Demo Mode.");
      }

      const token = await requestGoogleAccessToken(activeClientId);
      if (!token) {
        setCloudSyncStatus('unauthenticated');
        return;
      }
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);

      // Fetch user profile and strictly enforce Auth Gatekeeper
      const user = await fetchGoogleUserProfile(token);
      setCloudUser(user);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
      setIsGuest(false);
      try {
        localStorage.removeItem(STORAGE_KEYS.IS_GUEST);
      } catch {}
      setShowDashboard(true);

      // Check existing backup in Google Drive appDataFolder
      const existingFile = await findDriveBackupFile(token);
      if (existingFile) {
        setCloudFileId(existingFile.id);
        localStorage.setItem(STORAGE_KEYS.FILE_ID, existingFile.id);

        const remoteBackup = await loadDriveBackup(token, existingFile.id);
        if (remoteBackup) {
          setCloudConflictPayload(remoteBackup);
          setShowCloudConflictModal(true);
        }
      } else {
        await performCloudSync({ silent: true });
      }

      setCloudSyncStatus('synced');
      showCloudToast(`Welcome, ${user.name}! Cloud sync active.`);
    } catch (err: any) {
      if ((err as any)?.isGatekeeperError) {
        setGatekeeperError(err.message);
      } else {
        showCloudToast(err?.message || "Failed to sign in with Google.");
      }
      setCloudSyncStatus('unauthenticated');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleContinueAsGuest = () => {
    setIsGuest(true);
    try {
      localStorage.setItem(STORAGE_KEYS.IS_GUEST, 'true');
    } catch (e) {
      console.error("Failed to persist guest mode:", e);
    }
    setGatekeeperError(null);
    setShowDashboard(true);
  };

  const handleBackupToCloud = async () => {
    if (!cloudUser) {
      setShowCloudModal(true);
      return;
    }
    showCloudToast("Syncing to Google Drive...");
    await performCloudSync();
  };

  const handleRestoreFromCloudClick = async () => {
    if (!cloudUser) {
      setShowCloudModal(true);
      return;
    }
    showCloudToast("Fetching backup from Google Drive...");
    try {
      const isDemo = localStorage.getItem(STORAGE_KEYS.DEMO_MODE) === 'true';
      let backupPayload: DriveBackupPayload | null = null;
      if (isDemo) {
        backupPayload = loadDemoDriveBackup();
      } else {
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        if (!token) throw new Error("Google access token missing. Please sign in again.");
        const file = await findDriveBackupFile(token);
        if (file) {
          backupPayload = await loadDriveBackup(token, file.id);
        }
      }
      if (backupPayload) {
        handleRestoreFromCloud(backupPayload);
      } else {
        showCloudToast("No cloud backup found on Google Drive.");
      }
    } catch (err: any) {
      showCloudToast(err?.message || "Failed to restore from Google Drive.");
    }
  };

  const handleCloudSignOut = async () => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      revokeGoogleToken(token).catch(() => {});
    }
    setCloudUser(null);
    setIsGuest(false);
    setCloudSyncStatus('unauthenticated');
    setCloudLastSync(null);
    setCloudFileId(null);
    setGatekeeperError(null);
    setShowDashboard(false);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXP);
    localStorage.removeItem(STORAGE_KEYS.FILE_ID);
    localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
    localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
    localStorage.removeItem(STORAGE_KEYS.IS_GUEST);
    showCloudToast("Signed out of Google Drive Cloud Sync.");
  };

  const handleRestoreFromCloud = (backupData?: DriveBackupPayload) => {
    const targetPayload = backupData || cloudConflictPayload;
    if (!targetPayload) return;

    if (targetPayload.mode) setMode(targetPayload.mode);
    if (targetPayload.isOnboarded !== undefined) setIsOnboarded(targetPayload.isOnboarded);
    if (targetPayload.semesters && Array.isArray(targetPayload.semesters)) {
      const sanitized = targetPayload.semesters.map((s: Semester) => ({
        ...s,
        courses: dedupeSemesterCourses(s.courses || [])
      }));
      setSemesters(sanitized);
    }
    if (targetPayload.thesisTrack) setThesisTrack(targetPayload.thesisTrack);
    if (targetPayload.thesisSteps) setThesisSteps(targetPayload.thesisSteps);
    if (targetPayload.projectCompleted !== undefined) setProjectCompleted(targetPayload.projectCompleted);
    if (targetPayload.internshipCompleted !== undefined) setInternshipCompleted(targetPayload.internshipCompleted);
    if (targetPayload.onboardingData) setOnboardingData(targetPayload.onboardingData);

    saveStateToLocalStorage(
      targetPayload.mode,
      targetPayload.isOnboarded,
      targetPayload.semesters,
      targetPayload.thesisTrack,
      targetPayload.thesisSteps,
      targetPayload.projectCompleted,
      targetPayload.internshipCompleted,
      targetPayload.onboardingData
    );

    setShowCloudConflictModal(false);
    setCloudConflictPayload(null);
    showCloudToast("Curriculum successfully restored from Google Drive!");
  };

  const handleSaveCustomClientId = (newId: string) => {
    setCustomClientId(newId);
    if (newId.trim()) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_CLIENT_ID, newId.trim());
      showCloudToast("Custom Google Client ID saved.");
    } else {
      localStorage.removeItem(STORAGE_KEYS.CUSTOM_CLIENT_ID);
      showCloudToast("Reset to default Client ID.");
    }
    setShowClientIdInput(false);
  };

  const cse400Course = useMemo(() => {
    for (const sem of semesters) {
      const found = sem.courses.find(c => c.code === "CSE400");
      if (found) return found;
    }
    return null;
  }, [semesters]);

  const handleCSE400CompletionToggle = (isCompleted: boolean) => {
    const updated = semesters.map(sem => ({
      ...sem,
      courses: sem.courses.map(c => {
        if (c.code === "CSE400") {
          return { ...c, isCompleted };
        }
        return c;
      })
    }));
    updateSemesters(updated);
  };

  const handleCSE400GradeChange = (grade: string) => {
    const updated = semesters.map(sem => ({
      ...sem,
      courses: sem.courses.map(c => {
        if (c.code === "CSE400") {
          return { ...c, grade, isCompleted: grade !== "" };
        }
        return c;
      })
    }));
    updateSemesters(updated);
  };

  const handleGradeChange = (semId: string, courseCode: string, grade: string) => {
    const updated = semesters.map(sem => {
      if (sem.id === semId) {
        return {
          ...sem,
          courses: sem.courses.map(c => {
            if (c.code === courseCode) {
              return {
                ...c,
                grade,
                isCompleted: grade !== "" ? true : c.isCompleted
              };
            }
            return c;
          })
        };
      }
      return sem;
    });
    updateSemesters(updated);
  };

  const handleToggleSemesterAllCompleted = (semId: string) => {
    const sem = semesters.find(s => s.id === semId);
    if (!sem) return;
    const targetCourses = sem.courses.filter(c => c.code !== "CSE400");
    const allCompleted = targetCourses.length > 0 && targetCourses.every(c => c.isCompleted);
    const updated = semesters.map(s => {
      if (s.id === semId) {
        return {
          ...s,
          courses: s.courses.map(c => {
            if (c.code === "CSE400") return c;
            return {
              ...c,
              isCompleted: !allCompleted,
              grade: allCompleted ? "" : (c.grade || "")
            };
          })
        };
      }
      return s;
    });
    updateSemesters(updated);
  };

  const handleCompletionToggle = (semId: string, courseCode: string, isCompleted: boolean) => {
    const updated = semesters.map(sem => {
      if (sem.id === semId) {
        return {
          ...sem,
          courses: sem.courses.map(c => {
            if (c.code === courseCode) {
              return {
                ...c,
                isCompleted,
                grade: !isCompleted ? "" : c.grade
              };
            }
            return c;
          })
        };
      }
      return sem;
    });
    updateSemesters(updated);
  };

  // Search combobox logic
  const filteredSearchCourses = useMemo(() => {
    let list = COURSES;
    if (courseSearchFilter !== "All") {
      list = COURSES.filter(c => {
        if (courseSearchFilter === "Core") return c.mandatory && c.category === "CSE Program Core";
        if (courseSearchFilter === "Math/Science") return c.category === "School Core (Math & Sciences)" || c.category === "GenEd Stream 2";
        if (courseSearchFilter === "GenEd") return c.category.startsWith("GenEd");
        if (courseSearchFilter === "Electives") return c.category === "CSE Major Elective";
        return true;
      });
    }

    if (courseSearchQuery.trim() !== "") {
      const q = courseSearchQuery.toLowerCase();
      list = list.filter(c => 
        c.code.toLowerCase().includes(q) || 
        c.title.toLowerCase().includes(q)
      );
    }

    return list.slice(0, 200); // cap size to prevent layout lag without truncating category tabs
  }, [courseSearchQuery, courseSearchFilter]);

  // Category Course Selection Modal Memos
  const getCompletedCourseState = useCallback((courseCode: string) => {
    for (const sem of semesters) {
      const found = sem.courses.find(c => c.code === courseCode);
      if (found) {
        const isComp = mode === 'tracker' 
          ? found.isCompleted 
          : (found.isCompleted && found.grade !== "");
        if (isComp) {
          return { isCompleted: true, grade: found.grade };
        }
      }
    }
    if (courseCode === "CSE400" && isCSE400Passed) {
      return { isCompleted: true, grade: "" };
    }
    return { isCompleted: false, grade: "" };
  }, [semesters, mode, isCSE400Passed]);

  const categoryDetails = useMemo(() => {
    if (!activeCategorySelectorKey) return { name: "", desc: "" };
    switch (activeCategorySelectorKey) {
      case 'core':
        return { name: "Program Core (Mandatory)", desc: "Mandatory Core Computing Courses" };
      case 'thesis':
        return { name: "Capstone Thesis (CSE400)", desc: "Final Year Capstone Phase" };
      case 'schoolCore':
        return { name: "School Core", desc: "Mathematics & Natural Sciences Core Requirements" };
      case 'electives':
        return { name: "CSE Major Electives", desc: "Major Elective Specialization Tracks" };
      case 'stream1':
        return { name: "GenEd Stream 1 (Writing Comprehension)", desc: "Writing Comprehension Electives" };
      case 'stream2':
        return { name: "GenEd Stream 2 (Math & Natural Sciences)", desc: "Math & Natural Sciences Electives" };
      case 'stream3':
        return { name: "GenEd Stream 3 (Arts & Humanities)", desc: "Arts & Humanities Electives" };
      case 'stream4':
        return { name: "GenEd Stream 4 (Social Sciences)", desc: "Social Sciences Electives" };
      case 'stream5':
        return { name: "GenEd Stream 5 (Communities / CST)", desc: "Communities & Civilizations Studies" };
      case 'freeGenEd':
        return { name: "GenEd Electives (Free Choice)", desc: "Free Choice Stream Electives (any Stream 1-5 course)" };
      default:
        return { name: "Add Course", desc: "" };
    }
  }, [activeCategorySelectorKey]);

  const categoryFilteredCourses = useMemo(() => {
    if (!activeCategorySelectorKey) return [];
    
    const isMandatoryGenEd = (code: string) => {
      const mandatoryCodes = ["ENG101", "ENG102", "ENG103", "MAT110", "PHY111", "STA201", "BNG103", "HUM103", "EMB101"];
      return mandatoryCodes.includes(code);
    };

    let list: Course[] = [];
    switch (activeCategorySelectorKey) {
      case 'core':
        list = COURSES.filter(c => c.category === "CSE Program Core" && c.code !== "CSE400");
        break;
      case 'thesis':
        list = COURSES.filter(c => c.code === "CSE400");
        break;
      case 'schoolCore':
        list = COURSES.filter(c => c.category === "School Core (Math & Sciences)");
        break;
      case 'electives':
        list = COURSES.filter(c => c.category === "CSE Major Elective");
        break;
      case 'stream1':
        list = COURSES.filter(c => c.category === "GenEd Stream 1");
        break;
      case 'stream2':
        list = COURSES.filter(c => c.category === "GenEd Stream 2");
        break;
      case 'stream3':
        list = COURSES.filter(c => c.category === "GenEd Stream 3");
        break;
      case 'stream4':
        list = COURSES.filter(c => c.category === "GenEd Stream 4");
        break;
      case 'stream5':
        list = COURSES.filter(c => c.category === "GenEd Stream 5");
        break;
      case 'freeGenEd':
        list = COURSES.filter(c => c.category.startsWith("GenEd") && !isMandatoryGenEd(c.code));
        break;
      default:
        list = [];
    }

    // Also apply text search filtering if active
    if (categoryCourseSearchQuery.trim() !== "") {
      const q = categoryCourseSearchQuery.toLowerCase();
      list = list.filter(c => 
        c.code.toLowerCase().includes(q) || 
        c.title.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeCategorySelectorKey, categoryCourseSearchQuery]);

  const CSE400 = ({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) => {
    return (
      <div className="bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#262626] rounded-xl p-5 shadow-vercel-card relative overflow-hidden h-full flex flex-col justify-between">
        <div className={`flex flex-wrap items-center justify-between gap-3 ${isCollapsed ? "" : "border-b border-[#ebebeb] dark:border-[#262626] pb-4 mb-5"}`}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#0070f3] shadow-vercel-subtle shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#171717] dark:text-[#ededed] tracking-tight">
                CSE400 — Final Year Capstone
              </h3>
              <p className="text-xs text-[#888888] mt-0.5">Academic Research Thesis, Engineering Project, or Corporate Internship</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-medium bg-[#f5f5f5] dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] text-[#888888] px-2.5 py-1 rounded-md">
              {isCSE400Passed ? "4 / 4 Cr" : "0 / 4 Cr"}
            </span>
            {isCSE400Passed ? (
              <span className="text-[11px] font-mono font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-md">
                Passed / Defended
              </span>
            ) : (
              <span className="text-[11px] font-mono font-medium bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-md">
                In Progress
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onToggle) {
                  onToggle();
                }
              }}
              aria-label="Toggle Capstone Module"
              className="cursor-pointer flex items-center justify-center w-8 h-8 rounded-lg bg-[#fafafa] dark:bg-[#141414] hover:bg-[#f0f0f0] dark:hover:bg-[#1f1f1f] border border-[#ebebeb] dark:border-[#262626] text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] transition-all flex-shrink-0"
              title={isCollapsed ? "Expand Capstone" : "Minimize Capstone"}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="space-y-5">
            {/* Track selector tabs/cards */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-[#888888] uppercase tracking-wider block">Choose Capstone Track Path</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(['thesis', 'project', 'internship'] as const).map(track => {
                  const isSelected = thesisTrack === track;
                  let desc = "";
                  let title = "";
                  if (track === 'thesis') {
                    title = "Thesis";
                    desc = "Academic Research Track";
                  } else if (track === 'project') {
                    title = "Project";
                    desc = "System & Software Development Track";
                  } else {
                    title = "Internship";
                    desc = "Corporate Industry Track";
                  }

                  return (
                    <button
                      key={track}
                      onClick={() => {
                        setThesisTrack(track);
                        saveStateToLocalStorage(mode, isOnboarded, semesters, track, thesisSteps, projectCompleted, internshipCompleted, onboardingData);
                      }}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer group shadow-vercel-subtle ${
                        isSelected 
                          ? 'border-[#171717] dark:border-[#ededed] bg-[#fafafa] dark:bg-[#141414]' 
                          : 'bg-white dark:bg-[#0f0f0f] border-[#ebebeb] dark:border-[#262626] hover:border-[#888888] dark:hover:border-[#555]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`font-semibold text-xs ${isSelected ? 'text-[#171717] dark:text-[#ededed]' : 'text-[#888888]'}`}>
                            {title}
                          </span>
                          <span className={`h-2 w-2 rounded-full transition ${isSelected ? 'bg-[#0070f3]' : 'bg-[#d4d4d8] dark:bg-[#333]'}`} />
                        </div>
                        <p className="text-xs text-[#888888] leading-relaxed">
                          {desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checklist & Grade details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3 border-t border-[#ebebeb] dark:border-[#262626]">
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-wider">Milestone Checklist</p>
                
                {thesisTrack === 'thesis' && (
                  <div className="space-y-2.5 bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] p-4 rounded-xl">
                    <div className="flex items-center gap-2.5 text-xs text-[#171717] dark:text-[#ededed] select-none">
                      <button
                        type="button"
                        onClick={() => {
                          const updatedSteps = { ...thesisSteps, step1: !thesisSteps.step1 };
                          setThesisSteps(updatedSteps);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, updatedSteps, projectCompleted, internshipCompleted, onboardingData);
                        }}
                        className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 focus:outline-none ${
                          thesisSteps.step1
                            ? 'bg-[#171717] dark:bg-[#ededed] border-[#171717] dark:border-[#ededed] text-white dark:text-black'
                            : 'border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#161616]'
                        }`}
                      >
                        {thesisSteps.step1 && (
                          <Check className="h-3 w-3 stroke-[3]" />
                        )}
                      </button>
                      <span
                        onClick={() => {
                          const updatedSteps = { ...thesisSteps, step1: !thesisSteps.step1 };
                          setThesisSteps(updatedSteps);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, updatedSteps, projectCompleted, internshipCompleted, onboardingData);
                        }}
                        className="cursor-pointer hover:underline font-medium text-xs"
                      >
                        Step 1: Thesis Topic &amp; Advisor Approved
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-[#171717] dark:text-[#ededed] select-none">
                      <button
                        type="button"
                        onClick={() => {
                          const updatedSteps = { ...thesisSteps, step2: !thesisSteps.step2 };
                          setThesisSteps(updatedSteps);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, updatedSteps, projectCompleted, internshipCompleted, onboardingData);
                        }}
                        className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 focus:outline-none ${
                          thesisSteps.step2
                            ? 'bg-[#171717] dark:bg-[#ededed] border-[#171717] dark:border-[#ededed] text-white dark:text-black'
                            : 'border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#161616]'
                        }`}
                      >
                        {thesisSteps.step2 && (
                          <Check className="h-3 w-3 stroke-[3]" />
                        )}
                      </button>
                      <span
                        onClick={() => {
                          const updatedSteps = { ...thesisSteps, step2: !thesisSteps.step2 };
                          setThesisSteps(updatedSteps);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, updatedSteps, projectCompleted, internshipCompleted, onboardingData);
                        }}
                        className="cursor-pointer hover:underline font-medium text-xs"
                      >
                        Step 2: Mid-term defense cleared
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-[#171717] dark:text-[#ededed] select-none">
                      <button
                        type="button"
                        onClick={() => handleThesisStep3Toggle(!thesisSteps.step3)}
                        className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 focus:outline-none ${
                          thesisSteps.step3
                            ? 'bg-[#171717] dark:bg-[#ededed] border-[#171717] dark:border-[#ededed] text-white dark:text-black'
                            : 'border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#161616]'
                        }`}
                      >
                        {thesisSteps.step3 && (
                          <Check className="h-3 w-3 stroke-[3]" />
                        )}
                      </button>
                      <span
                        onClick={() => handleThesisStep3Toggle(!thesisSteps.step3)}
                        className="font-medium text-xs cursor-pointer hover:underline"
                      >
                        Step 3: Final defense report defended &amp; approved
                      </span>
                    </div>
                  </div>
                )}

                {thesisTrack === 'project' && (
                  <div className="bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] p-4 rounded-xl">
                    <div className="flex items-start gap-2.5 text-xs text-[#171717] dark:text-[#ededed] select-none">
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !projectCompleted;
                          setProjectCompleted(nextVal);
                          handleCSE400CompletionToggle(nextVal);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, thesisSteps, nextVal, internshipCompleted, onboardingData);
                        }}
                        className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 focus:outline-none mt-0.5 ${
                          projectCompleted
                            ? 'bg-[#171717] dark:bg-[#ededed] border-[#171717] dark:border-[#ededed] text-white dark:text-black'
                            : 'border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#161616]'
                        }`}
                      >
                        {projectCompleted && (
                          <Check className="h-3 w-3 stroke-[3]" />
                        )}
                      </button>
                      <div
                        onClick={() => {
                          const nextVal = !projectCompleted;
                          setProjectCompleted(nextVal);
                          handleCSE400CompletionToggle(nextVal);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, thesisSteps, nextVal, internshipCompleted, onboardingData);
                        }}
                        className="cursor-pointer"
                      >
                        <p className="font-medium text-xs text-[#171717] dark:text-[#ededed]">Final Project Built &amp; Defended</p>
                        <p className="text-[11px] text-[#888888] mt-0.5">Marks capstone complete and awards 4 degree credits</p>
                      </div>
                    </div>
                  </div>
                )}

                {thesisTrack === 'internship' && (
                  <div className="bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] p-4 rounded-xl">
                    <div className="flex items-start gap-2.5 text-xs text-[#171717] dark:text-[#ededed] select-none">
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !internshipCompleted;
                          setInternshipCompleted(nextVal);
                          handleCSE400CompletionToggle(nextVal);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, thesisSteps, projectCompleted, nextVal, onboardingData);
                        }}
                        className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 focus:outline-none mt-0.5 ${
                          internshipCompleted
                            ? 'bg-[#171717] dark:bg-[#ededed] border-[#171717] dark:border-[#ededed] text-white dark:text-black'
                            : 'border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#161616]'
                        }`}
                      >
                        {internshipCompleted && (
                          <Check className="h-3 w-3 stroke-[3]" />
                        )}
                      </button>
                      <div
                        onClick={() => {
                          const nextVal = !internshipCompleted;
                          setInternshipCompleted(nextVal);
                          handleCSE400CompletionToggle(nextVal);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, thesisSteps, projectCompleted, nextVal, onboardingData);
                        }}
                        className="cursor-pointer"
                      >
                        <p className="font-medium text-xs text-[#171717] dark:text-[#ededed]">Internship Completed &amp; Report Submitted</p>
                        <p className="text-[11px] text-[#888888] mt-0.5">Marks capstone complete and awards 4 degree credits</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {mode === 'gpa' && (
                <div className="space-y-3 bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <label className="text-[11px] font-medium text-[#888888] uppercase tracking-wider block mb-1">Final Capstone Grade</label>
                    <p className="text-xs text-[#888888] leading-relaxed">Select the final grade scored in CSE400 for cumulative CGPA calculation.</p>
                  </div>
                  <select
                    value={cse400Course?.grade || ""}
                    onChange={(e) => handleCSE400GradeChange(e.target.value)}
                    className="bg-white dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] text-xs text-[#171717] dark:text-[#ededed] rounded-lg px-3 py-2 w-full focus:outline-none cursor-pointer mt-2 font-medium shadow-vercel-subtle transition"
                  >
                    <option value="">Select Grade</option>
                    {Object.keys(GRADING_SCALE).map(g => (
                      <option key={g} value={g}>{g} ({GRADING_SCALE[g].toFixed(1)})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen w-full bg-[#fafafa] dark:bg-[#000000] text-[#171717] dark:text-[#ededed] font-sans antialiased flex flex-col justify-between relative overflow-hidden animate-pulse">
        {/* Header Skeleton */}
        <header className="px-6 py-4 max-w-7xl mx-auto w-full flex items-center justify-between border-b border-[#ebebeb] dark:border-[#262626] relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-black/10 dark:bg-white/10" />
            <div className="h-4 w-24 bg-black/10 dark:bg-white/10 rounded" />
          </div>
          <div className="h-8 w-24 bg-black/10 dark:bg-white/10 rounded-full" />
        </header>

        {/* Hero Section Skeleton */}
        <main className="flex-grow flex flex-col items-center justify-center text-center px-4 py-16 relative z-10 max-w-6xl mx-auto w-full">
          <div className="h-6 w-48 bg-black/10 dark:bg-white/10 rounded-full mb-8" />
          <div className="h-14 w-3/4 max-w-xl bg-black/10 dark:bg-white/10 rounded-2xl mb-6 mx-auto" />
          <div className="h-5 w-2/3 max-w-md bg-black/10 dark:bg-white/10 rounded mb-10 mx-auto" />
          <div className="h-12 w-52 bg-black/10 dark:bg-white/10 rounded-full mb-16 mx-auto" />
        </main>
        
        {/* Footer Skeleton */}
        <footer className="px-6 py-6 border-t border-[#ebebeb] dark:border-[#262626] max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="h-3 w-36 bg-black/10 dark:bg-white/10 rounded" />
          <div className="h-3 w-44 bg-black/10 dark:bg-white/10 rounded" />
        </footer>
      </div>
    );
  }

  const currentLayout = viewMode;

  // 🚀 LANDING PAGE VIEW (Vercel-inspired Developer Platform design)
  if (!showDashboard || (!cloudUser && !isGuest)) {
    return (
      <div className="min-h-screen w-full bg-[#fafafa] dark:bg-[#050505] text-[#171717] dark:text-[#ededed] font-sans antialiased flex flex-col justify-between relative overflow-x-hidden transition-colors duration-200">
        {/* Vercel Structural Grid + Atmospheric Radial Spotlight */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808014_1px,transparent_1px),linear-gradient(to_bottom,#80808014_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_85%_65%_at_50%_15%,#000_65%,transparent_100%)]" />
          <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[780px] h-[380px] bg-gradient-to-tr from-[#0070f3]/12 via-cyan-500/8 to-transparent rounded-full blur-[110px]" />
        </div>

        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 w-full border-b border-[#ebebeb] dark:border-[#1f1f1f] bg-[#fafafa]/80 dark:bg-[#050505]/80 backdrop-blur-xl transition-colors">
          <div className="px-4 sm:px-6 h-14 max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#171717] dark:bg-[#ededed] flex items-center justify-center text-white dark:text-[#171717] shadow-vercel-subtle shrink-0">
                <svg className="h-4 w-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
              </div>
              <span className="text-sm sm:text-base font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">
                Route136
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#f0f0f0] dark:bg-[#141414] text-[#666666] dark:text-[#888888] border border-[#e5e5e5] dark:border-[#262626]">
                BRACU CSE • 136 Cr
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="h-8 w-8 rounded-lg border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#111111] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] text-[#4d4d4d] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-[#ededed] flex items-center justify-center transition cursor-pointer shadow-vercel-subtle"
              >
                {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>

              {cloudUser && (
                <div className="flex items-center gap-2 px-2.5 h-8 rounded-lg bg-white dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] shadow-vercel-subtle">
                  <div className="h-4.5 w-4.5 rounded-full overflow-hidden bg-[#171717] text-white flex items-center justify-center font-semibold text-[9px] shrink-0">
                    {cloudUser.picture ? (
                      <img src={cloudUser.picture} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span>{cloudUser.name?.[0]?.toUpperCase() || "U"}</span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-[#171717] dark:text-[#ededed] hidden sm:inline max-w-[120px] truncate">{cloudUser.name}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!cloudUser && !isGuest) {
                    handleContinueAsGuest();
                  } else {
                    setShowDashboard(true);
                  }
                }}
                className="h-8 px-3.5 rounded-lg bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white text-xs font-medium text-white dark:text-[#0a0a0a] transition-all flex items-center gap-1.5 cursor-pointer shadow-vercel-subtle active:scale-95"
              >
                <span>{cloudUser || isGuest ? "Open Workspace" : "Launch Tracker"}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Hero & Showcase Container */}
        <main className="flex-grow relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-10 sm:pt-16 pb-20 space-y-20">
          
          {/* Top Split Hero: Left Copy + Auth Card, Right Interactive Product Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Left Column: Value Proposition & Auth Portal (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left">
              {/* Eyebrow Status Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] text-[11px] font-mono text-[#4d4d4d] dark:text-[#a1a1a1] mb-5 shadow-vercel-subtle">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0070f3]" />
                <span>BRACU CSE Degree Architecture</span>
                <span className="text-[#cccccc] dark:text-[#333333]">|</span>
                <span className="text-[#0070f3] font-medium">136 Credits</span>
              </div>

              {/* Vercel High-Contrast Headline */}
              <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.1] bg-clip-text text-transparent bg-gradient-to-b from-[#171717] via-[#171717] to-[#666666] dark:from-[#ffffff] dark:via-[#ededed] dark:to-[#888888] mb-4">
                Your CSE curriculum, engineered for clarity.
              </h1>

              <p className="text-sm sm:text-[15px] text-[#555555] dark:text-[#999999] font-normal mb-7 max-w-md leading-relaxed">
                Plan every semester from <span className="font-mono text-xs text-[#171717] dark:text-[#ededed] bg-[#f0f0f0] dark:bg-[#161616] px-1.5 py-0.5 rounded border border-[#e5e5e5] dark:border-[#262626]">CSE110</span> to <span className="font-mono text-xs text-[#171717] dark:text-[#ededed] bg-[#f0f0f0] dark:bg-[#161616] px-1.5 py-0.5 rounded border border-[#e5e5e5] dark:border-[#262626]">CSE400</span> with live prerequisite locks, 5-stream GenEd validation, and CGPA trajectory modeling.
              </p>

              {/* Auth / Access Surface Card */}
              <div className="w-full max-w-md bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#262626] rounded-xl p-5 shadow-vercel-card relative overflow-hidden flex flex-col gap-3.5 text-center transition-colors">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#f0f0f0] dark:border-[#1f1f1f]">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#666666] dark:text-[#888888]">
                    Workspace Access
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Client-Side Private
                  </span>
                </div>

                {/* Error Denial Alert */}
                {gatekeeperError && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-left space-y-1 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-medium text-xs">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>Access Blocked by Gatekeeper</span>
                    </div>
                    <p className="text-[11px] text-rose-600 dark:text-rose-300 leading-relaxed font-normal">
                      {gatekeeperError}
                    </p>
                  </div>
                )}

                {!cloudUser && !isGuest ? (
                  <>
                    {/* Option A: Primary Action (G-Suite) */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={isAuthenticating}
                        onClick={() => handleCloudSignIn()}
                        className="w-full h-10 px-4 bg-[#171717] hover:bg-black/90 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0a0a0a] font-medium text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2.5 transition-all shadow-vercel-subtle active:scale-[0.98] cursor-pointer disabled:opacity-60"
                      >
                        {isAuthenticating ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                          </svg>
                        )}
                        <span>{isAuthenticating ? "Connecting..." : "Continue with BRACU G-Suite"}</span>
                      </button>

                      <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#888888] font-mono">
                        <Cloud className="h-3 w-3 text-[#0070f3]" />
                        <span>Encrypted backup in your personal Google Drive</span>
                      </div>
                    </div>

                    {/* Minimalist Divider */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-[#ebebeb] dark:bg-[#222222]" />
                      <span className="text-[10px] font-mono text-[#888888]">OR</span>
                      <div className="flex-1 h-px bg-[#ebebeb] dark:bg-[#222222]" />
                    </div>

                    {/* Option B: Continue as Guest */}
                    <button
                      type="button"
                      onClick={handleContinueAsGuest}
                      className="w-full h-9 px-4 text-[#171717] dark:text-[#ededed] hover:bg-[#f5f5f5] dark:hover:bg-[#161616] transition-all text-xs font-medium cursor-pointer rounded-lg bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center gap-2 group active:scale-[0.98]"
                    >
                      <span>Continue as Guest (Local Browser Storage)</span>
                      <ArrowRight className="h-3 w-3 text-[#888888] group-hover:text-[#171717] dark:group-hover:text-[#ededed] group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </>
                ) : cloudUser ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-[#fafafa] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-between text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-[#171717] text-white flex items-center justify-center font-semibold text-xs shrink-0">
                          {cloudUser.picture ? (
                            <img src={cloudUser.picture} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span>{cloudUser.name?.[0]?.toUpperCase() || "U"}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#171717] dark:text-[#ededed] truncate">{cloudUser.name}</p>
                          <p className="text-[10px] text-[#888888] font-mono truncate">{cloudUser.email}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#0070f3] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 shrink-0">
                        <Cloud className="h-3 w-3" />
                        Synced
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDashboard(true)}
                      className="w-full h-10 px-5 bg-[#171717] hover:bg-black/90 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0a0a0a] font-medium text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] shadow-vercel-subtle"
                    >
                      <span>Open Degree Tracker</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <div className="flex items-center justify-center gap-3 text-xs text-[#888888]">
                      <button
                        type="button"
                        onClick={handleCloudSignOut}
                        className="hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-[#fafafa] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-between text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-[#f5f5f5] dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#4d4d4d] dark:text-[#a1a1a1] shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#171717] dark:text-[#ededed]">Guest Session</p>
                          <p className="text-[10px] text-[#888888] font-mono">Saved in local storage</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#888888] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-[#ebebeb] dark:border-[#262626] shrink-0">
                        Local Only
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDashboard(true)}
                      className="w-full h-10 px-5 bg-[#171717] hover:bg-black/90 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0a0a0a] font-medium text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] shadow-vercel-subtle"
                    >
                      <span>Open Degree Tracker</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <div className="flex items-center justify-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setIsGuest(false);
                          try { localStorage.removeItem(STORAGE_KEYS.IS_GUEST); } catch {}
                        }}
                        className="text-[#0070f3] hover:underline font-medium transition cursor-pointer"
                      >
                        Sign in with BRACU account for cloud backup
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Micro-metrics row under auth card */}
              <div className="mt-5 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-[11px] font-mono text-[#666666] dark:text-[#888888]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0070f3]" />
                  <span>136-Cr Official Syllabus</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0070f3]" />
                  <span>Hard &amp; Soft Prereq Engine</span>
                </span>
              </div>
            </div>

            {/* Right Column: Interactive Product Preview Mockup (7 cols) */}
            <div className="lg:col-span-7 w-full">
              <div className="rounded-2xl bg-white dark:bg-[#0c0c0c] border border-[#e5e5e5] dark:border-[#242424] shadow-vercel-modal overflow-hidden text-left">
                {/* Window Chrome Bar */}
                <div className="px-4 py-2.5 bg-[#fafafa] dark:bg-[#111111] border-b border-[#ebebeb] dark:border-[#222222] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                  </div>
                  <div className="px-3 py-0.5 rounded-md bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] text-[10px] font-mono text-[#888888] flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>route136.app/workspace</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#0070f3] bg-[#0070f3]/10 border border-[#0070f3]/20 px-2 py-0.5 rounded">
                    LIVE PREVIEW
                  </span>
                </div>

                {/* Mockup Body */}
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Top Metric Strip */}
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                    <div className="p-3 rounded-xl bg-[#fafafa] dark:bg-[#121212] border border-[#ebebeb] dark:border-[#222222]">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#888888] mb-1">
                        <span>DEGREE PROGRESS</span>
                        <span className="text-[#0070f3] font-semibold">79.4%</span>
                      </div>
                      <div className="text-base sm:text-lg font-semibold font-mono text-[#171717] dark:text-[#ededed]">
                        108 <span className="text-xs font-normal text-[#888888]">/ 136 Cr</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-[#eaeaea] dark:bg-[#222222] overflow-hidden">
                        <div className="h-full w-[79%] bg-[#0070f3] rounded-full" />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#fafafa] dark:bg-[#121212] border border-[#ebebeb] dark:border-[#222222]">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#888888] mb-1">
                        <span>CUMULATIVE GPA</span>
                        <span className="text-emerald-600 dark:text-emerald-400">HONS</span>
                      </div>
                      <div className="text-base sm:text-lg font-semibold font-mono text-[#171717] dark:text-[#ededed]">
                        3.74 <span className="text-xs font-normal text-[#888888]">/ 4.00</span>
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-[#888888]">
                        <span>Target:</span>
                        <span className="text-[#171717] dark:text-[#ededed] font-medium">3.80</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#fafafa] dark:bg-[#121212] border border-[#ebebeb] dark:border-[#222222]">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#888888] mb-1">
                        <span>GENED STREAMS</span>
                        <span className="text-[#171717] dark:text-[#ededed]">5/5</span>
                      </div>
                      <div className="text-base sm:text-lg font-semibold font-mono text-[#171717] dark:text-[#ededed]">
                        36 <span className="text-xs font-normal text-[#888888]">/ 39 Cr</span>
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        <span className="h-1.5 flex-1 rounded-full bg-[#0070f3]" />
                        <span className="h-1.5 flex-1 rounded-full bg-[#0070f3]" />
                        <span className="h-1.5 flex-1 rounded-full bg-[#0070f3]" />
                        <span className="h-1.5 flex-1 rounded-full bg-[#0070f3]" />
                        <span className="h-1.5 flex-1 rounded-full bg-[#eaeaea] dark:bg-[#262626]" />
                      </div>
                    </div>
                  </div>

                  {/* Mockup Semester Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Sample Semester Card 1 */}
                    <div className="rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222] p-3 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-[#ebebeb] dark:border-[#222222] pb-2">
                        <div className="flex items-center gap-2">
                          <span className="h-4 w-4 rounded bg-[#171717] dark:bg-[#ededed] text-white dark:text-[#0a0a0a] flex items-center justify-center text-[10px] font-bold">✓</span>
                          <span className="text-xs font-semibold text-[#171717] dark:text-[#ededed]">Semester 3 • Fall</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-white dark:bg-[#191919] border border-[#ebebeb] dark:border-[#262626] text-[#666666] dark:text-[#999999]">12 Cr</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#0070f3]/10 border border-[#0070f3]/25 text-[#0070f3] font-semibold">SGPA 3.83</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {[
                          { code: "CSE220", title: "Data Structures", grade: "A (4.0)", tag: "Core" },
                          { code: "CSE230", title: "Discrete Mathematics", grade: "A (4.0)", tag: "Core" },
                          { code: "MAT215", title: "Complex Variables & Laplace", grade: "A- (3.7)", tag: "Math" },
                          { code: "STA201", title: "Elements of Statistics", grade: "B+ (3.3)", tag: "Sci" },
                        ].map((item) => (
                          <div key={item.code} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#161616] border border-[#ebebeb] dark:border-[#242424] text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[11px] font-semibold text-[#171717] dark:text-[#ededed]">{item.code}</span>
                              <span className="text-[11px] text-[#777777] truncate">{item.title}</span>
                            </div>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#f5f5f5] dark:bg-[#222222] text-[#171717] dark:text-[#ededed] shrink-0">
                              {item.grade}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sample Semester Card 2 + Dependency Validator Preview */}
                    <div className="rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222] p-3 flex flex-col justify-between space-y-2.5">
                      <div>
                        <div className="flex items-center justify-between border-b border-[#ebebeb] dark:border-[#222222] pb-2 mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="h-4 w-4 rounded bg-[#0070f3] text-white flex items-center justify-center text-[9px] font-mono font-bold">RS</span>
                            <span className="text-xs font-semibold text-[#171717] dark:text-[#ededed]">Residential Semester</span>
                          </div>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#0070f3]/10 border border-[#0070f3]/25 text-[#0070f3]">
                            Savar Campus
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {[
                            { code: "ENG102", title: "English Composition I", status: "Stream 1" },
                            { code: "EMB101", title: "Emergence of Bangladesh", status: "Stream 3" },
                            { code: "HUM103", title: "Ethics and Culture", status: "Stream 4" },
                          ].map((item) => (
                            <div key={item.code} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#161616] border border-[#ebebeb] dark:border-[#242424] text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[11px] font-semibold text-[#171717] dark:text-[#ededed]">{item.code}</span>
                                <span className="text-[11px] text-[#777777] truncate">{item.title}</span>
                              </div>
                              <span className="font-mono text-[10px] text-[#0070f3] bg-[#0070f3]/10 px-1.5 py-0.5 rounded shrink-0">
                                {item.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Prerequisite Chain Status Pill */}
                      <div className="p-2.5 rounded-lg bg-white dark:bg-[#161616] border border-[#ebebeb] dark:border-[#242424] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#666666] dark:text-[#999999]">
                          <span className="text-[#171717] dark:text-[#ededed] font-semibold">CSE111</span>
                          <span>→</span>
                          <span className="text-[#171717] dark:text-[#ededed] font-semibold">CSE220</span>
                          <span>→</span>
                          <span className="text-[#0070f3] font-semibold">CSE221</span>
                        </div>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          PREREQS VALID
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vercel Architectural Bento Grid Section */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#ebebeb] dark:border-[#222222] pb-4">
              <div>
                <span className="text-[11px] font-mono text-[#0070f3] uppercase tracking-wider">
                  [ System Capabilities ]
                </span>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed] mt-1">
                  Built specifically for BRACU CSE degree rules.
                </h2>
              </div>
              <p className="text-xs text-[#666666] dark:text-[#888888] font-mono">
                45 Core • 42 Foundation/GenEd • 21 Electives • 4 Cr Thesis
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {/* Bento Card 1: Pre-req Chain Sequence Viewer (3 cols) */}
              <div className="md:col-span-3 bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#242424] rounded-xl p-5 sm:p-6 shadow-vercel-card flex flex-col justify-between gap-4 hover:border-[#171717]/30 dark:hover:border-[#ededed]/30 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-8 w-8 rounded-lg bg-[#f5f5f5] dark:bg-[#171717] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-emerald-500">
                      <GitBranch className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-mono text-[#888888] px-2 py-0.5 rounded bg-[#f5f5f5] dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626]">
                      PRE-REQ CHAIN
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#171717] dark:text-[#ededed] mb-1.5">
                    Interactive Prerequisite Chains
                  </h3>
                  <p className="text-xs text-[#666666] dark:text-[#888888] leading-relaxed">
                    Visualize every CSE, MNS &amp; BIL prerequisite sequence in one flowchart, track how many courses remain in each chain, and inspect what unlocks next.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-[#f0f0f0] dark:border-[#1d1d1d] font-mono text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-[#fafafa] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] text-[#171717] dark:text-[#ededed]">CSE110 ✓</span>
                    <span className="text-[#888888]">→</span>
                    <span className="px-2 py-0.5 rounded bg-[#fafafa] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] text-[#171717] dark:text-[#ededed]">CSE220 ✓</span>
                    <span className="text-[#888888]">→</span>
                    <span className="px-2 py-0.5 rounded bg-[#0070f3]/10 border border-[#0070f3]/30 text-[#0070f3] font-medium">CSE221 Ready</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">4 Left in Chain</span>
                </div>
              </div>

              {/* Bento Card 2: CGPA & Target Solver (3 cols) */}
              <div className="md:col-span-3 bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#242424] rounded-xl p-5 sm:p-6 shadow-vercel-card flex flex-col justify-between gap-4 hover:border-[#171717]/30 dark:hover:border-[#ededed]/30 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-8 w-8 rounded-lg bg-[#f5f5f5] dark:bg-[#171717] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#0070f3]">
                      <Target className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-mono text-[#888888] px-2 py-0.5 rounded bg-[#f5f5f5] dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626]">
                      TRAJECTORY ENGINE
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#171717] dark:text-[#ededed] mb-1.5">
                    Target CGPA Solver &amp; Retake ROI Analyzer
                  </h3>
                  <p className="text-xs text-[#666666] dark:text-[#888888] leading-relaxed">
                    Calculate the exact GPA required across your remaining credits to hit Vice Chancellor’s List or Dean’s List, and rank past courses by highest CGPA boost on retake.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f0] dark:border-[#1d1d1d] font-mono text-[11px]">
                  <span className="text-[#666666] dark:text-[#888888]">Retake Simulation: <strong className="text-[#171717] dark:text-[#ededed]">MAT120 (B → A)</strong></span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">+0.07 CGPA</span>
                </div>
              </div>

              {/* Bento Card 3: 5-Stream GenEd Matrix (2 cols) */}
              <div className="md:col-span-2 bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#242424] rounded-xl p-5 shadow-vercel-card hover:border-[#171717]/30 dark:hover:border-[#ededed]/30 transition-all">
                <div className="h-8 w-8 rounded-lg bg-[#f5f5f5] dark:bg-[#171717] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-[#ededed] mb-3">
                  <BookOpen className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#171717] dark:text-[#ededed] mb-1">
                  39-Credit GenEd Matrix
                </h3>
                <p className="text-xs text-[#666666] dark:text-[#888888] leading-relaxed">
                  Tracks all 5 mandatory GenEd streams, Residential Semester (RS) courses, and free elective caps without manual spreadsheet formulas.
                </p>
              </div>

              {/* Bento Card 4: Semester Performance Charts (2 cols) */}
              <div className="md:col-span-2 bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#242424] rounded-xl p-5 shadow-vercel-card hover:border-[#171717]/30 dark:hover:border-[#ededed]/30 transition-all">
                <div className="h-8 w-8 rounded-lg bg-[#f5f5f5] dark:bg-[#171717] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#0070f3] mb-3">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#171717] dark:text-[#ededed] mb-1">
                  Semester Performance Charts
                </h3>
                <p className="text-xs text-[#666666] dark:text-[#888888] leading-relaxed">
                  Track term-by-term SGPA bars against an editable graduation target line, spot your peak semester, and click any bar for instant grade entry.
                </p>
              </div>

              {/* Bento Card 5: 4K Snapshot Export (2 cols) */}
              <div className="md:col-span-2 bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#242424] rounded-xl p-5 shadow-vercel-card hover:border-[#171717]/30 dark:hover:border-[#ededed]/30 transition-all">
                <div className="h-8 w-8 rounded-lg bg-[#f5f5f5] dark:bg-[#171717] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-[#ededed] mb-3">
                  <Camera className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#171717] dark:text-[#ededed] mb-1">
                  Grade Sheet PNG Snapshot
                </h3>
                <p className="text-xs text-[#666666] dark:text-[#888888] leading-relaxed">
                  Generate a clean, shareable academic summary card and full semester transcript image for advising or offline record keeping.
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Vercel Clean Hairline Footer */}
        <footer className="w-full py-7 px-6 border-t border-[#ebebeb] dark:border-[#1f1f1f] bg-white/60 dark:bg-[#050505]/80 backdrop-blur-md relative z-10 transition-colors">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-[#666666] dark:text-[#888888]">
              <span className="font-semibold text-[#171717] dark:text-[#ededed]">Route136</span>
              <span>•</span>
              <span className="font-mono text-[11px]">© 2026 Khan Abdullah</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs text-[#4d4d4d] dark:text-[#a1a1a1]">
              <a
                href="https://github.com/fakekhanabdullah"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#111111] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] text-xs text-[#171717] dark:text-[#ededed] transition shadow-vercel-subtle"
              >
                <svg className="h-3.5 w-3.5 fill-current shrink-0" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                <span>GitHub</span>
              </a>
              <a
                href="https://www.linkedin.com/in/khan-abdullahh"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#111111] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] text-xs text-[#171717] dark:text-[#ededed] transition shadow-vercel-subtle"
              >
                <svg className="h-3.5 w-3.5 fill-current shrink-0" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                <span>LinkedIn</span>
              </a>
              <span className="text-[#888888]">•</span>
              <a href="/privacy" className="hover:text-[#171717] dark:hover:text-[#ededed] hover:underline transition">
                Privacy Policy
              </a>
              <span className="text-[#888888]">•</span>
              <a href="/terms" className="hover:text-[#171717] dark:hover:text-[#ededed] hover:underline transition">
                Terms of Service
              </a>
            </div>
          </div>
        </footer>

        {/* Floating Cloud Toast Notification */}
        {cloudToastMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200 pointer-events-none">
            <div className="bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#262626] text-[#171717] dark:text-[#ededed] text-xs font-mono px-4 py-2.5 rounded-full shadow-vercel-modal flex items-center gap-2">
              <Cloud className="h-4 w-4 text-[#0070f3] shrink-0 animate-pulse" />
              <span>{cloudToastMessage}</span>
            </div>
          </div>
        )}
      </div>
    );
  }


  return (
    <div className="min-h-screen w-full bg-[#fafafa] dark:bg-[#000000] text-[#171717] dark:text-[#ededed] font-sans antialiased flex flex-col lg:flex-row relative selection:bg-[#171717] selection:text-white dark:selection:bg-[#ededed] dark:selection:text-black">
      {/* 1. Left Vertical Sidebar (Desktop >= 1024px) */}
      <aside className="hidden lg:flex w-56 h-screen sticky top-0 bg-white dark:bg-[#080808] border-r border-[#ebebeb] dark:border-[#1f1f1f] flex-col justify-between p-4 shrink-0 z-40 transition-colors">
        {/* Top: Brand Header & Labeled Navigation Sections */}
        <div className="flex flex-col gap-5 w-full">
          {/* Logo & Brand */}
          <div
            onClick={() => setShowDashboard(false)}
            className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-[#f5f5f5] dark:hover:bg-[#121212] cursor-pointer transition-all group"
            title="Route136 - Back to Landing Page"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#171717] dark:bg-white text-white dark:text-black flex items-center justify-center shadow-vercel-subtle shrink-0">
                <svg className="h-4 w-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#171717] dark:text-[#ededed] tracking-tight leading-none">
                  Route136
                </p>
                <p className="text-[10px] font-mono text-[#888888] mt-1 leading-none">
                  BRACU CSE • 136 Cr
                </p>
              </div>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-[#888888] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Primary Action Button in Sidebar */}
          {isOnboarded && (
            <button
              type="button"
              onClick={() => {
                setAddCoursesTargetSemesterId(null);
                setAddCoursesPreselected([]);
                setIsAddCoursesModalOpen(true);
              }}
              className="w-full h-9 px-3 rounded-lg bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white text-white dark:text-[#0a0a0a] text-xs font-medium flex items-center justify-center gap-2 shadow-vercel-subtle transition cursor-pointer active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Add Courses</span>
            </button>
          )}

          {/* Workspace Navigation Links */}
          <div className="space-y-1">
            <span className="px-2.5 text-[10px] font-mono uppercase tracking-wider text-[#888888] block mb-1.5">
              Workspace
            </span>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("category-requirements-section");
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full px-2.5 py-2 rounded-lg text-xs font-medium text-[#666666] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-[#ededed] hover:bg-[#f5f5f5] dark:hover:bg-[#141414] flex items-center gap-2.5 transition-all cursor-pointer"
            >
              <Layers className="h-4 w-4 text-[#0070f3] shrink-0" />
              <span>Degree Overview</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("gpa-dashboard-section");
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full px-2.5 py-2 rounded-lg text-xs font-medium text-[#666666] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-[#ededed] hover:bg-[#f5f5f5] dark:hover:bg-[#141414] flex items-center gap-2.5 transition-all cursor-pointer"
            >
              <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>CGPA &amp; Trajectory</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("semester-planner-section");
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full px-2.5 py-2 rounded-lg text-xs font-medium text-[#666666] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-[#ededed] hover:bg-[#f5f5f5] dark:hover:bg-[#141414] flex items-center gap-2.5 transition-all cursor-pointer"
            >
              <Calendar className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Semester Planner</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsCapstoneCollapsed(false);
                const el = document.getElementById("capstone-section");
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full px-2.5 py-2 rounded-lg text-xs font-medium text-[#666666] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-[#ededed] hover:bg-[#f5f5f5] dark:hover:bg-[#141414] flex items-center gap-2.5 transition-all cursor-pointer"
            >
              <GraduationCap className="h-4 w-4 text-purple-500 shrink-0" />
              <span>CSE400 Capstone</span>
            </button>
          </div>

          {/* Academic Tools & Modals */}
          {isOnboarded && (
            <div className="space-y-1 pt-2 border-t border-[#ebebeb] dark:border-[#1f1f1f]">
              <span className="px-2.5 text-[10px] font-mono uppercase tracking-wider text-[#888888] block mb-1.5">
                Utilities
              </span>

              <button
                type="button"
                onClick={() => {
                  setQuickGradesInitialSemIdx(0);
                  setIsQuickGradesModalOpen(true);
                }}
                className="w-full px-2.5 py-2 rounded-lg text-xs font-medium text-[#666666] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-[#ededed] hover:bg-[#f5f5f5] dark:hover:bg-[#141414] flex items-center gap-2.5 transition-all cursor-pointer"
              >
                <Zap className="h-4 w-4 text-[#0070f3] shrink-0" />
                <span>Quick Grades</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPrereqChainsModal(true)}
                className="w-full px-2.5 py-2 rounded-lg text-xs font-medium text-[#666666] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-[#ededed] hover:bg-[#f5f5f5] dark:hover:bg-[#141414] flex items-center gap-2.5 transition-all cursor-pointer"
              >
                <GitBranch className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Pre-req Chain</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRoiModal(true)}
                className="w-full px-2.5 py-2 rounded-lg text-xs font-medium text-[#666666] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-[#ededed] hover:bg-[#f5f5f5] dark:hover:bg-[#141414] flex items-center gap-2.5 transition-all cursor-pointer"
              >
                <Repeat className="h-4 w-4 text-cyan-500 shrink-0" />
                <span>Retake ROI Analyzer</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRoadmapModal(true)}
                className="w-full px-2.5 py-2 rounded-lg text-xs font-medium text-[#666666] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-[#ededed] hover:bg-[#f5f5f5] dark:hover:bg-[#141414] flex items-center gap-2.5 transition-all cursor-pointer"
              >
                <Compass className="h-4 w-4 text-rose-500 shrink-0" />
                <span>Curriculum Roadmap</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGradeSheetModal(true)}
                className="w-full px-2.5 py-2 rounded-lg text-xs font-medium text-[#666666] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-[#ededed] hover:bg-[#f5f5f5] dark:hover:bg-[#141414] flex items-center gap-2.5 transition-all cursor-pointer"
              >
                <Camera className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>Progress Snapshot</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExtraSidebarOpen(prev => !prev)}
                className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                  isExtraSidebarOpen
                    ? 'bg-[#f5f5f5] dark:bg-[#161616] text-[#171717] dark:text-white'
                    : 'text-[#666666] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-[#ededed] hover:bg-[#f5f5f5] dark:hover:bg-[#141414]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Menu className="h-4 w-4 text-[#888888] shrink-0" />
                  <span>Backups &amp; Reset</span>
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#0070f3]" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom: Theme Toggle & Cloud Sync Profile Card */}
        <div className="flex flex-col gap-2 w-full pt-3 border-t border-[#ebebeb] dark:border-[#1f1f1f]">
          <div className="flex items-center justify-between gap-2">
            {/* Cloud Sync / Profile Button */}
            <button
              type="button"
              onClick={() => {
                setGatekeeperError(null);
                setShowCloudModal(true);
              }}
              className="flex-1 px-2.5 py-2 rounded-lg border border-[#ebebeb] dark:border-[#242424] bg-[#fafafa] dark:bg-[#121212] hover:bg-[#f0f0f0] dark:hover:bg-[#181818] flex items-center gap-2 transition-all cursor-pointer min-w-0"
              title={cloudUser ? `Google Drive Synced • ${cloudUser.email}` : "Sign in with G-Suite"}
            >
              {cloudUser?.picture ? (
                <img src={cloudUser.picture} alt="Profile" className="h-5 w-5 rounded-full object-cover shrink-0" />
              ) : (
                <Cloud className={`h-4 w-4 shrink-0 ${cloudUser ? 'text-[#0070f3]' : 'text-[#888888]'}`} />
              )}
              <span className="text-[11px] font-medium text-[#171717] dark:text-[#ededed] truncate">
                {cloudUser ? cloudUser.name : "Cloud Sync"}
              </span>
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-lg border border-[#ebebeb] dark:border-[#242424] bg-[#fafafa] dark:bg-[#121212] hover:bg-[#f0f0f0] dark:hover:bg-[#181818] text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] flex items-center justify-center transition-all cursor-pointer shrink-0"
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Slide-out Drawer: Where Extra Things Go (Backups, Snapshot, Roadmap, Reset) */}
      {isExtraSidebarOpen && (
        <>
          {/* Backdrop on small screens */}
          <div 
            onClick={() => setIsExtraSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          />

          <div className="fixed top-0 left-0 lg:left-56 h-screen w-80 sm:w-88 bg-white dark:bg-[#0a0a0a] border-r border-[#ebebeb] dark:border-[#262626] z-50 p-6 flex flex-col justify-between shadow-vercel-modal animate-in slide-in-from-left duration-200 overflow-y-auto">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-[#ebebeb] dark:border-[#262626] pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-[#f5f5f5] dark:bg-[#171717] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-white">
                    <Menu className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm tracking-tight text-[#171717] dark:text-[#ededed]">Tools &amp; Utilities</h3>
                    <p className="text-[11px] text-[#888888]">Curriculum utilities &amp; backups</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExtraSidebarOpen(false)}
                  className="h-7 w-7 rounded-md bg-white dark:bg-[#111111] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626] text-[#888888] hover:text-[#171717] dark:hover:text-white flex items-center justify-center cursor-pointer transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Backup & Progress Actions */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#888888] px-1 block mb-1">Data &amp; Backups</span>
                
                {/* Export JSON */}
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="w-full p-3 rounded-lg bg-[#fafafa] dark:bg-[#111111] hover:bg-[#f5f5f5] dark:hover:bg-[#171717] border border-[#ebebeb] dark:border-[#262626] flex items-center gap-3 transition cursor-pointer text-left shadow-vercel-subtle group"
                >
                  <div className="h-8 w-8 rounded-md bg-white dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-[#ededed] shrink-0">
                    <Download className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#171717] dark:text-[#ededed] group-hover:text-[#0070f3] transition-colors">Export JSON Backup</p>
                    <p className="text-[11px] text-[#888888]">Save curriculum state locally</p>
                  </div>
                </button>

                {/* Restore JSON */}
                <label className="w-full p-3 rounded-lg bg-[#fafafa] dark:bg-[#111111] hover:bg-[#f5f5f5] dark:hover:bg-[#171717] border border-[#ebebeb] dark:border-[#262626] flex items-center gap-3 transition cursor-pointer text-left shadow-vercel-subtle group">
                  <div className="h-8 w-8 rounded-md bg-white dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-[#ededed] shrink-0">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#171717] dark:text-[#ededed] group-hover:text-[#0070f3] transition-colors">Restore JSON Backup</p>
                    <p className="text-[11px] text-[#888888]">Load from .json file</p>
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      handleImportBackup(e);
                      setIsExtraSidebarOpen(false);
                    }}
                    className="hidden"
                  />
                </label>

                {/* Snapshot Progress */}
                <button
                  type="button"
                  onClick={() => {
                    setShowGradeSheetModal(true);
                    setIsExtraSidebarOpen(false);
                  }}
                  className="w-full p-3 rounded-lg bg-[#fafafa] dark:bg-[#111111] hover:bg-[#f5f5f5] dark:hover:bg-[#171717] border border-[#ebebeb] dark:border-[#262626] flex items-center gap-3 transition cursor-pointer text-left shadow-vercel-subtle group"
                >
                  <div className="h-8 w-8 rounded-md bg-white dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-[#ededed] shrink-0">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#171717] dark:text-[#ededed] group-hover:text-[#0070f3] transition-colors">Snapshot Progress PNG</p>
                    <p className="text-[11px] text-[#888888]">High-resolution summary card</p>
                  </div>
                </button>
              </div>

              {/* Academic Utilities */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#888888] px-1 block mb-1">Academic Utilities</span>

                {/* Pre-req Chain Sequence Viewer */}
                <button
                  type="button"
                  onClick={() => {
                    setShowPrereqChainsModal(true);
                    setIsExtraSidebarOpen(false);
                  }}
                  className="w-full p-3 rounded-lg bg-[#fafafa] dark:bg-[#111111] hover:bg-[#f5f5f5] dark:hover:bg-[#171717] border border-[#ebebeb] dark:border-[#262626] flex items-center gap-3 transition cursor-pointer text-left shadow-vercel-subtle group"
                >
                  <div className="h-8 w-8 rounded-md bg-white dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-emerald-500 shrink-0">
                    <GitBranch className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#171717] dark:text-[#ededed] group-hover:text-[#0070f3] transition-colors">Pre-req Chain</p>
                    <p className="text-[11px] text-[#888888]">CSE &amp; MNS sequence progress</p>
                  </div>
                </button>

                {/* Feeling Lost Roadmap */}
                <button
                  type="button"
                  onClick={() => {
                    setShowRoadmapModal(true);
                    setIsExtraSidebarOpen(false);
                  }}
                  className="w-full p-3 rounded-lg bg-[#fafafa] dark:bg-[#111111] hover:bg-[#f5f5f5] dark:hover:bg-[#171717] border border-[#ebebeb] dark:border-[#262626] flex items-center gap-3 transition cursor-pointer text-left shadow-vercel-subtle group"
                >
                  <div className="h-8 w-8 rounded-md bg-white dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-[#ededed] shrink-0">
                    <HelpCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#171717] dark:text-[#ededed] group-hover:text-[#0070f3] transition-colors">Curriculum Roadmap</p>
                    <p className="text-[11px] text-[#888888]">Interactive CSE flowchart</p>
                  </div>
                </button>

                {/* Sample OBE Curriculum (Version 2023) Link */}
                <a
                  href="https://docs.google.com/document/d/1_gvpl646PurM3Cl_JoxaXt0mvQx_6-Qc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full p-3 rounded-lg bg-[#fafafa] dark:bg-[#111111] hover:bg-[#f5f5f5] dark:hover:bg-[#171717] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-between gap-3 transition cursor-pointer text-left shadow-vercel-subtle group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-md bg-white dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-[#ededed] shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#171717] dark:text-[#ededed] group-hover:text-[#0070f3] transition-colors truncate">Sample OBE Curriculum (2023)</p>
                      <p className="text-[11px] text-[#888888] truncate">Official Google Doc syllabus</p>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-[#888888] group-hover:text-[#0070f3] transition-colors shrink-0" />
                </a>

                {/* Grading System Scale */}
                <button
                  type="button"
                  onClick={() => {
                    setShowGradingSystemModal(true);
                    setIsExtraSidebarOpen(false);
                  }}
                  className="w-full p-3 rounded-lg bg-[#fafafa] dark:bg-[#111111] hover:bg-[#f5f5f5] dark:hover:bg-[#171717] border border-[#ebebeb] dark:border-[#262626] flex items-center gap-3 transition cursor-pointer text-left shadow-vercel-subtle group"
                >
                  <div className="h-8 w-8 rounded-md bg-white dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-[#ededed] shrink-0">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#171717] dark:text-[#ededed] group-hover:text-[#0070f3] transition-colors">BRACU Grading Scale</p>
                    <p className="text-[11px] text-[#888888]">Grade points &amp; marks range</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Drawer Bottom: Reset Plan */}
            <div className="pt-4 border-t border-[#ebebeb] dark:border-[#262626]">
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(true);
                  setIsExtraSidebarOpen(false);
                }}
                className="w-full p-2.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 text-[#ee0000] flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs font-medium">Reset Plan to Default</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* 3. Mobile Header (< 1024px) */}
      <header className="flex lg:hidden items-center justify-between px-4 py-3 bg-white/80 dark:bg-black/80 border-b border-[#ebebeb] dark:border-[#262626] sticky top-0 z-40 backdrop-blur-md">
        <div 
          onClick={() => setShowDashboard(false)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="h-7 w-7 rounded-md bg-[#171717] dark:bg-white text-white dark:text-black flex items-center justify-center shadow-vercel-subtle">
            <svg className="h-4 w-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#171717] dark:text-white">Route136</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle Button Mobile */}
          <button
            type="button"
            onClick={toggleTheme}
            className="h-8 w-8 rounded-md bg-[#f5f5f5] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] text-[#888888] hover:text-[#171717] dark:hover:text-white flex items-center justify-center cursor-pointer transition"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

          {/* Profile / Cloud Button */}
          <button
            type="button"
            onClick={() => {
              setGatekeeperError(null);
              setShowCloudModal(true);
            }}
            className="h-8 w-8 rounded-md bg-[#f5f5f5] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center cursor-pointer hover:bg-[#ebebeb] dark:hover:bg-[#1c1c1c] transition"
          >
            {cloudUser?.picture ? (
              <img src={cloudUser.picture} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <Cloud className="h-3.5 w-3.5 text-[#0070f3]" />
            )}
          </button>
        </div>
      </header>

      {/* 4. Main Body Container (either Onboarding Wizard or Bento Dashboard) */}
      {!isOnboarded ? (
        /* Onboarding Wizard Modal overlay if not onboarded — Landing Page Vercel Developer Platform Aesthetic */
        <div className="flex-1 flex items-center justify-center p-4 md:p-6 bg-[#fafafa] dark:bg-[#050505] relative overflow-hidden transition-colors">
          {/* Vercel Structural Grid + Atmospheric Radial Spotlight */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808014_1px,transparent_1px),linear-gradient(to_bottom,#80808014_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_85%_65%_at_50%_20%,#000_65%,transparent_100%)]" />
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[340px] bg-gradient-to-tr from-[#0070f3]/14 via-cyan-500/8 to-transparent rounded-full blur-[100px]" />
          </div>

          <div className="w-full max-w-2xl mx-auto bg-white dark:bg-[#0c0c0c] border border-[#e5e5e5] dark:border-[#242424] rounded-2xl shadow-vercel-modal relative z-10 overflow-hidden text-[#171717] dark:text-[#ededed]">
            {/* Window Chrome Bar (matches Landing Page preview window) */}
            <div className="px-4 sm:px-5 py-2.5 bg-[#fafafa] dark:bg-[#111111] border-b border-[#ebebeb] dark:border-[#222222] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
              </div>
              <div className="px-3 py-0.5 rounded-md bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] text-[10px] font-mono text-[#888888] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0070f3]" />
                <span>route136.app/setup</span>
              </div>
              <span className="text-[10px] font-mono text-[#0070f3] bg-[#0070f3]/10 border border-[#0070f3]/20 px-2 py-0.5 rounded font-medium">
                STEP {wizardStep} OF 3
              </span>
            </div>

            <div className="p-5 sm:p-7 space-y-6">
              {/* Interactive Step Indicator Pills */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { step: 1, title: "1. Intake & RS", sub: "Current Sem & Term" },
                  { step: 2, title: "2. 1st Sem Entry", sub: "Credit vs. Remedial" },
                  { step: 3, title: "3. Add Courses", sub: "Populate Past Terms" },
                ].map((item) => {
                  const isActive = wizardStep === item.step;
                  const isDone = wizardStep > item.step;
                  return (
                    <div
                      key={item.step}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                        isActive
                          ? "bg-[#fafafa] dark:bg-[#141414] border-[#0070f3]/40 shadow-vercel-subtle"
                          : isDone
                          ? "bg-[#fafafa] dark:bg-[#111111] border-emerald-500/30"
                          : "bg-[#fafafa]/50 dark:bg-[#0e0e0e] border-[#ebebeb] dark:border-[#222222] opacity-65"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`text-[11px] font-semibold truncate ${isActive ? "text-[#0070f3]" : "text-[#171717] dark:text-[#ededed]"}`}>
                          {item.title}
                        </p>
                        <p className="text-[10px] font-mono text-[#888888] truncate hidden sm:block">
                          {item.sub}
                        </p>
                      </div>
                      {isDone ? (
                        <span className="h-4 w-4 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                      ) : (
                        <span className={`h-2 w-2 rounded-full shrink-0 ${isActive ? "bg-[#0070f3]" : "bg-[#d4d4d8] dark:bg-[#2a2a2a]"}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* STEP 1: Current Semester, Intake & RS Placement (First Popup!) */}
              {wizardStep === 1 && (
                <div className="space-y-5 relative z-10">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0070f3]/10 border border-[#0070f3]/20 text-[10px] font-mono text-[#0070f3] mb-2">
                      <span>[ TIMELINE CONFIGURATION ]</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">
                      Current Semester, Intake &amp; RS
                    </h2>
                    <p className="text-[#666666] dark:text-[#888888] text-xs mt-1 leading-relaxed">
                      Select which semester you are currently in, your starting intake, and when you attend Residential Semester (RS).
                    </p>
                  </div>

                  {/* 3-Column Bento Grid: Current Semester, Starting Term, Starting Year */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-[#fafafa] dark:bg-[#121212] border border-[#ebebeb] dark:border-[#242424] space-y-1.5">
                      <label className="block text-[10px] font-mono text-[#888888] uppercase tracking-wider">
                        Current Semester
                      </label>
                      <div className="relative">
                        <select
                          value={onboardingData.currentSemesterNumber || 1}
                          onChange={(e) => setOnboardingData({ ...onboardingData, currentSemesterNumber: parseInt(e.target.value, 10) })}
                          className="w-full appearance-none bg-white dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#2a2a2a] text-xs pl-3 pr-8 py-2 rounded-lg text-[#171717] dark:text-[#ededed] outline-none focus:border-[#0070f3] transition cursor-pointer font-semibold"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                            <option key={num} value={num}>{getOrdinal(num)} Semester</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888888] flex items-center">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#fafafa] dark:bg-[#121212] border border-[#ebebeb] dark:border-[#242424] space-y-1.5">
                      <label className="block text-[10px] font-mono text-[#888888] uppercase tracking-wider">
                        Starting Term
                      </label>
                      <div className="relative">
                        <select
                          value={onboardingData.startingTerm}
                          onChange={(e) => setOnboardingData({ ...onboardingData, startingTerm: e.target.value as any })}
                          className="w-full appearance-none bg-white dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#2a2a2a] text-xs pl-3 pr-8 py-2 rounded-lg text-[#171717] dark:text-[#ededed] outline-none focus:border-[#0070f3] transition cursor-pointer font-semibold"
                        >
                          <option value="Spring">Spring</option>
                          <option value="Summer">Summer</option>
                          <option value="Fall">Fall</option>
                        </select>
                        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888888] flex items-center">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#fafafa] dark:bg-[#121212] border border-[#ebebeb] dark:border-[#242424] space-y-1.5">
                      <label className="block text-[10px] font-mono text-[#888888] uppercase tracking-wider">
                        Starting Year
                      </label>
                      <div className="relative">
                        <select
                          value={onboardingData.startingYear}
                          onChange={(e) => setOnboardingData({ ...onboardingData, startingYear: parseInt(e.target.value, 10) })}
                          className="w-full appearance-none bg-white dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#2a2a2a] text-xs pl-3 pr-8 py-2 rounded-lg text-[#171717] dark:text-[#ededed] outline-none focus:border-[#0070f3] transition cursor-pointer font-semibold"
                        >
                          {Array.from({ length: 11 }, (_, i) => 2020 + i).map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888888] flex items-center">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Residential Semester (RS) Flexible Selector: Quick Picks + Custom Semester # + Not Sure Yet */}
                  <div className="p-4 rounded-xl bg-[#fafafa] dark:bg-[#121212] border border-[#ebebeb] dark:border-[#242424] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="block text-[10px] font-mono text-[#888888] uppercase tracking-wider">
                        When do you attend Residential Semester (RS)?
                      </label>
                      <span className="text-[10px] font-mono text-[#0070f3]">
                        {onboardingData.rsTerm === 'not_sure' ? 'Can be assigned later anytime' : `Assigned to ${onboardingData.rsTerm}`}
                      </span>
                    </div>

                    {/* Quick presets: 3rd, 4th, 5th, or Not Sure Yet */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: "3rd Semester", value: "3rd Semester" },
                        { label: "4th Semester", value: "4th Semester" },
                        { label: "5th Semester", value: "5th Semester" },
                        { label: "Not Sure Yet", value: "not_sure" },
                      ].map((opt) => {
                        const isSelected = onboardingData.rsTerm === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setOnboardingData({ ...onboardingData, rsTerm: opt.value })}
                            className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              isSelected
                                ? "bg-[#171717] dark:bg-[#ededed] border-[#171717] dark:border-[#ededed] text-white dark:text-[#0a0a0a] shadow-vercel-subtle font-semibold"
                                : "bg-white dark:bg-[#181818] border-[#e5e5e5] dark:border-[#2a2a2a] text-[#666666] dark:text-[#a1a1a1] hover:border-[#888888]"
                            }`}
                          >
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Or pick any custom semester number (2nd - 12th) */}
                    <div className="pt-2 border-t border-[#ebebeb] dark:border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[11px] text-[#666666] dark:text-[#888888]">
                        Attending RS in a different semester number?
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#888888] uppercase">Custom Sem #:</span>
                        <div className="relative">
                          <select
                            value={onboardingData.rsTerm === "not_sure" ? "not_sure" : onboardingData.rsTerm}
                            onChange={(e) => setOnboardingData({ ...onboardingData, rsTerm: e.target.value })}
                            className="appearance-none bg-white dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#2a2a2a] text-xs pl-2.5 pr-7 py-1.5 rounded-lg text-[#171717] dark:text-[#ededed] font-mono font-medium outline-none focus:border-[#0070f3] cursor-pointer"
                          >
                            {Array.from({ length: 11 }, (_, i) => i + 2).map((semNum) => {
                              const label = `${getOrdinal(semNum)} Semester`;
                              return (
                                <option key={semNum} value={label}>
                                  {label}
                                </option>
                              );
                            })}
                            <option value="not_sure">Not Sure / Decide Later</option>
                          </select>
                          <ChevronDown className="h-3 w-3 text-[#888888] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#ebebeb] dark:border-[#222222]">
                    <span className="text-[11px] font-mono text-[#888888]">
                      12 Default Semesters • Manual Course Control
                    </span>
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="h-9 px-5 bg-[#171717] dark:bg-[#ededed] text-white dark:text-[#0a0a0a] font-medium rounded-lg hover:bg-black/90 dark:hover:bg-white shadow-vercel-subtle transition duration-150 cursor-pointer text-xs flex items-center gap-1.5"
                    >
                      <span>Continue</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: 1st Semester Entry Pathway (Credit vs. Non-Credit Foundation) */}
              {wizardStep === 2 && (
                <div className="space-y-5 relative z-10">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0070f3]/10 border border-[#0070f3]/20 text-[10px] font-mono text-[#0070f3] mb-2">
                      <span>[ ENTRY PATHWAY ]</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">
                      1st Semester Starting Pathway
                    </h2>
                    <p className="text-[#666666] dark:text-[#888888] text-xs mt-1 leading-relaxed">
                      Did you start directly with credit courses or take non-credit foundation (remedial) courses in your 1st semester?
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Pathway Bento Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setOnboardingData({
                          ...onboardingData,
                          pathway: 'credit',
                          creditOption: onboardingData.creditOption || 'opt1',
                          foundationOption: null
                        })}
                        className={`p-4 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between gap-3 cursor-pointer ${
                          onboardingData.pathway === 'credit'
                            ? 'bg-[#fafafa] dark:bg-[#141414] border-[#0070f3] text-[#171717] dark:text-white shadow-vercel-subtle'
                            : 'bg-white dark:bg-[#111111] border-[#ebebeb] dark:border-[#242424] text-[#888888] hover:border-[#888888]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="h-8 w-8 rounded-lg bg-[#0070f3]/10 border border-[#0070f3]/25 flex items-center justify-center text-[#0070f3]">
                            <GraduationCap className="h-4 w-4" />
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0070f3]/10 text-[#0070f3] border border-[#0070f3]/20">
                            DIRECT CREDIT
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#171717] dark:text-[#ededed]">Direct Credit Courses</p>
                          <p className="text-[11px] text-[#888888] mt-0.5">Started 1st Semester directly with ENG101 or ENG102</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOnboardingData({
                          ...onboardingData,
                          pathway: 'foundation',
                          foundationOption: onboardingData.foundationOption || 'opt1',
                          creditOption: null
                        })}
                        className={`p-4 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between gap-3 cursor-pointer ${
                          onboardingData.pathway === 'foundation'
                            ? 'bg-[#fafafa] dark:bg-[#141414] border-[#0070f3] text-[#171717] dark:text-white shadow-vercel-subtle'
                            : 'bg-white dark:bg-[#111111] border-[#ebebeb] dark:border-[#242424] text-[#888888] hover:border-[#888888]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500">
                            <Compass className="h-4 w-4" />
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            NON-CREDIT
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#171717] dark:text-[#ededed]">Non-Credit Foundation</p>
                          <p className="text-[11px] text-[#888888] mt-0.5">Required ENG091, MAT091, or MAT092 in 1st Semester</p>
                        </div>
                      </button>
                    </div>

                    {/* Sub-options for Direct Credit */}
                    {onboardingData.pathway === 'credit' && (
                      <div className="p-3.5 rounded-xl bg-[#fafafa] dark:bg-[#121212] border border-[#ebebeb] dark:border-[#242424] space-y-2">
                        <label className="block text-[10px] font-mono text-[#888888] uppercase tracking-wider">
                          Select your starting 1st Semester English course:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setOnboardingData({ ...onboardingData, creditOption: 'opt1' })}
                            className={`p-3 rounded-lg border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                              onboardingData.creditOption === 'opt1'
                                ? 'bg-white dark:bg-[#1a1a1a] border-[#171717] dark:border-[#ededed] text-[#171717] dark:text-white shadow-vercel-subtle'
                                : 'bg-white/60 dark:bg-[#151515] border-[#e5e5e5] dark:border-[#262626] text-[#888888] hover:border-[#888888]'
                            }`}
                          >
                            <div>
                              <p className="font-semibold text-xs text-[#171717] dark:text-[#ededed]">Started with ENG101</p>
                              <p className="text-[10px] font-mono text-[#888888] mt-0.5">English Fundamentals in Sem 1</p>
                            </div>
                            {onboardingData.creditOption === 'opt1' && <Check className="h-4 w-4 text-[#0070f3] shrink-0" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => setOnboardingData({ ...onboardingData, creditOption: 'opt2' })}
                            className={`p-3 rounded-lg border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                              onboardingData.creditOption === 'opt2'
                                ? 'bg-white dark:bg-[#1a1a1a] border-[#171717] dark:border-[#ededed] text-[#171717] dark:text-white shadow-vercel-subtle'
                                : 'bg-white/60 dark:bg-[#151515] border-[#e5e5e5] dark:border-[#262626] text-[#888888] hover:border-[#888888]'
                            }`}
                          >
                            <div>
                              <p className="font-semibold text-xs text-[#171717] dark:text-[#ededed]">Started with ENG102</p>
                              <p className="text-[10px] font-mono text-[#888888] mt-0.5">English Composition I in Sem 1</p>
                            </div>
                            {onboardingData.creditOption === 'opt2' && <Check className="h-4 w-4 text-[#0070f3] shrink-0" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Sub-options for Non-Credit Foundation */}
                    {onboardingData.pathway === 'foundation' && (
                      <div className="p-3.5 rounded-xl bg-[#fafafa] dark:bg-[#121212] border border-[#ebebeb] dark:border-[#242424] space-y-2">
                        <label className="block text-[10px] font-mono text-[#888888] uppercase tracking-wider">
                          Select required non-credit courses (0 Cr):
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {[
                            { key: 'remedialEng091Checked' as const, code: 'ENG091', desc: 'Foundation English' },
                            { key: 'remedialMat091Checked' as const, code: 'MAT091', desc: 'Basic Pre-Calculus' },
                            { key: 'remedialMat092Checked' as const, code: 'MAT092', desc: 'Remedial Algebra' },
                          ].map((rem) => {
                            const checked = Boolean(onboardingData[rem.key]);
                            return (
                              <label
                                key={rem.code}
                                className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                                  checked
                                    ? 'bg-white dark:bg-[#1a1a1a] border-[#171717] dark:border-[#ededed] shadow-vercel-subtle'
                                    : 'bg-white/60 dark:bg-[#151515] border-[#e5e5e5] dark:border-[#262626] hover:border-[#888888]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => setOnboardingData({ ...onboardingData, [rem.key]: e.target.checked })}
                                  className="sr-only"
                                />
                                <div className={`h-4 w-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                                  checked
                                    ? 'bg-[#0070f3] border-[#0070f3] text-white'
                                    : 'border-[#d4d4d8] dark:border-[#333333] bg-white dark:bg-[#111111]'
                                }`}>
                                  {checked && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-mono font-semibold text-[#171717] dark:text-[#ededed]">{rem.code}</p>
                                  <p className="text-[10px] text-[#888888] truncate">{rem.desc}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#ebebeb] dark:border-[#222222]">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="h-9 px-4 rounded-lg border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#141414] hover:bg-[#f5f5f5] dark:hover:bg-[#1c1c1c] text-[#666666] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-[#ededed] text-xs font-medium transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProceedToWizardStep3()}
                      disabled={!onboardingData.pathway}
                      className="h-9 px-5 bg-[#171717] dark:bg-[#ededed] text-white dark:text-[#0a0a0a] font-medium rounded-lg hover:bg-black/90 dark:hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed shadow-vercel-subtle transition duration-150 cursor-pointer text-xs flex items-center gap-1.5"
                    >
                      <span>Next: Add Courses</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Add Courses up to Current Semester via Multi-Semester Popup & Choose RS 4th Course */}
              {wizardStep === 3 && (
                <div className="space-y-5 relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0070f3]/10 border border-[#0070f3]/20 text-[10px] font-mono text-[#0070f3] mb-2">
                        <span>[ COURSE POPULATION • 1ST → {getOrdinal(onboardingData.currentSemesterNumber || 1).toUpperCase()} SEM ]</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">
                        Populate Your Semesters
                      </h2>
                      <p className="text-[#666666] dark:text-[#888888] text-xs mt-1 leading-relaxed">
                        Add courses to any semester up to your current semester using the multi-semester picker.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAddCoursesTargetSemesterId(semesters[0]?.id || "sem-1");
                        setAddCoursesPreselected([]);
                        setIsAddCoursesModalOpen(true);
                      }}
                      className="h-9 px-3.5 bg-[#0070f3] hover:bg-[#0060df] text-white text-xs font-medium rounded-lg shadow-vercel-subtle flex items-center gap-1.5 shrink-0 cursor-pointer transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Open Multi-Semester Course Picker</span>
                    </button>
                  </div>

                  {/* Semesters 1..currentSemesterNumber interactive list */}
                  <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
                    {semesters.slice(0, onboardingData.currentSemesterNumber || 1).map((sem, idx) => {
                      const intake = semesterIntakes[idx];
                      const semTermYear = `${sem.term || intake?.term || 'Spring'} ${sem.year || intake?.year || onboardingData.startingYear}`;
                      const semCredits = sem.courses.reduce((sum, c) => {
                        const info = COURSES.find(co => co.code === c.code);
                        return sum + (info?.category === "Non-Credit" ? 0 : (info?.credits ?? 3));
                      }, 0);
                      const hasEng102InRS = sem.courses.some(c => c.code === "ENG102");
                      const hasBu201InRS = sem.courses.some(c => c.code === "BU201");

                      return (
                        <div
                          key={sem.id}
                          className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
                            sem.isRS
                              ? "bg-indigo-500/[0.04] dark:bg-indigo-500/[0.06] border-indigo-500/30"
                              : "bg-[#fafafa] dark:bg-[#111111] border-[#ebebeb] dark:border-[#242424]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              {sem.isRS && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-mono font-semibold">
                                  SAVAR RS
                                </span>
                              )}
                              <span className="text-xs font-semibold text-[#171717] dark:text-[#ededed] truncate">
                                {sem.name}
                              </span>
                              <span className="text-[10px] font-mono text-[#888888]">
                                ({semTermYear})
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626] text-[#0070f3] font-medium">
                                {sem.courses.length} courses • {semCredits} Cr
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setAddCoursesTargetSemesterId(sem.id);
                                setAddCoursesPreselected([]);
                                setIsAddCoursesModalOpen(true);
                              }}
                              className="h-7 px-2.5 rounded-lg bg-white dark:bg-[#181818] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] border border-[#e5e5e5] dark:border-[#2a2a2a] text-[#171717] dark:text-[#ededed] text-[11px] font-medium flex items-center gap-1 shrink-0 cursor-pointer transition shadow-vercel-subtle"
                            >
                              <Plus className="h-3 w-3 text-[#0070f3]" />
                              <span>Add Courses</span>
                            </button>
                          </div>

                          {/* Special RS 4th Course Quick Selector (ENG102 vs. BU201) */}
                          {sem.isRS && (
                            <div className="p-2.5 rounded-lg bg-white dark:bg-[#161616] border border-indigo-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="text-[11px]">
                                <span className="font-semibold text-[#171717] dark:text-[#ededed]">
                                  Choose 4th RS Course:
                                </span>{" "}
                                <span className="text-[#666666] dark:text-[#888888]">
                                  (Alongside EMB101, HUM103 &amp; BNG103)
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const isComp = (onboardingData.currentSemesterNumber || 1) > idx + 1;
                                    setSemesters(prev => prev.map(s => {
                                      if (s.id !== sem.id) {
                                        // Also ensure ENG102 isn't duplicated elsewhere if moving to RS
                                        return s;
                                      }
                                      const filtered = s.courses.filter(c => c.code !== "BU201" && c.code !== "ENG102");
                                      return {
                                        ...s,
                                        courses: [...filtered, { code: "ENG102", grade: "", isCompleted: isComp }]
                                      };
                                    }));
                                  }}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border transition cursor-pointer flex items-center gap-1 ${
                                    hasEng102InRS
                                      ? "bg-[#0070f3] border-[#0070f3] text-white shadow-vercel-subtle"
                                      : "bg-[#fafafa] dark:bg-[#1f1f1f] border-[#e5e5e5] dark:border-[#2e2e2e] text-[#666666] dark:text-[#a1a1a1] hover:border-[#0070f3]"
                                  }`}
                                >
                                  {hasEng102InRS && <Check className="h-3 w-3 stroke-[3]" />}
                                  <span>+ ENG102</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const isComp = (onboardingData.currentSemesterNumber || 1) > idx + 1;
                                    setSemesters(prev => prev.map(s => {
                                      if (s.id !== sem.id) return s;
                                      const filtered = s.courses.filter(c => c.code !== "ENG102" && c.code !== "BU201");
                                      return {
                                        ...s,
                                        courses: [...filtered, { code: "BU201", grade: "", isCompleted: isComp }]
                                      };
                                    }));
                                  }}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border transition cursor-pointer flex items-center gap-1 ${
                                    hasBu201InRS
                                      ? "bg-[#0070f3] border-[#0070f3] text-white shadow-vercel-subtle"
                                      : "bg-[#fafafa] dark:bg-[#1f1f1f] border-[#e5e5e5] dark:border-[#2e2e2e] text-[#666666] dark:text-[#a1a1a1] hover:border-[#0070f3]"
                                  }`}
                                >
                                  {hasBu201InRS && <Check className="h-3 w-3 stroke-[3]" />}
                                  <span>+ BU201</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {sem.courses.length === 0 ? (
                            <p className="text-[11px] text-[#888888] font-mono">
                              No courses added yet — click &ldquo;+ Add Courses&rdquo; to assign courses.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {sem.courses.map((c) => {
                                const theme = getCategoryTheme(undefined, c.code);
                                return (
                                  <span
                                    key={c.code}
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono font-medium ${theme.codePill}`}
                                  >
                                    <span>{c.code}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCourse(sem.id, c.code)}
                                      className="opacity-70 hover:opacity-100 hover:text-rose-500 transition cursor-pointer"
                                      title="Remove course"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Compact Configuration Summary Footer */}
                  <div className="bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#242424] px-3.5 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#666666] dark:text-[#888888]">
                    <span>Default Plan: <strong className="text-[#171717] dark:text-[#ededed]">12 Semesters</strong></span>
                    <span>RS Placement: <strong className="text-[#0070f3]">{onboardingData.rsTerm === "not_sure" ? "Not Sure Yet" : onboardingData.rsTerm}</strong></span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#ebebeb] dark:border-[#222222]">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="h-9 px-4 rounded-lg border border-[#e5e5e5] dark:border-[#262626] bg-white dark:bg-[#141414] hover:bg-[#f5f5f5] dark:hover:bg-[#1c1c1c] text-[#666666] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-[#ededed] text-xs font-medium transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        generateInitialPlan();
                      }}
                      className="h-9 px-5 bg-[#171717] dark:bg-[#ededed] text-white dark:text-[#0a0a0a] font-medium rounded-lg hover:bg-black/90 dark:hover:bg-white shadow-vercel-subtle transition duration-150 cursor-pointer text-xs flex items-center gap-1.5"
                    >
                      <span>Finish &amp; Open Workspace</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Actual App Dashboard in Bento Grid Layout — Landing Page Vercel Developer Platform Aesthetic */
        <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-6 lg:h-screen overflow-y-auto custom-scrollbar flex flex-col gap-6 pb-24 lg:pb-8 relative bg-[#fafafa] dark:bg-[#050505]">
          {/* Vercel Structural Grid + Atmospheric Radial Spotlight */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_90%_70%_at_50%_10%,#000_60%,transparent_100%)]" />
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[820px] h-[340px] bg-gradient-to-tr from-[#0070f3]/10 via-cyan-500/6 to-transparent rounded-full blur-[110px]" />
          </div>

          <div className="w-full shrink-0 bg-white dark:bg-[#0c0c0c] border border-[#e5e5e5] dark:border-[#242424] rounded-2xl shadow-vercel-modal relative z-10 flex flex-col transition-colors">
            {/* Window Chrome Bar (matches Landing Page preview window) */}
            <div className="px-4 sm:px-6 py-2.5 bg-[#fafafa] dark:bg-[#111111] border-b border-[#ebebeb] dark:border-[#222222] rounded-t-2xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
              </div>
              <div className="px-3 py-0.5 rounded-md bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] text-[10px] font-mono text-[#888888] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>route136.app/workspace</span>
              </div>
              <span className="text-[10px] font-mono text-[#0070f3] bg-[#0070f3]/10 border border-[#0070f3]/20 px-2 py-0.5 rounded font-medium">
                136-CR ENGINE
              </span>
            </div>

            <div className="p-4 sm:p-6 lg:p-7 flex flex-col gap-6">
              {/* Bento Container Top Bar: Workspace Status & Direct Action Buttons */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 border-b border-[#ebebeb] dark:border-[#222222] pb-4">
              {/* Left: Workspace Title & Live Credit / CGPA Badges */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#0070f3]" />
                  <h1 className="text-sm sm:text-base font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">
                    Degree Workspace
                  </h1>
                </div>
                <div className="bg-[#f5f5f5] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-vercel-subtle">
                  <BadgeCheck className="h-3.5 w-3.5 text-[#0070f3]" />
                  <span className="text-[11px] font-mono font-medium text-[#171717] dark:text-[#ededed]">
                    {cumulativeStats.completedCredits} <span className="text-[#888888]">/ 136 Cr</span>
                  </span>
                </div>
                <div className="bg-[#f5f5f5] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-vercel-subtle">
                  <span className="text-[10px] font-mono text-[#888888] uppercase">CGPA</span>
                  <span className="text-[11px] font-mono font-semibold text-[#0070f3]">
                    {cumulativeStats.cgpa.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Right: Direct 1-Click Action Buttons (+ Add Courses, Roadmap, Snapshot, Tools) */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setAddCoursesTargetSemesterId(null);
                    setAddCoursesPreselected([]);
                    setIsAddCoursesModalOpen(true);
                  }}
                  className="h-8 px-3 bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white text-white dark:text-black font-medium text-xs rounded-lg shadow-vercel-subtle active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Add Courses</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrereqChainsModal(true)}
                  className="h-8 px-3 bg-[#fafafa] dark:bg-[#141414] hover:bg-[#f0f0f0] dark:hover:bg-[#1f1f1f] border border-[#ebebeb] dark:border-[#262626] text-[#171717] dark:text-[#ededed] font-medium text-xs rounded-lg shadow-vercel-subtle active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                  title="Open CSE & MNS Prerequisite Sequence Chains"
                >
                  <GitBranch className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Pre-req Chain</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRoadmapModal(true)}
                  className="h-8 px-3 bg-[#fafafa] dark:bg-[#141414] hover:bg-[#f0f0f0] dark:hover:bg-[#1f1f1f] border border-[#ebebeb] dark:border-[#262626] text-[#171717] dark:text-[#ededed] font-medium text-xs rounded-lg shadow-vercel-subtle active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                  title="Open CSE Curriculum Roadmap & Guide"
                >
                  <Compass className="h-3.5 w-3.5 text-[#0070f3]" />
                  <span>Roadmap</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowGradeSheetModal(true)}
                  className="h-8 px-3 bg-[#fafafa] dark:bg-[#141414] hover:bg-[#f0f0f0] dark:hover:bg-[#1f1f1f] border border-[#ebebeb] dark:border-[#262626] text-[#171717] dark:text-[#ededed] font-medium text-xs rounded-lg shadow-vercel-subtle active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                  title="Export Academic Progress Snapshot PNG"
                >
                  <Camera className="h-3.5 w-3.5 text-[#0070f3]" />
                  <span>Snapshot</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsExtraSidebarOpen(true)}
                  className="h-8 px-2.5 bg-[#fafafa] dark:bg-[#141414] hover:bg-[#f0f0f0] dark:hover:bg-[#1f1f1f] border border-[#ebebeb] dark:border-[#262626] text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] font-medium text-xs rounded-lg shadow-vercel-subtle active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                  title="Backups, Grading Scale & Reset"
                >
                  <Menu className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Data</span>
                </button>
              </div>
            </div>

            {/* Alerts */}
            {mode === 'gpa' && (
              <div className="w-full flex flex-col gap-2.5">
                {cumulativeStats.cgpa > 0 && cumulativeStats.cgpa < 1.50 && (
                  <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl text-[#ee0000]">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <p className="text-xs font-medium">
                      <span className="font-semibold">Academic Probation:</span> Your CGPA is below 1.50. You must raise it to 1.50+ next semester to avoid dismissal.
                    </p>
                  </div>
                )}
                {firstSemesterGpa !== null && firstSemesterGpa < 1.00 && (
                  <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <p className="text-xs font-medium">
                      <span className="font-semibold">High Risk:</span> 1st Semester CGPA below 1.00. Immediate academic counseling required.
                    </p>
                  </div>
                )}
              </div>
            )}

            {backupFileError && (
              <div className="w-full flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl text-[#ee0000]">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-xs">{backupFileError}</p>
                </div>
                <button onClick={() => setBackupFileError(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Top Row: Compact 3-Card Executive Metric Strip (Degree Standing, Category Requirements, GenEd Streams) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              {/* 1. Compact Degree Progress Card */}
              <div id="degree-standing-section" className="bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#262626] rounded-xl p-4 shadow-vercel-card relative overflow-hidden flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#888888] mb-1">
                    <span className="uppercase tracking-wider flex items-center gap-1.5">
                      <BadgeCheck className="h-3.5 w-3.5 text-[#0070f3]" />
                      <span>DEGREE PROGRESS</span>
                    </span>
                    <span className="text-[#0070f3] font-semibold">
                      {((cumulativeStats.completedCredits / 136) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <div className="text-2xl font-semibold font-mono text-[#171717] dark:text-[#ededed]">
                      {cumulativeStats.completedCredits} <span className="text-xs font-normal text-[#888888]">/ 136 Cr</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#888888]">
                      {Math.max(0, 136 - cumulativeStats.completedCredits)} Cr left
                    </span>
                  </div>
                  <div className="mt-2.5 h-2 w-full rounded-full bg-[#eaeaea] dark:bg-[#1f1f1f] overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, (cumulativeStats.completedCredits / 136) * 100)}%` }}
                      className="h-full bg-[#0070f3] rounded-full transition-all duration-500"
                    />
                  </div>
                </div>

                {/* Mini summary pills */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#ebebeb] dark:border-[#222222] text-[11px] font-mono">
                  <div className="px-2.5 py-1.5 rounded-lg bg-[#fafafa] dark:bg-[#121212] border border-[#ebebeb] dark:border-[#222222] flex items-center justify-between">
                    <span className="text-[#888888]">Terms</span>
                    <span className="text-[#171717] dark:text-[#ededed] font-semibold">{semesters.length}</span>
                  </div>
                  <div className="px-2.5 py-1.5 rounded-lg bg-[#fafafa] dark:bg-[#121212] border border-[#ebebeb] dark:border-[#222222] flex items-center justify-between">
                    <span className="text-[#888888]">Thesis</span>
                    <span className={isCSE400Passed ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-[#888888]"}>
                      {isCSE400Passed ? "4/4 Cr" : "0/4 Cr"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Compact Category Requirements Card */}
              <div id="category-requirements-section" className="bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#262626] rounded-xl p-4 shadow-vercel-card relative overflow-hidden flex flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#888888]">
                  <span className="uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-[#0070f3]" />
                    <span>CORE &amp; ELECTIVES</span>
                  </span>
                  <span className="text-[#171717] dark:text-[#ededed] font-medium">
                    {curriculumProgress.coreCompleted + curriculumProgress.schoolCoreCompleted + curriculumProgress.electiveCompleted} / 93 Cr
                  </span>
                </div>

                <div className="space-y-1.5">
                  {[
                    { key: 'core', label: 'Program Core', done: curriculumProgress.coreCompleted, total: curriculumProgress.coreTotal, bar: 'bg-[#0070f3]' },
                    { key: 'schoolCore', label: 'School Core (MNS)', done: curriculumProgress.schoolCoreCompleted, total: curriculumProgress.schoolCoreTotal, bar: 'bg-cyan-500' },
                    { key: 'electives', label: 'Major Electives', done: curriculumProgress.electiveCompleted, total: curriculumProgress.electiveTotal, bar: 'bg-amber-500' },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setActiveCategorySelectorKey(cat.key)}
                      className="w-full text-left cursor-pointer bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222] hover:border-[#888888] transition rounded-lg px-2.5 py-1.5 flex flex-col gap-1 group"
                    >
                      <div className="w-full flex justify-between items-center text-[11px]">
                        <span className="text-[#171717] dark:text-[#ededed] font-medium group-hover:text-[#0070f3] transition-colors">{cat.label}</span>
                        <span className="text-[#888888] font-mono text-[10px]">{cat.done}/{cat.total} Cr</span>
                      </div>
                      <div className="h-1 w-full bg-[#ebebeb] dark:bg-[#262626] rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, (cat.done / cat.total) * 100)}%` }}
                          className={`h-full ${cat.bar} rounded-full transition-all duration-300`}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Compact GenEd Streams (39 Cr) Matrix Card */}
              <div id="gened-streams-section" className="bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#262626] rounded-xl p-4 shadow-vercel-card relative overflow-hidden flex flex-col justify-between gap-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#888888]">
                  <span className="uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-[#0070f3]" />
                    <span>GENED STREAMS</span>
                  </span>
                  <span className="text-[#171717] dark:text-[#ededed] font-medium">
                    {curriculumProgress.stream1Completed + curriculumProgress.stream2Completed + curriculumProgress.stream3Completed + curriculumProgress.stream4Completed + curriculumProgress.stream5Completed + curriculumProgress.freeGenEdCredits} / 39 Cr
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'stream1', label: 'S1: Writing', done: curriculumProgress.stream1Completed, total: curriculumProgress.stream1Total, bar: 'bg-rose-500' },
                    { key: 'stream2', label: 'S2: Math/Sci', done: curriculumProgress.stream2Completed, total: curriculumProgress.stream2Total, bar: 'bg-blue-500' },
                    { key: 'stream3', label: 'S3: Arts/Hum', done: curriculumProgress.stream3Completed, total: curriculumProgress.stream3Total, bar: 'bg-emerald-500' },
                    { key: 'stream4', label: 'S4: Social Sci', done: curriculumProgress.stream4Completed, total: curriculumProgress.stream4Total, bar: 'bg-purple-500' },
                    { key: 'stream5', label: 'S5: CST', done: curriculumProgress.stream5Completed, total: curriculumProgress.stream5Total, bar: 'bg-teal-500' },
                    { key: 'freeGenEd', label: 'Free GenEd', done: curriculumProgress.freeGenEdCredits, total: curriculumProgress.freeGenEdTotal, bar: 'bg-slate-500' },
                  ].map((st) => (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => setActiveCategorySelectorKey(st.key)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222] hover:border-[#888888] text-left transition cursor-pointer flex flex-col justify-between gap-1 group"
                    >
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#171717] dark:text-[#ededed] font-medium truncate group-hover:text-[#0070f3]">{st.label}</span>
                        <span className="text-[#888888] font-mono text-[10px]">{st.done}/{st.total}</span>
                      </div>
                      <div className="h-1 w-full bg-[#ebebeb] dark:bg-[#262626] rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, (st.done / st.total) * 100)}%` }}
                          className={`h-full ${st.bar} rounded-full transition-all duration-300`}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance & Analytics Row (Visual CGPA Graph + GPA Dashboard) */}
            {mode === 'gpa' ? (
              <div id="gpa-dashboard-section" className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6 items-stretch">
                {/* Visual CGPA Graph */}
                <div className="xl:col-span-7 flex flex-col">
                  <CgpaSemesterGraph
                    semesters={semesters}
                    semesterStats={semesterStats}
                    cumulativeStats={{
                      completedCredits: cumulativeStats.completedCredits,
                      cgpa: cumulativeStats.cgpa,
                      standing: cumulativeStats.cgpa >= 2.0 ? "Good Standing" : "Probation Range"
                    }}
                    targetCgpa={targetCgpa}
                    onTargetCgpaChange={(newTarget) => setTargetCgpa(newTarget)}
                    onOpenQuickGrades={() => {
                      setQuickGradesInitialSemIdx(0);
                      setIsQuickGradesModalOpen(true);
                    }}
                    onSelectSemester={(semId) => {
                      const idx = semesters.findIndex(s => s.id === semId);
                      if (idx !== -1) {
                        setQuickGradesInitialSemIdx(idx);
                        setIsQuickGradesModalOpen(true);
                      }
                    }}
                  />
                </div>

                {/* GPA Dashboard & Target Solver Card */}
                <div className="xl:col-span-5 flex flex-col">
                  <div className="bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#262626] rounded-xl p-5 sm:p-6 shadow-vercel-card relative overflow-hidden transition-all duration-200 space-y-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between pb-3 border-b border-[#ebebeb] dark:border-[#262626]">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626] text-[#0070f3] flex items-center justify-center shrink-0">
                          <Gauge className="h-4 w-4" />
                        </div>
                        <div>
                          <h2 className="text-xs font-semibold text-[#171717] dark:text-white uppercase tracking-wider">
                            GPA Dashboard &amp; Growth
                          </h2>
                          <p className="text-[11px] text-[#888888] mt-0.5">
                            Cumulative tracking &amp; target solver
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickGradesInitialSemIdx(0);
                          setIsQuickGradesModalOpen(true);
                        }}
                        className="h-8 px-3.5 bg-[#171717] dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 font-medium text-xs rounded-full shadow-vercel-subtle active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Zap className="h-3 w-3 fill-current" />
                        <span>Quick Grades</span>
                      </button>
                    </div>

                    {/* Cumulative CGPA Box */}
                    <div className="bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] p-4 rounded-lg flex items-center justify-between shadow-vercel-subtle">
                      <div>
                        <p className="text-[10px] font-mono text-[#888888] uppercase tracking-wider">Cumulative CGPA</p>
                        <p className="text-3xl font-semibold text-[#171717] dark:text-white mt-1 tracking-tight font-mono">
                          {cumulativeStats.cgpa.toFixed(2)}
                        </p>
                      </div>
                      <div className="pt-0.5">
                        {cumulativeStats.cgpa >= 2.0 ? (
                          <span className="inline-flex items-center justify-center whitespace-nowrap text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full uppercase tracking-wider">
                            Good Standing
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center whitespace-nowrap text-xs font-medium bg-red-500/10 border border-red-500/20 text-[#ee0000] px-3 py-1 rounded-full uppercase tracking-wider">
                            Probation Range
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Target CGPA Solver Widget */}
                    <div className="bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] rounded-lg p-4 space-y-3 shadow-vercel-subtle">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-md border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#1c1c1c] flex items-center justify-center text-[#0070f3] shrink-0">
                            <Crosshair className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-[#171717] dark:text-white uppercase truncate">
                              Target Solver
                            </p>
                            <p className="text-[10px] text-[#888888] truncate">
                              CGPA Goal Calculator
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 bg-white dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626] focus-within:border-[#171717] dark:focus-within:border-white rounded-md px-2 py-0.5 transition-colors shrink-0">
                          <span className="text-[10px] font-mono text-[#888888] uppercase">Goal:</span>
                          <input
                            type="number"
                            step="0.01"
                            min="1.5"
                            max="4.0"
                            value={targetCgpa}
                            onChange={(e) => setTargetCgpa(e.target.value)}
                            className="w-12 text-xs font-semibold font-mono text-[#171717] dark:text-white bg-transparent focus:outline-none text-center appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </div>
                      </div>

                      {targetSolverResult.isAchieved ? (
                        <div className="flex items-center gap-2.5 bg-blue-500/10 border border-blue-500/20 rounded-md p-2.5 text-[#0070f3]">
                          <div className="h-6 w-6 rounded-md bg-white dark:bg-[#1a1a1a] border border-blue-500/30 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#0070f3]" />
                          </div>
                          <div className="min-w-0 text-xs">
                            <p className="font-semibold text-xs">Goal Achieved!</p>
                            <p className="text-[11px] text-[#888888] mt-0.5">
                              Final CGPA: <span className="font-mono font-semibold text-[#171717] dark:text-white">{targetSolverResult.maxPossibleCgpa.toFixed(2)}</span>
                            </p>
                          </div>
                        </div>
                      ) : targetSolverResult.requiredGpa > 4.00 ? (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-md p-2.5 space-y-1 text-[#ee0000]">
                          <div className="flex items-center gap-1.5 font-semibold text-xs">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span>Target Out of Reach</span>
                          </div>
                          <p className="text-[11px] text-[#888888] leading-relaxed">
                            Scoring 4.00 across remaining credits yields a maximum possible CGPA of <span className="font-mono font-medium text-[#171717] dark:text-white">{targetSolverResult.maxPossibleCgpa.toFixed(2)}</span>.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626] rounded-md p-2 flex flex-col justify-between">
                              <span className="text-[9px] font-mono text-[#888888] uppercase">
                                Required GPA / Sem
                              </span>
                              <div className="flex items-baseline gap-1.5 mt-1">
                                <span className="text-base font-semibold font-mono text-[#171717] dark:text-white">
                                  {Math.max(0, targetSolverResult.requiredGpa).toFixed(2)}
                                </span>
                                <span className="text-[10px] font-mono font-semibold text-[#0070f3] bg-[#f5f5f5] dark:bg-[#222] px-1 rounded">
                                  {targetSolverResult.letterEquivalent}
                                </span>
                              </div>
                            </div>

                            <div className="bg-white dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626] rounded-md p-2 flex flex-col justify-between">
                              <span className="text-[9px] font-mono text-[#888888] uppercase">
                                Remaining Credits
                              </span>
                              <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-base font-semibold font-mono text-[#171717] dark:text-white">
                                  {targetSolverResult.remainingCredits}
                                </span>
                                <span className="text-[10px] text-[#888888] font-mono">
                                  cr
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-[#888888]">
                            <ArrowUpRight className="h-3 w-3 text-[#0070f3] shrink-0" />
                            <span>
                              Maintain <strong className="font-mono text-[#171717] dark:text-white font-medium">{Math.max(0, targetSolverResult.requiredGpa).toFixed(2)} ({targetSolverResult.letterEquivalent})</strong> for goal <strong className="font-mono text-[#171717] dark:text-white font-medium">{targetCgpa}</strong>.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Repeat ROI Analyzer Trigger */}
                    <div className="bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] rounded-lg p-3 flex items-center justify-between gap-3 shadow-vercel-subtle">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-md border border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#1c1c1c] flex items-center justify-center text-[#7928ca] shrink-0">
                          <Repeat className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[#171717] dark:text-white uppercase truncate">
                            Repeat ROI
                          </p>
                          <p className="text-[10px] text-[#888888] truncate">
                            Simulate grade boosts
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowRoiModal(true)}
                        className="px-2.5 py-1 bg-white dark:bg-[#1a1a1a] hover:bg-[#f0f0f0] dark:hover:bg-[#222] border border-[#ebebeb] dark:border-[#262626] text-[#171717] dark:text-white rounded-md text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <span className="font-mono">{roiAnalysis.candidates.length} courses</span>
                        <ChevronDown className="h-3 w-3 text-[#888888]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Tracker Only Mode Growth Card */
              <div className="bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] rounded-xl p-5 shadow-vercel-card relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-white dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#0070f3] shrink-0">
                    <Calculator className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-[#171717] dark:text-[#ededed] uppercase tracking-wider">CGPA Planner Mode</h3>
                    <p className="text-xs text-[#888888] mt-0.5">Switch to Course + CGPA Planner to enable live SGPA/CGPA calculations, target solver goal tracking, and repeat grade analyzers.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleModeToggle()}
                  className="px-4 py-2 bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white text-white dark:text-black font-medium text-xs rounded-lg shadow-vercel-subtle transition cursor-pointer shrink-0 active:scale-95"
                >
                  Enable CGPA Mode
                </button>
              </div>
            )}

            {/* Full-Width Semester Planner Section */}
            <div id="semester-planner-section" className="w-full space-y-5">

                {/* Semester Timelines Title as a Separate Element */}
                <div className="pb-1">
                  <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">
                    Semester Planner
                  </h2>
                </div>

                {/* Buttons Row Under Title: Left (+ Add), Middle (List/Board Toggle), Right (Sort & Expand) */}
                <div className="flex items-center justify-between border-b border-[#ebebeb] dark:border-[#262626] pb-3.5 gap-2">
                  {/* Very Left: + Add Button */}
                  <div className="flex items-center justify-start">
                    <button
                      type="button"
                      onClick={handleTriggerAddSemester}
                      className="h-8 px-3 bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white text-white dark:text-black font-medium text-xs rounded-lg shadow-vercel-subtle active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      title="Add Semester"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Middle: View Switcher Toggle */}
                  <div className="flex items-center justify-center">
                    <div className="flex items-center h-8 bg-[#f5f5f5] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] rounded-lg p-0.5 shadow-vercel-subtle">
                      <button
                        type="button"
                        onClick={() => handleToggleViewMode("list")}
                        title="List Feed"
                        className={`h-full inline-flex items-center gap-1.5 px-2.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                          currentLayout === "list"
                            ? "bg-white dark:bg-[#262626] text-[#171717] dark:text-[#ededed] shadow-vercel-subtle"
                            : "text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed]"
                        }`}
                      >
                        <List className="h-3.5 w-3.5" />
                        <span className="hidden xs:inline">List</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleViewMode("kanban")}
                        title="Kanban Board"
                        className={`h-full inline-flex items-center gap-1.5 px-2.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                          currentLayout === "kanban"
                            ? "bg-white dark:bg-[#262626] text-[#171717] dark:text-[#ededed] shadow-vercel-subtle"
                            : "text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed]"
                        }`}
                      >
                        <Columns className="h-3.5 w-3.5" />
                        <span className="hidden xs:inline">Board</span>
                      </button>
                    </div>
                  </div>

                  {/* Very Right: The other two buttons (Sort & Expand/Collapse) */}
                  <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleSemesterSort()}
                      className="bg-[#f5f5f5] dark:bg-[#141414] hover:bg-[#ebebeb] dark:hover:bg-[#1f1f1f] border border-[#ebebeb] dark:border-[#262626] text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] p-2 rounded-lg transition-colors flex items-center justify-center h-8 w-8 shrink-0 cursor-pointer shadow-vercel-subtle active:scale-95"
                      title={semesterSortOrder === 'asc' ? "Sorted: First → Last" : "Sorted: Last → First"}
                    >
                      <svg
                        className="h-4 w-4 fill-none stroke-current"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="3" y1="5.5" x2="14" y2="5.5" />
                        <line x1="3" y1="11" x2="10.5" y2="11" />
                        <line x1="3" y1="16.5" x2="7" y2="16.5" />
                        <g
                          className="transition-transform duration-300 ease-out origin-[18.5px_11px]"
                          style={{
                            transform: semesterSortOrder === 'desc' ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}
                        >
                          <line x1="18.5" y1="4.5" x2="18.5" y2="17.5" />
                          <polyline points="14.5 13.5 18.5 17.5 22.5 13.5" />
                        </g>
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleAllCollapse}
                      className="bg-[#f5f5f5] dark:bg-[#141414] hover:bg-[#ebebeb] dark:hover:bg-[#1f1f1f] border border-[#ebebeb] dark:border-[#262626] text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] p-2 rounded-lg transition-colors flex items-center justify-center h-8 w-8 shrink-0 cursor-pointer shadow-vercel-subtle active:scale-95"
                      title={isAnyExpanded ? "Collapse All" : "Expand All"}
                    >
                      {isAnyExpanded ? (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="3" y1="6" x2="13" y2="6" />
                          <line x1="3" y1="12" x2="13" y2="12" />
                          <line x1="3" y1="18" x2="13" y2="18" />
                          <path d="M18 4V10M18 10L15 7M18 10L21 7" />
                          <path d="M18 20V14M18 14L15 17M18 14L21 17" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="3" y1="6" x2="13" y2="6" />
                          <line x1="3" y1="12" x2="13" y2="12" />
                          <line x1="3" y1="18" x2="13" y2="18" />
                          <path d="M18 10V4M18 4L15 7M18 4L21 7" />
                          <path d="M18 14V20M18 20L15 17M18 20L21 17" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Top Horizontal Scrollbar for Kanban Board */}
                {currentLayout === 'kanban' && (
                  <div 
                    ref={topScrollBarRef} 
                    onScroll={handleTopScroll}
                    className="overflow-x-auto custom-scrollbar h-2 mb-2 w-full shrink-0"
                  >
                    <div style={{ width: `${kanbanScrollWidth}px`, height: '1px' }} />
                  </div>
                )}

            {/* List of Semester Cards */}
            <div 
              ref={boardContainerRef}
              onScroll={handleBoardScroll}
              onWheel={handleBoardWheel}
              onMouseDown={handleBoardMouseDown}
              onMouseMove={handleBoardMouseMove}
              onMouseUp={handleBoardMouseUp}
              onMouseLeave={handleBoardMouseUp}
              className={
                currentLayout === 'kanban' 
                  ? "flex flex-row gap-5 overflow-x-auto pt-2 pb-6 px-1 sm:px-2 items-start max-w-full min-w-0 touch-pan-x cursor-grab active:cursor-grabbing custom-scrollbar" 
                  : "space-y-4"
              }
            >
              {displayedSemesters.map(({ sem, originalIdx: semIdx }) => {
                const stats = semesterStats.find(s => s.id === sem.id);
                const visibleCourses = sem.courses.filter(c => c.code !== "CSE400");
                const intake = semesterIntakes[semIdx];
                const isAllCompleted = visibleCourses.length > 0 && visibleCourses.every(c => c.isCompleted);

                return (
                  <div 
                    key={sem.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const code = e.dataTransfer.getData("text/plain");
                      if (draggingSourceSemesterId) {
                        handleDragMoveCourse(code, draggingSourceSemesterId, sem.id);
                      }
                    }}
                    onDragEnter={() => setDragOverSemesterId(sem.id)}
                    onDragLeave={() => setDragOverSemesterId(null)}
                    className={`${
                      currentLayout === 'kanban' 
                        ? "w-[84vw] sm:w-[340px] min-w-[280px] max-w-[340px] flex-shrink-0 snap-start flex flex-col" 
                        : "w-full flex flex-col"
                    } border border-[#ebebeb] dark:border-[#262626] rounded-xl overflow-visible shadow-vercel-card bg-white dark:bg-[#0c0c0c] transition-colors duration-150 relative ${
                      draggingCourseCode && dragOverSemesterId === sem.id 
                        ? "border-dashed border-2 border-[#171717] dark:border-white bg-[#f5f5f5] dark:bg-[#141414]" 
                        : ""
                    }`}
                  >
                    {/* Semester Card Header */}
                    {sem.isCollapsed ? (
                      /* Collapsed Compact State */
                      <div className="bg-[#fafafa] dark:bg-[#111111] p-3.5 rounded-xl flex items-center justify-between gap-2.5 transition-colors duration-150">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            onClick={() => handleToggleSemesterAllCompleted(sem.id)}
                            title={isAllCompleted ? "Mark all incomplete" : "Mark all completed"}
                            className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              isAllCompleted
                                ? 'bg-[#171717] dark:bg-[#ededed] border-[#171717] dark:border-[#ededed] text-white dark:text-black'
                                : 'border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#141414]'
                            }`}
                          >
                            {isAllCompleted && (
                              <Check className="h-3 w-3 stroke-[3]" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-semibold text-xs text-[#171717] dark:text-white tracking-tight truncate">
                                {`Semester ${semIdx + 1}`}
                              </h3>
                              <span className="text-[11px] text-[#888888] font-mono">
                                ({sem.term || intake?.term || 'Spring'} {sem.year || intake?.year || 2025})
                              </span>
                              {sem.isRS && (
                                <span className="text-[9px] font-mono font-medium bg-[#f5f5f5] dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626] text-[#0070f3] px-1.5 py-0.2 rounded uppercase">
                                  RS
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#888888]">
                              <span><strong className="text-[#171717] dark:text-white font-mono font-medium">{stats?.credits ?? 0}</strong> Credits</span>
                              {mode === 'gpa' && stats?.gpa != null && (
                                <>
                                  <span className="text-[#888888]">•</span>
                                  <span className="text-[#0070f3] font-mono font-medium">GPA {stats.gpa.toFixed(2)}</span>
                                </>
                              )}
                              <span className="text-[#888888]">•</span>
                              <span>{visibleCourses.length} course{visibleCourses.length !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Expand & Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSemesterCollapse(sem.id);
                            }}
                            className="w-7 h-7 rounded-md bg-white dark:bg-[#141414] hover:bg-[#f5f5f5] dark:hover:bg-[#1f1f1f] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#888888] hover:text-[#171717] dark:hover:text-white transition-colors cursor-pointer"
                            title="Expand Semester"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteSemester(sem.id)}
                            className="w-7 h-7 rounded-md bg-white dark:bg-[#141414] hover:bg-red-500/10 border border-[#ebebeb] dark:border-[#262626] text-[#888888] hover:text-[#ee0000] flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete Semester"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Expanded State Header (Streamlined 2-Row Layout) */
                      <div className="bg-[#fafafa] dark:bg-[#111111] p-3.5 rounded-t-xl border-b border-[#ebebeb] dark:border-[#262626] space-y-2 transition-colors duration-150">
                        {/* Row 1: Checkbox + Title + Intake Pill on left; + Add Course + Collapse + Options Menu on right */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <button
                              onClick={() => handleToggleSemesterAllCompleted(sem.id)}
                              title={isAllCompleted ? "Mark all incomplete" : "Mark all completed"}
                              className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                isAllCompleted
                                  ? 'bg-[#171717] dark:bg-[#ededed] border-[#171717] dark:border-[#ededed] text-white dark:text-black'
                                  : 'border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#141414]'
                              }`}
                            >
                              {isAllCompleted && (
                                <Check className="h-3 w-3 stroke-[3]" />
                              )}
                            </button>
                            <h3 className="font-semibold text-xs text-[#171717] dark:text-[#ededed] tracking-tight truncate">
                              {`Semester ${semIdx + 1}`}
                            </h3>
                            {sem.isRS && (
                              <span className="text-[9px] font-mono font-semibold bg-[#0070f3]/10 border border-[#0070f3]/25 text-[#0070f3] px-1.5 py-0.5 rounded uppercase select-none">
                                RS
                              </span>
                            )}
                            <div className="flex items-center gap-1 bg-white dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] rounded-md px-1.5 py-0.5">
                              <select
                                value={sem.term || intake?.term || 'Spring'}
                                onChange={(e) => handleOverrideIntake(sem.id, e.target.value as any, sem.year || intake?.year || onboardingData.startingYear)}
                                className="bg-transparent text-[11px] font-mono text-[#666666] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-[#ededed] outline-none cursor-pointer"
                              >
                                <option value="Spring">Spring</option>
                                <option value="Summer">Summer</option>
                                <option value="Fall">Fall</option>
                              </select>
                              <select
                                value={sem.year || intake?.year || 2025}
                                onChange={(e) => handleOverrideIntake(sem.id, sem.term || intake?.term || 'Spring', parseInt(e.target.value))}
                                className="bg-transparent text-[11px] font-mono text-[#666666] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-[#ededed] outline-none cursor-pointer"
                              >
                                {Array.from({ length: 101 }, (_, i) => 2001 + i).map(year => (
                                  <option key={year} value={year}>{year}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Top Right Action Group: + Add Course, Minimize & More Menu */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                setAddCoursesTargetSemesterId(sem.id);
                                setAddCoursesPreselected([]);
                                setIsAddCoursesModalOpen(true);
                              }}
                              className="h-7 bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white text-white dark:text-black active:scale-95 px-2.5 rounded-md flex items-center gap-1 text-[11px] font-medium shadow-vercel-subtle transition cursor-pointer shrink-0"
                              title="Add Course to Semester"
                            >
                              <Plus className="h-3 w-3 shrink-0 stroke-[2.5]" />
                              <span>Add Course</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSemesterCollapse(sem.id);
                              }}
                              className="w-7 h-7 rounded-md bg-white dark:bg-[#141414] hover:bg-[#f5f5f5] dark:hover:bg-[#1f1f1f] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] transition-colors cursor-pointer"
                              title="Minimize Semester"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>

                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveSemesterMenuId(prev => prev === sem.id ? null : sem.id)}
                                className="w-7 h-7 rounded-md bg-white dark:bg-[#141414] hover:bg-[#f5f5f5] dark:hover:bg-[#1f1f1f] border border-[#ebebeb] dark:border-[#262626] text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] flex items-center justify-center transition-colors cursor-pointer font-mono text-xs"
                                title="Semester Actions"
                              >
                                ⋯
                              </button>
                              {activeSemesterMenuId === sem.id && (
                                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] rounded-lg shadow-vercel-modal p-1 z-30 text-xs space-y-0.5">
                                  {!sem.isRS && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleMarkAsRS(sem.id);
                                        setActiveSemesterMenuId(null);
                                      }}
                                      className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#f5f5f5] dark:hover:bg-[#1c1c1c] text-[#171717] dark:text-[#ededed] transition cursor-pointer"
                                    >
                                      Mark as RS Semester
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDeleteSemester(sem.id);
                                      setActiveSemesterMenuId(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-rose-500/10 text-[#ee0000] transition cursor-pointer flex items-center gap-1.5"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span>Delete Semester</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Row 2: Compact Metrics Strip (Credits & GPA) */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-[#ebebeb] dark:border-[#262626] text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-medium text-[#888888] bg-white dark:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] px-2 py-0.5 rounded">
                              Credits: <strong className="text-[#171717] dark:text-[#ededed] font-mono">{stats?.credits ?? 0}</strong>
                            </span>
                            {stats?.gpa != null && (
                              <span className="text-[11px] font-medium text-[#0070f3] bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                                SGPA: <strong className="font-mono">{stats.gpa.toFixed(2)}</strong>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-[#888888]">
                            {visibleCourses.length} course{visibleCourses.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Course list grid in Semester Card */}
                    {!sem.isCollapsed && (
                      <div className={`p-3 flex-grow ${currentLayout === 'kanban' ? 'space-y-0' : 'space-y-2'} animate-in fade-in duration-150`}>
                      
                      {visibleCourses.length === 0 && (
                        <div className="py-6 text-center text-[#888888] text-xs">
                          No courses scheduled in this semester.
                        </div>
                      )}

                      {sem.courses.map((c, cIdx) => {
                        const courseDetails = COURSES.find(co => co.code === c.code);
                        const isCSE400Row = c.code === "CSE400";
                        const warnings = prerequisiteWarnings[`${sem.id}_${c.code}`];
                        const attempt = courseAttemptStats[`${sem.id}_${c.code}`];
                        
                        if (isCSE400Row) {
                          return null;
                        }

                        const isCreditCourse = courseDetails?.category !== "Non-Credit" && (courseDetails?.credits ?? 3) > 0;
                        const theme = getCategoryTheme(courseDetails?.category, c.code);
                        const courseMenuKey = `${sem.id}_${c.code}_${cIdx}`;

                        return (
                          <div 
                            key={`${c.code}_${cIdx}`}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", c.code);
                              setDraggingSourceSemesterId(sem.id);
                              setTimeout(() => {
                                setDraggingCourseCode(c.code);
                              }, 0);
                            }}
                            onDragEnd={() => {
                              setDraggingCourseCode(null);
                              setDraggingSourceSemesterId(null);
                            }}
                            className={`group transition-all duration-150 ${
                              currentLayout === 'kanban' 
                                ? `p-3 border border-[#ebebeb] dark:border-[#262626] rounded-lg bg-[#fafafa] dark:bg-[#111111] hover:bg-white dark:hover:bg-[#161616] shadow-vercel-subtle mb-2 cursor-grab flex flex-col justify-between gap-2.5` 
                                : `p-3 rounded-lg bg-[#fafafa] dark:bg-[#111111] hover:bg-white dark:hover:bg-[#161616] border border-[#ebebeb] dark:border-[#262626] shadow-vercel-subtle flex flex-col md:flex-row md:items-center justify-between gap-2.5 relative`
                            } ${
                              draggingCourseCode === c.code 
                                ? "border-[#171717] dark:border-[#ededed] shadow-vercel-float" 
                                : ""
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              {/* Left category accent bar */}
                              <div className={`w-1 self-stretch rounded-full ${theme.leftBar} shrink-0 opacity-80`} />

                              {/* Left side checklist check & Grade dropdown */}
                              <div className="flex items-center gap-2 mt-0.5 shrink-0">
                                <button
                                  onClick={() => handleCompletionToggle(sem.id, c.code, !c.isCompleted)}
                                  title={c.isCompleted ? "Mark as incomplete" : "Mark as complete"}
                                  className={`h-4 w-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 focus:outline-none ${
                                    c.isCompleted
                                      ? 'bg-[#171717] dark:bg-[#ededed] border-[#171717] dark:border-[#ededed] text-white dark:text-black'
                                      : 'border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#141414]'
                                  }`}
                                >
                                  {c.isCompleted && (
                                    <Check className="h-3 w-3 stroke-[3]" />
                                  )}
                                </button>
                                
                                {isCreditCourse && (
                                  <select
                                    value={c.grade}
                                    onChange={(e) => handleGradeChange(sem.id, c.code, e.target.value)}
                                    className="bg-white dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626] text-xs font-mono font-medium text-[#171717] dark:text-[#ededed] rounded px-1.5 py-0.5 outline-none cursor-pointer"
                                  >
                                    <option value="">Grade</option>
                                    {Object.keys(GRADING_SCALE).map(g => (
                                      <option key={g} value={g}>{g} ({GRADING_SCALE[g].toFixed(1)})</option>
                                    ))}
                                  </select>
                                )}

                                {!isCreditCourse && c.isCompleted && (
                                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">
                                    Passed
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-mono font-semibold text-xs tracking-tight px-1.5 py-0.5 rounded bg-white dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626] text-[#171717] dark:text-[#ededed]">
                                    {c.code}
                                  </span>
                                  <span className="text-[#171717] dark:text-[#ededed] font-medium text-xs truncate max-w-[200px] sm:max-w-none">
                                    {courseDetails?.title ?? "Custom Elective Course"}
                                  </span>
                                  <span className="text-[10px] text-[#888888] bg-white dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626] px-1.5 py-0.5 rounded font-mono">
                                    {(courseDetails?.credits ?? 3)} Cr
                                  </span>
                                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${theme.badge}`}>
                                    {theme.label}
                                  </span>
                                  {renderMandatoryBadge(c.code)}

                                  {/* Retake & Repeat badges */}
                                  {attempt?.badge && (
                                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                                      attempt.isError 
                                        ? 'bg-red-500/10 border border-red-500/20 text-[#ee0000]' 
                                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400'
                                    }`}>
                                      {attempt.badge}
                                    </span>
                                  )}
                                </div>

                                {/* Warning outputs */}
                                <div className="space-y-1 mt-1">
                                  {warnings && warnings.type === 'hard' && (
                                    <div className="flex items-center gap-1.5 text-[#ee0000] text-[10px] font-medium">
                                      <AlertTriangle className="h-3 w-3 shrink-0" />
                                      <span>Prerequisite warning: Requires {warnings.missing.join(", ")} prior to this semester</span>
                                    </div>
                                  )}
                                  {warnings && warnings.type === 'soft' && (
                                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-[10px] font-medium">
                                      <Info className="h-3 w-3 shrink-0" />
                                      <span>Soft Prerequisite recommended ({warnings.missing.join(", ")})</span>
                                    </div>
                                  )}
                                  {attempt?.isError && (
                                    <div className="flex items-center gap-1.5 text-[#ee0000] text-[10px] font-medium">
                                      <AlertTriangle className="h-3 w-3 shrink-0" />
                                      <span>{attempt.statusText}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Compact Right-Side Course Actions (Popover Menu + Remove) */}
                            <div className="flex items-center gap-1 self-end md:self-auto shrink-0 relative">
                              <button
                                type="button"
                                onClick={() => setActiveCourseMenuKey(prev => prev === courseMenuKey ? null : courseMenuKey)}
                                title="Move or Swap Course"
                                className="h-6 w-6 rounded-md bg-white dark:bg-[#1a1a1a] hover:bg-[#f0f0f0] dark:hover:bg-[#222] border border-[#ebebeb] dark:border-[#262626] text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] flex items-center justify-center transition cursor-pointer font-mono text-xs"
                              >
                                ⋯
                              </button>

                              {activeCourseMenuKey === courseMenuKey && (
                                <div className="absolute right-7 top-full mt-1 w-48 bg-white dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] rounded-lg shadow-vercel-modal p-1.5 z-30 text-xs space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveCourseSelectorSemesterId(sem.id);
                                      setSwappingCourseCode(c.code);
                                      setActiveCourseMenuKey(null);
                                    }}
                                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[#f5f5f5] dark:hover:bg-[#1c1c1c] text-[#171717] dark:text-[#ededed] flex items-center gap-2 transition cursor-pointer"
                                  >
                                    <ArrowRightLeft className="h-3 w-3 text-[#0070f3]" />
                                    <span>Swap Course...</span>
                                  </button>
                                  <div className="border-t border-[#ebebeb] dark:border-[#222222] pt-1">
                                    <span className="block px-2 py-0.5 text-[10px] font-mono text-[#888888] uppercase">Move to Term</span>
                                    <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-0.5">
                                      {semesters.filter(s => s.id !== sem.id).map(s => {
                                        const destIdx = semesters.findIndex(semItem => semItem.id === s.id);
                                        const { hp } = getCoursePrereqs(c.code, onboardingData.pathway, onboardingData.creditOption);
                                        const missingHp = hp.filter(code => !isCourseCompletedPrior(code, destIdx, semesters, mode));
                                        const isLocked = missingHp.length > 0;
                                        const alreadyInDest = s.courses.some(course => course.code === c.code);
                                        return (
                                          <button
                                            key={s.id}
                                            type="button"
                                            disabled={isLocked || alreadyInDest}
                                            onClick={() => {
                                              handleMoveCourse(sem.id, s.id, c);
                                              setActiveCourseMenuKey(null);
                                            }}
                                            className="w-full text-left px-2 py-1 rounded hover:bg-[#f5f5f5] dark:hover:bg-[#1c1c1c] disabled:opacity-40 disabled:cursor-not-allowed text-[11px] text-[#171717] dark:text-[#ededed] flex items-center justify-between cursor-pointer"
                                          >
                                            <span className="truncate">{s.name}</span>
                                            {alreadyInDest ? <span className="text-[9px] text-[#888888]">Added</span> : isLocked ? <span className="text-[9px]">🔒</span> : null}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Remove Course button */}
                              <button
                                onClick={() => handleRemoveCourse(sem.id, c.code, cIdx)}
                                className="h-6 w-6 rounded-md bg-white dark:bg-[#1a1a1a] hover:bg-red-500/10 border border-[#ebebeb] dark:border-[#262626] text-[#888888] hover:text-[#ee0000] flex items-center justify-center transition cursor-pointer"
                                title="Remove Course"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  </div>
                );
              })}

              {/* Kanban: Add Semester Column Card */}
              {currentLayout === 'kanban' && (
                <div className="w-[84vw] sm:w-[320px] min-w-[260px] max-w-[320px] flex-shrink-0 snap-start flex flex-col justify-center">
                  <button
                    type="button"
                    onClick={handleTriggerAddSemester}
                    className="h-full min-h-[300px] rounded-xl border border-dashed border-[#ebebeb] dark:border-[#333] hover:border-[#888888] bg-[#fafafa] dark:bg-[#111111] hover:bg-white dark:hover:bg-[#161616] p-6 flex flex-col items-center justify-center gap-2.5 text-[#888888] hover:text-[#171717] dark:hover:text-white transition cursor-pointer group active:scale-[0.99] shadow-vercel-subtle"
                    title="Add Next Semester"
                  >
                    <div className="h-10 w-10 rounded-lg bg-white dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-white group-hover:scale-105 transition-all shadow-vercel-subtle">
                      <Plus className="h-5 w-5 stroke-[2.5]" />
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-xs text-[#171717] dark:text-white transition-colors">
                        Add {getOrdinal(semesters.length + 1)} Semester
                      </div>
                      <div className="text-[11px] text-[#888888] mt-1 font-mono">
                        {nextPredictedIntake.term} {nextPredictedIntake.year}
                      </div>
                      <span className="inline-block mt-3 px-3 py-1 rounded-full bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white text-white dark:text-black text-xs font-medium shadow-vercel-subtle">
                        + Add Courses
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* List View: Bottom Add Semester Full Card */}
            {currentLayout === 'list' && (
              <button
                type="button"
                onClick={handleTriggerAddSemester}
                className="w-full py-4 px-5 rounded-xl border border-dashed border-[#ebebeb] dark:border-[#333] hover:border-[#888888] bg-[#fafafa] dark:bg-[#111111] hover:bg-white dark:hover:bg-[#161616] text-[#888888] hover:text-[#171717] dark:hover:text-white transition flex flex-col sm:flex-row items-center justify-center gap-3 cursor-pointer group shadow-vercel-subtle active:scale-[0.99]"
                title="Add Next Semester"
              >
                <div className="h-8 w-8 rounded-lg bg-white dark:bg-[#1c1c1c] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#171717] dark:text-white group-hover:scale-105 transition shrink-0 shadow-vercel-subtle">
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                </div>
                <div className="text-center sm:text-left">
                  <span className="text-xs font-semibold text-[#171717] dark:text-white transition-colors">
                    Add {getOrdinal(semesters.length + 1)} Semester
                  </span>
                  <span className="block text-[11px] text-[#888888] font-mono mt-0.5">
                    {nextPredictedIntake.term} {nextPredictedIntake.year} • Click to create term &amp; enroll courses
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* CSE400 Capstone & Thesis Track (Full-Width) */}
          <div id="capstone-section" className="w-full">
            <CSE400 
              isCollapsed={isCapstoneCollapsed} 
              onToggle={() => setIsCapstoneCollapsed(prev => !prev)} 
            />
          </div>
          </div>
      </div>

      {/* Connect with me Footer at very bottom of dashboard */}
      <footer className="w-full mt-auto pt-8 pb-28 lg:pb-12 border-t border-[#ebebeb] dark:border-[#262626] flex flex-col items-center justify-center gap-3 text-center">
        {/* Connect with me social links */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs font-medium text-[#888888]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#888888]">Connect:</span>
          <a
            href="https://github.com/fakekhanabdullah"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] hover:border-[#888888] text-[#171717] dark:text-[#ededed] transition shadow-vercel-subtle"
          >
            <svg className="h-3.5 w-3.5 fill-current shrink-0" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
            <span>GitHub</span>
          </a>
          <span className="text-[#888888]">•</span>
          <a
            href="https://www.linkedin.com/in/khan-abdullahh"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] hover:border-[#888888] text-[#171717] dark:text-[#ededed] transition shadow-vercel-subtle"
          >
            <svg className="h-3.5 w-3.5 fill-current shrink-0" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            <span>LinkedIn</span>
          </a>
        </div>

        {/* Legal Links */}
        <div className="flex items-center gap-3 text-xs text-[#888888]">
          <a href="/privacy" className="hover:text-[#171717] dark:hover:text-white underline transition">
            Privacy Policy
          </a>
          <span>•</span>
          <a href="/terms" className="hover:text-[#171717] dark:hover:text-white underline transition">
            Terms of Service
          </a>
        </div>

        {/* Muted Copyright Disclaimer */}
        <div className="text-[11px] text-[#888888]">
          <p>© 2026 Route136. Made with care by <strong className="text-[#171717] dark:text-[#ededed] font-medium">Khan Abdullah</strong></p>
        </div>
      </footer>
    </main>
  )}

      {/* 4. Search and Add Course Combobox Overlay */}
      {activeCourseSelectorSemesterId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c0c0c] border border-[#e5e5e5] dark:border-[#242424] rounded-2xl w-full max-w-lg shadow-vercel-modal overflow-hidden flex flex-col max-h-[88vh] text-[#171717] dark:text-[#ededed]">
            {/* Window Chrome Bar */}
            <div className="px-4 py-2 bg-[#fafafa] dark:bg-[#111111] border-b border-[#ebebeb] dark:border-[#222222] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
              </div>
              <div className="px-3 py-0.5 rounded-md bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] text-[10px] font-mono text-[#888888] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0070f3]" />
                <span>route136.app/swap-course</span>
              </div>
              <span className="text-[10px] font-mono text-[#0070f3] bg-[#0070f3]/10 border border-[#0070f3]/20 px-2 py-0.5 rounded">
                CATALOG
              </span>
            </div>

            {/* Combobox Header */}
            <div className="p-4 sm:p-5 border-b border-[#ebebeb] dark:border-[#262626] flex items-center justify-between bg-white dark:bg-[#0c0c0c]">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[#f0f0f0] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#2a2a2a] flex items-center justify-center text-[#171717] dark:text-[#ededed] shrink-0">
                  {swappingCourseCode ? <ArrowRightLeft className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-[#171717] dark:text-[#ededed] tracking-tight">
                    {swappingCourseCode ? `Swap Course: ${swappingCourseCode}` : "Add Course to Semester"}
                  </h3>
                  <p className="text-xs text-[#666666] dark:text-[#888888] mt-0.5 font-normal">
                    {swappingCourseCode 
                      ? "Select a replacement course for this slot" 
                      : "Select a course to add to your semester plan"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setActiveCourseSelectorSemesterId(null);
                  setSwappingCourseCode(null);
                  setCourseSearchQuery("");
                }} 
                className="w-8 h-8 rounded-lg bg-white dark:bg-[#161616] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Combobox Filter tabs and Search */}
            <div className="p-4 bg-white dark:bg-[#0c0c0c] border-b border-[#ebebeb] dark:border-[#262626] space-y-3">
              <input
                type="text"
                placeholder="Search by code (e.g. CSE220) or title..."
                value={courseSearchQuery}
                onChange={(e) => setCourseSearchQuery(e.target.value)}
                className="w-full bg-[#fafafa] dark:bg-[#141414] border border-[#e5e5e5] dark:border-[#262626] text-xs px-3.5 py-2.5 rounded-lg text-[#171717] dark:text-[#ededed] placeholder:text-[#888888] outline-none focus:border-[#171717] dark:focus:border-[#ededed] transition font-medium"
              />

              <div className="flex flex-wrap gap-1.5">
                {["All", "Core", "Electives", "Math/Science", "GenEd"].map(filterTab => (
                  <button
                    key={filterTab}
                    onClick={() => setCourseSearchFilter(filterTab)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer ${
                      courseSearchFilter === filterTab
                        ? 'bg-[#171717] dark:bg-[#ededed] border-transparent text-white dark:text-[#0a0a0a] shadow-vercel-subtle'
                        : 'bg-[#fafafa] dark:bg-[#141414] border-[#ebebeb] dark:border-[#262626] text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed]'
                    }`}
                  >
                    {filterTab}
                  </button>
                ))}
              </div>
            </div>

            {/* Search list results */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#f0f0f0] dark:divide-[#1a1a1a] p-2.5 space-y-1 custom-scrollbar">
              {filteredSearchCourses.length === 0 ? (
                <div className="py-8 text-center text-[#888888] text-xs">
                  No matching courses found.
                </div>
              ) : (
                filteredSearchCourses.map(course => {
                  const targetSemIdx = semesters.findIndex(s => s.id === activeCourseSelectorSemesterId);
                  const targetSem = semesters.find(s => s.id === activeCourseSelectorSemesterId);
                  const isAlreadyInSem = targetSem?.courses.some(c => c.code === course.code);
                  const isSwappingSelf = swappingCourseCode === course.code;
                  const isBlockedDuplicate = isAlreadyInSem && !isSwappingSelf;

                  const { hp } = getCoursePrereqs(course.code, onboardingData.pathway, onboardingData.creditOption);
                  const missingHp = hp.filter(code => !isCourseCompletedPrior(code, targetSemIdx, semesters, mode));
                  const isLocked = missingHp.length > 0;
                  const theme = getCategoryTheme(course.category, course.code);

                  const isDisabled = isLocked || isBlockedDuplicate;

                  return (
                    <button
                      key={course.code}
                      disabled={isDisabled}
                      onClick={() => {
                        if (activeCourseSelectorSemesterId) {
                          handleAddCourseToSemester(activeCourseSelectorSemesterId, course.code);
                        }
                      }}
                      className={`w-full p-3 text-left rounded-xl transition flex items-center justify-between text-xs group ${
                        isDisabled ? 'opacity-40 cursor-not-allowed bg-transparent' : 'cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#161616]'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-mono font-semibold text-xs px-2 py-0.5 rounded-md border ${theme.codePill}`}>
                            {course.code}
                          </span>
                          <span className="text-[10px] bg-[#f5f5f5] dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#262626] px-2 py-0.5 rounded-md font-mono font-medium text-[#666666] dark:text-[#a1a1a1]">
                            {course.credits} Cr
                          </span>
                          {theme.label !== "Mandatory Core" && (
                            <span className={`text-[9px] font-medium px-2 py-0.5 rounded-md border select-none ${theme.badge}`}>
                              {theme.label}
                            </span>
                          )}
                          {renderMandatoryBadge(course.code)}
                        </div>
                        <p className="text-[#4d4d4d] dark:text-[#b4b4b4] text-xs mt-1 font-medium truncate">{course.title}</p>
                        {isBlockedDuplicate && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            <Info className="h-3 w-3 shrink-0" />
                            <span>Already added to this semester</span>
                          </div>
                        )}
                        {isLocked && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>Missing Hard Prerequisite ({missingHp.join(", ")})</span>
                          </div>
                        )}
                      </div>

                      <div className="shrink-0">
                        {isBlockedDuplicate ? (
                          <span className="text-[10px] font-medium text-[#888888] bg-[#f5f5f5] dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#262626] px-2.5 py-1 rounded-lg whitespace-nowrap">
                            In Semester
                          </span>
                        ) : isLocked ? (
                          <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg whitespace-nowrap">
                            Locked
                          </span>
                        ) : swappingCourseCode ? (
                          <span className="text-[10px] font-medium text-[#0070f3] bg-[#0070f3]/10 border border-[#0070f3]/25 px-2.5 py-1 rounded-lg whitespace-nowrap flex items-center gap-1">
                            <ArrowRightLeft className="h-3 w-3 shrink-0" /> Swap
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-[#171717] dark:text-[#ededed] bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#e5e5e5] dark:border-[#2a2a2a] px-2.5 py-1 rounded-lg whitespace-nowrap flex items-center gap-1">
                            <Plus className="h-3 w-3 shrink-0" /> Add
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

      {/* 4.5. Category Course Selector Modal Overlay */}
      {activeCategorySelectorKey !== null && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => {
            setActiveCategorySelectorKey(null);
            setSelectedCategoryCourseCode("");
            setCategoryCourseSearchQuery("");
          }}
        >
          <div
            className="bg-white dark:bg-[#0c0c0c] border border-[#e5e5e5] dark:border-[#242424] rounded-2xl w-full max-w-lg shadow-vercel-modal overflow-hidden flex flex-col max-h-[88vh] text-[#171717] dark:text-[#ededed]"
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
                <span>route136.app/category-selector</span>
              </div>
              <span className="text-[10px] font-mono text-[#0070f3] bg-[#0070f3]/10 border border-[#0070f3]/20 px-2 py-0.5 rounded">
                SYLLABUS
              </span>
            </div>

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#ebebeb] dark:border-[#262626] flex items-center justify-between bg-white dark:bg-[#0c0c0c]">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[#0070f3]/10 border border-[#0070f3]/25 flex items-center justify-center text-[#0070f3] shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-[#171717] dark:text-[#ededed] tracking-tight">
                    Add to {categoryDetails.name}
                  </h3>
                  <p className="text-xs text-[#666666] dark:text-[#888888] mt-0.5 font-normal">
                    {categoryDetails.desc}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setActiveCategorySelectorKey(null);
                  setSelectedCategoryCourseCode("");
                  setCategoryCourseSearchQuery("");
                }} 
                className="w-8 h-8 rounded-lg bg-[#fafafa] dark:bg-[#161616] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] border border-[#ebebeb] dark:border-[#262626] flex items-center justify-center text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Target Semester Selector */}
            <div className="p-4 bg-white dark:bg-[#0c0c0c] border-b border-[#ebebeb] dark:border-[#262626] space-y-1.5">
              <label className="text-[10px] font-mono font-medium text-[#666666] dark:text-[#888888] tracking-wider uppercase">Target Semester</label>
              <div className="relative">
                <select
                  value={selectedCategoryTargetSemesterId}
                  onChange={(e) => setSelectedCategoryTargetSemesterId(e.target.value)}
                  className="w-full appearance-none bg-[#fafafa] dark:bg-[#141414] border border-[#e5e5e5] dark:border-[#262626] hover:border-[#cccccc] dark:hover:border-[#333333] text-xs pl-3.5 pr-10 py-2.5 rounded-lg text-[#171717] dark:text-[#ededed] outline-none focus:border-[#171717] dark:focus:border-[#ededed] transition cursor-pointer font-medium"
                >
                  {semesters.map((sem, semIdx) => {
                    const intake = semesterIntakes[semIdx];
                    const semTermYear = `${sem.term || intake?.term || 'Spring'} ${sem.year || intake?.year || 2025}`;
                    const semLabel = sem.isRS ? `RS (${semTermYear})` : `${sem.name} (${semTermYear})`;
                    return (
                      <option key={sem.id} value={sem.id}>
                        {semLabel}
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#888888] flex items-center">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Course Search Input */}
            <div className="p-4 bg-white dark:bg-[#0c0c0c] border-b border-[#ebebeb] dark:border-[#262626] space-y-1.5">
              <label className="text-[10px] font-mono font-medium text-[#666666] dark:text-[#888888] tracking-wider uppercase">Filter Courses</label>
              <input
                type="text"
                placeholder="Search course by code or title..."
                value={categoryCourseSearchQuery}
                onChange={(e) => setCategoryCourseSearchQuery(e.target.value)}
                className="w-full bg-[#fafafa] dark:bg-[#141414] border border-[#e5e5e5] dark:border-[#262626] text-xs px-3.5 py-2.5 rounded-lg text-[#171717] dark:text-[#ededed] placeholder:text-[#888888] outline-none focus:border-[#171717] dark:focus:border-[#ededed] transition font-medium"
              />
            </div>

            {/* Filtered Courses List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#f0f0f0] dark:divide-[#1a1a1a] p-2.5 space-y-1 custom-scrollbar">
              {categoryFilteredCourses.length === 0 ? (
                <div className="py-8 text-center text-[#888888] text-xs">
                  {categoryCourseSearchQuery.trim() !== "" 
                    ? "No matching courses found."
                    : "All courses in this category have already been planned or completed."}
                </div>
              ) : (
                categoryFilteredCourses.map(course => {
                  const targetSemIdx = semesters.findIndex(s => s.id === selectedCategoryTargetSemesterId);
                  const targetSem = semesters.find(s => s.id === selectedCategoryTargetSemesterId);
                  const isAlreadyInSem = targetSem?.courses.some(c => c.code === course.code);

                  const { hp } = getCoursePrereqs(course.code, onboardingData.pathway, onboardingData.creditOption);
                  const missingHp = hp.filter(code => !isCourseCompletedPrior(code, targetSemIdx, semesters, mode));
                  const isLocked = missingHp.length > 0;
                  const isSelected = selectedCategoryCourseCode === course.code;
                  const theme = getCategoryTheme(course.category, course.code);

                  const compState = getCompletedCourseState(course.code);
                  const isCompleted = compState.isCompleted;

                  const isDisabled = isLocked || isAlreadyInSem;

                  return (
                    <button
                      key={course.code}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => !isDisabled && setSelectedCategoryCourseCode(course.code)}
                      className={`w-full p-3 text-left rounded-xl border transition flex items-center justify-between text-xs group ${
                        isDisabled 
                          ? 'opacity-40 cursor-not-allowed border-transparent bg-transparent' 
                          : isSelected
                            ? 'bg-[#0070f3]/10 border-[#0070f3]/50 text-[#171717] dark:text-[#ededed]'
                            : 'bg-transparent border-transparent text-[#666666] dark:text-[#a1a1a1] hover:text-[#171717] dark:hover:text-[#ededed] hover:bg-[#f5f5f5] dark:hover:bg-[#161616] cursor-pointer'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-mono font-semibold text-xs px-2 py-0.5 rounded-md border ${theme.codePill}`}>
                            {course.code}
                          </span>
                          <span className="text-[10px] bg-[#f5f5f5] dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#262626] px-2 py-0.5 rounded-md font-mono font-medium text-[#666666] dark:text-[#a1a1a1]">
                            {course.credits} Cr
                          </span>
                          {theme.label !== "Mandatory Core" && (
                            <span className={`text-[9px] font-medium px-2 py-0.5 rounded-md border select-none ${theme.badge}`}>
                              {theme.label}
                            </span>
                          )}
                          {renderMandatoryBadge(course.code)}
                          {isCompleted && (
                            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                              Completed {compState.grade && `(${compState.grade})`}
                            </span>
                          )}
                        </div>
                        <p className="text-[#4d4d4d] dark:text-[#b4b4b4] text-xs mt-1 font-medium truncate">{course.title}</p>
                        {isAlreadyInSem && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            <Info className="h-3 w-3 shrink-0" />
                            <span>Already added to selected semester</span>
                          </div>
                        )}
                        {isLocked && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>Missing Hard Prerequisite ({missingHp.join(", ")})</span>
                          </div>
                        )}
                      </div>

                      <div className="shrink-0">
                        {isAlreadyInSem ? (
                          <span className="text-[10px] font-medium text-[#888888] bg-[#f5f5f5] dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#262626] px-2.5 py-1 rounded-lg whitespace-nowrap">
                            In Semester
                          </span>
                        ) : isLocked ? (
                          <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg whitespace-nowrap">
                            Locked
                          </span>
                        ) : isSelected ? (
                          <span className="text-[10px] font-medium text-white bg-[#0070f3] px-2.5 py-1 rounded-lg whitespace-nowrap flex items-center gap-1">
                            <Check className="h-3 w-3 shrink-0" /> Selected
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-[#171717] dark:text-[#ededed] bg-[#f5f5f5] dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#2a2a2a] px-2.5 py-1 rounded-lg whitespace-nowrap">
                            Select
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-[#ebebeb] dark:border-[#262626] flex gap-2.5 bg-[#fafafa] dark:bg-[#111111]">
              <button
                type="button"
                onClick={() => {
                  setActiveCategorySelectorKey(null);
                  setSelectedCategoryCourseCode("");
                  setCategoryCourseSearchQuery("");
                }}
                className="flex-1 h-9 bg-white dark:bg-[#181818] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] border border-[#e5e5e5] dark:border-[#2a2a2a] text-[#171717] dark:text-[#ededed] text-xs font-medium rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedCategoryCourseCode || (selectedCategoryTargetSemesterId ? semesters.find(s => s.id === selectedCategoryTargetSemesterId)?.courses.some(c => c.code === selectedCategoryCourseCode) : false)}
                onClick={handleAddCategoryCourse}
                className="flex-1 h-9 bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-[#0a0a0a] text-xs font-medium rounded-lg shadow-vercel-subtle transition cursor-pointer"
              >
                Add Course
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. Reset Confirmation Modal overlay */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="bg-white dark:bg-[#0c0c0c] border border-[#e5e5e5] dark:border-[#242424] rounded-2xl w-full max-w-sm shadow-vercel-modal overflow-hidden text-[#171717] dark:text-[#ededed]"
            onClick={e => e.stopPropagation()}
          >
            {/* Window Chrome Bar */}
            <div className="px-4 py-2 bg-[#fafafa] dark:bg-[#111111] border-b border-[#ebebeb] dark:border-[#222222] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
              </div>
              <div className="px-2.5 py-0.5 rounded-md bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] text-[10px] font-mono text-[#888888] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                <span>route136.app/reset</span>
              </div>
              <span className="text-[10px] font-mono text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                CONFIRM
              </span>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-[#171717] dark:text-[#ededed]">Reset Planner</h3>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-mono">Irreversible Action</p>
                </div>
              </div>
              
              <p className="text-xs text-[#666666] dark:text-[#999999] leading-relaxed">
                This action will permanently clear your course schedule, logged grades, and Capstone thesis records.
              </p>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 h-9 bg-[#fafafa] dark:bg-[#161616] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] border border-[#e5e5e5] dark:border-[#2a2a2a] text-[#171717] dark:text-[#ededed] text-xs font-medium rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetData}
                  className="flex-1 h-9 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-lg shadow-vercel-subtle transition cursor-pointer"
                >
                  Wipe Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* 5. Grade Sheet Preview Modal */}
      {showGradeSheetModal && isMounted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:static print:bg-transparent print:backdrop-none no-print-backdrop">
          <div className="bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#262626] rounded-2xl max-w-4xl w-full p-4 sm:p-6 text-[#171717] dark:text-[#ededed] shadow-vercel-modal relative flex flex-col max-h-[94vh] overflow-hidden transition print:max-h-none print:border-none print:shadow-none print:w-full print:p-0 print:bg-transparent print-only-container">
            
            {/* Modal Action Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-[#ebebeb] dark:border-[#262626] no-print">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg border border-[#e5e5e5] dark:border-[#2a2a2a] bg-[#f5f5f5] dark:bg-[#181818] flex items-center justify-center text-[#171717] dark:text-[#ededed] shrink-0">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#171717] dark:text-[#ededed]">Academic Progress Snapshot Preview</h3>
                  <p className="text-[11px] text-[#666666] dark:text-[#888888]">High-resolution exportable grade sheet</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Control 1: Download PNG Button */}
                <button
                  onClick={handleGenerateGradeSheet}
                  disabled={isGeneratingSnapshot}
                  className="h-8 inline-flex items-center gap-2 bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white text-white dark:text-[#0a0a0a] text-xs font-medium px-3.5 rounded-lg transition shadow-vercel-subtle disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{isGeneratingSnapshot ? "Generating PNG..." : "Download PNG"}</span>
                </button>

                {/* Control 2: Close Button */}
                <button
                  onClick={() => setShowGradeSheetModal(false)}
                  className="w-8 h-8 rounded-lg bg-[#f5f5f5] dark:bg-[#181818] hover:bg-[#eaeaea] dark:hover:bg-[#222222] border border-[#e5e5e5] dark:border-[#2a2a2a] flex items-center justify-center text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] transition cursor-pointer"
                  title="Close preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Printable Grade Sheet Container */}
            <div className="overflow-y-auto overflow-x-hidden max-w-full custom-scrollbar py-3 sm:py-4 flex items-start justify-center flex-grow">
              {/* Dynamic responsive scaling wrapper to fit 750px cleanly in any viewport width */}
              <div 
                className="shrink-0 transition-all duration-300 relative"
                style={{
                  width: `${750 * snapshotScale}px`,
                  height: `${snapshotHeight * snapshotScale}px`,
                }}
              >
                <div
                  style={{
                    width: '750px',
                    transform: `scale(${snapshotScale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  {/* Visible Grade Sheet Node Target (Landing Page Vercel Window Chrome Aesthetic) */}
                  <div 
                    id="flow136-grade-sheet-export-node"
                    style={{ 
                      backgroundColor: '#050505',
                      fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                    }}
                    className="w-[750px] min-w-[750px] h-auto min-h-[600px] border border-[#242424] rounded-2xl shadow-2xl text-[#ededed] relative overflow-hidden font-sans bg-[#050505]"
                  >
                    {/* Vercel Structural 36px Grid + Atmospheric Radial Spotlight */}
                    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808014_1px,transparent_1px),linear-gradient(to_bottom,#80808014_1px,transparent_1px)] bg-[size:36px_36px]" />
                      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[560px] h-[220px] bg-gradient-to-tr from-[#0070f3]/15 via-cyan-500/8 to-transparent rounded-full blur-[90px]" />
                    </div>

                    {/* Window Chrome Bar (Matches Landing Page Hero Mockup) */}
                    <div className="px-5 py-3 bg-[#111111] border-b border-[#222222] flex items-center justify-between gap-2 relative z-10">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#2a2a2a]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#2a2a2a]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#2a2a2a]" />
                      </div>
                      <div className="px-3.5 py-0.5 rounded-md bg-[#0a0a0a] border border-[#222222] text-[10px] font-mono text-[#888888] flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>route136.app/workspace</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#0070f3] bg-[#0070f3]/10 border border-[#0070f3]/25 px-2.5 py-0.5 rounded uppercase">
                        {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Inner Snapshot Body */}
                    <div className="p-6 space-y-5 relative z-10">
                      {/* Section 1: Route136 Brand & Student Status Header */}
                      <div className="flex items-center justify-between pb-4 border-b border-[#222222]">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-[#ededed] flex items-center justify-center text-[#0a0a0a] shrink-0">
                            <svg className="h-5 w-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                            </svg>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h1 className="text-xl font-semibold tracking-tight text-white">Route136</h1>
                              <span className="text-[10px] font-mono bg-[#141414] border border-[#262626] text-[#a1a1a1] px-2 py-0.5 rounded-full">
                                BRACU CSE • 136 Cr
                              </span>
                            </div>
                            <p className="text-[11px] font-mono text-[#888888] mt-0.5">
                              Academic Progress &amp; Official Degree Audit Snapshot
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border ${
                            cumulativeStats.cgpa >= 2.0 || cumulativeStats.completedCredits === 0
                              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cumulativeStats.cgpa >= 2.0 || cumulativeStats.completedCredits === 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            <span>{cumulativeStats.cgpa >= 3.7 ? 'HONS STANDING' : cumulativeStats.cgpa >= 2.0 || cumulativeStats.completedCredits === 0 ? 'GOOD STANDING' : 'PROBATION'}</span>
                          </span>
                          <p className="text-[10px] text-[#888888] font-mono mt-1">
                            Intake: {onboardingData.startingTerm} {onboardingData.startingYear}
                          </p>
                        </div>
                      </div>

                      {/* Section 2: 3-Column Executive Metric Strip (Combined Degree+CGPA Card, Core/MNS/Electives/Thesis Progress Card, GenEd Streams Progress Card) */}
                      <div className="grid grid-cols-3 gap-3">
                        {/* Card 1: Combined Degree Progress & Cumulative GPA */}
                        <div className="p-3.5 rounded-xl bg-[#0c0c0c] border border-[#222222] flex flex-col justify-between gap-2.5">
                          {/* Top Half: Degree Progress */}
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-[#888888] mb-0.5">
                              <span>DEGREE PROGRESS</span>
                              <span className="text-[#0070f3] font-semibold">
                                {((cumulativeStats.completedCredits / 136) * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between">
                              <div className="text-lg font-semibold font-mono text-white">
                                {cumulativeStats.completedCredits} <span className="text-[11px] font-normal text-[#888888]">/ 136 Cr</span>
                              </div>
                              <span className="text-[10px] font-mono text-[#888888]">
                                {Math.max(0, 136 - cumulativeStats.completedCredits)} Cr left
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#1f1f1f] overflow-hidden">
                              <div
                                style={{ width: `${Math.min(100, (cumulativeStats.completedCredits / 136) * 100)}%` }}
                                className="h-full bg-[#0070f3] rounded-full"
                              />
                            </div>
                          </div>

                          {/* Bottom Half: Cumulative GPA & Target Goal */}
                          <div className="pt-2.5 border-t border-[#1d1d1d]">
                            <div className="flex items-center justify-between text-[10px] font-mono text-[#888888] mb-0.5">
                              <span>CUMULATIVE GPA</span>
                              <span className="text-emerald-400">UGC 4.00</span>
                            </div>
                            <div className="flex items-baseline justify-between">
                              <div className="text-lg font-semibold font-mono text-white">
                                {cumulativeStats.cgpa.toFixed(2)} <span className="text-[11px] font-normal text-[#888888]">/ 4.00</span>
                              </div>
                              <span className="text-[10px] font-mono text-[#888888]">
                                Goal: <strong className="text-[#0070f3]">{targetCgpa}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card 2: Detailed Core, School Core (MNS), Electives & Thesis Progress Bars */}
                        <div className="p-3.5 rounded-xl bg-[#0c0c0c] border border-[#222222] flex flex-col justify-between gap-2">
                          <div className="flex items-center justify-between text-[10px] font-mono text-[#888888]">
                            <span>CORE &amp; ELECTIVES</span>
                            <span className="text-[#ededed] font-semibold">
                              {curriculumProgress.coreCompleted + curriculumProgress.schoolCoreCompleted + curriculumProgress.electiveCompleted + curriculumProgress.thesisCompleted} / 97 Cr
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {[
                              { label: "Program Core", done: curriculumProgress.coreCompleted, total: 75, text: "text-blue-400", bar: "bg-[#0070f3]" },
                              { label: "School Core (MNS)", done: curriculumProgress.schoolCoreCompleted, total: 12, text: "text-cyan-400", bar: "bg-cyan-400" },
                              { label: "Major Electives", done: curriculumProgress.electiveCompleted, total: 6, text: "text-amber-400", bar: "bg-amber-400" },
                              { label: "Capstone Thesis", done: curriculumProgress.thesisCompleted, total: 4, text: "text-purple-400", bar: "bg-purple-400" },
                            ].map((cat) => (
                              <div key={cat.label} className="space-y-0.5">
                                <div className="flex items-center justify-between text-[10px] font-mono">
                                  <span className={cat.text}>{cat.label}</span>
                                  <span className="text-[#ededed]">{cat.done}/{cat.total} Cr</span>
                                </div>
                                <div className="h-1 w-full rounded-full bg-[#1a1a1a] overflow-hidden">
                                  <div
                                    style={{ width: `${Math.min(100, (cat.done / cat.total) * 100)}%` }}
                                    className={`h-full ${cat.bar} rounded-full`}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Card 3: Detailed GenEd Streams (39 Cr) Progress Bars */}
                        <div className="p-3.5 rounded-xl bg-[#0c0c0c] border border-[#222222] flex flex-col justify-between gap-2">
                          <div className="flex items-center justify-between text-[10px] font-mono text-[#888888]">
                            <span>UNIVERSITY CORE (GENED)</span>
                            <span className="text-[#ededed] font-semibold">
                              {curriculumProgress.stream1Completed + curriculumProgress.stream2Completed + curriculumProgress.stream3Completed + curriculumProgress.stream4Completed + curriculumProgress.stream5Completed + curriculumProgress.freeGenEdCredits} / 39 Cr
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5">
                            {[
                              { label: "S1: Writing", done: curriculumProgress.stream1Completed, total: curriculumProgress.stream1Total, text: "text-sky-400", bar: "bg-sky-400" },
                              { label: "S2: Math/Sci", done: curriculumProgress.stream2Completed, total: curriculumProgress.stream2Total, text: "text-purple-400", bar: "bg-purple-400" },
                              { label: "S3: Arts/Hum", done: curriculumProgress.stream3Completed, total: curriculumProgress.stream3Total, text: "text-indigo-400", bar: "bg-indigo-400" },
                              { label: "S4: Social Sci", done: curriculumProgress.stream4Completed, total: curriculumProgress.stream4Total, text: "text-teal-400", bar: "bg-teal-400" },
                              { label: "S5: CST", done: curriculumProgress.stream5Completed, total: curriculumProgress.stream5Total, text: "text-rose-400", bar: "bg-rose-400" },
                              { label: "Free GenEd", done: curriculumProgress.freeGenEdCredits, total: curriculumProgress.freeGenEdTotal, text: "text-emerald-400", bar: "bg-emerald-400" },
                            ].map((st) => (
                              <div key={st.label} className="space-y-0.5">
                                <div className="flex items-center justify-between text-[9px] font-mono">
                                  <span className={`${st.text} truncate`}>{st.label}</span>
                                  <span className="text-[#ededed]">{st.done}/{st.total}</span>
                                </div>
                                <div className="h-1 w-full rounded-full bg-[#1a1a1a] overflow-hidden">
                                  <div
                                    style={{ width: `${Math.min(100, (st.done / st.total) * 100)}%` }}
                                    className={`h-full ${st.bar} rounded-full`}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Completed Coursework Table */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h2 className="text-[11px] font-mono font-semibold tracking-wider text-[#ededed] uppercase flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#0070f3]" />
                            <span>COMPLETED COURSEWORK</span>
                          </h2>
                          <span className="text-[10px] font-mono text-[#888888]">
                            {semesters.length} Terms Planned
                          </span>
                        </div>
                        
                        {(() => {
                          const exportCompletedCourses: Array<{ code: string; title: string; credits: number; grade: string; semesterName: string }> = [];
                          
                          semesters.forEach((sem, semIdx) => {
                            const intake = semesterIntakes[semIdx];
                            const semTermYear = `${sem.term || intake?.term || 'Spring'} ${sem.year || intake?.year || 2025}`;
                            const semLabel = sem.isRS ? `RS (${semTermYear})` : `${sem.name} (${semTermYear})`;

                            sem.courses.forEach(c => {
                              if (c.code === "CSE400") return;
                              const isComp = c.isCompleted || (c.grade !== "" && c.grade !== "F");
                              if (isComp) {
                                const cData = COURSES.find(co => co.code === c.code);
                                exportCompletedCourses.push({
                                  code: c.code,
                                  title: cData?.title || c.code,
                                  credits: cData?.category === "Non-Credit" ? 0 : (cData?.credits ?? 3),
                                  grade: c.grade || "PASS",
                                  semesterName: semLabel
                                });
                              }
                            });
                          });

                          if (isCSE400Passed) {
                            let capGrade = "PASS";
                            for (const sem of semesters) {
                              const found = sem.courses.find(c => c.code === "CSE400");
                              if (found && found.grade) {
                                capGrade = found.grade;
                                break;
                              }
                            }
                            exportCompletedCourses.push({
                              code: "CSE400",
                              title: "Final Year Capstone: Thesis, Project, or Internship",
                              credits: 4,
                              grade: capGrade,
                              semesterName: "Capstone Phase"
                            });
                          }

                          if (exportCompletedCourses.length === 0) {
                            return (
                              <div className="p-6 text-center text-[#888888] text-xs border border-[#222222] rounded-xl bg-[#0c0c0c]">
                                No completed courses recorded yet. Mark courses as completed or assign grades to populate your transcript snapshot.
                              </div>
                            );
                          }

                          return (
                            <div className="w-full border border-[#222222] rounded-xl overflow-hidden bg-[#0c0c0c]">
                              <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                  <tr className="bg-[#121212] border-b border-[#222222] text-[#888888] font-mono uppercase text-[10px] tracking-wider">
                                    <th className="py-2.5 px-3 font-medium">Course</th>
                                    <th className="py-2.5 px-3 font-medium">Title</th>
                                    <th className="py-2.5 px-3 text-center font-medium">Credits</th>
                                    <th className="py-2.5 px-3 text-right font-medium">Grade</th>
                                    <th className="py-2.5 px-3 text-right font-medium">Semester</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1a1a1a]">
                                  {exportCompletedCourses.map((item, idx) => {
                                    const theme = getCategoryTheme(undefined, item.code);
                                    return (
                                      <tr key={`${item.code}_${idx}`}>
                                        <td className="py-2 px-3">
                                          <span className={`font-mono font-semibold text-[11px] px-2 py-0.5 rounded border ${theme.codePill}`}>
                                            {item.code}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-[#d4d4d8] font-medium">{item.title}</td>
                                        <td className="py-2 px-3 text-center">
                                          <span className="font-mono text-[10px] text-[#a1a1a1] bg-[#161616] border border-[#262626] px-1.5 py-0.5 rounded">
                                            {item.credits} Cr
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-[#161616] border border-[#262626] text-[#ededed]">
                                            {item.grade}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-[#888888] text-right text-[11px] font-mono">{item.semesterName}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Section 4: Footer Watermark */}
                      <div className="border-t border-[#222222] pt-3.5 flex items-center justify-between text-[11px] text-[#888888]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#ededed] font-semibold">Route136</span>
                          <span>•</span>
                          <span>Your CSE curriculum, engineered for clarity.</span>
                          <span>•</span>
                          <span>Developed by <strong className="text-[#ededed] font-medium">Khan Abdullah</strong></span>
                        </div>
                        <div className="font-mono text-[10px] text-[#0070f3]">
                          route136-cse-course-tracker.vercel.app
                        </div>
                      </div>
                    </div>
                  </div> {/* End flow136-grade-sheet-export-node */}
                </div> {/* End inner-transform-wrapper */}
              </div> {/* End scale-wrapper */}
            </div> {/* End scrollable container */}

            {/* Modal Footer Controls */}
            <div className="pt-3 border-t border-[#ebebeb] dark:border-[#262626] flex justify-end gap-2.5 no-print">
              <button
                onClick={() => setShowGradeSheetModal(false)}
                className="h-9 px-4 bg-[#fafafa] dark:bg-[#181818] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] border border-[#e5e5e5] dark:border-[#2a2a2a] rounded-lg text-xs font-medium text-[#171717] dark:text-[#ededed] transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Recommended Curriculum Roadmap Modal Overlay ("Feeling Lost?") */}
      {showRoadmapModal && (() => {
        const q = roadmapSearch.toLowerCase().trim();
        const matchCourse = (item: { code: string; title: string }) => 
          !q || item.code.toLowerCase().includes(q) || item.title.toLowerCase().includes(q);

        const DEPT_CORE = [
          { code: "CSE110", alias: "CSE110 / CSE161 / EEE/ECE103", title: "Programming Language I", credits: 3 },
          { code: "CSE111", title: "Programming Language II", credits: 3 },
          { code: "CSE220", title: "Data Structures", credits: 3 },
          { code: "CSE221", title: "Algorithms", credits: 3 },
          { code: "CSE230", title: "Discrete Mathematics", credits: 3 },
          { code: "CSE250", title: "Circuits and Electronics", credits: 3 },
          { code: "CSE251", title: "Electronic Devices and Circuits", credits: 3 },
          { code: "CSE260", alias: "CSE260 / EEE/ECE283 / EEE301", title: "Digital Logic Design", credits: 3 },
          { code: "CSE320", title: "Data Communications", credits: 3 },
          { code: "CSE321", title: "Operating Systems", credits: 3 },
          { code: "CSE330", title: "Numerical Methods", credits: 3 },
          { code: "CSE331", title: "Automata and Computability", credits: 3 },
          { code: "CSE340", title: "Computer Architecture", credits: 3 },
          { code: "CSE341", title: "Microprocessors", credits: 3 },
          { code: "CSE350", title: "Digital Electronics and Pulse Techniques", credits: 3 },
          { code: "CSE360", title: "Computer Interfacing", credits: 3 },
          { code: "CSE370", title: "Database Systems", credits: 3 },
          { code: "CSE420", title: "Compiler Design", credits: 3 },
          { code: "CSE421", title: "Computer Networks", credits: 3 },
          { code: "CSE422", title: "Artificial Intelligence", credits: 3 },
          { code: "CSE423", title: "Computer Graphics", credits: 3 },
          { code: "CSE460", title: "VLSI Design", credits: 3 },
          { code: "CSE461", title: "Introduction to Robotics", credits: 3 },
          { code: "CSE470", title: "Software Engineering", credits: 3 },
          { code: "CSE471", title: "Systems Analysis and Design", credits: 3 },
        ];

        const CAPSTONE = [
          { code: "CSE400", title: "PROJECT & THESIS (Project / Internship / Thesis)", credits: 4 }
        ];

        const CSE_ELECTIVES = [
          { code: "CSE101", title: "Introduction to Computer Science", credits: 3 },
          { code: "CSE310", title: "Object-Oriented Programming", credits: 3 },
          { code: "CSE342", title: "Computer Systems Engineering", credits: 3 },
          { code: "CSE371", title: "Management Information Systems", credits: 3 },
          { code: "CSE390", title: "Technical Communication", credits: 3 },
          { code: "CSE391", title: "Programming for the Internet", credits: 3 },
          { code: "CSE392", title: "Signals and Systems", credits: 3 },
          { code: "CSE410", title: "Advance Programming In UNIX", credits: 3 },
          { code: "CSE419", title: "Programming Languages and Competitive Programming", credits: 3 },
          { code: "CSE424", title: "Pattern Recognition", credits: 3 },
          { code: "CSE425", title: "Neural Networks", credits: 3 },
          { code: "CSE426", title: "Advanced Algorithms", credits: 3 },
          { code: "CSE427", title: "Machine Learning", credits: 3 },
          { code: "CSE428", title: "Image Processing", credits: 3 },
          { code: "CSE429", title: "Basic Multimedia Theory", credits: 3 },
          { code: "CSE430", title: "Digital Signal Processing", credits: 3 },
          { code: "CSE431", title: "Natural Language Processing", credits: 3 },
          { code: "CSE432", title: "Speech Recognition and Synthesis", credits: 3 },
          { code: "CSE462", title: "Fault-Tolerant Systems", credits: 3 },
          { code: "CSE472", title: "Human-Computer Interface", credits: 3 },
          { code: "CSE473", title: "Financial Engineering & Technology", credits: 3 },
          { code: "CSE474", title: "Simulation and Modeling", credits: 3 },
          { code: "CSE490", title: "WAN Routing / Special Topics", credits: 3 },
          { code: "CSE491", title: "Independent Study", credits: 3 }
        ];

        const BIL_COURSES = [
          { code: "ENG091", title: "Foundation Course (0.0 Cr)", credits: 0, isRemedial: true },
          { code: "ENG101", title: "English Fundamentals", credits: 3, isRemedial: false },
          { code: "ENG102", title: "English Composition I", credits: 3, isRemedial: false },
          { code: "ENG103", title: "Advanced Writing Skills and Presentation* (*Only for ENG102 freshers)", credits: 3, isRemedial: false }
        ];

        const SCHOOL_CORE_MNS = [
          { code: "MAT120", title: "MATH II: Integral Calculus and Differential Equations", credits: 3, isRemedial: false },
          { code: "MAT215", title: "MATH III: Complex Variables and Laplace Transformations", credits: 3, isRemedial: false },
          { code: "MAT216", title: "MATH IV: Linear Algebra and Fourier Analysis", credits: 3, isRemedial: false },
          { code: "PHY112", title: "Principles of Physics II", credits: 3, isRemedial: false }
        ];

        const STREAM2_MNS = [
          { code: "MAT092", title: "Remedial Course in Mathematics (0.0 Cr)", credits: 0, isRemedial: true },
          { code: "MAT110", title: "MATH I: Differential Calculus and Co-ordinate Geometry", credits: 3, isRemedial: false },
          { code: "PHY111", title: "Principles of Physics I", credits: 3, isRemedial: false },
          { code: "STA201", title: "Elements of Statistics and Probability", credits: 3, isRemedial: false }
        ];

        const TARC_COURSES = [
          { code: "HUM103", title: "Ethics and Culture (Stream 3 Mandatory)", credits: 3 },
          { code: "BNG103", title: "Bangla Language and Literature (Stream 3 Mandatory)", credits: 3 },
          { code: "EMB101", title: "Emergence of Bangladesh / DEV101 Bangladesh Studies (Stream 4 Mandatory)", credits: 3 }
        ];

        const GENED_STREAMS = [
          {
            stream: "Stream 2",
            title: "Math & Natural Sciences (Optional Pool)",
            rule: "Mandatory: MAT110, PHY111, STA201 (9 Cr) • Optional Electives below:",
            badge: "bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-300",
            pill: "bg-purple-500/10 border-purple-500/25 text-purple-700 dark:text-purple-200 hover:bg-purple-500/20 hover:border-purple-500/50",
            courses: ["CHE101","BIO101","ENV103","GSC110"]
          },
          {
            stream: "Stream 3",
            title: "Arts & Humanities (Minimum 1 Elective)",
            rule: "Mandatory: HUM103, BNG103 (6 Cr) • Minimum 1 course (3 Cr) from:",
            badge: "bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-300",
            pill: "bg-sky-500/10 border-sky-500/25 text-sky-700 dark:text-sky-200 hover:bg-sky-500/20 hover:border-sky-500/50",
            courses: ["HUM101","HUM102","HST102","HST103","HST104","HUM207","ENG110","ENG113","ENG114","ENG115","ENG333","HUM104","HUM110","HUM201","HUM210","HUM301"]
          },
          {
            stream: "Stream 4",
            title: "Social Sciences (Minimum 1 Elective)",
            rule: "Mandatory: EMB101 / DEV101 (3 Cr) • Minimum 1 course (3 Cr) from:",
            badge: "bg-teal-500/15 border-teal-500/30 text-teal-600 dark:text-teal-300",
            pill: "bg-teal-500/10 border-teal-500/25 text-teal-700 dark:text-teal-200 hover:bg-teal-500/20 hover:border-teal-500/50",
            courses: ["PSY101","SOC101","ANT101","POL101","BUS201","BU201","ECO101","ECO102","ECO105","BUS102","POL102","POL103","POL201","POL202","POL203","POL210","PSY102","DEV104","DEV201","SOC201","ANT342","ANT351","BUS333","BUS335"]
          },
          {
            stream: "Stream 5",
            title: "Communities, Seeking Transformation (Minimum 1)",
            rule: "Minimum 1 course (3 Cr) from:",
            badge: "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-300",
            pill: "bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-200 hover:bg-rose-500/20 hover:border-rose-500/50",
            courses: ["CST201","CST204","CST301","CST302","CST303","CST304","CST305","CST306","CST307","CST308","CST309","CST310","CST314","CST333","BUS334"]
          }
        ];

        const filteredDeptCore = DEPT_CORE.filter(matchCourse);
        const filteredCapstone = CAPSTONE.filter(matchCourse);
        const filteredElectives = CSE_ELECTIVES.filter(matchCourse);
        const filteredBil = BIL_COURSES.filter(matchCourse);
        const filteredSchoolCoreMns = SCHOOL_CORE_MNS.filter(matchCourse);
        const filteredStream2Mns = STREAM2_MNS.filter(matchCourse);
        const filteredTarc = TARC_COURSES.filter(matchCourse);

        const showDept = roadmapActiveTab === 'all' || roadmapActiveTab === 'dept';
        const showOutside = roadmapActiveTab === 'all' || roadmapActiveTab === 'outside';
        const showGened = roadmapActiveTab === 'all' || roadmapActiveTab === 'gened';

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#0c0c0c] border border-[#e5e5e5] dark:border-[#242424] rounded-2xl max-w-[96vw] md:max-w-6xl w-full max-h-[94vh] flex flex-col shadow-vercel-modal relative overflow-hidden text-xs md:text-sm text-[#171717] dark:text-[#ededed]">
              {/* Window Chrome Bar */}
              <div className="px-4 py-2 bg-[#fafafa] dark:bg-[#111111] border-b border-[#ebebeb] dark:border-[#222222] flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                </div>
                <div className="px-3 py-0.5 rounded-md bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] text-[10px] font-mono text-[#888888] flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0070f3]" />
                  <span>route136.app/curriculum-roadmap</span>
                </div>
                <span className="text-[10px] font-mono text-[#0070f3] bg-[#0070f3]/10 border border-[#0070f3]/20 px-2 py-0.5 rounded">
                  136 CR GUIDE
                </span>
              </div>

              {/* Header */}
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#ebebeb] dark:border-[#262626] flex items-center justify-between gap-3 relative z-10 shrink-0 bg-white dark:bg-[#0c0c0c]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg border border-[#e5e5e5] dark:border-[#2a2a2a] bg-white dark:bg-[#181818] flex items-center justify-center text-[#0070f3] shrink-0">
                    <Compass className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-[#171717] dark:text-[#ededed] tracking-tight leading-tight truncate">
                      CSE Curriculum Roadmap &amp; Guide
                    </h3>
                    <p className="text-[11px] text-[#666666] dark:text-[#888888] font-mono mt-0.5 truncate">
                      FYAT Recommended 136-Credit Degree Distribution
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="https://docs.google.com/document/d/1_gvpl646PurM3Cl_JoxaXt0mvQx_6-Qc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 inline-flex items-center gap-1.5 px-3 bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white text-white dark:text-[#0a0a0a] rounded-lg text-xs font-medium transition shadow-vercel-subtle active:scale-95 cursor-pointer whitespace-nowrap"
                    title="Open Sample OBE Curriculum (Version 2023)"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sample OBE Curriculum</span>
                    <ExternalLink className="h-3 w-3 opacity-80" />
                  </a>
                  <button 
                    onClick={() => {
                      setShowRoadmapModal(false);
                      setRoadmapSearch("");
                    }}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-[#181818] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] border border-[#e5e5e5] dark:border-[#2a2a2a] flex items-center justify-center text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] transition cursor-pointer shrink-0"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Segmented Filter Pills & Search Bar Strip */}
              <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-b border-[#ebebeb] dark:border-[#262626] bg-white dark:bg-[#0c0c0c] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 relative z-10 shrink-0">
                {/* Segmented Category Filter Pills */}
                <div className="flex items-center gap-1 p-1 bg-[#f5f5f5] dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] rounded-lg w-full sm:w-auto overflow-x-auto no-scrollbar">
                  {[
                    { id: 'all', label: 'All Modules (45)' },
                    { id: 'dept', label: 'Dept Core (25+2)' },
                    { id: 'outside', label: 'Outside Dept' },
                    { id: 'gened', label: 'GenEd Streams' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setRoadmapActiveTab(tab.id as any)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                        roadmapActiveTab === tab.id
                          ? 'bg-white dark:bg-[#242424] text-[#171717] dark:text-[#ededed] shadow-vercel-subtle'
                          : 'text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Instant Search Bar */}
                <div className="relative w-full sm:w-64 shrink-0">
                  <input
                    type="text"
                    placeholder="Search course code or title..."
                    value={roadmapSearch}
                    onChange={(e) => setRoadmapSearch(e.target.value)}
                    className="w-full bg-[#fafafa] dark:bg-[#141414] border border-[#e5e5e5] dark:border-[#262626] text-xs pl-8 pr-7 py-1.5 rounded-lg text-[#171717] dark:text-[#ededed] placeholder:text-[#888888] outline-none focus:border-[#171717] dark:focus:border-[#ededed] transition font-medium"
                  />
                  <Search className="h-3.5 w-3.5 text-[#888888] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {roadmapSearch && (
                    <button
                      onClick={() => setRoadmapSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Modal Content */}
              <div className="flex-grow overflow-y-auto overflow-x-hidden p-4 sm:p-6 relative z-10 custom-scrollbar space-y-6">
                
                {/* Stats Summary Bar */}
                <div className="bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#242424] rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-[#ebebeb] dark:border-[#222222] pb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-[#171717] dark:text-[#ededed] uppercase tracking-wider">
                        CSE Curriculum Breakdown
                      </span>
                      <span className="text-[10px] font-mono bg-[#0070f3]/10 border border-[#0070f3]/25 text-[#0070f3] px-2 py-0.5 rounded-full font-medium">
                        136 Credits Total
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#666666] dark:text-[#888888]">
                      132 Academic + 4 Non-Academic Credits • 45 Total Courses
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {[
                      { label: "Dept Core", count: "25 Courses", cr: "75 Credits", box: "bg-blue-500/10 border-blue-500/30", text: "text-blue-600 dark:text-blue-300" },
                      { label: "Electives", count: "2 Courses", cr: "6 Credits", box: "bg-amber-500/10 border-amber-500/30", text: "text-amber-600 dark:text-amber-300" },
                      { label: "Capstone", count: "1 Course", cr: "4 Credits", box: "bg-purple-500/10 border-purple-500/30", text: "text-purple-600 dark:text-purple-300" },
                      { label: "MNS", count: "7 Courses", cr: "21 Credits", box: "bg-cyan-500/10 border-cyan-500/30", text: "text-cyan-600 dark:text-cyan-300" },
                      { label: "GenEd", count: "5 Courses", cr: "15 Credits", box: "bg-rose-500/10 border-rose-500/30", text: "text-rose-600 dark:text-rose-300" },
                      { label: "TARC (RS)", count: "3 Courses", cr: "9 Credits", box: "bg-indigo-500/10 border-indigo-500/30", text: "text-indigo-600 dark:text-indigo-300" },
                      { label: "BIL (English)", count: "2 Courses", cr: "6 Credits", box: "bg-sky-500/10 border-sky-500/30", text: "text-sky-600 dark:text-sky-300" },
                    ].map((stat, idx) => (
                      <div key={stat.label} className={`${idx === 6 ? "col-span-2 sm:col-span-1" : ""} p-2.5 rounded-lg border flex flex-col items-center text-center ${stat.box}`}>
                        <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${stat.text}`}>
                          {stat.label}
                        </span>
                        <span className="text-xs font-semibold text-[#171717] dark:text-[#ededed] mt-1">{stat.count}</span>
                        <span className="text-[10px] text-[#666666] dark:text-[#a1a1a1] font-mono">{stat.cr}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 1: Department Core (Program Core + Capstone) */}
                {showDept && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 pb-2 border-b border-blue-500/20">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono font-semibold text-blue-600 dark:text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                          Program Core
                        </span>
                        <h4 className="font-semibold text-xs sm:text-sm text-[#171717] dark:text-[#ededed]">25 Mandatory Computing Courses</h4>
                      </div>
                      <span className="text-xs text-blue-600 dark:text-blue-300 font-mono shrink-0">75 Credits Total</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {filteredDeptCore.map((c) => (
                        <div 
                          key={c.code}
                          className="p-2.5 rounded-lg bg-blue-500/5 dark:bg-blue-500/[0.06] border border-blue-500/20 hover:border-blue-500/45 transition-all flex items-center justify-between gap-2.5"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              title={(c as any).alias || c.code}
                              className="font-mono font-semibold text-xs text-blue-600 dark:text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded shrink-0"
                            >
                              {c.code}
                            </span>
                            <div className="min-w-0">
                              <span className="text-xs text-[#333333] dark:text-[#d4d4d8] truncate block">
                                {c.title}
                              </span>
                              {(c as any).alias && (
                                <span className="text-[10px] font-mono text-blue-600/80 dark:text-blue-300/80 truncate block">
                                  Alt: {(c as any).alias}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-blue-600/80 dark:text-blue-300/80 shrink-0">
                            {c.credits} Cr
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Capstone */}
                    <div className="pt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 pb-2 border-b border-purple-500/20">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono font-semibold text-purple-600 dark:text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                            Capstone
                          </span>
                          <h4 className="font-semibold text-xs sm:text-sm text-[#171717] dark:text-[#ededed]">Graduation Milestone</h4>
                        </div>
                        <span className="text-xs text-purple-600 dark:text-purple-300 font-mono shrink-0">4 Credits</span>
                      </div>

                      <div className="mt-2">
                        {filteredCapstone.map((c) => (
                          <div 
                            key={c.code}
                            className="p-3 rounded-lg bg-purple-500/5 dark:bg-purple-500/[0.06] border border-purple-500/25 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono font-semibold text-xs text-purple-600 dark:text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded shrink-0">
                                {c.code}
                              </span>
                              <span className="text-xs font-medium text-[#171717] dark:text-[#ededed] truncate">
                                {c.title}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-purple-600 dark:text-purple-300 shrink-0">
                              4 Credits
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Program Electives (Official Degree Plan Note: Min 1 CSE, others maybe COD/GenEd/Minor/2nd Major) */}
                    <div className="pt-2 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 pb-2 border-b border-amber-500/20">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono font-semibold text-amber-600 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                            Program Elective (6 Cr)
                          </span>
                          <h4 className="font-semibold text-xs sm:text-sm text-[#171717] dark:text-[#ededed]">
                            Select 2 Courses <span className="text-[#888888] font-normal text-xs">(Min 1 CSE; 2nd may be CSE, COD/GenEd, Minor, or 2nd Major)</span>
                          </h4>
                        </div>
                        <span className="text-xs text-amber-600 dark:text-amber-300 font-mono shrink-0">6 Credits Required</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {filteredElectives.map((c) => (
                          <div 
                            key={c.code}
                            className="p-2.5 rounded-lg bg-amber-500/5 dark:bg-amber-500/[0.06] border border-amber-500/20 hover:border-amber-500/45 transition-all flex items-center justify-between gap-2.5"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono font-semibold text-xs text-amber-600 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded shrink-0">
                                {c.code}
                              </span>
                              <span className="text-xs text-[#333333] dark:text-[#d4d4d8] truncate">
                                {c.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-amber-600/80 dark:text-amber-300/80 shrink-0">
                              {c.credits} Cr
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 2: Outside Department (School Core, Stream 2 MNS, Stream 1 BIL, RS) */}
                {showOutside && (
                  <div className="space-y-5">
                    {/* School Core (12 Cr) */}
                    <div className="space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 pb-2 border-b border-cyan-500/20">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono font-semibold text-cyan-600 dark:text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                            School Core
                          </span>
                          <h4 className="font-semibold text-xs sm:text-sm text-[#171717] dark:text-[#ededed]">
                            Mandatory Mathematics &amp; Physics <span className="text-[#888888] font-normal text-xs">(4 Courses)</span>
                          </h4>
                        </div>
                        <span className="text-xs text-cyan-600 dark:text-cyan-300 font-mono shrink-0">12 Credits</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        {filteredSchoolCoreMns.map((c) => (
                          <div 
                            key={c.code}
                            className="p-2.5 rounded-lg bg-cyan-500/5 dark:bg-cyan-500/[0.06] border border-cyan-500/20 hover:border-cyan-500/45 transition-all flex items-center justify-between gap-2.5"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono font-semibold text-xs text-cyan-600 dark:text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded shrink-0">
                                {c.code}
                              </span>
                              <span className="text-xs text-[#333333] dark:text-[#d4d4d8] truncate">
                                {c.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-cyan-600/80 dark:text-cyan-300/80 shrink-0">
                              {c.credits} Cr
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stream 2 Mandatory MNS (9 Cr + Remedial MAT092) */}
                    <div className="space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 pb-2 border-b border-purple-500/20">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono font-semibold text-purple-600 dark:text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                            Stream 2: Math &amp; Natural Sciences
                          </span>
                          <h4 className="font-semibold text-xs sm:text-sm text-[#171717] dark:text-[#ededed]">
                            University Core Mandatory MNS <span className="text-[#888888] font-normal text-xs">(3 Courses + Optional Remedial MAT092)</span>
                          </h4>
                        </div>
                        <span className="text-xs text-purple-600 dark:text-purple-300 font-mono shrink-0">9 Credits</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        {filteredStream2Mns.map((c) => (
                          <div 
                            key={c.code}
                            className="p-2.5 rounded-lg bg-purple-500/5 dark:bg-purple-500/[0.06] border border-purple-500/20 hover:border-purple-500/45 transition-all flex items-center justify-between gap-2.5"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono font-semibold text-xs text-purple-600 dark:text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded shrink-0">
                                {c.code}
                              </span>
                              <span className="text-xs text-[#333333] dark:text-[#d4d4d8] truncate">
                                {c.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {c.isRemedial && (
                                <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded uppercase">
                                  0.0 Cr
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-purple-600/80 dark:text-purple-300/80">
                                {c.credits} Cr
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stream 1: Writing Comprehension (BIL Languages - 6 Cr) */}
                    <div className="space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 pb-2 border-b border-sky-500/20">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono font-semibold text-sky-600 dark:text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                            Stream 1: Writing Comprehension (BIL)
                          </span>
                          <h4 className="font-semibold text-xs sm:text-sm text-[#171717] dark:text-[#ededed]">
                            2 Credit Courses Required <span className="text-[#888888] font-normal text-xs">(ENG101+ENG102, or ENG102+ENG103* for ENG102 freshers)</span>
                          </h4>
                        </div>
                        <span className="text-xs text-sky-600 dark:text-sky-300 font-mono shrink-0">6 Credits</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        {filteredBil.map((c) => (
                          <div 
                            key={c.code}
                            className="p-2.5 rounded-lg bg-sky-500/5 dark:bg-sky-500/[0.06] border border-sky-500/20 hover:border-sky-500/45 transition-all flex items-center justify-between gap-2.5"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono font-semibold text-xs text-sky-600 dark:text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded shrink-0">
                                {c.code}
                              </span>
                              <span className="text-xs text-[#333333] dark:text-[#d4d4d8] truncate">
                                {c.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {c.isRemedial && (
                                <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded uppercase">
                                  0.0 Cr
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-sky-600/80 dark:text-sky-300/80">
                                {c.credits} Cr
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* TARC Residential Semester */}
                    <div className="space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 pb-2 border-b border-indigo-500/20">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                            TARC (RS) • Stream 3 &amp; 4 Mandatory
                          </span>
                          <h4 className="font-semibold text-xs sm:text-sm text-[#171717] dark:text-[#ededed]">
                            Residential Semester Core <span className="text-[#888888] font-normal text-xs">(HUM103, BNG103, EMB101 / DEV101)</span>
                          </h4>
                        </div>
                        <span className="text-xs text-indigo-600 dark:text-indigo-300 font-mono shrink-0">9 Credits</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {filteredTarc.map((c) => (
                          <div 
                            key={c.code}
                            className="p-2.5 rounded-lg bg-indigo-500/5 dark:bg-indigo-500/[0.06] border border-indigo-500/20 hover:border-indigo-500/45 transition-all flex items-center justify-between gap-2.5"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono font-semibold text-xs text-indigo-600 dark:text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded shrink-0">
                                {c.code}
                              </span>
                              <span className="text-xs text-[#333333] dark:text-[#d4d4d8] truncate">
                                {c.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-indigo-600/80 dark:text-indigo-300/80 shrink-0">
                              {c.credits} Cr
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 3: University Core (General Education Streams & 2 Free GenEd Electives) */}
                {showGened && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 pb-2 border-b border-rose-500/20">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono font-semibold text-rose-600 dark:text-rose-300 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                          University Core (GenEd)
                        </span>
                        <h4 className="font-semibold text-xs sm:text-sm text-[#171717] dark:text-[#ededed]">
                          Streams 2–5 Electives + 2 Free GenEd Electives <span className="text-[#888888] font-normal text-xs">(15 Cr Electives + 24 Cr Mandatory = 39 Cr Total)</span>
                        </h4>
                      </div>
                      <span className="text-xs text-rose-600 dark:text-rose-300 font-mono shrink-0">39 Total GenEd Credits</span>
                    </div>

                    {/* Official GenEd Electives Rule Callout from Updated_Degree_Plan_CSE.docx.pdf */}
                    <div className="p-3.5 rounded-xl bg-rose-500/[0.05] dark:bg-rose-500/[0.08] border border-rose-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-xs text-[#333333] dark:text-[#d4d4d8] leading-relaxed">
                        <strong className="text-rose-600 dark:text-rose-300 font-semibold">GenEd Electives Rule (6 Credits / 2 Courses):</strong>{" "}
                        After completing the minimum requirements (11 courses: 2 in Stream 1, 3 in Stream 2, 3 in Stream 3, 2 in Stream 4, 1 in Stream 5), students take <strong>2 additional GenEd elective courses</strong> as per their desire from Streams 2, 3, 4, and 5 or any elective courses outside the CSE department.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {GENED_STREAMS.map((st) => (
                        <div 
                          key={st.stream}
                          className="p-4 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#242424] space-y-2.5"
                        >
                          <div className="border-b border-[#ebebeb] dark:border-[#222222] pb-2 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${st.badge}`}>
                                  {st.stream}
                                </span>
                                <h5 className="font-semibold text-xs text-[#171717] dark:text-[#ededed]">{st.title}</h5>
                              </div>
                              <span className="text-[10px] text-[#888888] font-mono shrink-0">
                                {st.courses.length} options
                              </span>
                            </div>
                            {(st as any).rule && (
                              <p className="text-[11px] text-[#666666] dark:text-[#888888] font-mono">
                                {(st as any).rule}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                            {st.courses.map((code) => {
                              const detail = COURSES.find(co => co.code === code);
                              const isHighlight = q && (code.toLowerCase().includes(q) || (detail && detail.title.toLowerCase().includes(q)));
                              return (
                                <span
                                  key={code}
                                  title={detail ? `${code}: ${detail.title} (${detail.credits} Cr)` : code}
                                  className={`font-mono text-[10px] font-medium px-2 py-1 rounded border transition-all cursor-help select-none ${
                                    isHighlight
                                      ? 'bg-[#0070f3]/15 border-[#0070f3] text-[#0070f3] font-semibold'
                                      : st.pill
                                  }`}
                                >
                                  {code}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* External Official Resources Banners */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#242424] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-[#0070f3] shrink-0" />
                      <div>
                        <p className="text-xs text-[#171717] dark:text-[#ededed] font-semibold">
                          Sample OBE Curriculum (Version 2023)
                        </p>
                        <p className="text-[11px] text-[#666666] dark:text-[#888888] mt-0.5">
                          View the official degree pathway, course distributions &amp; structure.
                        </p>
                      </div>
                    </div>
                    <a
                      href="https://docs.google.com/document/d/1_gvpl646PurM3Cl_JoxaXt0mvQx_6-Qc"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 inline-flex items-center justify-center gap-1.5 px-3 bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white text-white dark:text-[#0a0a0a] text-xs font-medium rounded-lg transition shadow-vercel-subtle active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <span>Open Document</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#242424] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-[#888888] shrink-0" />
                      <div>
                        <p className="text-xs text-[#171717] dark:text-[#ededed] font-semibold">
                          Need clarification on GenEd stream rules?
                        </p>
                        <p className="text-[11px] text-[#666666] dark:text-[#888888] mt-0.5">
                          Check prerequisites and eligible courses on the university portal.
                        </p>
                      </div>
                    </div>
                    <a
                      href="https://www.bracu.ac.bd/avilable-program/general-education-gened"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 inline-flex items-center justify-center gap-1.5 px-3 bg-white dark:bg-[#181818] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] border border-[#e5e5e5] dark:border-[#2a2a2a] text-[#171717] dark:text-[#ededed] text-xs font-medium rounded-lg transition active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <span>GenEd Portal</span>
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>

              </div>

              {/* Modal Footer with Colored Category Guide & Attribution */}
              <div className="px-4 sm:px-6 py-3 border-t border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#111111] flex flex-col lg:flex-row items-center justify-between gap-2 text-[11px] text-[#666666] dark:text-[#888888] shrink-0 relative z-10 text-center lg:text-left">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 font-mono text-[10px]">
                  <span className="font-semibold text-[#171717] dark:text-[#ededed]">136 Cr:</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-300">75 Core</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-300">6 Electives</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/25 text-purple-600 dark:text-purple-300">4 Thesis</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/25 text-cyan-600 dark:text-cyan-300">21 MNS</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-300">15 GenEd</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/25 text-indigo-600 dark:text-indigo-300">9 RS</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/25 text-sky-600 dark:text-sky-300">6 BIL</span>
                </div>
                <div>
                  Curriculum Guideline by <strong className="text-[#171717] dark:text-[#ededed] font-medium">Badhon Nandi</strong> (FYAT Mentor), OAA Brac University
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Repeat ROI Analyzer Dedicated Popup Modal */}
      {showRoiModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white dark:bg-[#0c0c0c] border border-[#e5e5e5] dark:border-[#242424] rounded-2xl w-full max-w-2xl overflow-hidden shadow-vercel-modal flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150 text-[#171717] dark:text-[#ededed]">
            {/* Window Chrome Bar */}
            <div className="px-4 py-2 bg-[#fafafa] dark:bg-[#111111] border-b border-[#ebebeb] dark:border-[#222222] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
              </div>
              <div className="px-3 py-0.5 rounded-md bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] text-[10px] font-mono text-[#888888] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0070f3]" />
                <span>route136.app/retake-roi</span>
              </div>
              <span className="text-[10px] font-mono text-[#0070f3] bg-[#0070f3]/10 border border-[#0070f3]/20 px-2 py-0.5 rounded">
                SIMULATOR
              </span>
            </div>

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#ebebeb] dark:border-[#262626] flex items-center justify-between bg-white dark:bg-[#0c0c0c]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#2a2a2a] flex items-center justify-center text-[#0070f3] shrink-0">
                  <Repeat className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#171717] dark:text-[#ededed] tracking-tight">Repeat ROI Analyzer</h3>
                  <p className="text-xs text-[#666666] dark:text-[#888888] mt-0.5">Simulate grade improvements, retake scenarios &amp; CGPA impact</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGradingSystemModal(true)}
                  title="View Official University Grading Scale"
                  className="h-8 text-[#171717] dark:text-[#ededed] text-xs font-medium bg-white dark:bg-[#181818] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] px-3 rounded-lg border border-[#e5e5e5] dark:border-[#2a2a2a] flex items-center gap-1.5 transition cursor-pointer shadow-vercel-subtle"
                >
                  <Award className="h-3.5 w-3.5 text-[#0070f3]" />
                  <span className="hidden sm:inline">Grading Scale</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowRoiModal(false)}
                  className="w-8 h-8 rounded-lg bg-white dark:bg-[#181818] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] border border-[#e5e5e5] dark:border-[#2a2a2a] flex items-center justify-center text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4">
              {/* Threshold Filter Bar */}
              <div className="p-3.5 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#242424] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-[#4d4d4d] dark:text-[#a1a1a1]">
                    Detect courses with grade ≤
                  </span>
                  <select
                    value={roiThresholdGrade}
                    onChange={(e) => setRoiThresholdGrade(e.target.value)}
                    className="text-xs font-medium bg-white dark:bg-[#181818] text-[#171717] dark:text-[#ededed] border border-[#e5e5e5] dark:border-[#2a2a2a] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#171717] dark:focus:border-[#ededed] cursor-pointer"
                  >
                    <option value="B-">B- (2.7) — Standard Policy</option>
                    <option value="B">B (3.0)</option>
                    <option value="B+">B+ (3.3)</option>
                    <option value="A-">A- (3.7)</option>
                    <option value="C+">C+ (2.3)</option>
                    <option value="C">C (2.0)</option>
                    <option value="C-">C- (1.7)</option>
                    <option value="D+">D+ (1.3)</option>
                    <option value="D">D (1.0)</option>
                    <option value="D-">D- (0.7)</option>
                    <option value="all">All Gradable (&lt; 4.0)</option>
                  </select>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-[10px] font-mono font-medium self-start sm:self-auto">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>F grades always included</span>
                </div>
              </div>

              {/* Combined Multi-Course Simulation Banner */}
              {roiAnalysis.combinedSelectedCount > 0 ? (
                <div className={`p-4 rounded-xl border transition-all duration-200 ${
                  roiAnalysis.combinedDelta > 0
                    ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : roiAnalysis.combinedDelta < 0
                      ? 'bg-rose-500/5 border-rose-500/30 text-rose-700 dark:text-rose-300'
                      : 'bg-[#fafafa] dark:bg-[#111111] border-[#ebebeb] dark:border-[#242424] text-[#4d4d4d] dark:text-[#a1a1a1]'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-[#171717] dark:text-[#ededed]">
                      {roiAnalysis.combinedDelta > 0 ? (
                        <div className="h-6 w-6 rounded-md bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                          <TrendingUp className="h-3.5 w-3.5" />
                        </div>
                      ) : roiAnalysis.combinedDelta < 0 ? (
                        <div className="h-6 w-6 rounded-md bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                          <TrendingDown className="h-3.5 w-3.5" />
                        </div>
                      ) : (
                        <div className="h-6 w-6 rounded-md bg-[#eaeaea] dark:bg-[#222222] flex items-center justify-center text-[#888888] shrink-0">
                          <Target className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <span>
                        Combined Simulation ({roiAnalysis.combinedSelectedCount} course{roiAnalysis.combinedSelectedCount > 1 ? 's' : ''}, {roiAnalysis.combinedSelectedCredits} Cr)
                      </span>
                    </div>
                    <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border self-start sm:self-auto ${
                      roiAnalysis.combinedDelta > 0
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : roiAnalysis.combinedDelta < 0
                          ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                          : 'bg-[#f0f0f0] dark:bg-[#1a1a1a] border-[#e5e5e5] dark:border-[#2a2a2a] text-[#666666] dark:text-[#999999]'
                    }`}>
                      {roiAnalysis.combinedDelta > 0 ? `+${roiAnalysis.combinedDelta.toFixed(3)}` : roiAnalysis.combinedDelta.toFixed(3)} CGPA
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs pt-2 border-t border-black/5 dark:border-white/5">
                    <span className="text-[#666666] dark:text-[#999999]">
                      Current: <strong className="text-[#171717] dark:text-[#ededed] font-mono">{roiAnalysis.currentCgpa.toFixed(2)}</strong> → Projected: <strong className={`font-mono ${
                        roiAnalysis.combinedDelta > 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : roiAnalysis.combinedDelta < 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-[#171717] dark:text-[#ededed]'
                      }`}>{roiAnalysis.combinedNewCgpa.toFixed(2)}</strong>
                    </span>
                    <span className="text-[11px] text-[#666666] dark:text-[#888888]">
                      {roiAnalysis.combinedDelta > 0
                        ? `Boosts CGPA by +${roiAnalysis.combinedDelta.toFixed(3)} points`
                        : roiAnalysis.combinedDelta < 0
                          ? `Lowers CGPA by ${Math.abs(roiAnalysis.combinedDelta).toFixed(3)} points`
                          : 'No net change to overall CGPA'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-dashed border-[#e5e5e5] dark:border-[#262626] text-center text-xs text-[#666666] dark:text-[#888888] bg-[#fafafa] dark:bg-[#111111]">
                  Select one or more courses below using the checkboxes to calculate combined repeat impact.
                </div>
              )}

              {/* Toolbar & Course Count */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xs font-mono text-[#666666] dark:text-[#888888]">
                  {roiAnalysis.candidates.length} course{roiAnalysis.candidates.length !== 1 ? 's' : ''} detected
                </span>

                {roiAnalysis.candidates.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected: Record<string, boolean> = {};
                        roiAnalysis.candidates.forEach(c => { allSelected[c.code] = true; });
                        setSelectedRoiCourses(allSelected);
                      }}
                      className="text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] transition underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-[#cccccc] dark:text-[#333333]">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        const allDeselected: Record<string, boolean> = {};
                        roiAnalysis.candidates.forEach(c => { allDeselected[c.code] = false; });
                        setSelectedRoiCourses(allDeselected);
                      }}
                      className="text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] transition underline cursor-pointer"
                    >
                      Clear
                    </button>
                    <span className="text-[#cccccc] dark:text-[#333333]">|</span>
                    <button
                      type="button"
                      onClick={() => setRoiTargetGrades({})}
                      title="Reset all target repeat grades to 4.0 (A)"
                      className="text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] transition underline cursor-pointer"
                    >
                      Reset Grades
                    </button>
                  </div>
                )}
              </div>

              {/* Course Cards List */}
              {roiAnalysis.candidates.length === 0 ? (
                <div className="p-8 rounded-xl border border-[#ebebeb] dark:border-[#242424] bg-[#fafafa] dark:bg-[#111111] text-center space-y-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                    <Check className="h-4.5 w-4.5" />
                  </div>
                  <p className="text-xs text-[#171717] dark:text-[#ededed] font-semibold">
                    No courses found with grade ≤ {roiThresholdGrade} (or F).
                  </p>
                  <p className="text-xs text-[#666666] dark:text-[#888888] max-w-sm mx-auto">
                    You have no courses under this threshold. You can raise the threshold to inspect higher grades.
                  </p>
                  <button
                    type="button"
                    onClick={() => setRoiThresholdGrade('all')}
                    className="h-8 inline-flex items-center gap-1.5 px-3.5 bg-[#171717] dark:bg-[#ededed] text-white dark:text-[#0a0a0a] rounded-lg text-xs font-medium transition cursor-pointer shadow-vercel-subtle"
                  >
                    <span>Show All Gradable Courses (&lt; 4.0)</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                  {roiAnalysis.candidates.map((item) => {
                    const isSelected = item.isSelected;
                    const isBoost = item.delta > 0;
                    const isDrop = item.delta < 0;

                    return (
                      <div 
                        key={item.code} 
                        className={`p-3.5 rounded-xl border transition-all ${
                          isSelected 
                            ? 'bg-[#fafafa] dark:bg-[#141414] border-[#171717] dark:border-[#ededed] shadow-vercel-subtle' 
                            : 'bg-white dark:bg-[#111111] border-[#ebebeb] dark:border-[#242424] hover:border-[#cccccc] dark:hover:border-[#333333]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                          {/* Course info & Checkbox */}
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRoiCourses(prev => ({
                                  ...prev,
                                  [item.code]: !isSelected
                                }));
                              }}
                              className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 focus:outline-none ${
                                isSelected
                                  ? 'bg-[#171717] dark:bg-[#ededed] border-transparent text-white dark:text-[#0a0a0a]'
                                  : 'border-[#cccccc] dark:border-[#333333] bg-white dark:bg-[#181818]'
                              }`}
                              title="Include in combined repeat calculation"
                            >
                              {isSelected && (
                                <Check className="h-3 w-3 stroke-[3]" />
                              )}
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-xs text-[#171717] dark:text-[#ededed] bg-[#f5f5f5] dark:bg-[#1c1c1c] border border-[#e5e5e5] dark:border-[#2a2a2a] px-2 py-0.5 rounded">{item.code}</span>
                                <span className="text-[11px] text-[#666666] dark:text-[#888888] font-mono">({item.credits} Cr)</span>
                                {item.isF && (
                                  <span className="text-[9px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                                    F Failed
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-[#4d4d4d] dark:text-[#a1a1a1] truncate block max-w-xs sm:max-w-md mt-1 font-medium" title={item.title}>
                                {item.title}
                              </span>
                            </div>
                          </div>

                          {/* Current Grade & Target Grade Dropdown */}
                          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                            <div className="text-right">
                              <span className="text-[9px] text-[#888888] block uppercase tracking-wider font-mono">Current</span>
                              <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border inline-block ${
                                item.isF 
                                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400' 
                                  : 'bg-[#f5f5f5] dark:bg-[#1a1a1a] border-[#e5e5e5] dark:border-[#2a2a2a] text-[#171717] dark:text-[#ededed]'
                              }`}>
                                {item.currentGrade} ({item.currentGp.toFixed(1)})
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] text-[#888888] block uppercase tracking-wider font-mono">Repeat As</span>
                              <select
                                value={item.targetGrade}
                                onChange={(e) => {
                                  const newG = e.target.value;
                                  setRoiTargetGrades(prev => ({
                                    ...prev,
                                    [item.code]: newG
                                  }));
                                }}
                                className="text-xs font-mono font-medium bg-white dark:bg-[#181818] text-[#171717] dark:text-[#ededed] border border-[#e5e5e5] dark:border-[#2a2a2a] rounded-lg px-2 py-1 focus:outline-none focus:border-[#171717] dark:focus:border-[#ededed] cursor-pointer"
                              >
                                {Object.keys(GRADING_SCALE).map(g => (
                                  <option key={g} value={g}>
                                    {g} ({GRADING_SCALE[g].toFixed(1)})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Individual Course Impact Sub-bar */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#ebebeb] dark:border-[#222222] text-xs">
                          <div className="flex items-center gap-1.5 font-mono">
                            {isBoost ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                <TrendingUp className="h-3.5 w-3.5" />
                                +{item.delta.toFixed(3)} CGPA Boost
                              </span>
                            ) : isDrop ? (
                              <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                                <TrendingDown className="h-3.5 w-3.5" />
                                {item.delta.toFixed(3)} CGPA Drop
                              </span>
                            ) : (
                              <span className="text-[#888888]">
                                ±0.000 CGPA (No Change)
                              </span>
                            )}
                          </div>

                          <span className="text-[#666666] dark:text-[#888888] text-[11px] font-mono">
                            Yields <strong className={isBoost ? 'text-emerald-600 dark:text-emerald-400' : isDrop ? 'text-rose-600 dark:text-rose-400' : 'text-[#171717] dark:text-[#ededed]'}>{item.newCgpa.toFixed(2)} CGPA</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#111111] flex justify-end">
              <button
                type="button"
                onClick={() => setShowRoiModal(false)}
                className="h-9 px-5 bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white text-white dark:text-[#0a0a0a] text-xs font-medium rounded-lg transition cursor-pointer shadow-vercel-subtle"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Grading System Reference Modal */}
      {showGradingSystemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c0c0c] border border-[#e5e5e5] dark:border-[#242424] rounded-2xl w-full max-w-lg overflow-hidden shadow-vercel-modal flex flex-col max-h-[90vh] text-[#171717] dark:text-[#ededed]">
            {/* Window Chrome Bar */}
            <div className="px-4 py-2 bg-[#fafafa] dark:bg-[#111111] border-b border-[#ebebeb] dark:border-[#222222] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
              </div>
              <div className="px-3 py-0.5 rounded-md bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] text-[10px] font-mono text-[#888888] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0070f3]" />
                <span>route136.app/grading-scale</span>
              </div>
              <span className="text-[10px] font-mono text-[#0070f3] bg-[#0070f3]/10 border border-[#0070f3]/20 px-2 py-0.5 rounded">
                UGC 4.00
              </span>
            </div>

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#ebebeb] dark:border-[#262626] flex items-center justify-between bg-white dark:bg-[#0c0c0c]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#2a2a2a] flex items-center justify-center text-[#0070f3]">
                  <Award className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#171717] dark:text-[#ededed] tracking-tight">Grading System</h3>
                  <p className="text-xs text-[#666666] dark:text-[#888888] mt-0.5">University standard grade points &amp; marks distribution</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGradingSystemModal(false)}
                className="w-8 h-8 rounded-lg bg-white dark:bg-[#181818] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] border border-[#e5e5e5] dark:border-[#2a2a2a] flex items-center justify-center text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-4">
              <p className="text-xs text-[#666666] dark:text-[#999999] leading-relaxed">
                Official BRAC University letter grades, grade points, and percentage mark equivalents:
              </p>

              <div className="border border-[#ebebeb] dark:border-[#242424] rounded-xl overflow-hidden bg-[#fafafa] dark:bg-[#111111]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#ebebeb] dark:border-[#242424] bg-[#f5f5f5] dark:bg-[#161616] text-[10px] font-mono uppercase text-[#666666] dark:text-[#888888]">
                      <th className="p-3 font-medium">Marks Range</th>
                      <th className="p-3 text-center font-medium">Grade</th>
                      <th className="p-3 text-center font-medium">Grade Point</th>
                      <th className="p-3 font-medium">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {GRADING_SYSTEM_INFO.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className="border-b border-[#ebebeb] dark:border-[#1f1f1f] last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition"
                      >
                        <td className="p-3 font-mono text-[11px] text-[#4d4d4d] dark:text-[#b4b4b4]">{row.marks}</td>
                        <td className="p-3 font-mono font-semibold text-center text-[#0070f3]">{row.grade}</td>
                        <td className="p-3 font-mono font-medium text-center text-[#171717] dark:text-[#ededed]">({row.points})</td>
                        <td className="p-3 text-[#666666] dark:text-[#888888]">{row.remark || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#111111] flex justify-end">
              <button
                type="button"
                onClick={() => setShowGradingSystemModal(false)}
                className="h-9 px-5 bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white text-white dark:text-[#0a0a0a] text-xs font-medium rounded-lg shadow-vercel-subtle transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Sync & Auth Gatekeeper Modal */}
      {showCloudModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0c0c0c] border border-[#e5e5e5] dark:border-[#242424] rounded-2xl w-full max-w-lg overflow-hidden shadow-vercel-modal flex flex-col max-h-[92vh] relative text-[#171717] dark:text-[#ededed]">
            {/* Window Chrome Bar */}
            <div className="px-4 py-2 bg-[#fafafa] dark:bg-[#111111] border-b border-[#ebebeb] dark:border-[#222222] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
              </div>
              <div className="px-3 py-0.5 rounded-md bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] text-[10px] font-mono text-[#888888] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>route136.app/cloud-sync</span>
              </div>
              <span className="text-[10px] font-mono text-[#0070f3] bg-[#0070f3]/10 border border-[#0070f3]/20 px-2 py-0.5 rounded">
                G-SUITE
              </span>
            </div>

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#ebebeb] dark:border-[#262626] flex items-center justify-between bg-white dark:bg-[#0c0c0c]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#2a2a2a] flex items-center justify-center text-[#0070f3] shrink-0">
                  <Cloud className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-[#171717] dark:text-[#ededed] tracking-tight">
                    Google Drive Cloud Sync
                  </h3>
                  <p className="text-[11px] text-[#666666] dark:text-[#888888]">
                    Encrypted private AppData backup
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCloudModal(false);
                  setGatekeeperError(null);
                }}
                className="w-8 h-8 rounded-lg bg-white dark:bg-[#181818] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] border border-[#e5e5e5] dark:border-[#2a2a2a] flex items-center justify-center text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] transition cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-4">
              {/* Gatekeeper Error Denial Alert */}
              {gatekeeperError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-1 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-semibold text-xs">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>Access Blocked by Gatekeeper</span>
                  </div>
                  <p className="text-[11px] text-rose-600 dark:text-rose-300 leading-relaxed">
                    {gatekeeperError}
                  </p>
                </div>
              )}

              {!cloudUser ? (
                /* Unauthenticated View */
                <div className="space-y-4 py-2">
                  {/* Primary Google Sign In Button */}
                  <button
                    type="button"
                    disabled={isAuthenticating}
                    onClick={() => handleCloudSignIn()}
                    className="w-full h-10 px-4 bg-[#171717] hover:bg-black/90 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0a0a0a] font-medium text-xs sm:text-sm rounded-lg flex items-center justify-center gap-2.5 transition-all shadow-vercel-subtle active:scale-[0.99] cursor-pointer disabled:opacity-60"
                  >
                    {isAuthenticating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                      </svg>
                    )}
                    <span>{isAuthenticating ? "Connecting with Google..." : "Sign in with BRACU G-Suite"}</span>
                  </button>

                  {/* Google OAuth Compliance Legal Notice */}
                  <div className="text-center pt-1 px-2">
                    <p className="text-[11px] text-[#666666] dark:text-[#888888] leading-relaxed">
                      By continuing with Google, you agree to Route136&apos;s{" "}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0070f3] hover:underline font-medium transition"
                      >
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0070f3] hover:underline font-medium transition"
                      >
                        Privacy Policy
                      </a>
                      .
                    </p>
                    <p className="text-[10px] text-[#888888] mt-1.5 font-mono">
                      Cloud backup writes strictly to your hidden Google Drive AppData folder.
                    </p>
                  </div>
                </div>
              ) : (
                /* Authenticated View */
                <div className="space-y-4">
                  {/* Student Profile Card */}
                  <div className="p-3.5 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#242424] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-[#171717] dark:bg-[#ededed] flex items-center justify-center text-white dark:text-[#0a0a0a] font-semibold text-sm shrink-0 overflow-hidden">
                        {cloudUser.picture ? (
                          <img src={cloudUser.picture} alt={cloudUser.name} className="h-full w-full object-cover" />
                        ) : (
                          <span>{cloudUser.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-semibold text-[#171717] dark:text-[#ededed] truncate">{cloudUser.name}</h4>
                          <span className="text-[9px] font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                            <ShieldCheck className="h-3 w-3" />
                            Verified
                          </span>
                        </div>
                        <p className="text-[11px] text-[#666666] dark:text-[#888888] font-mono truncate mt-0.5">{cloudUser.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCloudSignOut}
                      className="h-8 px-3 rounded-lg bg-white dark:bg-[#181818] hover:bg-rose-500/10 border border-[#e5e5e5] dark:border-[#2a2a2a] hover:border-rose-500/30 text-[#666666] dark:text-[#888888] hover:text-rose-600 dark:hover:text-rose-400 text-xs font-medium transition cursor-pointer shrink-0"
                    >
                      Sign Out
                    </button>
                  </div>

                  {/* Sync Details & Status Card */}
                  <div className="p-3.5 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#242424] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#666666] dark:text-[#888888]">Drive Sync Status</span>
                      <span className="flex items-center gap-1.5 font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded text-[11px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>{cloudSyncStatus === 'syncing' ? 'Syncing Now...' : 'Connected & Synced'}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-[#ebebeb] dark:border-[#222222] pt-2.5">
                      <span className="text-[#666666] dark:text-[#888888]">Last Cloud Backup</span>
                      <span className="text-[#171717] dark:text-[#ededed] font-mono font-medium text-[11px]">
                        {formatSyncTimestamp(cloudLastSync)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-[#ebebeb] dark:border-[#222222] pt-2.5">
                      <span className="text-[#666666] dark:text-[#888888]">Active Degree Plan</span>
                      <span className="text-[#0070f3] font-mono font-medium text-[11px]">
                        {cumulativeStats?.completedCredits ?? 0} / 136 Cr Completed
                      </span>
                    </div>
                  </div>

                  {/* Auto-Sync Toggle */}
                  <div className="p-3.5 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#242424] flex items-center justify-between gap-3">
                    <div>
                      <h5 className="text-xs font-semibold text-[#171717] dark:text-[#ededed]">Automated Auto-Save</h5>
                      <p className="text-[11px] text-[#666666] dark:text-[#888888] mt-0.5">Automatically sync changes to Google Drive in the background</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isAutoSyncEnabled;
                        setIsAutoSyncEnabled(next);
                        localStorage.setItem(STORAGE_KEYS.AUTO_SYNC, String(next));
                      }}
                      className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        isAutoSyncEnabled ? 'bg-[#0070f3]' : 'bg-[#e5e5e5] dark:bg-[#2a2a2a]'
                      }`}
                    >
                      <div className={`h-4 w-4 rounded-full bg-white transition-transform absolute top-[3px] ${
                        isAutoSyncEnabled ? 'left-[21px]' : 'left-[3px]'
                      }`} />
                    </button>
                  </div>

                  {/* Sync Action Buttons */}
                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={cloudSyncStatus === 'syncing'}
                      onClick={() => performCloudSync()}
                      className="flex-1 h-9 bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white text-white dark:text-[#0a0a0a] text-xs font-medium rounded-lg shadow-vercel-subtle flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${cloudSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                      <span>{cloudSyncStatus === 'syncing' ? "Syncing..." : "Sync Now"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const isDemo = localStorage.getItem(STORAGE_KEYS.DEMO_MODE) === 'true';
                          let backupPayload: DriveBackupPayload | null = null;
                          if (isDemo) {
                            backupPayload = loadDemoDriveBackup();
                          } else {
                            const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
                            if (!token) throw new Error("Please re-authenticate with Google.");
                            const file = await findDriveBackupFile(token);
                            if (file) {
                              backupPayload = await loadDriveBackup(token, file.id);
                            }
                          }
                          if (backupPayload) {
                            handleRestoreFromCloud(backupPayload);
                          } else {
                            showCloudToast("No cloud backup found on Google Drive.");
                          }
                        } catch (err: any) {
                          showCloudToast(err?.message || "Failed to restore from Google Drive.");
                        }
                      }}
                      className="flex-1 h-9 bg-white dark:bg-[#181818] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] border border-[#e5e5e5] dark:border-[#2a2a2a] text-[#171717] dark:text-[#ededed] text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-[#0070f3]" />
                      <span>Restore from Drive</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#ebebeb] dark:border-[#262626] bg-[#fafafa] dark:bg-[#111111] flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-[11px] text-[#666666] dark:text-[#888888]">
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#171717] dark:hover:text-[#ededed] underline transition"
                >
                  Privacy Policy
                </a>
                <span>•</span>
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#171717] dark:hover:text-[#ededed] underline transition"
                >
                  Terms of Service
                </a>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCloudModal(false);
                  setGatekeeperError(null);
                }}
                className="h-8 px-4 bg-white dark:bg-[#181818] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] border border-[#e5e5e5] dark:border-[#2a2a2a] rounded-lg text-xs font-medium text-[#171717] dark:text-[#ededed] transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Remote Conflict / Initial Found Modal */}
      {showCloudConflictModal && cloudConflictPayload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0c0c0c] border border-[#e5e5e5] dark:border-[#242424] rounded-2xl w-full max-w-md shadow-vercel-modal overflow-hidden relative text-[#171717] dark:text-[#ededed]">
            {/* Window Chrome Bar */}
            <div className="px-4 py-2 bg-[#fafafa] dark:bg-[#111111] border-b border-[#ebebeb] dark:border-[#222222] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
              </div>
              <div className="px-2.5 py-0.5 rounded-md bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] text-[10px] font-mono text-[#888888] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0070f3]" />
                <span>route136.app/cloud-restore</span>
              </div>
              <span className="text-[10px] font-mono text-[#0070f3] bg-[#0070f3]/10 border border-[#0070f3]/20 px-2 py-0.5 rounded">
                SYNC
              </span>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#f5f5f5] dark:bg-[#181818] border border-[#e5e5e5] dark:border-[#2a2a2a] flex items-center justify-center text-[#0070f3] shrink-0">
                  <Cloud className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-[#171717] dark:text-[#ededed]">Cloud Curriculum Found</h4>
                  <p className="text-xs text-[#666666] dark:text-[#888888] mt-0.5">Existing backup on Google Drive</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#242424] text-xs space-y-2.5 text-[#4d4d4d] dark:text-[#a1a1a1]">
                <p>
                  An existing Route136 curriculum backup was found on your Google Drive:
                </p>
                <div className="text-[11px] font-mono text-[#171717] dark:text-[#ededed] bg-white dark:bg-[#181818] border border-[#ebebeb] dark:border-[#262626] p-2.5 rounded-lg space-y-1">
                  <div>Backup Date: <strong>{formatSyncTimestamp(cloudConflictPayload.updatedAt)}</strong></div>
                  <div>Semesters: <strong>{cloudConflictPayload.semesters?.length ?? 0} semesters planned</strong></div>
                  {cloudConflictPayload.statsSummary && (
                    <div>Credits: <strong>{cloudConflictPayload.statsSummary.completedCredits} completed</strong></div>
                  )}
                </div>
                <p className="text-[11px] text-[#666666] dark:text-[#888888]">
                  Would you like to restore this cloud plan, or overwrite it with your current local plan?
                </p>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowCloudConflictModal(false);
                    performCloudSync();
                  }}
                  className="flex-1 h-9 bg-[#fafafa] dark:bg-[#181818] hover:bg-[#f0f0f0] dark:hover:bg-[#222222] border border-[#e5e5e5] dark:border-[#2a2a2a] text-[#171717] dark:text-[#ededed] text-xs font-medium rounded-lg transition cursor-pointer"
                >
                  Keep Local Plan
                </button>
                <button
                  type="button"
                  onClick={() => handleRestoreFromCloud()}
                  className="flex-1 h-9 bg-[#171717] dark:bg-[#ededed] hover:bg-black/90 dark:hover:bg-white text-white dark:text-[#0a0a0a] text-xs font-medium rounded-lg shadow-vercel-subtle transition cursor-pointer"
                >
                  Restore Cloud Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cloud Toast Notification */}
      {cloudToastMessage && (
        <div className="fixed bottom-24 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200 pointer-events-none">
          <div className="bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#262626] text-[#171717] dark:text-[#ededed] text-xs font-mono px-4 py-2.5 rounded-full shadow-vercel-modal flex items-center gap-2">
            <Cloud className="h-4 w-4 text-[#0070f3] shrink-0 animate-pulse" />
            <span>{cloudToastMessage}</span>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Sheet (when (+) tapped on mobile nav) */}
      {isOnboarded && (
        <SpeedDialMenu
          onAddSemester={handleTriggerAddSemester}
          onAddCourses={() => {
            setAddCoursesPreselected([]);
            setAddCoursesTargetSemesterId(null);
            setIsAddCoursesModalOpen(true);
          }}
          onQuickGrades={() => {
            setQuickGradesInitialSemIdx(0);
            setIsQuickGradesModalOpen(true);
          }}
          isCgpaMode={mode === 'gpa'}
          isMobileSheet={true}
          isOpenControlled={isMobileSpeedDialOpen}
          onCloseControlled={() => setIsMobileSpeedDialOpen(false)}
        />
      )}

      {/* Mobile Bottom Navigation Bar (matches desktop sidebar dock with + Add in middle) */}
      {isOnboarded && (
        <MobileBottomNav
          activeTab={mobileActiveTab}
          onTabChange={(tab) => {
            setMobileActiveTab(tab);
            if (tab === "planner" || tab === "semesters") {
              const el = document.getElementById("semester-planner-section");
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            } else if (tab === "cgpa") {
              setMode("gpa");
              const el = document.getElementById("gpa-dashboard-section");
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            } else if (tab === "categories" || tab === "curriculum") {
              const el = document.getElementById("category-requirements-section");
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            } else if (tab === "tools") {
              setIsExtraSidebarOpen(true);
            } else if (tab === "profile") {
              setShowCloudModal(true);
            }
          }}
          onOpenAddCourses={() => {
            setAddCoursesPreselected([]);
            setAddCoursesTargetSemesterId(null);
            setIsAddCoursesModalOpen(true);
          }}
          onOpenTools={() => setIsExtraSidebarOpen(true)}
          onOpenSpeedDial={() => setIsMobileSpeedDialOpen(true)}
          isCgpaMode={mode === 'gpa'}
        />
      )}

      {/* Add Semester Focused Card Popup Modal */}
      <AddSemesterModal
        isOpen={isAddSemesterModalOpen}
        onClose={() => {
          setIsAddSemesterModalOpen(false);
          setFocusedSemesterForModal(null);
        }}
        semester={focusedSemesterForModal}
        onAddCourseToSemester={(semId, courseCode) => handleAddCourseToSemester(semId, courseCode)}
        onRemoveCourseFromSemester={(semId, courseCode) => handleRemoveCourse(semId, courseCode)}
        allSemesters={semesters}
      />

      {/* Add & Assign Courses Multi-select Modal */}
      <AddCoursesModal
        isOpen={isAddCoursesModalOpen}
        onClose={() => {
          setIsAddCoursesModalOpen(false);
          setAddCoursesPreselected([]);
          setAddCoursesTargetSemesterId(null);
        }}
        semesters={!isOnboarded ? semesters.slice(0, onboardingData.currentSemesterNumber || 1) : semesters}
        initialSelectedCodes={addCoursesPreselected}
        initialTargetSemesterId={addCoursesTargetSemesterId}
        onCommitAddCourses={handleCommitAddCourses}
        onRemoveCourseFromSemester={(semId, courseCode) => handleRemoveCourse(semId, courseCode)}
        onClearSemesterCourses={handleClearSemesterCourses}
      />

      {/* Quick Grade Carousel Modal */}
      <QuickGradeCarouselModal
        isOpen={isQuickGradesModalOpen}
        onClose={() => setIsQuickGradesModalOpen(false)}
        semesters={semesters}
        initialSemesterIdx={quickGradesInitialSemIdx}
        onUpdateGrade={(semId, courseCode, grade) => handleGradeChange(semId, courseCode, grade)}
      />

      {/* CSE & MNS Prerequisite Sequence Chains Modal */}
      <PrereqChainsModal
        isOpen={showPrereqChainsModal}
        onClose={() => setShowPrereqChainsModal(false)}
        semesters={semesters}
        isCSE400Passed={isCSE400Passed}
        onQuickAddCourse={(courseCode) => {
          setShowPrereqChainsModal(false);
          setAddCoursesPreselected([courseCode]);
          setAddCoursesTargetSemesterId(null);
          setIsAddCoursesModalOpen(true);
        }}
      />
    </div>
  );
}
