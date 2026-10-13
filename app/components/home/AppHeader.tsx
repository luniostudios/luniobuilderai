import Link from 'next/link'
import { auth } from '@/lib/auth'
import { Suspense } from 'react'
import type { Session } from 'next-auth'
import UserAvatar from '../../login/UserAvatar'
import { LayoutDashboard, Menu, Rocket, Settings, User } from 'lucide-react'
import {
    Popover,
    PopoverContent,
    PopoverHeader,
    PopoverTrigger,
} from "@/components/ui/popover"
import { SignOut } from '../../login/SignOutButton'

type AppHeaderProps = {
    user?: Session['user'] | null
}

const Header = ({ user }: AppHeaderProps = {}) => {
    return (
        <div className='bg-[#0b0d10] w-full mt-0 flex flex-row fixed z-100 justify-between align-middle items-center gap-2 py-4 px-[10%] max-lg:px-5'>
            <div className='flex'>
                <Link href={"/"}>
                    <div className="flex items-center text-white gap-2 cursor-pointer font-bold uppercase text-lg">
                        <div className='flex flex-row text-2xl align-middle items-center'>
                            <h1>LUNI</h1>
                            <Rocket width={20} className="text-bold text-[#b8f36b]" />
                        </div>
                        <h1 className='flex flex-row text-2xl align-middle items-center'>BUILDER</h1>
                    </div>
                </Link>
            </div>

            <div className='flex items-center gap-6 justify-center max-md:hidden'>
                <nav>
                    <ul className='flex gap-6 items-center justify-center'>
                        <NavigationLinks />
                        <Suspense fallback={<li aria-hidden className="h-8 w-20" />}>
                            <DesktopAccountControl user={user} />
                        </Suspense>
                    </ul>
                </nav>
            </div>
            <div className='text-white md:hidden gap-2 z-10' >
                <Popover>
                    <PopoverTrigger className='outline-none'>
                        <Menu size={20} />
                    </PopoverTrigger>
                    <PopoverContent className="bg-[#0b0d10] text-white border border-white/20 mr-6 mt-8">
                        <Suspense fallback={<MobileMenuFallback />}>
                            <MobileMenu user={user} />
                        </Suspense>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    )
}

function NavigationLinks() {
    return (
        <>
            <li><Link href="/#faq" className='text-gray-400 hover:text-gray-300 transition-colors'>FAQ</Link></li>
            <li><Link href="/pricing" className='text-gray-400 hover:text-gray-300 transition-colors'>Pricing</Link></li>
            <li><Link href="/#examples" className='text-gray-400 hover:text-gray-300 transition-colors'>Examples</Link></li>
            <li><Link href="/#services" className='text-gray-400 hover:text-gray-300 transition-colors'>Services</Link></li>
            <li><Link href="/documentation" className='text-gray-400 hover:text-gray-300 transition-colors'>Documentation</Link></li>
        </>
    )
}

async function DesktopAccountControl({ user }: AppHeaderProps) {
    const session = user ? { user } : await auth()

    if (!session?.user) {
        return (
            <li>
                <Link href="/login" className="flex flex-row text-white border justify-center border-white/20 rounded-sm px-3 py-1 items-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <User size={16} />
                    Sign In
                </Link>
            </li>
        )
    }

    return <UserAvatar user={session.user} />
}

async function MobileMenu({ user }: AppHeaderProps) {
    const session = user ? { user } : await auth()

    return (
        <PopoverHeader className="ml-4">
            <div>
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-xs text-gray-400 underline">{session?.user?.email}</p>
            </div>
            <ul className='flex flex-col gap-4 mt-4'>
                <NavigationLinks />
                {!session && (
                    <li><Link href="/login" className="flex flex-row text-white mt-2 border justify-center border-white/20 px-3 py-3 gap-2 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><User size={16} /> Sign In</Link></li>
                )}
                {session && (
                    <div className='flex flex-col gap-4'>
                        <Link href="/dashboard?tab=projects" className="flex felx-row mt-3 text-gray-400 hover:text-gray-300 transition-colors">
                            <LayoutDashboard size={16} className="inline-block mr-2" />
                            My Projects
                        </Link>
                        <Link href="/dashboard?tab=settings" className="mt-3 text-gray-400 hover:text-gray-300 transition-colors">
                            <Settings size={16} className="inline-block mr-2" />
                            Account Settings
                        </Link>
                        <hr className="border-white/20 my-2" />
                        <SignOut />
                    </div>
                )}
            </ul>
        </PopoverHeader>
    )
}

function MobileMenuFallback() {
    return (
        <PopoverHeader className="ml-4">
            <ul className='flex flex-col gap-4 mt-4'>
                <NavigationLinks />
            </ul>
        </PopoverHeader>
    )
}

export default Header