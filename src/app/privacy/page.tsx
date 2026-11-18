import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Lock, ArrowLeft, ExternalLink, CheckCircle2, AlertCircle, Database, RefreshCw, Mail, Shield } from "lucide-react";
import ThemeToggleButton from "@/components/ThemeToggleButton";

export const metadata: Metadata = {
  title: "Privacy Policy | Route136 - BRACU CSE Course Tracker",
  description: "Privacy Policy and Google API Services User Data Policy Compliance statement for Route136.",
};

export default function PrivacyPolicyPage() {
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
            <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#141414] border border-[#ebebeb] dark:border-[#262626] text-[#171717] dark:text-[#ededed] font-medium shadow-vercel-subtle">
              Privacy Policy
            </span>
            <Link
              href="/terms"
              className="px-3 py-1.5 rounded-lg bg-transparent hover:bg-white dark:hover:bg-[#141414] border border-transparent hover:border-[#ebebeb] dark:hover:border-[#262626] text-[#888888] hover:text-[#171717] dark:hover:text-[#ededed] font-medium transition"
            >
              Terms of Service
            </Link>
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
              <span>route136.app/privacy</span>
            </div>
            <span className="text-[10px] font-mono text-[#0070f3] bg-[#0070f3]/10 border border-[#0070f3]/20 px-2 py-0.5 rounded">
              LEGAL DOCS
            </span>
          </div>

          <div className="p-6 sm:p-10 space-y-10">
        
        {/* Hero Section */}
        <div className="space-y-4 border-b border-[#ebebeb] dark:border-[#262626] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] text-[#0070f3] text-xs font-mono font-medium shadow-vercel-subtle">
            <Shield className="w-3.5 h-3.5" />
            <span>Official Privacy Policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">
            Privacy Policy &amp; Data Protection
          </h1>
          <p className="text-sm sm:text-base text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed max-w-3xl">
            Route136 is an independent student academic planning platform designed for BRAC University CSE students. Your privacy, academic autonomy, and data sovereignty are fundamental to our architecture.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#888888] pt-1">
            <span>Last Updated: <strong className="text-[#171717] dark:text-[#ededed]">{lastUpdated}</strong></span>
            <span>•</span>
            <span>Application: <strong className="text-[#171717] dark:text-[#ededed]">Route136</strong></span>
            <span>•</span>
            <span>Contact: <a href={`mailto:${contactEmail}`} className="text-[#0070f3] hover:underline">{contactEmail}</a></span>
          </div>
        </div>

        {/* Highlight Alert: Google API Services User Data Policy / Limited Use */}
        <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#262626] shadow-vercel-card relative overflow-hidden space-y-3">
          <div className="flex items-center gap-2 text-[#171717] dark:text-[#ededed] font-semibold text-sm">
            <div className="h-6 w-6 rounded-md bg-blue-500/10 text-[#0070f3] border border-blue-500/20 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <span>Google API Services User Data Policy &amp; Limited Use Disclosure</span>
          </div>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            Route136&apos;s use and transfer to any other app of information received from Google APIs adheres strictly to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0070f3] hover:underline font-medium inline-flex items-center gap-1"
            >
              Google API Services User Data Policy
              <ExternalLink className="w-3 h-3 inline" />
            </a>
            , including the <strong>Limited Use</strong> requirements:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-[#4d4d4d] dark:text-[#a1a1a1]">
            <div className="flex items-start gap-2 bg-[#fafafa] dark:bg-[#141414] p-3 rounded-lg border border-[#ebebeb] dark:border-[#262626]">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Zero Selling of User Data:</strong> We never sell, rent, or trade your Google data to any third parties.</span>
            </div>
            <div className="flex items-start gap-2 bg-[#fafafa] dark:bg-[#141414] p-3 rounded-lg border border-[#ebebeb] dark:border-[#262626]">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Zero Advertising:</strong> Google user data is never used for serving ads or targeted profiling.</span>
            </div>
            <div className="flex items-start gap-2 bg-[#fafafa] dark:bg-[#141414] p-3 rounded-lg border border-[#ebebeb] dark:border-[#262626]">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Zero Generalized AI Training:</strong> Your Google data is not used to train machine learning or AI models.</span>
            </div>
            <div className="flex items-start gap-2 bg-[#fafafa] dark:bg-[#141414] p-3 rounded-lg border border-[#ebebeb] dark:border-[#262626]">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>No Human Access:</strong> No human has access unless explicitly requested by you for technical support.</span>
            </div>
          </div>
        </div>

        {/* Section 1: Developer & Entity Identity */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed] flex items-center gap-2">
            <span className="text-[#0070f3] font-mono">1.</span>
            <span>Developer &amp; Organization Identity</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            Route136 is operated as an independent, non-commercial open-source student utility for BRAC University CSE students.
          </p>
          <div className="p-4 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] space-y-2 text-xs text-[#4d4d4d] dark:text-[#a1a1a1] shadow-vercel-subtle">
            <p><strong>Entity / Project Name:</strong> Route136 (Student Open-Source Project)</p>
            <p><strong>Developer:</strong> Khan Abdullah (Undergraduate Student, Department of CSE, BRAC University)</p>
            <p><strong>Primary Support Email:</strong> <a href={`mailto:${contactEmail}`} className="text-[#0070f3] hover:underline font-medium">{contactEmail}</a></p>
            <p><strong>Open-Source Repository:</strong> <a href="https://github.com/fakekhanabdullah/Route136-CSE-Course-Tracker" target="_blank" rel="noopener noreferrer" className="text-[#0070f3] hover:underline font-medium">github.com/fakekhanabdullah/Route136-CSE-Course-Tracker</a></p>
          </div>
        </section>

        {/* Section 2: Data We Collect & Scopes */}
        <section className="space-y-4">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed] flex items-center gap-2">
            <span className="text-[#0070f3] font-mono">2.</span>
            <span>Information We Collect &amp; Google OAuth Scopes</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            Route136 collects only the minimal data strictly necessary to provide academic degree tracking and optional cloud synchronization:
          </p>

          <div className="space-y-3">
            {/* Scope 1: Userinfo Email & Profile */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#262626] space-y-2 shadow-vercel-subtle">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[#171717] dark:text-[#ededed]">
                  openid, userinfo.email, userinfo.profile
                </span>
                <span className="text-[10px] uppercase font-mono font-medium text-[#888888] px-2 py-0.5 rounded bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626]">
                  Basic Profile
                </span>
              </div>
              <p className="text-xs text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
                <strong>What it provides:</strong> Your name, Google account email address, and avatar image.
              </p>
              <p className="text-xs text-[#888888] leading-relaxed">
                <strong>Purpose:</strong> To identify your student profile locally, display your active session, and verify that students belong to the BRAC University G-Suite domain (<code>@g.bracu.ac.bd</code>) to safeguard program accuracy.
              </p>
            </div>

            {/* Scope 2: Drive AppData */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#0c0c0c] border border-blue-500/30 space-y-2 shadow-vercel-subtle">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[#0070f3]">
                  https://www.googleapis.com/auth/drive.appdata
                </span>
                <span className="text-[10px] uppercase font-mono font-medium text-[#0070f3] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                  Application Data
                </span>
              </div>
              <p className="text-xs text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
                <strong>What it provides:</strong> Read and write access strictly confined to Route136&apos;s own private application data folder on your Google Drive.
              </p>
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-[#4d4d4d] dark:text-[#a1a1a1] space-y-1">
                <p className="font-semibold flex items-center gap-1.5 text-[#0070f3]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  What Route136 CANNOT see or access:
                </p>
                <p>
                  Route136 <strong>cannot</strong> view, browse, search, edit, or delete any of your personal Google Drive documents, Google Docs, photos, spreadsheets, or files outside its isolated app data storage folder.
                </p>
              </div>
              <p className="text-xs text-[#888888] leading-relaxed">
                <strong>Purpose:</strong> Storing your backup file (<code>flow136_backup.json</code>) so your degree plan and grades synchronize seamlessly between your devices without requiring a centralized third-party database.
              </p>
            </div>

            {/* Academic Data */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#262626] space-y-2 shadow-vercel-subtle">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[#171717] dark:text-[#ededed]">
                  Academic Progress Data (Entered by User)
                </span>
                <span className="text-[10px] uppercase font-mono font-medium text-[#888888] px-2 py-0.5 rounded bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#ebebeb] dark:border-[#262626]">
                  User Input
                </span>
              </div>
              <p className="text-xs text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
                Course codes, grades, completed semesters, target CGPA goal, and thesis/internship selections. This information is saved locally in your browser&apos;s <code>localStorage</code> and optionally backed up to your personal Google Drive.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Architecture & Zero Central Server Storage */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed] flex items-center gap-2">
            <span className="text-[#0070f3] font-mono">3.</span>
            <span>No-Backend / Client-Side Architecture</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            Route136 runs as a client-side web application. <strong>We do not operate a centralized backend server, cloud database, or student registry that stores your grades or course records.</strong>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#4d4d4d] dark:text-[#a1a1a1]">
            <div className="p-3.5 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] space-y-1 shadow-vercel-subtle">
              <div className="flex items-center gap-1.5 font-semibold text-[#171717] dark:text-[#ededed]">
                <Database className="w-4 h-4 text-[#0070f3]" />
                <span>Local Browser Storage</span>
              </div>
              <p className="text-[#888888]">
                Your course data is stored in your browser&apos;s isolated <code>localStorage</code>. It remains on your physical device until you clear your browser data.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] space-y-1 shadow-vercel-subtle">
              <div className="flex items-center gap-1.5 font-semibold text-[#171717] dark:text-[#ededed]">
                <RefreshCw className="w-4 h-4 text-[#0070f3]" />
                <span>Your Google Drive AppData</span>
              </div>
              <p className="text-[#888888]">
                When you sign in with Google, backups are written directly from your browser to your Google Drive AppData folder via secure HTTPS REST API calls.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Data Retention, Deletion & Revocation */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed] flex items-center gap-2">
            <span className="text-[#0070f3] font-mono">4.</span>
            <span>How to Delete Your Data &amp; Revoke Access</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            You retain 100% control over your data at all times. You can delete all traces of your data through any of the following mechanisms:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] list-disc list-inside leading-relaxed">
            <li>
              <strong>Clear Local Data:</strong> Open the in-app Tools menu in Route136 and select <em>&quot;Reset Plan to Default&quot;</em>. This immediately purges all courses, grades, and stored tokens from your browser&apos;s <code>localStorage</code>.
            </li>
            <li>
              <strong>Delete Cloud Backup from Google Drive:</strong> Open your Google Drive in a desktop browser &rarr; Click the <strong>Gear icon (Settings)</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Manage Apps</strong> &rarr; Find <strong>Route136</strong> &rarr; Click <strong>Options</strong> &rarr; <strong>Delete hidden app data</strong>.
            </li>
            <li>
              <strong>Revoke Google OAuth Authorization:</strong> You can disconnect Route136 from your Google Account at any time by visiting your{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0070f3] hover:underline font-medium inline-flex items-center gap-0.5"
              >
                Google Account Permissions Dashboard
                <ExternalLink className="w-3 h-3 inline" />
              </a>
              . Once revoked, Route136 loses all access immediately.
            </li>
          </ul>
        </section>

        {/* Section 5: Cookies & Third-Party Services */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed] flex items-center gap-2">
            <span className="text-[#0070f3] font-mono">5.</span>
            <span>Cookies &amp; Third-Party Services</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            Route136 does <strong>not</strong> use advertising cookies, marketing tracking pixels, or third-party behavioral analytics scripts (such as Facebook Pixel or third-party ad trackers).
          </p>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            The only third-party service integrated is <strong>Google Identity Services (GSI) / Google APIs</strong>, solely used when you explicitly request Google Sign-In or Google Drive Cloud Synchronization.
          </p>
        </section>

        {/* Section 6: Security Measures */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed] flex items-center gap-2">
            <span className="text-[#0070f3] font-mono">6.</span>
            <span>Security Measures</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            We implement strict security practices to ensure student safety:
          </p>
          <ul className="space-y-1.5 text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] list-disc list-inside leading-relaxed">
            <li>All communication between your browser and Google APIs is encrypted in transit using industry-standard <strong>TLS/HTTPS (Transport Layer Security)</strong>.</li>
            <li>Short-lived OAuth2 access tokens are stored in private browser storage and are never logged or transmitted to any third-party infrastructure.</li>
            <li>Content Security Policies and strict scope constraints minimize any exposure risk.</li>
          </ul>
        </section>

        {/* Section 7: Educational Disclaimer */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed] flex items-center gap-2">
            <span className="text-[#0070f3] font-mono">7.</span>
            <span>Academic &amp; Institutional Disclaimer</span>
          </h2>
          <div className="p-4 rounded-xl bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#262626] text-xs text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed space-y-2 shadow-vercel-subtle">
            <p className="font-semibold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Not Officially Affiliated with BRAC University:
            </p>
            <p>
              Route136 is an independent planning utility created by and for BRAC University CSE students. It is not owned, operated, endorsed, or audited by BRAC University administration. All official grades, transcripts, and graduation clearances are maintained strictly by the BRAC University Registrar, Department of CSE, and USIS/Connect portals.
            </p>
          </div>
        </section>

        {/* Section 8: Changes to this Policy */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#171717] dark:text-[#ededed] flex items-center gap-2">
            <span className="text-[#0070f3] font-mono">8.</span>
            <span>Changes to this Privacy Policy</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#4d4d4d] dark:text-[#a1a1a1] leading-relaxed">
            We may update this Privacy Policy from time to time to reflect improvements or regulatory changes. Any modifications will be posted directly to this page with an updated &quot;Last Updated&quot; timestamp.
          </p>
        </section>

        {/* Section 9: Contact Us */}
        <section className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#0c0c0c] border border-[#ebebeb] dark:border-[#262626] space-y-3 shadow-vercel-card">
          <h2 className="text-sm font-semibold text-[#171717] dark:text-[#ededed] flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#0070f3]" />
            <span>Questions &amp; Privacy Inquiries</span>
          </h2>
          <p className="text-xs text-[#888888] leading-relaxed">
            If you have any questions, feedback, or data requests regarding this Privacy Policy or Route136&apos;s data practices, please reach out directly:
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
                Issue Tracker
              </a>
            </div>
          </div>
        </section>

        {/* Bottom Footer */}
        <footer className="pt-8 border-t border-[#ebebeb] dark:border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#888888]">
          <p>&copy; {new Date().getFullYear()} Route136 • Khan Abdullah. Open source under MIT.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#171717] dark:hover:text-[#ededed] transition">Home</Link>
            <Link href="/terms" className="hover:text-[#171717] dark:hover:text-[#ededed] transition">Terms of Service</Link>
            <a href="https://github.com/fakekhanabdullah/Route136-CSE-Course-Tracker" target="_blank" rel="noopener noreferrer" className="hover:text-[#171717] dark:hover:text-[#ededed] transition">GitHub</a>
          </div>
        </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
