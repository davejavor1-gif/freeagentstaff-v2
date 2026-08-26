import InformationPage from "@/components/layout/InformationPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Read the terms that guide access to and use of the Free Agent Staff platform.",
  alternates: { canonical: "/terms" },
  openGraph: { url: "https://freeagentstaff.com/terms" },
};

// LEGAL: Final solicitor review required before public production launch.
export default function TermsPage() {
  return (
    <InformationPage
      eyebrow="Terms of Use"
      title="Terms & Conditions"
      description="The terms that guide access to and use of the Freeagentstaff platform."
    >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9a6d15]">Last updated: August 2026</p>
          <div className="mt-8 space-y-7 text-sm leading-7 text-[#f7ebcf] sm:text-base">
            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">1. About these Terms</h2>
              <p className="mt-2">These Terms govern your access to and use of Freeagentstaff.</p>
              <p className="mt-2">Freeagentstaff provides an online platform designed to help talent and employers discover professional opportunities, request introductions and establish connections.</p>
              <p className="mt-2">By creating an account or using Freeagentstaff, you agree to these Terms and acknowledge our Privacy Policy.</p>
              <p className="mt-2">If you do not agree, you should not use the service.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">2. Eligibility and accounts</h2>
              <p className="mt-2">You must provide accurate information when creating and maintaining your account.</p>
              <p className="mt-2">You are responsible for activity occurring through your account and for keeping your login credentials secure.</p>
              <p className="mt-2">You must not impersonate another person or organisation or create an account using information you are not authorised to use.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">3. Talent accounts</h2>
              <p className="mt-2">Talent users are responsible for ensuring information included in their Talent Passport is accurate and not misleading.</p>
              <p className="mt-2">Talent users control whether their Talent Passport is published and the privacy and visibility options made available through the platform.</p>
              <p className="mt-2">Publishing a Talent Passport may allow eligible and verified employers to view information about professional experience in accordance with those settings.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">4. Employer accounts</h2>
              <p className="mt-2">Employer users must provide accurate information about themselves and the organisation they represent.</p>
              <p className="mt-2">Certain employer functionality may require verification before access is granted.</p>
              <p className="mt-2">Employer users must only use talent information obtained through Freeagentstaff for legitimate professional, recruitment, engagement or employment-related purposes.</p>
              <p className="mt-2">Employer users must not misuse, scrape, systematically harvest, sell or improperly disclose talent information obtained through the platform.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">5. Employer verification</h2>
              <p className="mt-2">Freeagentstaff may review employer information before granting access to protected employer functionality.</p>
              <p className="mt-2">Verification is intended to support platform access controls. It does not constitute an endorsement, certification or guarantee that an employer, company, opportunity or person is suitable, trustworthy or legitimate.</p>
              <p className="mt-2">Users remain responsible for conducting their own enquiries before entering into any employment, engagement or commercial arrangement.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">6. Talent discovery and privacy</h2>
              <p className="mt-2">Employer discovery is subject to Freeagentstaff&apos;s access, verification, visibility, publication and blocking controls.</p>
              <p className="mt-2">Users must not attempt to circumvent those controls or gain access to information they are not authorised to view.</p>
              <p className="mt-2">Talent users may use available privacy controls to restrict access by certain companies.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">7. Introduction requests and connections</h2>
              <p className="mt-2">Eligible employers may use Freeagentstaff to request an introduction to talent.</p>
              <p className="mt-2">Talent users may accept or decline introduction requests.</p>
              <p className="mt-2">Acceptance may establish a connection between the talent user and employer.</p>
              <p className="mt-2">Where permitted by the platform&apos;s access controls, an accepted connection may allow the employer to obtain the talent user&apos;s contact email.</p>
              <p className="mt-2">A talent user may subsequently revoke a connection using available platform functionality.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">8. Communications outside Freeagentstaff</h2>
              <p className="mt-2">Freeagentstaff does not currently provide an in-platform messaging service.</p>
              <p className="mt-2">Once contact information has been legitimately provided following a connection, talent and employers may communicate independently outside Freeagentstaff.</p>
              <p className="mt-2">Freeagentstaff does not control those external communications and users are responsible for their own communications and dealings with one another.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">9. No guarantee of employment or engagement</h2>
              <p className="mt-2">Freeagentstaff facilitates discovery and introductions.</p>
              <p className="mt-2">Freeagentstaff does not guarantee that:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>a talent user will receive an introduction, interview, engagement or employment;</li>
                <li>an employer will identify or engage a suitable candidate;</li>
                <li>an introduction will result in a professional relationship; or</li>
                <li>information provided by another user will always be complete or accurate.</li>
              </ul>
              <p className="mt-2">Employment, engagement and contractual decisions remain the responsibility of the relevant talent and employer.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">10. User conduct</h2>
              <p className="mt-2">Users must not use Freeagentstaff to:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>break applicable law;</li>
                <li>harass, threaten, discriminate against or abuse another person;</li>
                <li>impersonate another person or organisation;</li>
                <li>provide knowingly false or misleading information;</li>
                <li>gain unauthorised access to accounts, data or restricted areas;</li>
                <li>circumvent privacy, blocking, verification or security controls;</li>
                <li>scrape, harvest or systematically extract user information without authorisation;</li>
                <li>introduce malware or interfere with operation of the service;</li>
                <li>use information obtained through the platform for spam or unrelated marketing; or</li>
                <li>otherwise misuse Freeagentstaff or information made available through it.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">11. User content</h2>
              <p className="mt-2">Users retain ownership of content they provide to Freeagentstaff.</p>
              <p className="mt-2">Users give Freeagentstaff permission to host, process, reproduce and display that content to the extent reasonably necessary to operate the service and provide functionality they have requested or enabled.</p>
              <p className="mt-2">Users must have the right to provide content they upload or submit.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">12. Privacy</h2>
              <p className="mt-2">Handling of personal information is described in the Freeagentstaff Privacy Policy.</p>
              <p className="mt-2">Use of Freeagentstaff is also subject to the privacy and visibility controls provided through the service.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">13. Availability and changes</h2>
              <p className="mt-2">Freeagentstaff may change, improve, suspend or discontinue parts of the service from time to time.</p>
              <p className="mt-2">Freeagentstaff does not guarantee that the service will always be uninterrupted or error-free.</p>
              <p className="mt-2">Where reasonably practicable, significant changes affecting users may be communicated through the service or another appropriate means.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">14. Suspension and termination</h2>
              <p className="mt-2">Freeagentstaff may restrict, suspend or terminate access where reasonably necessary, including where it believes an account:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>breaches these Terms;</li>
                <li>creates a security or privacy risk;</li>
                <li>is being used fraudulently or unlawfully;</li>
                <li>misuses another user&apos;s information; or</li>
                <li>threatens the operation or integrity of the platform.</li>
              </ul>
              <p className="mt-2">Users may request account deletion or deactivation by contacting <a className="font-semibold text-slate-900 underline underline-offset-4" href="mailto:support@freeagentstaff.com">support@freeagentstaff.com</a>.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">15. Third-party services</h2>
              <p className="mt-2">Freeagentstaff relies on third-party technology and infrastructure providers to operate aspects of the service.</p>
              <p className="mt-2">Use of external websites, communications services or other third-party services may also be subject to those providers&apos; own terms and privacy practices.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">16. Intellectual property</h2>
              <p className="mt-2">Except for user-provided content, the Freeagentstaff platform, branding, software, design and associated materials are owned by or licensed to Freeagentstaff and are protected by applicable intellectual property laws.</p>
              <p className="mt-2">Users must not reproduce, distribute or commercially exploit those materials except as permitted by law or with permission.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">17. Liability and consumer rights</h2>
              <p className="mt-2">Nothing in these Terms is intended to exclude, restrict or modify rights or remedies that cannot lawfully be excluded, including rights that may apply under the Australian Consumer Law.</p>
              <p className="mt-2">To the extent permitted by law, Freeagentstaff is not responsible for losses arising solely from dealings or arrangements independently entered into between users outside the platform.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">18. Governing law</h2>
              <p className="mt-2">These Terms are governed by the laws of New South Wales, Australia.</p>
              <p className="mt-2">Subject to rights that may apply under applicable law, the parties submit to courts having jurisdiction in New South Wales.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">19. Contact</h2>
              <p className="mt-2">Questions about these Terms or Freeagentstaff can be sent to:</p>
              <p className="mt-2 font-semibold text-slate-900">Freeagentstaff</p>
              <p className="mt-1"><a className="font-semibold text-slate-900 underline underline-offset-4" href="mailto:support@freeagentstaff.com">support@freeagentstaff.com</a></p>
              <p className="mt-1">New South Wales, Australia</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">20. Changes to these Terms</h2>
              <p className="mt-2">Freeagentstaff may update these Terms from time to time.</p>
              <p className="mt-2">Updated Terms will be published on Freeagentstaff with a revised effective date.</p>
            </section>
          </div>
    </InformationPage>
  );
}