'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppSidebar } from './app-sidebar'
import { ChatFAB, ChatDrawer } from '@/components/features/chat'
import { UserProvider, UserInfo } from './user-context'

interface DashboardShellProps {
    children: React.ReactNode
    user: UserInfo
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
        <UserProvider user={user}>
            <div className="flex h-screen bg-[#f6f7f8] dark:bg-[#101a22]">
                <AppSidebar user={user} onLogout={handleLogout} />
                <div className="flex-1 overflow-y-auto">{children}</div>
                <ChatFAB />
                <ChatDrawer />
            </div>
        </UserProvider>
    )
}

