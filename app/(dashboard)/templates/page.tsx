import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { TemplatesPageClient } from '@/components/features/templates/templates-page-client'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
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

    // Only admins can access templates
    if (profile?.role !== 'admin') {
        redirect('/dashboard')
    }

    // Fetch all templates with usage info
    const { data: templates } = await supabase
        .from('reminder_templates')
        .select('*')
        .order('name')

    // Fetch automation configs to determine which templates are in use
    const { data: automations } = await supabase
        .from('automation_configs')
        .select('id, name, template_id')

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
