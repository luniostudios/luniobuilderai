import Link from 'next/link';

const templates = [
  {
    name: 'WILDNATURE',
    category: 'Digital Magazine',
    summary: 'Editorial layout for a digital magazine, with featured articles, categories, and subscription options.',
    accent: 'from-[#dfe7d8] via-[#f8f3ea] to-[#d7e9e7]',
    preview: [
      'bg-[#1f2a27]',
      'bg-[#f4efe7]',
      'bg-[#d2e6d5]',
      'bg-[#f5f5f0]',
    ],
    href: 'https://nature.luniobuilder.com/',
  },
];

const Templates = () => {
  return (
    <>
    <section id='templates' aria-labelledby='templates-title' className='w-full border-t border-black/10 bg-[#f6f6f4] px-5 py-20 text-[#171a16] sm:px-8 sm:py-28'>
        <div className='mx-auto max-w-6xl'>
          <div className='max-w-3xl'>
            <h2 id='templates-title' className='mt-4 text-3xl font-semibold leading-tight sm:text-5xl'>
              Beautiful templates to get you started.
            </h2>
            <p className='mt-5 text-base leading-7 text-[#555b53] sm:text-lg'>
              These are just a few examples of the types of pages you can build with LUNIO Builder. You can also create custom pages and layouts to fit your specific needs.
            </p>
          </div>

          <div className='mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4'>
            {templates.map(({ name, category, summary, accent, preview, href }) => (
              <article key={name} className='group overflow-hidden rounded-xs border border-black/10 bg-white shadow-[0_18px_40px_rgba(18,22,17,0.04)] transition-transform duration-200 hover:-translate-y-1'>
                <div className={`h-44 bg-linear-to-br ${accent} p-3`}>
                  <div className='flex h-full flex-col overflow-hidden rounded-xl border border-black/5 bg-white/40 backdrop-blur-sm'>
                    <div className='flex items-center justify-between border-b border-black/5 px-3 py-2'>
                      <div className='flex gap-1.5'>
                        <span className='h-2.5 w-2.5 rounded-full bg-[#ff6f61]' />
                        <span className='h-2.5 w-2.5 rounded-full bg-[#f6c453]' />
                        <span className='h-2.5 w-2.5 rounded-full bg-[#72c677]' />
                      </div>
                      <span className='rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.15em] text-[#2f332f]'>{category}</span>
                    </div>

                    <div className='flex flex-1 gap-2 p-3'>
                      <div className='w-2/5 rounded-lg border border-black/5 bg-white/60 p-2'>
                        <div className={`mb-2 h-5 rounded ${preview[1]} opacity-90`} />
                        <div className={`mb-1.5 h-2 rounded ${preview[0]} opacity-90`} />
                        <div className={`mb-1.5 h-2 w-3/4 rounded ${preview[2]} opacity-80`} />
                        <div className={`h-8 rounded ${preview[3]} opacity-80`} />
                      </div>
                      <div className='flex flex-1 flex-col gap-2'>
                        <div className={`h-8 rounded-lg ${preview[0]} opacity-90`} />
                        <div className={`h-16 rounded-lg ${preview[2]} opacity-75`} />
                        <div className={`h-14 rounded-lg ${preview[3]} opacity-80`} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className='p-5'>
                  <div className='flex items-center justify-between gap-3'>
                    <h3 className='text-lg font-semibold text-[#171a16]'>{name}</h3>
                    <span className='rounded-full border border-[#557b1c]/20 bg-[#557b1c]/5 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#36520d]'>Live</span>
                  </div>
                  <p className='mt-3 text-sm leading-6 text-[#555b53]'>{summary}</p>
                </div>
                <Link href={href} target='_blank' rel='noopener noreferrer' className='block border-t border-black/10 px-5 py-3 text-sm font-medium text-[#557b1c] transition-colors hover:text-[#36520d]'>View templates <span aria-hidden='true'>→</span></Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export default Templates