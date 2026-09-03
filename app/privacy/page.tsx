import InformationPage from "@/components/layout/InformationPage";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read how Free Agent Staff collects, uses, and protects information across the platform.",
  alternates: { canonical: "/privacy" },
  openGraph: { url: "https://freeagentstaff.com/privacy" },
};

// LEGAL: Final solicitor review required before public production launch.
export default function PrivacyPage() {
  return (
    <InformationPage
      title="Privacy Policy"
      titleColor="#AFF546"
      description="How Freeagentstaff collects, uses, and protects information across the platform."
    >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9a6d15]">Australia &middot; Effective: 3 September 2026</p>
          <div className="mt-8 space-y-7 text-sm leading-7 text-[#f7ebcf] sm:text-base">
            <section className="rounded-2xl border border-[#cda64d]/40 bg-[#f7ebcf]/[0.06] p-5 sm:p-6">
              <h2 className="text-lg font-bold text-[#f7ebcf]">Key points</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>FreeAgentStaff is designed to help professionals be discovered by employers rather than requiring them to repeatedly apply for jobs.</li>
                <li>Talent choose what information they add to their FreeAgent Card and Talent Passport and can control how their profile appears through available Privacy &amp; Visibility settings.</li>
                <li>Depending on the visibility setting selected by the Talent, profile information may be visible publicly, to verified employers within the FreeAgentStaff network, or in a confidential or anonymised form.</li>
                <li>Private contact details and private files are not automatically made available to employers simply because an employer can discover or view a Talent profile. Access may be provided when a Talent accepts an introduction, establishes a connection, or otherwise authorises access through FreeAgentStaff.</li>
                <li>Employers must be verified before accessing employer discovery features where verification is required by FreeAgentStaff.</li>
                <li>FreeAgentStaff does not sell personal information.</li>
                <li>Subscription payments are processed through third-party payment providers such as Stripe. FreeAgentStaff does not store full payment card numbers.</li>
                <li>Talent should only upload information that is relevant to their professional profile and should avoid uploading unnecessary sensitive information.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">1. About this policy</h2>
              <p className="mt-2">
                FreeAgentStaff is operated by Freeagentstaff (ABN 26 572 935 109).
              </p>
              <p className="mt-2">
                In this Privacy Policy, FreeAgentStaff, we, us and our refer to Freeagentstaff.
              </p>
              <p className="mt-2">
                FreeAgentStaff provides a professional discovery platform that allows Talent to create a FreeAgent Card and Talent Passport and allows eligible employers to discover, save and connect with Talent.
              </p>
              <p className="mt-2">
                This Privacy Policy explains how we collect, hold, use, disclose and protect personal information when you use FreeAgentStaff, including our website, accounts, Talent profiles, employer tools and related services.
              </p>
              <p className="mt-2">
                We handle personal information in accordance with applicable privacy laws, including the Privacy Act 1988 (Cth) and the Australian Privacy Principles where they apply.
              </p>
              <p className="mt-2">
                This Privacy Policy should be read together with our <a className="font-semibold text-[#f2cc63] underline underline-offset-4" href="/terms">Terms &amp; Conditions</a> and any specific notice displayed when information is collected.
              </p>
              <p className="mt-2">
                Some parts of FreeAgentStaff can be viewed without creating an account. Core Talent and Employer features require an account because we need to identify users, operate profile and connection features, protect users and maintain the integrity of the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">2. Information we collect</h2>
              <p className="mt-2">
                We may collect information you provide when creating or using a FreeAgentStaff account, including your name, email address, phone number where provided, login and account identifiers, account type, preferences and communication settings.
              </p>
              <p className="mt-2">
                For Talent, this may include information added to a FreeAgent Card or Talent Passport, including profile photographs, professional headline, occupation or role, location, biography, skills, strengths, languages, education, qualifications, employment history, career experience, salary expectations, availability, employment preferences and other professional information you choose to provide.
              </p>
              <p className="mt-2">
                Talent may also upload a resume, video introduction or other files where those features are available.
              </p>
              <p className="mt-2">
                We may collect information about the way a Talent profile is configured, including whether the Talent has selected Public, Verified Employer Network or Confidential visibility and the Talent&apos;s current opportunity status.
              </p>
              <p className="mt-2">
                For Employers, we may collect business name, ABN or other business identifiers, contact details, contact-person information, role, employer verification information, subscription status and activity performed through employer tools.
              </p>
              <p className="mt-2">
                We may also collect information about introductions, accepted or declined introductions, connections, saved Talent, blocked employers, profile views where that functionality is available, account activity, support communications and records of permissions granted or withdrawn.
              </p>
              <p className="mt-2">
                When you use FreeAgentStaff we may automatically collect technical information such as IP address, browser and device information, login activity, pages and features used, search activity, security logs, error information, cookies or similar identifiers and approximate location derived from technical information.
              </p>
              <p className="mt-2">
                Payment providers may collect payment and billing information directly. We may receive payment status, customer references, subscription information, transaction references and limited billing information required to operate subscriptions.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">3. FreeAgent Cards and Talent Passports</h2>
              <p className="mt-2">
                A FreeAgent Card is designed to provide employers with a concise professional introduction to a Talent.
              </p>
              <p className="mt-2">
                A Talent Passport provides additional professional information selected by the Talent.
              </p>
              <p className="mt-2">
                The information shown to an employer depends on the information the Talent has chosen to provide, the Talent&apos;s Privacy &amp; Visibility settings, the employer&apos;s account status and the relationship between the Talent and employer.
              </p>
              <p className="mt-2">
                Talent are responsible for deciding what professional information they include in their profile.
              </p>
              <p className="mt-2">
                Talent should not include information in a discoverable profile that they do not want available to the audience permitted by their selected visibility settings.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">4. Privacy &amp; Visibility settings</h2>
              <p className="mt-2">
                FreeAgentStaff provides privacy controls intended to give Talent meaningful control over how they are discovered.
              </p>
              <p className="mt-2">
                Where available, these may include Public, Verified Employer Network and Confidential Mode.
              </p>
              <p className="mt-2">
                Public may allow the Talent profile to be visible and searchable through the public Talent experience.
              </p>
              <p className="mt-2">
                Verified Employer Network may restrict discovery to eligible verified employer accounts within the FreeAgentStaff network.
              </p>
              <p className="mt-2">
                Confidential Mode is intended to allow a Talent to participate in discovery while withholding or anonymising identifying information until the appropriate permission or connection exists.
              </p>
              <p className="mt-2">
                FreeAgentStaff may also provide opportunity-status settings such as Actively Open, Exploring or Not Open.
              </p>
              <p className="mt-2">
                The exact information visible under each setting is explained within the platform. Talent should review their Privacy &amp; Visibility settings whenever their preferences change.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">5. Introductions, connections and private information</h2>
              <p className="mt-2">
                An employer being able to discover a Talent does not automatically mean that employer has access to all of the Talent&apos;s information.
              </p>
              <p className="mt-2">
                Employers may send an introduction request through FreeAgentStaff.
              </p>
              <p className="mt-2">
                If the Talent accepts an introduction request, an active connection is created immediately. Once a connection is active, FreeAgentStaff automatically makes additional information available to that employer, including the Talent&apos;s full identity details, contact email and, where uploaded, resume.
              </p>
              <p className="mt-2">
                Where the Talent is using Confidential Mode, accepting an introduction also reveals information that was previously withheld or anonymised, including the Talent&apos;s name, profile photo, location, professional title, summary, current employer, career information and introduction video where available.
              </p>
              <p className="mt-2">
                No further approval step is required after the Talent accepts the introduction.
              </p>
              <p className="mt-2">
                A Talent may end a connection using available platform controls. Ending a connection removes future access within FreeAgentStaff in accordance with the platform&apos;s current rules, but may not remove information an employer lawfully obtained or separately retained before the connection ended.
              </p>
              <p className="mt-2">
                FreeAgentStaff may maintain historical records of introductions, connections and permissions for security, support, auditing, dispute resolution and legitimate platform administration.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">6. Resumes and private files</h2>
              <p className="mt-2">
                Talent may choose to upload a resume and other supported professional files.
              </p>
              <p className="mt-2">
                A resume is not made available to an employer through general Talent discovery or ordinary profile views.
              </p>
              <p className="mt-2">
                Once a Talent accepts an introduction and an active connection is created, the Talent&apos;s resume, where uploaded, becomes accessible to that connected employer automatically without a further approval step.
              </p>
              <p className="mt-2">
                Other supported private files, where available, are made accessible according to the connection and access rules implemented by FreeAgentStaff.
              </p>
              <p className="mt-2">
                Talent should only upload documents relevant to their professional profile or employment search.
              </p>
              <p className="mt-2">
                General upload fields should not be used to provide unnecessary sensitive information such as tax file numbers, bank account details, complete identity documents, health records or unrelated personal information.
              </p>
              <p className="mt-2">
                Unless FreeAgentStaff expressly states that a document or credential has been independently verified, uploaded material should be treated as information supplied by the Talent.
              </p>
              <p className="mt-2">
                Employers remain responsible for conducting any checks required before making an employment decision.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">7. Employer verification</h2>
              <p className="mt-2">
                FreeAgentStaff may require employers to complete business verification before accessing Talent discovery or other employer features.
              </p>
              <p className="mt-2">
                Verification may include checking information such as business identity, ABN and account details.
              </p>
              <p className="mt-2">
                Verification is intended to help protect the integrity of the platform but does not constitute a guarantee, endorsement or representation about an employer&apos;s conduct, financial position or suitability as a prospective employer.
              </p>
              <p className="mt-2">
                Talent should continue to exercise appropriate judgement when communicating with prospective employers.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">8. How we use personal information</h2>
              <p className="mt-2">
                We use personal information where reasonably necessary to operate, secure and improve FreeAgentStaff.
              </p>
              <p className="mt-2">
                This includes creating and managing accounts; creating and displaying FreeAgent Cards and Talent Passports; applying Privacy &amp; Visibility settings; allowing eligible employers to search for and discover Talent; operating saved Talent and shortlist functionality; processing introductions and connections; providing authorised access to contact information or private files; verifying employer accounts; managing subscriptions and payments; providing customer support; sending account, security and service communications; preventing fraud, misuse and unauthorised access; maintaining security and audit records; analysing and improving platform performance; enforcing our <a className="font-semibold text-[#f2cc63] underline underline-offset-4" href="/terms">Terms &amp; Conditions</a>; and complying with legal obligations.
              </p>
              <p className="mt-2">
                We will not use a Talent&apos;s private resume or other private files for unrelated advertising or public promotion without an appropriate basis or permission.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">9. Who we disclose information to</h2>
              <p className="mt-2">
                Information may be disclosed between Talent and Employers where reasonably necessary to operate FreeAgentStaff and according to the relevant Privacy &amp; Visibility, introduction and connection rules.
              </p>
              <p className="mt-2">
                We may also provide information to trusted service providers that help us operate the platform, including providers involved in hosting, databases, file storage, video delivery, website infrastructure, payment processing, email delivery, security, fraud prevention, analytics, customer support and professional services.
              </p>
              <p className="mt-2">
                These providers are only given access to information reasonably necessary for the services they provide, subject to their own terms, privacy obligations and applicable contractual or security controls.
              </p>
              <p className="mt-2">
                We may disclose information where reasonably necessary to comply with law, respond to lawful requests, prevent fraud or misuse, protect the safety or rights of users or other people, obtain professional advice, enforce our agreements or resolve disputes.
              </p>
              <p className="mt-2">
                If FreeAgentStaff or its operating business is involved in a sale, merger, acquisition, investment, financing, restructure or transfer of assets, information may be disclosed to relevant advisers and parties under appropriate confidentiality arrangements.
              </p>
              <p className="mt-2">
                FreeAgentStaff does not sell personal information for money.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">10. Payments and Stripe</h2>
              <p className="mt-2">
                Paid FreeAgentStaff services may be processed through Stripe or another payment provider.
              </p>
              <p className="mt-2">
                Payment providers may collect payment card, billing, identity and transaction information under their own privacy policies.
              </p>
              <p className="mt-2">
                FreeAgentStaff does not store complete payment card numbers.
              </p>
              <p className="mt-2">
                We may receive information such as billing contact details, subscription status, payment status, customer identifiers, transaction references, invoices and other information needed to administer FreeAgentStaff subscriptions.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">11. Cookies, analytics and platform information</h2>
              <p className="mt-2">
                FreeAgentStaff may use cookies and similar technologies to maintain sessions, secure accounts, remember preferences, understand platform usage, measure performance and improve the service.
              </p>
              <p className="mt-2">
                We may use analytics and diagnostic services to understand how people interact with FreeAgentStaff.
              </p>
              <p className="mt-2">
                Where advertising or conversion measurement tools are used, they may receive technical information such as device identifiers, cookie identifiers, IP address, browser information, pages viewed and actions taken.
              </p>
              <p className="mt-2">
                We do not provide private Talent resumes or private connected files to advertising providers for advertising purposes.
              </p>
              <p className="mt-2">
                Users may be able to manage cookies through browser settings and any preference tools provided by FreeAgentStaff. Blocking essential cookies may prevent some platform functionality from working correctly.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">12. Security</h2>
              <p className="mt-2">
                FreeAgentStaff takes reasonable technical and organisational measures to protect personal information against misuse, interference, loss and unauthorised access, modification or disclosure.
              </p>
              <p className="mt-2">
                Measures may include secure transmission, authentication controls, database and storage access controls, restrictions on private files, logging, monitoring, backups, security reviews and measures designed to detect suspicious or unauthorised activity.
              </p>
              <p className="mt-2">
                No online service can guarantee absolute security.
              </p>
              <p className="mt-2">
                Users are responsible for protecting their account credentials and should notify FreeAgentStaff promptly if they believe their account has been compromised.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">13. International processing</h2>
              <p className="mt-2">
                FreeAgentStaff is operated from Australia but may use technology providers that store, process or access information in other countries.
              </p>
              <p className="mt-2">
                This may include Australia, the United States and other locations in which our service providers or their subcontractors operate.
              </p>
              <p className="mt-2">
                Where Australian privacy requirements apply, we take reasonable steps appropriate to the circumstances to protect personal information handled by overseas service providers.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">14. Retention, account closure and deletion</h2>
              <p className="mt-2">
                We retain personal information only for as long as reasonably necessary for the purposes for which it was collected, related legitimate purposes, fraud and security prevention, dispute resolution, legal claims or applicable record-keeping requirements.
              </p>
              <p className="mt-2">
                Account and profile information may be retained while an account is active and for a reasonable period after account closure where required to complete deletion, protect the platform, resolve disputes or comply with legal obligations.
              </p>
              <p className="mt-2">
                Security, audit, payment, introduction, connection and permission records may sometimes be retained after related profile information is removed where reasonably necessary for legitimate security, compliance or dispute-resolution purposes.
              </p>
              <p className="mt-2">
                Backups may temporarily retain deleted information until they are overwritten through normal backup processes.
              </p>
              <p className="mt-2">
                When information is no longer required, FreeAgentStaff will take reasonable steps to delete or de-identify it where required by applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">15. Access and correction</h2>
              <p className="mt-2">
                You may request access to personal information FreeAgentStaff holds about you and ask us to correct information that is inaccurate, incomplete, out of date, irrelevant or misleading.
              </p>
              <p className="mt-2">
                Many Talent and Employer account details can be updated directly through FreeAgentStaff.
              </p>
              <p className="mt-2">
                You may also contact us at <a className="font-semibold text-[#f2cc63] underline underline-offset-4" href="mailto:support@freeagentstaff.com">support@freeagentstaff.com</a> regarding access or correction of your personal information.
              </p>
              <p className="mt-2">
                We may need to verify your identity before providing access or making certain changes.
              </p>
              <p className="mt-2">
                Where permitted by law, there may be circumstances in which access cannot be provided. If that occurs, we will provide an explanation where required.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">16. Blocking employers</h2>
              <p className="mt-2">
                FreeAgentStaff may allow Talent to block particular companies, domains or employer identities through Privacy &amp; Visibility controls.
              </p>
              <p className="mt-2">
                Where a block is active, FreeAgentStaff will use the information associated with that block to apply the platform&apos;s current discovery and contact restrictions.
              </p>
              <p className="mt-2">
                Blocking is intended as a privacy control within FreeAgentStaff. It cannot prevent an organisation from obtaining information about you from unrelated sources outside FreeAgentStaff.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">17. Marketing communications</h2>
              <p className="mt-2">
                FreeAgentStaff may send information about platform features, services or updates where permitted by law.
              </p>
              <p className="mt-2">
                Marketing messages will include an unsubscribe or opt-out mechanism where required.
              </p>
              <p className="mt-2">
                Operational communications concerning your account, security, subscription, introduction, connection or important service changes are not marketing communications and may still be sent where necessary to operate your account.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">18. Privacy complaints</h2>
              <p className="mt-2">
                If you believe FreeAgentStaff has mishandled your personal information, please contact the Privacy Officer at <a className="font-semibold text-[#f2cc63] underline underline-offset-4" href="mailto:support@freeagentstaff.com">support@freeagentstaff.com</a>.
              </p>
              <p className="mt-2">
                Please provide enough information for us to understand and investigate your concern.
              </p>
              <p className="mt-2">
                We will assess privacy complaints and respond within a reasonable period.
              </p>
              <p className="mt-2">
                Where applicable, you may also have the right to complain to the Office of the Australian Information Commissioner (OAIC).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">19. Data breaches</h2>
              <p className="mt-2">
                FreeAgentStaff maintains processes for responding to suspected data breaches.
              </p>
              <p className="mt-2">
                Where the Australian Notifiable Data Breaches scheme or another applicable notification requirement applies, we will assess the incident and notify affected individuals and relevant regulators where required by law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">20. Changes to this Privacy Policy</h2>
              <p className="mt-2">
                We may update this Privacy Policy where our products, technology, legal obligations, security practices or operations change.
              </p>
              <p className="mt-2">
                The current version will display its effective date.
              </p>
              <p className="mt-2">
                Where a change is material, we may provide notice through FreeAgentStaff, by email or by another reasonable method.
              </p>
              <p className="mt-2">
                Where applicable law requires specific consent for a new collection, use or disclosure, we will seek that consent rather than relying solely on continued use of FreeAgentStaff.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">21. Contact us</h2>
              <p className="mt-3 font-semibold text-[#f7ebcf]">Privacy Officer</p>
              <p className="mt-1 font-semibold text-[#f7ebcf]">Freeagentstaff</p>
              <p className="mt-1">ABN 26 572 935 109</p>
              <p className="mt-1">
                Email: <a className="font-semibold text-[#f2cc63] underline underline-offset-4" href="mailto:support@freeagentstaff.com">support@freeagentstaff.com</a>
              </p>
              <p className="mt-1">
                Website: <Link className="font-semibold text-[#f2cc63] underline underline-offset-4" href="/">freeagentstaff.com</Link>
              </p>
            </section>
          </div>
    </InformationPage>
  );
}
