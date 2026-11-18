"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import PrereqChainsModal from "@/components/PrereqChainsModal";
import { loadCustomCoursesFromStorage } from "@/app/courses-data";

export default function PrereqChainsPage() {
  const router = useRouter();
  const [semesters, setSemesters] = useState<any[]>([]);
  const [isCSE400Passed, setIsCSE400Passed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("flow136_theme") as "dark" | "light" | null;
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else if (savedTheme === "light") {
        document.documentElement.classList.remove("dark");
      }
    } catch {}

    loadCustomCoursesFromStorage();

    try {
      const raw = localStorage.getItem("bracu_course_tracker_state");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.semesters)) {
          setSemesters(parsed.semesters);
          const cse400InSem = parsed.semesters.some((s: any) =>
            s.courses?.some((c: any) => c.code === "CSE400" && c.isCompleted && c.grade !== "F")
          );
          const steps = parsed.thesisSteps;
          const thesisDone =
            Boolean(steps?.p1Completed && steps?.p2Completed && steps?.p3Completed) ||
            Boolean(parsed.projectCompleted) ||
            Boolean(parsed.internshipCompleted) ||
            cse400InSem;
          setIsCSE400Passed(thesisDone);
        }
      }
    } catch {}
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] dark:bg-[#050505] text-[#171717] dark:text-[#ededed]">
      {/* Sticky Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-[#ebebeb] dark:border-[#1f1f1f] bg-white/85 dark:bg-[#0a0a0a]/85 backdrop-blur-md px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5e5e5] dark:border-[#242424] bg-white dark:bg-[#111111] hover:bg-[#f5f5f5] dark:hover:bg-[#181818] text-xs font-medium transition shadow-vercel-subtle"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Workspace</span>
        </Link>
        <ThemeToggleButton />
      </header>

      <div className="flex-1 flex flex-col">
        <PrereqChainsModal
          isOpen={true}
          isFullPage={true}
          onClose={() => router.push("/")}
          semesters={semesters}
          isCSE400Passed={isCSE400Passed}
        />
      </div>
    </div>
  );
}
