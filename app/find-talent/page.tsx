import Footer from "@/components/layout/Footer";
import EmployerTalentSearch from "@/components/EmployerTalentSearch";

export default function FindTalentPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#08111F] text-[#071426]">
      <EmployerTalentSearch />
      <Footer />
    </main>
  );
}
