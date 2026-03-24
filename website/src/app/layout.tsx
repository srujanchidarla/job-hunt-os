import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JobHuntOS — AI-Powered Job Application Assistant",
  description:
    "Analyze any job posting in seconds. Get fit score, ATS analysis, tailored resume bullets, and outreach message. Powered by Claude AI + Notion MCP.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ background: "var(--c-bg)", color: "#fff", width: "100%" }}>
        <Navbar />
        <main style={{ width: "100%" }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
