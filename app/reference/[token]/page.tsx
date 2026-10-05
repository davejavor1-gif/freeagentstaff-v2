import type { Metadata } from "next";
import type { ReactNode } from "react";
import Footer from "@/components/layout/Footer";
import ReferenceInvitationForm from "@/components/ReferenceInvitationForm";
import { lookupPublicTalentReferenceInvitation } from "@/lib/talent-reference-public";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Professional reference",
  description: "Provide a professional reference through FreeAgentStaff.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  referrer: "no-referrer",
};

function InvitationMessage({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-3 text-center">
      <h1 className="font-serif text-3xl font-bold text-[#08111F]">Reference invitation</h1>
      <p className="text-sm leading-6 text-[#27405f]">{children}</p>
    </div>
  );
}

export default async function ReferenceInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await lookupPublicTalentReferenceInvitation(token);

  let body: ReactNode;
  if (invitation.state === "valid" && invitation.talentDisplayName && invitation.talentFirstName) {
    body = (
      <ReferenceInvitationForm
        talentDisplayName={invitation.talentDisplayName}
        talentFirstName={invitation.talentFirstName}
      />
    );
  } else if (invitation.state === "expired") {
    const talentFirstName = invitation.talentFirstName;
    body = (
      <InvitationMessage>
        {talentFirstName
          ? `This reference invitation has expired. Please ask ${talentFirstName} to send a new invitation.`
          : "This reference invitation has expired. Please ask the Talent to send a new invitation."}
      </InvitationMessage>
    );
  } else {
    body = <InvitationMessage>This reference invitation is invalid or no longer available.</InvitationMessage>;
  }

  return (
    <>
      <main className="flex-1 min-h-screen bg-[#08111F] px-4 py-10 text-[#071426] sm:px-6">
        <div className="mx-auto w-full max-w-xl rounded-[28px] border border-[#cda64d]/45 bg-[#fffaf0] p-5 shadow-[0_18px_45px_rgba(6,16,33,0.1)] sm:p-8">
          {body}
        </div>
      </main>
      <Footer />
    </>
  );
}
