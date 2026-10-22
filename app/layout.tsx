import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeSync } from "@/components/theme/use-theme-preference";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
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
  title: "Luyra",
  description: "Personal money tracking, budgeting, savings, and financial reviews.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Luyra" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#18181b",
};

// The theme script sets <html data-theme> from the saved preference before
// first paint, so the server HTML stays static and a dark choice never
// flashes light. suppressHydrationWarning: that attribute is expected to
// differ from the server render.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeSync />
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
