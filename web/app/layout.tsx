import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hyper Compass | Smart Money Intelligence Dashboard",
  description: "Cross-chain smart money discovery, coordination detection, and signal analysis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0a0e1a] text-[#e0e6f0] font-mono">
        <nav className="border-b border-[#1a2240] bg-[#0a0e1a]/90 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-[1600px] mx-auto px-4 h-12 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00ff88] shadow-[0_0_8px_rgba(0,255,136,0.5)]" />
              <span className="text-[#00ff88] font-bold text-sm tracking-wider">HYPER</span>
              <span className="text-[#4488ff] text-xs opacity-70">COMPASS</span>
            </Link>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                <span className="text-[#00ff88]/80">LIVE</span>
              </span>
              <span className="text-[#e0e6f0]/20">|</span>
              <span className="text-[#4488ff]/60">8 chains</span>
              <span className="text-[#e0e6f0]/20">|</span>
              <span className="text-[#e0e6f0]/40">nansen-cli</span>
            </div>
          </div>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
