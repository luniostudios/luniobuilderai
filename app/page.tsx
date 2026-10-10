import AppHeader from "./components/AppHeader";
import { SessionProvider } from "next-auth/react";
import PromptTextArea from "./components/PromptTextArea";
import { ArrowUpRight, Check } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen ">
      <SessionProvider>
        <AppHeader />
        <main className="w-full flex flex-col items-center align-middle gap-20 px-6 py-14">
          <section>
            <div className='flex flex-col max-w-7xl justify-center mx-auto items-center gap-10 sm:flex-row sm:gap-20'>
              <div className='flex-1 w-full'>
                <div className='mb-10 flex flex-col'>
                  <h1 className='w-full text-6xl font-bold'>
                    Tell us what to build. Well make it real.
                  </h1>
                  <p className='mt-6 max-w-xl text-base leading-7 text-black/55 sm:text-lg'>Describe your website, a feeling, or a business. LUNIO Builder turns your words into an editable website you can shape in the visual editor.</p>
                </div>
                <PromptTextArea />
                <div className="home-trust-row">
                  <span><Check size={14} /> No code required</span>
                  <span><Check size={14} /> Make it yours as you go</span>
                </div>
              </div>
              <div className='flex-1 w-full'>
                <img src="./hero.png" height="400" width="full" alt="" />
              </div>
            </div>
          </section>

          <section className="home-bottom-line" aria-label="How it works">
            <span className="bottom-line-label">FROM FIRST THOUGHT TO FIRST DRAFT</span>
            <div><span>01</span> Describe your idea</div>
            <span className="bottom-line-rule" />
            <div><span>02</span> See it come together</div>
            <span className="bottom-line-rule" />
            <div><span>03</span> Refine it with LUNIO</div>
          </section>
        </main>
      </SessionProvider>
    </div>
  );
}
