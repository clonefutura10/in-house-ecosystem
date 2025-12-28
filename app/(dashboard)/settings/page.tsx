import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { SettingsPageClient } from '@/components/features/settings/settings-page-client'
import { getAuthenticatedUser } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const supabase = await createClient()

    // Use cached auth - deduplicated with layout
    const user = await getAuthenticatedUser()

    if (!user) {
        return null
    }

    // Only admins can access settings
    if (user.role !== 'admin') {
        redirect('/dashboard')
    }

    // Fetch all data in parallel for better performance
    const [
        { data: automationConfigs },
        { data: templates },
        { data: employees },
    ] = await Promise.all([
        // Fetch automation configs with their templates
        supabase
            .from('automation_configs')
            .select(`
                id,
                name,
                trigger_cron,
                reminder_type,
                template_id,
                is_active,
                updated_at,
                cron_job_name,
                cron_command,
                template:reminder_templates(
                    id,
                    name,
                    subject_template,
                    body_template,
                    channel,
                    created_by,
                    created_at,
                    required_variables,
                    description
                )
            `)
            .order('name'),

        // Fetch all templates
        supabase
            .from('reminder_templates')
            .select('*')
            .order('name'),

        // Fetch all active employees for manual email
        supabase
            .from('profiles')
            .select('id, full_name, email, department, job_title')
            .eq('status', 'active')
            .order('full_name'),
    ])

    return (
        <PageContainer>
            <SettingsPageClient
                automationConfigs={automationConfigs || []}
                templates={templates || []}
                employees={employees || []}
            />
        </PageContainer>
    )
}

