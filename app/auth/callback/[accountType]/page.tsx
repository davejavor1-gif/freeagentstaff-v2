import { redirect } from "next/navigation";

export default async function OAuthRoleCallback({ params }: { params: Promise<{ accountType: string }> }) {
  const { accountType } = await params;

  if (accountType !== "talent" && accountType !== "employer") {
    redirect("/auth/callback?account_type=invalid");
  }

  redirect(`/auth/callback?account_type=${accountType}`);
}
