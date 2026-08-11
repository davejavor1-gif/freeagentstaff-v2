import Navbar from "@/components/layout/Navbar";
import EmployerTalentSearch from "@/components/EmployerTalentSearch";

export default function FindTalentPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] text-[#071426]">
      <Navbar />
      <EmployerTalentSearch />
    </main>
  );
}
