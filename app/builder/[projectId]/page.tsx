import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import BuilderClient from "../../components/builder/BuilderClient";
import AppHeader from "@/app/components/home/AppHeader";
import { Session } from "puppeteer-core";
import { SessionProvider } from "next-auth/react";

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/builder/${projectId}`)}`);

  return (
    <SessionProvider session={session}>
      <BuilderClient projectId={projectId} />
    </SessionProvider>
  );
}