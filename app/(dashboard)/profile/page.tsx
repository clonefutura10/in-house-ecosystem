import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { ProfileSettingsClient } from '@/components/features/profile/profile-settings-client'
import { getAuthenticatedUser } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
    const supabase = await createClient()

    // Use cached auth - deduplicated with layout
    const user = await getAuthenticatedUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch full profile (cached auth only has basic fields)
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile) {
        redirect('/login')
    }

    return (
        <PageContainer>
            <ProfileSettingsClient profile={profile} />
        </PageContainer>
    )
}

