import Hero from "@/components/Hero";
import SocialProof from "@/components/SocialProof";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import DemoSection from "@/components/DemoSection";
import BuiltBy from "@/components/BuiltBy";
import FAQ from "@/components/FAQ";
import CTABanner from "@/components/CTABanner";

export default function Home() {
  return (
    <>
      <Hero />
      <SocialProof />
      <HowItWorks />
      <Features />
      <DemoSection />
      <BuiltBy />
      <FAQ />
      <CTABanner />
    </>
  );
}
