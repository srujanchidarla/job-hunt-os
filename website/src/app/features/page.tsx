import type { Metadata } from "next";
import FeaturesPageContent from "./FeaturesPageContent";

export const metadata: Metadata = {
  title: "Features — JobHuntOS",
  description:
    "Everything JobHuntOS can do — fit scoring, ATS analysis, tailored resume bullets, outreach messages, and Notion job tracking.",
};

export default function FeaturesPage() {
  return <FeaturesPageContent />;
}
