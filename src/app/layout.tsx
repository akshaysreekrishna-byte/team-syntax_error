import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import TopNav from "@/components/TopNav";
import FluidBackground from "@/components/FluidBackground";
import { GlobalStateProvider } from "@/components/GlobalStateProvider";
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
  title: "Skill-XO | Peer-to-Peer Skill Exchange",
  description: "Learn and teach skills peer-to-peer on a beautiful glassmorphic platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased bg-transparent text-slate-900 dark:text-white transition-colors relative">
        <FluidBackground />
        <ThemeProvider attribute="class" defaultTheme="dark">
          <GlobalStateProvider>
            <main className="flex-1 relative z-10 block">
              {children}
            </main>
          </GlobalStateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
