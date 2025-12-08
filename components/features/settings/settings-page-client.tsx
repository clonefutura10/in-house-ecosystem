'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'

interface ReminderTemplate {
    id: string
    name: string
    subject_template: string | null
    body_template: string
    channel: string[] | null
    created_by: string | null
    created_at: string | null
}

interface AutomationConfig {
    id: string
    name: string
    trigger_cron: string
    reminder_type: string
    template_id: string | null
    is_active: boolean | null
    updated_at: string | null
    template: ReminderTemplate | null
}

interface SettingsPageClientProps {
    automationConfigs: AutomationConfig[]
    templates: ReminderTemplate[]
}

const availableVariables = [
    { key: '{{name}}', description: 'User name' },
    { key: '{{email}}', description: 'User email' },
    { key: '{{company}}', description: 'Company name' },
]

// Convert cron to human readable
function cronToHuman(cron: string): string {
    // Simple cron parsing - just for display
    if (cron.includes('0 9 * * *')) return 'Daily at 9:00 AM'
    if (cron.includes('0 10 * * 1')) return 'Weekly on Monday'
    if (cron.includes('0 10 * * 5')) return 'Weekly on Friday'
    if (cron.includes('0 0 1 * *')) return 'Monthly on 1st'
    return cron
}

export function SettingsPageClient({ automationConfigs, templates }: SettingsPageClientProps) {
    const router = useRouter()
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [editingConfig, setEditingConfig] = useState<AutomationConfig | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // Local state for editing
    const [editSubject, setEditSubject] = useState('')
    const [editBody, setEditBody] = useState('')

    const handleToggleExpand = (config: AutomationConfig) => {
        if (expandedId === config.id) {
            setExpandedId(null)
            setEditingConfig(null)
        } else {
            setExpandedId(config.id)
            setEditingConfig(config)
            setEditSubject(config.template?.subject_template || '')
            setEditBody(config.template?.body_template || '')
        }
    }

    const handleToggleActive = async (config: AutomationConfig) => {
        setIsLoading(true)
        const supabase = createClient()

        await supabase
            .from('automation_configs')
            .update({ is_active: !config.is_active })
            .eq('id', config.id)

        router.refresh()
        setIsLoading(false)
    }

    const handleSaveTemplate = async () => {
        if (!editingConfig?.template) return
        setIsLoading(true)

        const supabase = createClient()

        await supabase
            .from('reminder_templates')
            .update({
                subject_template: editSubject,
                body_template: editBody,
            })
            .eq('id', editingConfig.template.id)

        router.refresh()
        setIsLoading(false)
        setExpandedId(null)
    }

    const insertVariable = (variable: string) => {
        setEditBody((prev) => prev + ' ' + variable)
    }

    return (
        <div className="space-y-6">
            {/* Breadcrumbs */}
            <div className="flex flex-wrap gap-2">
                <Link
                    href="/settings"
                    className="text-slate-500 dark:text-slate-400 text-base font-medium hover:text-[#1387ec]"
                >
                    Settings
                </Link>
                <span className="text-slate-500 dark:text-slate-400">/</span>
                <span className="text-slate-900 dark:text-slate-100 text-base font-medium">
                    Automated Reminders
                </span>
            </div>

            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-3">
                <h1 className="text-slate-900 dark:text-white text-2xl font-semibold tracking-tight">
                    Automated Reminders
                </h1>
                <Button className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    New Rule
                </Button>
            </div>

            {/* Rules List */}
            <div className="flex flex-col gap-4">
                {automationConfigs.length === 0 ? (
                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <CardContent className="p-8 text-center text-slate-500">
                            <p className="text-lg font-medium mb-2">No automation rules yet</p>
                            <p className="text-sm">
                                Create your first automated reminder rule to get started.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    automationConfigs.map((config) => (
                        <Card
                            key={config.id}
                            className={`bg-white dark:bg-slate-900 overflow-hidden ${expandedId === config.id
                                ? 'border-[#1387ec]'
                                : 'border-slate-200 dark:border-slate-800'
                                }`}
                        >
                            {/* Header Row */}
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                onClick={() => handleToggleExpand(config)}
                            >
                                <div className="flex items-center gap-4">
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Switch
                                            checked={config.is_active ?? false}
                                            onCheckedChange={() => handleToggleActive(config)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-slate-900 dark:text-white">
                                            {config.name}
                                        </h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {cronToHuman(config.trigger_cron)}
                                        </p>
                                    </div>
                                </div>
                                {expandedId === config.id ? (
                                    <ChevronUp className="h-5 w-5 text-slate-500" />
                                ) : (
                                    <ChevronDown className="h-5 w-5 text-slate-500" />
                                )}
                            </div>

                            {/* Expanded Content */}
                            {expandedId === config.id && config.template && (
                                <div className="border-t border-slate-200 dark:border-slate-800 p-4">
                                    <div className="flex gap-6">
                                        {/* Form */}
                                        <div className="flex-grow space-y-4">
                                            <div>
                                                <Label htmlFor="subject">Subject</Label>
                                                <Input
                                                    id="subject"
                                                    value={editSubject}
                                                    onChange={(e) => setEditSubject(e.target.value)}
                                                    className="mt-1 bg-slate-50 dark:bg-slate-800"
                                                    disabled={isLoading}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="body">Body</Label>
                                                <Textarea
                                                    id="body"
                                                    value={editBody}
                                                    onChange={(e) => setEditBody(e.target.value)}
                                                    rows={6}
                                                    className="mt-1 bg-slate-50 dark:bg-slate-800"
                                                    disabled={isLoading}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-3">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => setExpandedId(null)}
                                                    disabled={isLoading}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white"
                                                    onClick={handleSaveTemplate}
                                                    disabled={isLoading}
                                                >
                                                    Save Changes
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Variables Panel */}
                                        <div className="w-56 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                                            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-3">
                                                Available Variables
                                            </h3>
                                            <div className="flex flex-col gap-2">
                                                {availableVariables.map((variable) => (
                                                    <button
                                                        key={variable.key}
                                                        className="text-left w-full text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600"
                                                        onClick={() => insertVariable(variable.key)}
                                                    >
                                                        <code>{variable.key}</code>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
