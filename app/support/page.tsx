import InformationPage from "@/components/layout/InformationPage";
import type { Metadata } from "next";

const SUPPORT_EMAIL = "support@freeagentstaff.com";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help using Free Agent Staff, managing your account, and keeping your information secure.",
  alternates: { canonical: "/support" },
  openGraph: { url: "https://freeagentstaff.com/support" },
};

export default function SupportPage() {
  return (
    <InformationPage
      title="Support"
      titleColor="#AFF546"
      description="Practical help for using Freeagentstaff, managing your account, and keeping your information secure."
    >
          <div className="border-b border-[#cda64d]/45 pb-8">
          <p className="max-w-3xl text-base leading-7 text-[#f7ebcf]">
            Contact <a className="font-semibold text-[#f2cc63] underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> for product support, account access issues, privacy or correction questions, or manual account deactivation and deletion requests.
          </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">Support scope</h2>
              <p className="mt-2 text-sm leading-7 text-[#f7ebcf]">
                Support currently covers general product questions, account access problems, employer verification questions, privacy and correction requests, contact-access issues, and employer account deletion or deactivation requests.
              </p>
            </section>

            <section className="border-t border-[#cda64d]/50 pt-5 md:border-l md:border-t-0 md:pl-5 md:pt-0">
              <h2 className="text-lg font-bold text-[#f7ebcf]">Security and privacy concerns</h2>
              <p className="mt-2 text-sm leading-7 text-[#f7ebcf]">
                If you believe your account has been compromised, or if you need to report a security or privacy concern, contact support and include as much relevant detail as possible.
              </p>
            </section>

            <section className="border-t border-[#cda64d]/50 pt-5 md:border-l md:border-t-0 md:pl-5 md:pt-0">
              <h2 className="text-lg font-bold text-[#f7ebcf]">Account deletion and deactivation</h2>
              <p className="mt-2 text-sm leading-7 text-[#f7ebcf]">
                Talent can permanently delete their own account from the dashboard. Select Delete account, confirm, and we cancel any active Free Agent Pro subscription, remove your uploaded files, delete your profile and related records, and remove your sign-in. This cannot be undone. Employer accounts are closed by contacting support.
              </p>
            </section>
          </div>
    </InformationPage>
  );
}