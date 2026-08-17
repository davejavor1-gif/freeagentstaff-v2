import InformationPage from "@/components/layout/InformationPage";

const SUPPORT_EMAIL = "support@freeagentstaff.com";

export default function SupportPage() {
  return (
    <InformationPage
      eyebrow="Support"
      title="Here to Help"
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
                Support currently covers general product questions, account access problems, employer verification questions, privacy and correction requests, contact-access issues, and manual account deletion or deactivation requests.
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
                Self-serve account deletion is not part of V1. Users should contact support to request account deactivation or deletion review.
              </p>
            </section>
          </div>
    </InformationPage>
  );
}