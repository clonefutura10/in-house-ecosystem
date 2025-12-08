import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { SettingsPageClient } from '@/components/features/settings/settings-page-client'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return null
    }

    // Check if user is admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    // Only admins can access settings
    if (profile?.role !== 'admin') {
        redirect('/dashboard')
    }

    // Fetch automation configs with their templates
    const { data: automationConfigs } = await supabase
        .from('automation_configs')
        .select(`
            *,
            template:reminder_templates(*)
        `)
        .order('name')

    // Fetch all templates
    const { data: templates } = await supabase
        .from('reminder_templates')
        .select('*')
        .order('name')

    return (
        <PageContainer>
            <SettingsPageClient
                automationConfigs={automationConfigs || []}
                templates={templates || []}
            />
        </PageContainer>
    )
}
