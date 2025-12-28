import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { TemplatesPageClient } from '@/components/features/templates/templates-page-client'
import { getAuthenticatedUser } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
    const supabase = await createClient()

    // Use cached auth - deduplicated with layout
    const user = await getAuthenticatedUser()

    if (!user) {
        return null
    }

    // Only admins can access templates
    if (user.role !== 'admin') {
        redirect('/dashboard')
    }

    // Fetch all data in parallel for better performance
    const [
        { data: templates },
        { data: automations },
    ] = await Promise.all([
        // Fetch all templates with usage info
        supabase
            .from('reminder_templates')
            .select('*')
            .order('name'),

        // Fetch automation configs to determine which templates are in use
        supabase
            .from('automation_configs')
            .select('id, name, template_id'),
    ])

    // Create a map of template usage
    const templateUsage: Record<string, { count: number; automations: { id: string; name: string }[] }> = {}
    automations?.forEach((automation) => {
        if (automation.template_id) {
            if (!templateUsage[automation.template_id]) {
                templateUsage[automation.template_id] = { count: 0, automations: [] }
            }
            templateUsage[automation.template_id].count++
            templateUsage[automation.template_id].automations.push({
                id: automation.id,
                name: automation.name
            })
        }
    })

    return (
        <PageContainer>
            <TemplatesPageClient
                templates={templates || []}
                templateUsage={templateUsage}
            />
        </PageContainer>
    )
}

