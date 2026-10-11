import AppHeader from '../components/AppHeader'
import { auth } from "../../lib/auth"
import Footer from '../components/home/Footer'
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Pricing from './Pricing';
import { SessionProvider } from 'next-auth/react';

export const metadata: Metadata = {
    title: "LUNIO Builder - Pricing",
    description: "View our pricing plans and choose the perfect option for your needs.",
    robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
};

const page = () => {
    return (
        <SessionProvider>
            <div>
                <AppHeader />
                <Suspense fallback={<Pricing hasSession />}>
                    <PricingWithSession />
                </Suspense>
                <Footer />
            </div>
        </SessionProvider>
    )
}

async function PricingWithSession() {
    const session = await auth();
    return <Pricing hasSession={!session} />
}

export default page