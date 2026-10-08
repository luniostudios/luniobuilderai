import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import BuilderClient from "../../components/BuilderClient";

export default function BuilderPage({ params }: PageProps<"/builder/[projectId]">) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" />}>
      <ProtectedBuilder params={params} />
    </Suspense>
  );
}

async function ProtectedBuilder({ params }: { params: Promise<{ projectId: string }> }) {
  await connection();
  const { projectId } = await params;
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/builder/${projectId}`)}`);

  return <BuilderClient projectId={projectId} />;
}