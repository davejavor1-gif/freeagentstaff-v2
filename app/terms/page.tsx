import InformationPage from "@/components/layout/InformationPage";
import Link from "next/link";
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
      title="Terms & Conditions"
      titleColor="#2BD7EF"
      description="The terms that guide access to and use of the Freeagentstaff platform."
    >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9a6d15]">Last updated: 3 September 2026</p>
          <div className="mt-8 space-y-7 text-sm leading-7 text-[#f7ebcf] sm:text-base">
            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">1. Who we are and what we do</h2>
              <p className="mt-2">1.1 These Terms &amp; Conditions (&quot;Terms&quot;) are an agreement between you and Freeagentstaff (ABN 26 572 935 109) (&quot;FreeAgentStaff&quot;, &quot;we&quot;, &quot;us&quot; or &quot;our&quot;).</p>
              <p className="mt-2">1.2 FreeAgentStaff operates a professional discovery platform that allows professionals (&quot;Talent&quot;) to create professional profiles, including FreeAgent Cards and Talent Passports, and allows eligible businesses and their authorised representatives (&quot;Employers&quot;) to discover, save, review and connect with Talent.</p>
              <p className="mt-2">1.3 FreeAgentStaff is a technology platform. Unless we expressly state otherwise, we are not:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>an employer of Talent;</li>
                <li>a recruiter or employment agency acting on behalf of Talent or Employers;</li>
                <li>a labour hire provider;</li>
                <li>a payroll or workforce management provider; or</li>
                <li>a legal, employment, tax or financial adviser.</li>
              </ul>
              <p className="mt-2">1.4 We do not employ Talent and do not guarantee:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>that a Talent will be discovered or contacted;</li>
                <li>that an Employer will find a suitable Talent;</li>
                <li>interviews;</li>
                <li>job offers;</li>
                <li>employment;</li>
                <li>salary or remuneration;</li>
                <li>employment conditions; or</li>
                <li>any particular hiring or career outcome.</li>
              </ul>
              <p className="mt-2">1.5 Any employment, engagement, interview, offer or other arrangement arising between Talent and an Employer is a matter between those parties.</p>
              <p className="mt-2">1.6 By creating an account or using the platform, you agree to these Terms.</p>
              <p className="mt-2">1.7 If you use FreeAgentStaff on behalf of a business or organisation, you confirm that you are authorised to act for that business or organisation and to agree to these Terms on its behalf.</p>
              <p className="mt-2">1.8 Our <Link className="font-semibold text-[#f2cc63] underline underline-offset-4" href="/privacy">Privacy Policy</Link> explains how we collect, use, disclose and protect personal information and should be read together with these Terms.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">2. Eligibility and accounts</h2>
              <p className="mt-2">2.1 You must be legally capable of entering into these Terms.</p>
              <p className="mt-2">2.2 You must provide information that is accurate, current and not misleading and keep relevant account information reasonably up to date.</p>
              <p className="mt-2">2.3 You are responsible for maintaining the security of your account and login credentials and for activity performed through your account.</p>
              <p className="mt-2">2.4 You must notify us promptly at <a className="font-semibold text-[#f2cc63] underline underline-offset-4" href="mailto:support@freeagentstaff.com">support@freeagentstaff.com</a> if you believe your account has been accessed or used without authorisation.</p>
              <p className="mt-2">2.5 Accounts are personal to the individual or authorised business user for whom they were created. You must not sell, transfer or provide another person with unauthorised access to your account.</p>
              <p className="mt-2">2.6 We may require additional information to verify an account, protect users or maintain the integrity and security of FreeAgentStaff.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">3. Talent accounts</h2>
              <p className="mt-2">3.1 Talent may use FreeAgentStaff to create and maintain a professional profile.</p>
              <p className="mt-2">3.2 Depending on available features, this may include:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>a FreeAgent Card;</li>
                <li>a Talent Passport;</li>
                <li>profile photographs;</li>
                <li>professional information;</li>
                <li>career history;</li>
                <li>skills and qualifications;</li>
                <li>employment preferences;</li>
                <li>availability or opportunity status;</li>
                <li>a video introduction;</li>
                <li>a resume; and</li>
                <li>other supported professional information or files.</li>
              </ul>
              <p className="mt-2">3.3 Talent are responsible for the accuracy of the information they provide.</p>
              <p className="mt-2">3.4 Talent must not deliberately provide false, misleading, fraudulent or impersonated information.</p>
              <p className="mt-2">3.5 Unless FreeAgentStaff expressly states that information, a qualification or a document has been independently verified, information appearing on a Talent profile should be treated as information supplied by the Talent.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">4. Talent discovery and visibility</h2>
              <p className="mt-2">4.1 FreeAgentStaff is designed around professional discovery. Talent may make themselves discoverable to Employers in accordance with the Privacy &amp; Visibility settings available through the platform.</p>
              <p className="mt-2">4.2 Depending on available settings, these may include:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Public;</li>
                <li>Verified Employer Network; and</li>
                <li>Confidential Mode.</li>
              </ul>
              <p className="mt-2">4.3 Talent may also be able to indicate an opportunity status such as:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Actively Open;</li>
                <li>Exploring; or</li>
                <li>Not Open.</li>
              </ul>
              <p className="mt-2">4.4 Talent are responsible for selecting the visibility and opportunity settings appropriate to them.</p>
              <p className="mt-2">4.5 Visibility and opportunity settings control how FreeAgentStaff presents a Talent through the platform but do not guarantee that the Talent will or will not be contacted, discovered, interviewed or hired.</p>
              <p className="mt-2">4.6 Talent should review their settings whenever their circumstances or preferences change.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">5. Confidential Mode</h2>
              <p className="mt-2">5.1 Confidential Mode is intended to allow Talent to participate in professional discovery while withholding or anonymising certain identifying information before a connection is established.</p>
              <p className="mt-2">5.2 Information displayed before a connection may therefore differ from the information available to a connected Employer.</p>
              <p className="mt-2">5.3 If a Talent using Confidential Mode accepts an Employer&apos;s introduction request, an active connection is created and information previously withheld or anonymised may automatically become visible to that Employer in accordance with the platform&apos;s connection rules.</p>
              <p className="mt-2">5.4 This may include the Talent&apos;s name, profile photograph, location, professional title, summary, current employer, career information, introduction video, contact information and resume where available.</p>
              <p className="mt-2">5.5 No separate private-access approval is required after the Talent accepts the introduction where the information is made available as part of an active connection.</p>
              <p className="mt-2">5.6 Talent should therefore only accept an introduction where they are comfortable establishing a connection with that Employer.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">6. Employer accounts and verification</h2>
              <p className="mt-2">6.1 Employers may be required to complete business verification before accessing Talent discovery or other Employer features.</p>
              <p className="mt-2">6.2 Verification may include checking information such as:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>business identity;</li>
                <li>ABN;</li>
                <li>business details;</li>
                <li>account information; and</li>
                <li>other information reasonably required to assess eligibility.</li>
              </ul>
              <p className="mt-2">6.3 A verified status means only that FreeAgentStaff has completed the verification process applicable at that time.</p>
              <p className="mt-2">6.4 Verification is not:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>an endorsement of the Employer;</li>
                <li>a guarantee of the Employer&apos;s conduct;</li>
                <li>a guarantee of financial standing;</li>
                <li>a guarantee that information supplied by the Employer will remain accurate; or</li>
                <li>a guarantee that an employment opportunity will be suitable.</li>
              </ul>
              <p className="mt-2">6.5 We may request further verification information, repeat verification, suspend verification or remove Employer access where reasonably necessary to protect the platform or its users.</p>
              <p className="mt-2">6.6 Employers must keep their business and account information accurate and current.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">7. Employer use of Talent discovery</h2>
              <p className="mt-2">7.1 Employer access to Talent information is provided for genuine professional recruitment, hiring, employment and related business purposes.</p>
              <p className="mt-2">7.2 Employers must not use FreeAgentStaff or Talent information to:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>spam Talent;</li>
                <li>send unrelated marketing;</li>
                <li>harass or intimidate Talent;</li>
                <li>unlawfully discriminate;</li>
                <li>scrape or harvest Talent information;</li>
                <li>build or enrich unrelated databases;</li>
                <li>sell Talent information;</li>
                <li>publish Talent information without authority;</li>
                <li>impersonate another person or business; or</li>
                <li>use Talent information for purposes unrelated to genuine professional or employment opportunities.</li>
              </ul>
              <p className="mt-2">7.3 Employers are responsible for conducting their own assessment and due diligence before interviewing, engaging or employing a Talent.</p>
              <p className="mt-2">7.4 FreeAgentStaff does not guarantee the identity, qualifications, experience, suitability, availability or right to work of any Talent unless a particular item is expressly stated to have been verified by FreeAgentStaff or an approved verification provider.</p>
              <p className="mt-2">7.5 Employers remain responsible for any checks required by law or reasonably appropriate for a role.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">8. Introductions and connections</h2>
              <p className="mt-2">8.1 Employers may be able to send introduction requests to Talent through FreeAgentStaff.</p>
              <p className="mt-2">8.2 An introduction request does not create an employment relationship and does not oblige the Talent to respond or accept.</p>
              <p className="mt-2">8.3 If a Talent accepts an introduction request, an active connection is created between the Talent and Employer.</p>
              <p className="mt-2">8.4 Once a connection is active, additional information may automatically become available to the Employer in accordance with the platform&apos;s connection rules.</p>
              <p className="mt-2">8.5 This may include:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>the Talent&apos;s full identity;</li>
                <li>profile photograph;</li>
                <li>professional and career information;</li>
                <li>contact email;</li>
                <li>introduction video;</li>
                <li>precise location information where available; and</li>
                <li>resume where uploaded.</li>
              </ul>
              <p className="mt-2">8.6 No additional private-access approval is required for information that becomes available as part of the active connection.</p>
              <p className="mt-2">8.7 Talent should only accept an introduction from an Employer where they are comfortable revealing the information made available through a connection.</p>
              <p className="mt-2">8.8 A Talent may end a connection using available platform controls.</p>
              <p className="mt-2">8.9 Ending a connection may remove future access to connection-gated information within FreeAgentStaff, but cannot necessarily remove information that an Employer lawfully obtained, downloaded or separately retained while access was authorised.</p>
              <p className="mt-2">8.10 Employers must continue to handle information obtained through a connection lawfully and responsibly after the connection ends.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">9. Saved Talent</h2>
              <p className="mt-2">9.1 Employers may be able to save or shortlist Talent through FreeAgentStaff.</p>
              <p className="mt-2">9.2 Saving a Talent does not:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>notify or guarantee contact with the Talent unless the platform expressly states otherwise;</li>
                <li>create a connection;</li>
                <li>create an employment relationship;</li>
                <li>give the Employer additional private information; or</li>
                <li>guarantee that the Talent will remain available or discoverable.</li>
              </ul>
              <p className="mt-2">9.3 Talent profiles and availability may change after an Employer saves them.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">10. Resumes and private information</h2>
              <p className="mt-2">10.1 Talent may choose to upload a resume and other supported professional information or files.</p>
              <p className="mt-2">10.2 A resume is not automatically made available merely because an Employer can discover or view a Talent profile.</p>
              <p className="mt-2">10.3 Where a Talent accepts an introduction and an active connection is created, the Talent&apos;s resume, where uploaded, may become accessible to that connected Employer without a further approval step.</p>
              <p className="mt-2">10.4 Employers may only use information obtained through a connection for genuine recruitment, hiring, employment or related professional purposes.</p>
              <p className="mt-2">10.5 Employers must not sell, publish, misuse or disclose Talent information for unrelated purposes.</p>
              <p className="mt-2">10.6 If an Employer lawfully downloads or separately stores Talent information, that Employer is responsible for its handling of that copy in accordance with applicable privacy, employment and record-keeping laws.</p>
              <p className="mt-2">10.7 Talent should not upload unnecessary sensitive information such as tax file numbers, bank account details, complete identity documents, health records or unrelated personal information through general profile or resume fields.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">11. User content</h2>
              <p className="mt-2">11.1 Users retain ownership of content they submit to FreeAgentStaff, including profile information, photographs, videos, resumes, documents, business information and other material (&quot;User Content&quot;).</p>
              <p className="mt-2">11.2 You grant FreeAgentStaff a worldwide, non-exclusive, royalty-free licence to host, store, reproduce, display, transmit, technically format and otherwise process your User Content to the extent reasonably necessary to:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>operate FreeAgentStaff;</li>
                <li>provide the features you select;</li>
                <li>display your information to audiences permitted by your settings;</li>
                <li>maintain and secure the platform; and</li>
                <li>provide technical and support services.</li>
              </ul>
              <p className="mt-2">11.3 The licence in section 11.2 does not transfer ownership of your User Content to FreeAgentStaff.</p>
              <p className="mt-2">11.4 We will not use a Talent&apos;s identifiable profile, photograph, video or resume in external advertising or public promotional material without separate permission from that Talent.</p>
              <p className="mt-2">11.5 You must ensure your User Content:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>is accurate where presented as factual;</li>
                <li>is not misleading or fraudulent;</li>
                <li>does not infringe another person&apos;s intellectual property, privacy or other rights;</li>
                <li>is not unlawful;</li>
                <li>is not defamatory, abusive or threatening; and</li>
                <li>does not contain malicious code or material intended to compromise the platform.</li>
              </ul>
              <p className="mt-2">11.6 We may remove, restrict or disable User Content where reasonably necessary to enforce these Terms, comply with law, protect users or protect FreeAgentStaff.</p>
              <p className="mt-2">11.7 If you provide feedback, suggestions or ideas about FreeAgentStaff, we may use that feedback to improve the platform without payment or obligation to you.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">12. Subscriptions and fees</h2>
              <p className="mt-2">12.1 FreeAgentStaff may provide free and paid plans for Talent and Employers.</p>
              <p className="mt-2">12.2 Current plan features and prices are displayed on our <Link className="font-semibold text-[#f2cc63] underline underline-offset-4" href="/pricing">Pricing page</Link> or otherwise communicated before purchase.</p>
              <p className="mt-2">12.3 At the date of these Terms, paid services may include Free Agent Pro for Talent and an Employer subscription.</p>
              <p className="mt-2">12.4 Subscription fees are charged in Australian dollars unless otherwise stated.</p>
              <p className="mt-2">12.5 Unless expressly stated otherwise at checkout, displayed Australian prices include GST where GST is applicable.</p>
              <p className="mt-2">12.6 Paid subscriptions automatically renew for successive billing periods unless cancelled before the next renewal date.</p>
              <p className="mt-2">12.7 You may cancel a subscription through the available account or billing controls.</p>
              <p className="mt-2">12.8 Unless otherwise stated, cancellation takes effect at the end of the current paid billing period and you may retain paid access until that time.</p>
              <p className="mt-2">12.9 Fees already paid are generally non-refundable except where required by law or where FreeAgentStaff expressly agrees otherwise.</p>
              <p className="mt-2">12.10 We may offer free plans, promotional periods, discounts or trials. Applicable conditions will be disclosed where relevant.</p>
              <p className="mt-2">12.11 We may change subscription prices or paid-plan features. Where a price change affects an existing recurring subscriber, we will provide reasonable notice before the new price applies to a future renewal.</p>
              <p className="mt-2">12.12 If you do not agree to a notified price change, you may cancel before the new price takes effect.</p>
              <p className="mt-2">12.13 Nothing in this section limits rights that cannot lawfully be excluded under the Australian Consumer Law.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">13. Payment processing</h2>
              <p className="mt-2">13.1 Subscription payments may be processed by third-party providers such as Stripe.</p>
              <p className="mt-2">13.2 Payment providers operate under their own terms and privacy policies.</p>
              <p className="mt-2">13.3 You must provide valid payment information to the relevant payment provider.</p>
              <p className="mt-2">13.4 FreeAgentStaff does not store complete payment card numbers.</p>
              <p className="mt-2">13.5 If a subscription payment fails, the payment provider or FreeAgentStaff may retry the payment and paid features may be restricted or suspended until payment is successfully received.</p>
              <p className="mt-2">13.6 FreeAgentStaff may receive information such as payment status, subscription status, customer identifiers, transaction references and billing information needed to administer your subscription.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">14. Intellectual property</h2>
              <p className="mt-2">14.1 FreeAgentStaff and its licensors own the platform and associated software, design, branding, trade marks, systems, features and content other than User Content.</p>
              <p className="mt-2">14.2 Subject to these Terms, we grant you a limited, non-exclusive, non-transferable and revocable right to access and use FreeAgentStaff for its intended purpose.</p>
              <p className="mt-2">14.3 You must not, except where permitted by law or with our written permission:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>copy or reproduce substantial parts of the platform;</li>
                <li>reverse engineer the platform;</li>
                <li>scrape or harvest data;</li>
                <li>use automated systems to extract Talent information;</li>
                <li>resell access to the platform;</li>
                <li>circumvent technical protections;</li>
                <li>interfere with the operation or security of the platform; or</li>
                <li>use our branding in a manner that suggests endorsement or affiliation without permission.</li>
              </ul>
              <p className="mt-2">14.4 We may create and use aggregated or de-identified information derived from platform use for lawful purposes including analytics, security, research and product improvement, provided that information does not identify an individual.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">15. Acceptable use</h2>
              <p className="mt-2">15.1 You must use FreeAgentStaff lawfully and in accordance with its intended professional-discovery purpose.</p>
              <p className="mt-2">15.2 You must not:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>use FreeAgentStaff for unlawful activity;</li>
                <li>provide deliberately false or deceptive information;</li>
                <li>impersonate another person or organisation;</li>
                <li>unlawfully discriminate against or harass another user;</li>
                <li>spam users;</li>
                <li>send unrelated marketing using information obtained through FreeAgentStaff;</li>
                <li>scrape, harvest, collect or misuse Talent information;</li>
                <li>attempt to circumvent subscriptions, fees, access controls or privacy controls;</li>
                <li>attempt to gain unauthorised access to accounts or systems;</li>
                <li>introduce malicious software;</li>
                <li>interfere with the operation, security or availability of the platform;</li>
                <li>use FreeAgentStaff to facilitate fraud or other harmful conduct; or</li>
                <li>use information obtained through FreeAgentStaff for purposes materially unrelated to professional discovery, recruitment or employment.</li>
              </ul>
              <p className="mt-2">15.3 Employers must respect the visibility, introduction and connection controls provided to Talent.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">16. Privacy</h2>
              <p className="mt-2">16.1 Our <Link className="font-semibold text-[#f2cc63] underline underline-offset-4" href="/privacy">Privacy Policy</Link> explains how FreeAgentStaff collects, uses, discloses and protects personal information.</p>
              <p className="mt-2">16.2 By using FreeAgentStaff, you acknowledge that personal information will be handled in accordance with our <Link className="font-semibold text-[#f2cc63] underline underline-offset-4" href="/privacy">Privacy Policy</Link>.</p>
              <p className="mt-2">16.3 Employers must comply with applicable privacy laws when accessing, downloading, storing or otherwise handling Talent information obtained through FreeAgentStaff.</p>
              <p className="mt-2">16.4 Employers must not use connection-gated or confidential Talent information for an unrelated purpose.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">17. Moderation and enforcement</h2>
              <p className="mt-2">17.1 We may review, restrict or remove content and may warn, restrict, suspend or terminate accounts where we reasonably believe:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>these Terms have been breached;</li>
                <li>an account presents a security risk;</li>
                <li>a user is misusing Talent information;</li>
                <li>fraudulent or deceptive conduct may be occurring;</li>
                <li>a legal or safety risk exists;</li>
                <li>continued access may harm another user or FreeAgentStaff; or</li>
                <li>action is required by law.</li>
              </ul>
              <p className="mt-2">17.2 We are not required to monitor every user or every activity occurring through the platform.</p>
              <p className="mt-2">17.3 Where reasonably practicable and appropriate, we may provide notice or an opportunity to respond before or after enforcement action.</p>
              <p className="mt-2">17.4 We may act immediately where reasonably necessary to protect users, information, the platform or third parties.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">18. Third-party services</h2>
              <p className="mt-2">18.1 FreeAgentStaff relies on third-party services and technology providers to operate parts of the platform.</p>
              <p className="mt-2">18.2 These may include services relating to:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>hosting;</li>
                <li>databases;</li>
                <li>file storage;</li>
                <li>video delivery;</li>
                <li>payments;</li>
                <li>email delivery;</li>
                <li>analytics;</li>
                <li>security; and</li>
                <li>other technical infrastructure.</li>
              </ul>
              <p className="mt-2">18.3 Third-party services may operate under their own terms and privacy policies.</p>
              <p className="mt-2">18.4 FreeAgentStaff is not responsible for the availability, security, content or operation of an independent third-party service to the extent permitted by law.</p>
              <p className="mt-2">18.5 Links to third-party websites do not necessarily constitute endorsement of those websites or their products or services.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">19. Platform availability and changes</h2>
              <p className="mt-2">19.1 We aim to provide a reliable platform but do not guarantee that FreeAgentStaff will always be uninterrupted, error-free or available.</p>
              <p className="mt-2">19.2 Maintenance, technical problems, security incidents, provider outages or other circumstances may temporarily affect availability.</p>
              <p className="mt-2">19.3 We may modify, add, remove or replace features as FreeAgentStaff develops.</p>
              <p className="mt-2">19.4 We may change the features included in free plans.</p>
              <p className="mt-2">19.5 If we materially reduce the core functionality of a paid subscription during a period for which you have already paid, your rights under applicable consumer law are not affected.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">20. Employment relationships</h2>
              <p className="mt-2">20.1 FreeAgentStaff facilitates professional discovery and connections but is not a party to an employment or engagement relationship formed between Talent and Employers.</p>
              <p className="mt-2">20.2 Employers are solely responsible for their hiring decisions and for complying with applicable laws relating to employment, workplace relations, discrimination, wages, superannuation, tax, work health and safety and other workplace obligations.</p>
              <p className="mt-2">20.3 Talent are responsible for assessing prospective Employers and employment opportunities and for information they provide concerning their experience, qualifications and work eligibility.</p>
              <p className="mt-2">20.4 FreeAgentStaff does not determine:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>whether a Talent should be hired;</li>
                <li>employment terms;</li>
                <li>salary or remuneration;</li>
                <li>hours;</li>
                <li>workplace conditions; or</li>
                <li>termination of employment.</li>
              </ul>
              <p className="mt-2">20.5 Any offer, contract or employment arrangement is between the relevant Talent and Employer.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">21. Disclaimers</h2>
              <p className="mt-2">21.1 To the maximum extent permitted by law, FreeAgentStaff is provided on an &quot;as is&quot; and &quot;as available&quot; basis.</p>
              <p className="mt-2">21.2 We do not guarantee:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>that Talent will be discovered;</li>
                <li>that an Employer will contact a Talent;</li>
                <li>that an introduction will be accepted;</li>
                <li>that a connection will lead to an interview or employment;</li>
                <li>the quality, conduct or legitimacy of any user;</li>
                <li>the accuracy or completeness of user-supplied information;</li>
                <li>uninterrupted platform availability; or</li>
                <li>any particular employment, recruitment or career outcome.</li>
              </ul>
              <p className="mt-2">21.3 Information provided through FreeAgentStaff is not legal, employment, tax or financial advice.</p>
              <p className="mt-2">21.4 Nothing in these Terms excludes, restricts or modifies rights or remedies that cannot lawfully be excluded, restricted or modified.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">22. Australian Consumer Law</h2>
              <p className="mt-2">22.1 Our services may come with consumer guarantees that cannot be excluded under the Australian Consumer Law.</p>
              <p className="mt-2">22.2 Nothing in these Terms excludes, restricts or modifies any guarantee, right or remedy that cannot lawfully be excluded, restricted or modified.</p>
              <p className="mt-2">22.3 Where permitted by law, our liability for failure to comply with an applicable consumer guarantee in relation to services may be limited, at our option, to:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>supplying the services again; or</li>
                <li>paying the cost of having the services supplied again.</li>
              </ul>
              <p className="mt-2">22.4 This limitation does not apply where it would be unlawful to limit liability in this way.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">23. Liability</h2>
              <p className="mt-2">23.1 To the maximum extent permitted by law, FreeAgentStaff is not liable for loss arising from:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>the acts or omissions of another user;</li>
                <li>an Employer&apos;s hiring decision;</li>
                <li>a Talent&apos;s decision to accept or decline an introduction;</li>
                <li>an employment or engagement arrangement between users;</li>
                <li>user-supplied content or information;</li>
                <li>misuse of information by another user;</li>
                <li>independent third-party services; or</li>
                <li>circumstances outside our reasonable control,</li>
              </ul>
              <p className="mt-2">except to the extent liability cannot lawfully be excluded.</p>
              <p className="mt-2">23.2 To the maximum extent permitted by law, FreeAgentStaff is not liable for indirect or consequential loss, loss of profit, revenue, goodwill, opportunity or data arising from use of the platform.</p>
              <p className="mt-2">23.3 To the extent permitted by law, FreeAgentStaff&apos;s aggregate liability arising out of or relating to the platform or these Terms is limited to the greater of:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>the fees paid by you to FreeAgentStaff during the three months immediately preceding the event giving rise to the claim; and</li>
                <li>AUD $200.</li>
              </ul>
              <p className="mt-2">23.4 Sections 23.1&ndash;23.3 do not exclude or limit liability where doing so would be prohibited by law.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">24. Indemnity</h2>
              <p className="mt-2">24.1 To the maximum extent permitted by law, you indemnify FreeAgentStaff against claims, losses, liabilities, damages and reasonable costs arising from:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>your material breach of these Terms;</li>
                <li>your unlawful use of FreeAgentStaff;</li>
                <li>your User Content;</li>
                <li>your infringement of another person&apos;s rights; or</li>
                <li>your unlawful handling or misuse of information obtained through FreeAgentStaff.</li>
              </ul>
              <p className="mt-2">24.2 For Employers, this includes claims arising from the Employer&apos;s handling of Talent information after it has been lawfully accessed or downloaded.</p>
              <p className="mt-2">24.3 This indemnity does not apply to the extent a claim, loss or liability was caused by FreeAgentStaff&apos;s own unlawful conduct, negligence or breach of these Terms.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">25. Termination and account closure</h2>
              <p className="mt-2">25.1 You may stop using FreeAgentStaff and may close your account using available account controls or by contacting us.</p>
              <p className="mt-2">25.2 Cancellation of a paid subscription is governed by section 12.</p>
              <p className="mt-2">25.3 We may suspend, restrict or terminate access where:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>you materially breach these Terms;</li>
                <li>we reasonably believe an account presents a legal, security, fraud or safety risk;</li>
                <li>an Employer misuses Talent information;</li>
                <li>continued access may harm users or the platform; or</li>
                <li>we are required to do so by law.</li>
              </ul>
              <p className="mt-2">25.4 Where reasonably practicable, we will provide notice of suspension or termination.</p>
              <p className="mt-2">25.5 Following termination or account closure, personal information will be handled in accordance with our <Link className="font-semibold text-[#f2cc63] underline underline-offset-4" href="/privacy">Privacy Policy</Link>.</p>
              <p className="mt-2">25.6 Employers remain responsible for information they lawfully downloaded or separately retained before access ended and must handle that information in accordance with applicable law.</p>
              <p className="mt-2">25.7 Provisions that by their nature are intended to continue after termination, including provisions concerning intellectual property, privacy obligations, liability, indemnities and governing law, continue to apply.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">26. Changes to these Terms</h2>
              <p className="mt-2">26.1 We may update these Terms to reflect changes to FreeAgentStaff, our business, technology, applicable laws or other operational requirements.</p>
              <p className="mt-2">26.2 The current version will display its last updated date.</p>
              <p className="mt-2">26.3 If a change materially affects users, we may provide reasonable notice through FreeAgentStaff, by email or by another appropriate method.</p>
              <p className="mt-2">26.4 Where a change materially affects an existing paid subscription, we will provide any notice required by applicable law.</p>
              <p className="mt-2">26.5 If you do not agree to updated Terms, you may stop using FreeAgentStaff and cancel an applicable subscription before a change takes effect.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">27. Disputes</h2>
              <p className="mt-2">27.1 If you have a dispute or complaint relating to FreeAgentStaff, please contact us first at <a className="font-semibold text-[#f2cc63] underline underline-offset-4" href="mailto:support@freeagentstaff.com">support@freeagentstaff.com</a>.</p>
              <p className="mt-2">27.2 We will attempt in good faith to resolve the issue directly with you.</p>
              <p className="mt-2">27.3 Nothing in this section prevents either party from:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>seeking urgent interlocutory or injunctive relief;</li>
                <li>exercising rights under the Australian Consumer Law;</li>
                <li>making a complaint to an applicable regulator; or</li>
                <li>bringing a claim in a court or tribunal with jurisdiction.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">28. Governing law</h2>
              <p className="mt-2">28.1 These Terms are governed by the laws of New South Wales, Australia.</p>
              <p className="mt-2">28.2 Subject to any rights you have under applicable consumer law, the courts and tribunals of New South Wales have non-exclusive jurisdiction in relation to disputes arising from these Terms or FreeAgentStaff.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">29. General</h2>
              <p className="mt-2">29.1 These Terms, together with our Privacy Policy and any separate written agreement expressly entered into between you and FreeAgentStaff, form the agreement between you and FreeAgentStaff concerning use of the platform.</p>
              <p className="mt-2">29.2 We may assign or transfer our rights or obligations under these Terms as part of a restructure, financing, sale, merger or transfer of the FreeAgentStaff business.</p>
              <p className="mt-2">29.3 You may not assign your rights under these Terms without our written consent.</p>
              <p className="mt-2">29.4 If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions continue in effect.</p>
              <p className="mt-2">29.5 A failure or delay in enforcing a right under these Terms does not waive that right.</p>
              <p className="mt-2">29.6 We may provide notices through FreeAgentStaff or to the email address associated with your account.</p>
              <p className="mt-2">29.7 Headings are for convenience and do not affect interpretation.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#f7ebcf]">30. Contact</h2>
              <p className="mt-3 font-semibold text-[#f7ebcf]">Freeagentstaff</p>
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