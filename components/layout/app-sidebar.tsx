'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Home,
    CheckCircle,
    Users,
    BarChart3,
    Settings,
    LogOut,
    FileText,
    Bell,
    Briefcase,
    type LucideIcon,
} from 'lucide-react'

interface NavItem {
    title: string
    href: string
    icon: LucideIcon
    adminOnly?: boolean
}

function getNavItems(isAdmin: boolean): NavItem[] {
    return [
        { title: 'Dashboard', href: '/dashboard', icon: Home },
        { title: isAdmin ? 'Tasks' : 'My Tasks', href: '/tasks', icon: CheckCircle },
        { title: 'Team', href: '/team', icon: Users, adminOnly: true },
        { title: isAdmin ? 'Performance' : 'My Performance', href: '/performance', icon: BarChart3 },
        { title: 'ATS Hiring', href: '/ats', icon: Briefcase, adminOnly: true },
        { title: 'Templates', href: '/templates', icon: FileText, adminOnly: true },
        { title: 'Notifications', href: '/notifications', icon: Bell, adminOnly: true },
        { title: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
    ]
}

interface AppSidebarProps {
    user: {
        full_name: string
        email: string
        avatar_url?: string | null
        role: 'admin' | 'employee'
    }
    onLogout: () => void
}

export function AppSidebar({ user, onLogout }: AppSidebarProps) {
    const pathname = usePathname()

    const isAdmin = user.role === 'admin'
    const navItems = getNavItems(isAdmin)

    // Filter nav items based on role
    const visibleNavItems = navItems.filter(
        (item) => !item.adminOnly || isAdmin
    )

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    return (
        <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-screen">
            {/* Logo & Navigation */}
            <div className="flex flex-col gap-4 p-4">
                {/* Logo */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="bg-[#1387ec] size-8 rounded-lg" />
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                        Ecosystem
                    </h1>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-2">
                    {visibleNavItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                                    isActive
                                        ? 'bg-[#1387ec]/20 text-[#1387ec]'
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                )}
                            >
                                <Icon
                                    className={cn(
                                        'h-5 w-5',
                                        isActive
                                            ? 'text-[#1387ec]'
                                            : 'text-slate-600 dark:text-slate-400'
                                    )}
                                />
                                <span className="text-sm font-medium">{item.title}</span>
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* User Profile & Logout */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-col gap-4">
                    {/* User Info - Clickable to profile */}
                    <Link
                        href="/profile"
                        className="flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 -m-2 rounded-lg transition-colors"
                    >
                        <Avatar className="size-10">
                            <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
                            <AvatarFallback className="bg-[#1387ec] text-white font-medium">
                                {getInitials(user.full_name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-slate-900 dark:text-white text-base font-medium leading-normal truncate">
                                {user.full_name}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal truncate">
                                {user.email}
                            </p>
                        </div>
                    </Link>

                    {/* Logout Button */}
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <LogOut className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                            Log Out
                        </span>
                    </button>
                </div>
            </div>
        </aside>
    )
}
