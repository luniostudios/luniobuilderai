import { IconAi, IconTextResize, IconDatabase, IconGraph } from '@tabler/icons-react';
import Link from 'next/link'
import React from 'react'

const services = [
    {
        number: '01',
        title: 'Generate first draft with AI',
        description: 'Generate a first draft of your website with AI, using a prompt and optional reference images. Then, refine the design and content to your liking.',
        icon: IconAi,
    },
    {
        number: '02',
        title: 'Edit and style your site',
        description: 'Use the visual editor to edit and style your site, with a wide range of design options and components to choose from.',
        icon: IconTextResize,
    },
    {
        number: '03',
        title: 'CMS and e-commerce',
        description: 'Add a CMS and e-commerce functionality to your site, with support for custom content types, products, and payment gateways.',
        icon: IconDatabase,
    },
    {
        number: '04',
        title: 'Publish and analyze',
        description: 'Publish your site to a custom domain and analyze its performance with built-in analytics and SEO tools.',
        icon: IconGraph,
    },
];

const Services = () => {
    return (
        <>
            <section id='services' aria-labelledby='services-title' className='w-full border-t border-black/10 bg-linear-to-r from-[#ECE9E6] to-[#ffffff] px-5 py-20 text-[#171a16] sm:px-8 sm:py-28'>
                <div className='mx-auto max-w-6xl'>
                    <div className='max-w-2xl'>
                        <h2 id='services-title' className='mt-4 text-3xl font-semibold leading-tight text-[#171a16] sm:text-5xl'>
                            From first idea to a live website.
                        </h2>
                        <p className='mt-5 max-w-xl text-base leading-7 text-[#555b53] sm:text-lg'>
                            One workspace to create, shape, manage, and publish your website, without losing control of the details.
                        </p>
                    </div>

                    <div className='mt-14 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-4'>
                        {services.map(({ number, title, description, icon: Icon }, index) => (
                            <article key={number} className={`border-t border-black/10 py-6 ${index > 0 ? 'lg:border-l lg:pl-7' : ''}`}>
                                <div className='flex items-center justify-between'>
                                    <span className='text-xs font-medium tabular-nums text-[#777d74]'>{number}</span>
                                    <Icon aria-hidden='true' size={30} strokeWidth={1.7} className='text-[#557b1c]' />
                                </div>
                                <h3 className='mt-8 text-lg font-semibold text-[#171a16]'>{title}</h3>
                                <p className='mt-3 text-sm leading-6 text-[#555b53]'>{description}</p>
                            </article>
                        ))}
                    </div>

                    <div className='mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-black/10 pt-6'>
                        <Link href='/pricing' className='text-sm font-semibold text-[#557b1c] transition-colors hover:text-[#36520d]'>Explore plans <span aria-hidden='true'>→</span></Link>
                        <Link href='/documentation' className='text-sm font-medium text-[#555b53] transition-colors hover:text-[#171a16]'>Read the documentation</Link>
                    </div>
                </div>
            </section>
        </>
    )
}

export default Services