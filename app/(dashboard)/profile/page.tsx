import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { ProfileSettingsClient } from '@/components/features/profile/profile-settings-client'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch user profile
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
