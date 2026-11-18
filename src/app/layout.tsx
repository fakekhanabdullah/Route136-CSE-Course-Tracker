import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Route136 | BRACU CSE Curriculum & CGPA Planner",
  description: "Your curriculum, minus the complexity. Map out your 136-credit BRACU CSE degree cleanly and offline with Route136.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Route136",
    description: "Your curriculum, minus the complexity. Map out your 136-credit BRACU CSE degree cleanly and offline with Route136.",
    type: "website",
    siteName: "Route136",
  },
  verification: {
    google: "IPWUw60VNgRfSKJlcp8Z8I1NnAxnc1U3SEoQehG5UGE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full antialiased ${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <meta name="google-site-verification" content="IPWUw60VNgRfSKJlcp8Z8I1NnAxnc1U3SEoQehG5UGE" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('flow136_theme');
                  if (saved === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else if (saved === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans transition-colors duration-200">{children}</body>
    </html>
  );
}
