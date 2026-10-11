import { BarChart, LayoutDashboard, Settings } from "lucide-react"
import type { Session } from "next-auth"
import { SignOut } from "./SignOutButton"
import {
    Popover,
    PopoverContent,
    PopoverHeader,
    PopoverTrigger,
} from "@/components/ui/popover"
import Link from "next/link"
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function UserAvatar({ user }: { user: NonNullable<Session["user"]> }) {
    if (!user.image) return null

    return (
        <div>
            <Popover>
                <PopoverTrigger>
                    <Avatar size="lg" className="cursor-pointer bg-white">
                        <AvatarImage src={user.image} />
                        <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                        <AvatarBadge className="bg-green-600 dark:bg-green-800" />
                    </Avatar>
                </PopoverTrigger>
                <PopoverContent className="bg-[#0b0d10] w-full mt-5 text-white/50 border border-white/20">
                    <PopoverHeader className="ml-2 mr-2 gap-2 flex flex-col">
                        <div className="flex flex-col">
                            <p className="text-white text-sm">{user.name}</p>
                            <p className="text-xs text-gray-400 underline">{user.email}</p>
                        </div>
                        <Link href="/dashboard?tab=projects" className="flex felx-row mt-3 hover:text-white transition-colors">
                            <LayoutDashboard size={16} className="inline-block mr-2" />
                            My Projects
                        </Link>
                        <Link href="" className="mt-3 hover:text-white transition-colors flex flex-row items-center gap-4">
                            <BarChart size={16} className="inline-block mr-2" />
                            Analytics <span className="text-xs text-yellow-400 border border-yellow-400 bg-yellow-200/30 rounded-full px-2 py-0.5">coming soon</span>
                        </Link>
                        <Link href="/dashboard?tab=settings" className="mt-3 hover:text-white transition-colors">
                            <Settings size={16} className="inline-block mr-2" />
                            Account Settings
                        </Link>
                        <hr className="border-white/20 my-2" />
                        <SignOut />
                    </PopoverHeader>
                </PopoverContent>
            </Popover>
        </div>
    )
}