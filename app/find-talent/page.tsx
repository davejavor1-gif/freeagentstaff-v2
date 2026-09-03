import Navbar from "@/components/layout/Navbar";
import EmployerTalentSearch from "@/components/EmployerTalentSearch";

export default function FindTalentPage() {
  return (
    <main className="min-h-screen bg-[#08111F] text-[#071426]">
      <Navbar />
      <EmployerTalentSearch />
    </main>
  );
}
