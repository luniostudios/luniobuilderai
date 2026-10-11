import Link from 'next/link';
import type { Database } from '@/lib/database.types';

type Project = Pick<Database['public']['Tables']['projects']['Row'], 'id' | 'name' | 'published_slug' | 'html' | 'created_date'>;

const Templates = ({ projects }: { projects: Project[] }) => {
  return (
    <>
      <section id='examples' aria-labelledby='templates-title' className='w-full border-t border-black/10 bg-[#f6f6f4] px-5 py-20 text-[#171a16] sm:px-8 sm:py-28'>
        <div className='mx-auto max-w-6xl'>
          <div className='max-w-3xl'>
            <h2 id='templates-title' className='mt-4 text-3xl font-semibold leading-tight sm:text-5xl'>
              Examples of websites built with LUNIO Builder
            </h2>
            <p className='mt-5 text-base leading-7 text-[#555b53] sm:text-lg'>
              Explore the latest websites created with LUNIO Builder.
            </p>
          </div>

          <div className='mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4'>
            {projects.filter((project) => project.published_slug).map((project) => (
              <article key={project.id} className='group overflow-hidden rounded-xs border border-black/10 bg-white shadow-[0_18px_40px_rgba(18,22,17,0.04)] transition-transform duration-200 hover:-translate-y-1'>
                <div className="relative h-40">
                  {project.html ? (
                    <iframe
                      srcDoc={project.html}
                      sandbox="allow-scripts allow-forms allow-popups"
                      scrolling="no"
                      className="pointer-events-none absolute inset-0 h-full w-full"
                      title={`${project.name} preview`}
                      tabIndex={-1}
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center font-display text-5xl text-brand/60">L</span>
                  )}
                </div>

                <div className='p-5'>
                  <div className='flex items-center justify-between gap-3'>
                    <h3 className='text-lg font-semibold text-[#171a16]'>{project.name}</h3>
                    <span className='rounded-full border border-[#557b1c]/20 bg-[#557b1c]/5 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#36520d]'>Live</span>
                  </div>
                  <p className='mt-3 text-sm leading-6 text-[#555b53]'>Created {new Date(project.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <Link href={`/sites/${project.published_slug}`} className='block border-t border-black/10 px-5 py-3 text-sm font-medium text-[#557b1c] transition-colors hover:text-[#36520d]'>View project <span aria-hidden='true'>→</span></Link>
              </article>
            ))}
            {projects.length === 0 && <p className='text-sm text-[#555b53]'>No published projects yet.</p>}
          </div>
        </div>
      </section>
    </>
  )
}

export default Templates