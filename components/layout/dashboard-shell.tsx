'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppSidebar } from './app-sidebar'

interface DashboardShellProps {
    children: React.ReactNode
    user: {
        id: string
        full_name: string
        email: string
        avatar_url?: string | null
        role: 'admin' | 'employee'
    }
}

export function DashboardShell({ children, user }: DashboardShellProps) {
    const router = useRouter()

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="flex h-screen bg-[#f6f7f8] dark:bg-[#101a22]">
            <AppSidebar user={user} onLogout={handleLogout} />
            <div className="flex-1 overflow-hidden">{children}</div>
        </div>
    )
}
