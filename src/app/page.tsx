import { SandBackground } from "@/components/landing/sand-background";
import { SiteNav } from "@/components/landing/site-nav";
import { Hero } from "@/components/landing/hero";
import { Philosophy } from "@/components/landing/philosophy";
import { TheLoop } from "@/components/landing/the-loop";
import { ChallengesTeaser } from "@/components/landing/challenges-teaser";
import { SpiritsTeaser } from "@/components/landing/spirits-teaser";
import { FinalCta } from "@/components/landing/final-cta";
import { SiteFooter } from "@/components/landing/site-footer";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <SandBackground />
      <SiteNav />
      <Hero />
      <Philosophy />
      <TheLoop />
      <ChallengesTeaser />
      <SpiritsTeaser />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}
