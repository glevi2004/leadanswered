import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";
import { AuthHashHandler } from "@/components/AuthHashHandler";
import { ThemeProvider } from "@/components/theme-provider";

// Rounded geometric sans (matches Cofounder's "Neoris") — the whole UI. No serif.
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
// IBM Plex Mono for editorial/terminal empty states ("All caught up").
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "Lead Answered",
  description: "Your AI assistant that answers and books every lead.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", sans.variable, mono.variable)}>
      <body className="min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <Suspense>
            <AuthHashHandler />
          </Suspense>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
