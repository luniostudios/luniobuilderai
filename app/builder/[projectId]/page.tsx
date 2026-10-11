import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import BuilderClient from "../../components/BuilderClient";

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/builder/${projectId}`)}`);

  return <BuilderClient projectId={projectId} />;
}