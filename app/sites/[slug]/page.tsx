import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export default function PublishedSitePage({ params }: PageProps<"/sites/[slug]">) {
  return (
    <Suspense fallback={<main className="fixed inset-0 bg-white" />}>
      <PublishedSite params={params} />
    </Suspense>
  );
}

async function PublishedSite({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const { data, error } = await getSupabaseAdmin()
    .from("projects")
    .select("name, html")
    .eq("published_slug", slug)
    .maybeSingle();

  if (error || !data?.html) notFound();

  return (
    <main className="fixed inset-0 bg-white">
      <iframe
        title={data.name}
        srcDoc={data.html}
        sandbox="allow-scripts allow-forms allow-popups"
        className="h-full w-full border-0"
      />
    </main>
  );
}