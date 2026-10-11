import AppHeader from "./components/AppHeader";
import Services from "./components/home/Services";
import { SessionProvider } from "next-auth/react";
import PromptTextArea from "./components/PromptTextArea";
import { ArrowUpRight, Check } from "lucide-react";
import Templates from "./components/home/Templates";
import Footer from "./components/home/Footer";
import FAQ from "./components/home/FAQ";
import { getSupabaseAdmin } from "@/lib/db";
import { Suspense } from "react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0b0d10]">
      <SessionProvider>
        <AppHeader />
        <main className="w-full flex flex-col items-center align-middle gap-20 px-6 py-40">
          <section>
            <div className='flex-1 w-full'>
              <div className='mb-10 flex flex-col items-center text-center'>
                <h1 className='max-w-4xl text-4xl font-semibold leading-[0.98] bg-linear-to-r from-[#8e9eab] to-[#eef2f3] bg-clip-text text-transparent tracking-[-0.04em] sm:text-8xl'>
                  Tell us what to build.
                </h1>
                <span className='block max-w-4xl text-4xl font-semibold leading-[0.98] text-white/35 sm:text-8xl'>We&apos;ll make it real.</span>
                <p className='mt-6 max-w-xl text-base leading-7 text-white/55 sm:text-lg'>Describe your website, a feeling, or a business. LUNIO Builder turns your words into an editable website you can shape in the visual editor.</p>
              </div>
              <PromptTextArea />
              <div className="text-white/50 mt-6 flex flex-row items-center gap-2 text-sm sm:flex-row sm:gap-6">
                <span className="flex items-center gap-2"><Check size={14} /> No code required</span>
                <span className="flex items-center gap-2"><Check size={14} /> Make it yours as you go</span>
              </div>
            </div>
          </section>

          <section className="text-white/50 flex flex-row gap-3 items-center text-xs" aria-label="How it works">
            <span className="bottom-line-label">FROM FIRST THOUGHT TO FIRST DRAFT</span>
            <div><span>01</span> Describe your idea</div>
            <span className="text-white/50">→</span>
            <div><span>02</span> See it come together</div>
            <span className="text-white/50">→</span>
            <div><span>03</span> Refine it with LUNIO</div>
          </section>
        </main>
        <Services />
        <Suspense fallback={<TemplatesFallback />}>
          <RecentProjects />
        </Suspense>
        <FAQ />
        <Footer />
      </SessionProvider>
    </div>
  );
}

async function RecentProjects() {
  const { data: projects } = await getSupabaseAdmin()
    .from("projects")
    .select("id, name, published_slug, html, created_date")
    .not("published_slug", "is", null)
    .order("created_date", { ascending: false })
    .limit(4);

  return (
    <Templates projects={projects ?? []} />
  );
}

function TemplatesFallback() {
  return (
    <section className='w-full border-t border-black/10 bg-[#f6f6f4] px-5 py-20 text-[#171a16] sm:px-8 sm:py-28' aria-label='Loading recent projects'>
      <div className='mx-auto max-w-6xl'>
        <p className='text-sm text-[#555b53]'>Loading recent projects...</p>
      </div>
    </section>
  );
}
