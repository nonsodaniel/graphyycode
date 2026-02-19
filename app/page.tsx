import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { AnimationDemo } from "@/components/landing/AnimationDemo";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { TopRepos } from "@/components/landing/TopRepos";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0C]">
      <Navbar />
      <Hero />
      <AnimationDemo />
      <Features />
      <HowItWorks />
      <TopRepos />
      <FAQ />
      <Footer />
    </main>
  );
}
