import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import LogoStrip from "@/components/LogoStrip";
import FeaturedCards from "@/components/FeaturedCards";
import HowItWorks from "@/components/HowItWorks";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8f5ef]">
      <Navbar />
      <Hero />
      <LogoStrip />
      <FeaturedCards />
      <HowItWorks />
    </main>
  );
}