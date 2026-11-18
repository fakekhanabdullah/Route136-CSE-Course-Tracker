import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { FileText, ArrowLeft, AlertTriangle, Scale, Mail, Shield } from "lucide-react";
import ThemeToggleButton from "@/components/ThemeToggleButton";

export const metadata: Metadata = {
  title: "Terms of Service | Route136 - BRACU CSE Course Tracker",
  description: "Terms of Service and Conditions of Use for Route136.",
};

export default function TermsOfServicePage() {
  const lastUpdated = "November 9, 2026";
  const contactEmail = "route136.tracker@gmail.com";
  const appUrl = "https://route136-cse-course-tracker.vercel.app";

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#050505] text-[#171717] dark:text-[#ededed] font-sans relative overflow-x-hidden transition-colors selection:bg-[#0070f3]/20 selection:text-[#0070f3]">
      {/* Vercel Structural Grid + Atmospheric Radial Spotlight */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808014_1px,transparent_1px),linear-gradient(to_bottom,#80808014_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_85%_65%_at_50%_15%,#000_65%,transparent_100%)]" />
        <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[780px] h-[380px] bg-gradient-to-tr from-[#0070f3]/12 via-cyan-500/8 to-transparent rounded-full blur-[110px]" />
      </div>

      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#fafafa]/80 dark:bg-[#050505]/80 border-b border-[#ebebeb] dark:border-[#1f1f1f] transition-colors">
        <div className="px-4 sm:px-6 h-14 max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#111111] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626] text-xs font-medium text-[#171717] dark:text-[#ededed] transition shadow-vercel-subtle group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-[#888888]" />
              <span>Back to Planner</span>
            </Link>
            <div className="h-4 w-px bg-[#ebebeb] dark:bg-[#262626] hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#171717] dark:bg-[#ededed] flex items-center justify-center text-white dark:text-[#171717] shadow-vercel-subtle shrink-0">
                <svg className="h-3.5 w-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
              </div>
              <span className="font-semibold text-sm tracking-tight text-[#171717] dark:text-[#ededed]">Route136</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/privacy"
              className="px-3 py-1.5 rounded-lg bg-transparent hover:bg-white dark:hover:bg-[#141414] border border-transparent hover:border-[#ebebeb] dark:hover:border-[#262626] text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] font-medium transition"
            >
              Privacy Policy
            </Link>
            <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] text-[#171717] dark:text-[#ededed] font-medium shadow-vercel-subtle">
              Terms of Service
            </span>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="rounded-2xl bg-white dark:bg-[#0c0c0c] border border-[#e5e5e5] dark:border-[#242424] shadow-vercel-modal overflow-hidden">
          {/* Window Chrome Bar */}
          <div className="px-4 sm:px-6 py-2.5 bg-[#fafafa] dark:bg-[#111111] border-b border-[#ebebeb] dark:border-[#222222] flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]" />
            </div>
            <div className="px-3 py-0.5 rounded-md bg-white dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] text-[10px] font-mono text-[#888888] flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>route136.app/terms</span>
            </div>
            <span className="text-[10px] font-mono text-[#0070f3] bg-[#0070f3]/10 border border-[#0070f3]/20 px-2 py-0.5 rounded">
              LEGAL DOCS
            </span>
          </div>

          <div className="p-6 sm:p-10 space-y-10">
        
        {/* Hero Section */}
        <div className="space-y-4 border-b border-[#ebebeb] dark:border-[#262626] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] text-[#0070f3] text-xs font-mono font-medium shadow-vercel-subtle">
            <Scale className="w-3.5 h-3.5" />
            <span>Terms of Service</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">
            Terms of Service &amp; User Agreement
          </h1>
          <p className="text-sm sm:text-base text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed max-w-3xl">
            Please read these Terms of Service carefully before using Route136. By accessing, saving a study plan, or using any part of Route136, you agree to be bound by these terms.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#888888] pt-1">
            <span>Last Updated: <strong className="text-[#171717] dark:text-[#ededed]">{lastUpdated}</strong></span>
            <span>•</span>
            <span>Platform: <strong className="text-[#171717] dark:text-[#ededed]">Route136</strong></span>
            <span>•</span>
            <span>Contact: <a href={`mailto:${contactEmail}`} className="text-[#0070f3] hover:underline">{contactEmail}</a></span>
          </div>
        </div>

        {/* Section 1: Acceptance of Terms */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed] flex items-center gap-2">
            <span className="text-[#0070f3] font-mono">1.</span>
            <span>Acceptance of Terms</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            By creating an academic plan, tracking grades, using the GPA simulator, or signing in with Google to synchronize your degree data, you represent and warrant that you agree to comply with and be bound by these Terms of Service and our{" "}
            <Link href="/privacy" className="text-[#0070f3] hover:underline font-medium">
              Privacy Policy
            </Link>
            . If you do not agree with any part of these terms, you should not access or use the application.
          </p>
        </section>

        {/* Section 2: Purpose & Educational Disclaimer */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed] flex items-center gap-2">
            <span className="text-[#0070f3] font-mono">2.</span>
            <span>Academic Purpose &amp; Institutional Disclaimer</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            Route136 is an unofficial academic planning and degree simulation tool built independently to assist students enrolled in the Bachelor of Science in Computer Science and Engineering (CSE) curriculum at BRAC University.
          </p>
          <div className="p-4 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] text-xs text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed space-y-2 shadow-vercel-subtle">
            <p className="font-semibold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Important Academic Disclaimer:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[#4d4d4d] dark:text-[#a1a1a1]">
              <li>Route136 is <strong>NOT</strong> an official service, affiliate, or representative of BRAC University or the Department of CSE.</li>
              <li>Calculations, prerequisite mappings, and simulated GPAs provided by Route136 are for personal planning, estimating, and projection purposes only.</li>
              <li>Official academic status, GPA, credit standing, prerequisite clearances, and graduation eligibility are governed exclusively by official BRAC University portals (such as USIS, Connect, and the Office of the Registrar). Students must confirm all graduation requirements directly with their department academic advisors.</li>
            </ul>
          </div>
        </section>

        {/* Section 3: Google Identity & OAuth Services */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed] flex items-center gap-2">
            <span className="text-[#0070f3] font-mono">3.</span>
            <span>Google Identity &amp; Cloud Drive Services</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            Route136 offers optional authentication and cloud backup powered by Google Identity Services and Google Drive REST APIs. By utilizing Google Sign-in:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            <li>You agree to comply with Google&apos;s applicable Terms of Service and Privacy Policies.</li>
            <li>You grant Route136 permission to access your designated Google Drive hidden Application Data folder (<code>drive.appdata</code>) solely to save, retrieve, and delete your academic plan backup file (<code>flow136_backup.json</code>).</li>
            <li>You understand that Route136 does not inspect, read, or alter any personal files, documents, or photos in your Google Drive outside this isolated application folder.</li>
            <li>Route136 complies strictly with the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-[#0070f3] hover:underline font-medium">Google API Services User Data Policy</a>, including its Limited Use requirements.</li>
          </ul>
        </section>

        {/* Section 4: User Responsibilities & Conduct */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed] flex items-center gap-2">
            <span className="text-[#0070f3] font-mono">4.</span>
            <span>User Responsibilities &amp; Conduct</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            When using Route136, you agree that you will:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            <li>Provide accurate grade and credit entries for your own personal simulation.</li>
            <li>Maintain the confidentiality and security of your Google account credentials and browser sessions.</li>
            <li>Not use the platform for any illegal, harmful, or abusive purpose, including attempting to reverse-engineer unauthorized exploits against Google APIs or BRAC University systems.</li>
            <li>Acknowledge that local data storage resides in your browser cache and you are responsible for maintaining backups or cloud synchronization of your plan.</li>
          </ul>
        </section>

        {/* Section 5: Intellectual Property & Open Source */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed] flex items-center gap-2">
            <span className="text-[#0070f3] font-mono">5.</span>
            <span>Intellectual Property &amp; Open Source</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            The Route136 source code is an open-source project created by Khan Abdullah. Course titles, codes, and credit weighting represent public curricular information of BRAC University.
          </p>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            All visual interfaces, design tokens, responsive graph implementations, and custom algorithms are subject to the project&apos;s open-source license hosted on our official GitHub repository.
          </p>
        </section>

        {/* Section 6: Disclaimer of Warranties */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed] flex items-center gap-2">
            <span className="text-[#0070f3] font-mono">6.</span>
            <span>Disclaimer of Warranties</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            ROUTE136 IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMISSIBLE UNDER APPLICABLE LAW, THE MAINTAINERS DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND ACCURACY OF CURRICULAR INFORMATION.
          </p>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF BUGS, OR THAT SIMULATED CGPA CALCULATIONS ARE FREE OF MINOR ROUNDING DEVIATIONS FROM OFFICIAL UNIVERSITY GRADING SOFTWARE.
          </p>
        </section>

        {/* Section 7: Limitation of Liability */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed] flex items-center gap-2">
            <span className="text-[#0070f3] font-mono">7.</span>
            <span>Limitation of Liability</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            IN NO EVENT SHALL ROUTE136, ITS MAINTAINERS, CONTRIBUTORS, OR AFFILIATES BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES ARISING IN ANY WAY OUT OF THE USE OR INABILITY TO USE THIS APPLICATION, INCLUDING BUT NOT LIMITED TO ADVISING DECISIONS, COURSE RETAKES, DROPPED COURSES, OR LOSS OF DATA.
          </p>
        </section>

        {/* Section 8: Termination & Changes */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed] flex items-center gap-2">
            <span className="text-[#0070f3] font-mono">8.</span>
            <span>Modifications to the Service &amp; Terms</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            We reserve the right to modify, suspend, or discontinue Route136, or update these Terms of Service, at any time without prior notice. Continued use of the platform following any modifications constitutes your binding acceptance of the revised Terms.
          </p>
        </section>

        {/* Section 9: Contact */}
        <section className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#262626] space-y-3 shadow-vercel-card">
          <h2 className="text-sm font-semibold text-[#171717] dark:text-[#ededed] flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#0070f3]" />
            <span>Contact &amp; Inquiries</span>
          </h2>
          <p className="text-xs text-[#888888] leading-relaxed">
            For questions, legal inquiries, or concerns regarding these Terms of Service, please contact:
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs font-mono text-[#171717] dark:text-[#ededed] pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[#888888]">Email:</span>
              <a href={`mailto:${contactEmail}`} className="text-[#0070f3] hover:underline font-medium">
                {contactEmail}
              </a>
            </div>
            <span className="hidden sm:inline text-[#888888]">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[#888888]">GitHub:</span>
              <a
                href="https://github.com/fakekhanabdullah/Route136-CSE-Course-Tracker"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0070f3] hover:underline"
              >
                Route136-CSE-Course-Tracker
              </a>
            </div>
          </div>
        </section>

        {/* Bottom Footer */}
        <footer className="pt-8 border-t border-[#ebebeb] dark:border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#888888]">
          <p>&copy; {new Date().getFullYear()} Route136 • Khan Abdullah. Open source under MIT.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#171717] dark:hover:text-[#ededed] transition">Home</Link>
            <Link href="/privacy" className="hover:text-[#171717] dark:hover:text-[#ededed] transition">Privacy Policy</Link>
            <a href="https://github.com/fakekhanabdullah/Route136-CSE-Course-Tracker" target="_blank" rel="noopener noreferrer" className="hover:text-[#171717] dark:hover:text-[#ededed] transition">GitHub</a>
          </div>
        </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
