import { PageContainer } from "@/components/layout/PageContainer";
import { HeroSection } from "@/components/landing/HeroSection";
import { LiveRoundBar } from "@/components/landing/LiveRoundBar";
import { HowItWorksCards } from "@/components/landing/HowItWorksCards";
import { FooterCTA } from "@/components/landing/FooterCTA";

export default function Home() {
  return (
    <PageContainer>
      <HeroSection />
      <LiveRoundBar />
      <HowItWorksCards />
      <FooterCTA />
    </PageContainer>
  );
}
