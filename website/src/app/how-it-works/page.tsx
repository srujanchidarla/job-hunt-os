import type { Metadata } from "next";
import HowItWorksPageContent from "./HowItWorksPageContent";

export const metadata: Metadata = {
  title: "How It Works — JobHuntOS",
  description:
    "See how JobHuntOS analyzes job postings, scores your fit, and generates tailored application content in seconds.",
};

export default function HowItWorksPage() {
  return <HowItWorksPageContent />;
}
