'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, ChevronDown, ChevronUp, Clock, Trash2, AlertCircle, Info, Mail, Send, Users, CheckCircle2, X } from 'lucide-react'
import { Database } from '@/types/supabase'

type ReminderType = Database['public']['Enums']['reminder_type']

interface ReminderTemplate {
    id: string
    name: string
    subject_template: string | null
    body_template: string
    channel: string[] | null
    created_by: string | null
    created_at: string | null
    required_variables: string[] | null
    description: string | null
}

interface AutomationConfig {
    id: string
    name: string
    trigger_cron: string
    reminder_type: ReminderType
    template_id: string | null
    is_active: boolean | null
    updated_at: string | null
    cron_job_name: string | null
    cron_command: string | null
    template: ReminderTemplate | null
}

interface Employee {
    id: string
    full_name: string
    email: string
    department: string | null
    job_title: string | null
}

interface SettingsPageClientProps {
    automationConfigs: AutomationConfig[]
    templates: ReminderTemplate[]
    employees: Employee[]
}

interface CronPreset {
    label: string
    value: string
    description: string
}

interface TemplateVariable {
    key: string
    description: string
    field: string | null
}

const availableVariables: TemplateVariable[] = [
    { key: '{{name}}', description: 'Employee full name', field: 'full_name' },
    { key: '{{email}}', description: 'Employee email address', field: 'email' },
    { key: '{{department}}', description: 'Employee department', field: 'department' },
    { key: '{{job_title}}', description: 'Employee job title', field: 'job_title' },
    { key: '{{company}}', description: 'Company name', field: null },
]

const reminderTypeLabels: Record<ReminderType, string> = {
    birthday: 'Birthday Reminder',
    anniversary: 'Work Anniversary',
    holiday: 'Holiday Reminder',
    custom_event: 'Custom Event',
    task_deadline: 'Task Deadline',
}

const reminderTypeDescriptions: Record<ReminderType, string> = {
    birthday: 'Sends automated birthday greetings to employees on their birthday. Requires date_of_birth to be set in profile.',
    anniversary: 'Sends work anniversary congratulations. Requires work_anniversary date to be set in profile.',
    holiday: 'Sends reminders about upcoming holidays.',
    custom_event: 'Custom event reminders for special occasions.',
    task_deadline: 'Sends reminders when tasks are due today.',
}

const defaultCronPresets: CronPreset[] = [
    { label: 'Daily at 9:00 AM', value: '0 9 * * *', description: 'Runs every day at 9:00 AM' },
    { label: 'Daily at 8:00 AM', value: '0 8 * * *', description: 'Runs every day at 8:00 AM' },
    { label: 'Daily at 10:00 AM', value: '0 10 * * *', description: 'Runs every day at 10:00 AM' },
    { label: 'Every Monday at 9:00 AM', value: '0 9 * * 1', description: 'Runs every Monday at 9:00 AM' },
    { label: 'Every Friday at 5:00 PM', value: '0 17 * * 5', description: 'Runs every Friday at 5:00 PM' },
    { label: 'First of Month at 9:00 AM', value: '0 9 1 * *', description: 'Runs on the first day of each month' },
    { label: 'Every Hour', value: '0 * * * *', description: 'Runs at the start of every hour' },
    { label: 'Every 30 Minutes', value: '*/30 * * * *', description: 'Runs every 30 minutes' },
]

// Convert cron to human readable
function cronToHuman(cron: string): string {
    const preset = defaultCronPresets.find(p => p.value === cron)
    if (preset) return preset.label

    const parts = cron.split(' ')
    if (parts.length !== 5) return cron

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

    if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        if (minute === '0') {
            return `Daily at ${hour}:00`
        }
        return `Daily at ${hour}:${minute.padStart(2, '0')}`
    }

    if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        return `Every ${days[parseInt(dayOfWeek)]} at ${hour}:${minute.padStart(2, '0')}`
    }

    return cron
}

function parseCronTime(cron: string): { hour: string; minute: string } {
    const parts = cron.split(' ')
    if (parts.length !== 5) return { hour: '9', minute: '0' }
    return { hour: parts[1], minute: parts[0] }
}

function buildCron(hour: string, minute: string, pattern: string = 'daily'): string {
    switch (pattern) {
        case 'daily':
            return `${minute} ${hour} * * *`
        case 'weekdays':
            return `${minute} ${hour} * * 1-5`
        case 'weekly-monday':
            return `${minute} ${hour} * * 1`
        case 'monthly':
            return `${minute} ${hour} 1 * *`
        default:
            return `${minute} ${hour} * * *`
    }
}

export function SettingsPageClient({ automationConfigs, templates, employees }: SettingsPageClientProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'automations' | 'compose'>('automations')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [editingConfig, setEditingConfig] = useState<AutomationConfig | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Create automation dialog state
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newName, setNewName] = useState('')
    const [newReminderType, setNewReminderType] = useState<ReminderType>('birthday')
    const [newTemplateId, setNewTemplateId] = useState('')
    const [newCronPreset, setNewCronPreset] = useState('0 9 * * *')
    const [useCustomCron, setUseCustomCron] = useState(false)
    const [customCron, setCustomCron] = useState('')

    // Local state for editing
    const [editSubject, setEditSubject] = useState('')
    const [editBody, setEditBody] = useState('')
    const [editCronPreset, setEditCronPreset] = useState('')
    const [useCustomEditCron, setUseCustomEditCron] = useState(false)
    const [customEditCron, setCustomEditCron] = useState('')

    // Delete confirmation
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    // Compose email state
    const [composeSubject, setComposeSubject] = useState('')
    const [composeBody, setComposeBody] = useState('')
    const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
    const [recipientMode, setRecipientMode] = useState<'select' | 'all' | 'department'>('select')
    const [selectedDepartment, setSelectedDepartment] = useState<string>('')
    const [useTemplateVars, setUseTemplateVars] = useState(true)
    const [selectedTemplate, setSelectedTemplate] = useState<string>('')

    // Get unique departments
    const departments = [...new Set(employees.filter(e => e.department).map(e => e.department!))]

    const handleToggleExpand = (config: AutomationConfig) => {
        if (expandedId === config.id) {
            setExpandedId(null)
            setEditingConfig(null)
        } else {
            setExpandedId(config.id)
            setEditingConfig(config)
            setEditSubject(config.template?.subject_template || '')
            setEditBody(config.template?.body_template || '')

            const matchingPreset = defaultCronPresets.find(p => p.value === config.trigger_cron)
            if (matchingPreset) {
                setEditCronPreset(matchingPreset.value)
                setUseCustomEditCron(false)
            } else {
                setUseCustomEditCron(true)
                setCustomEditCron(config.trigger_cron)
            }
        }
    }

    const handleToggleActive = async (config: AutomationConfig) => {
        setIsLoading(true)
        setError(null)
        const supabase = createClient()

        const { error: rpcError } = await supabase.rpc('toggle_automation', {
            p_automation_id: config.id,
            p_is_active: !(config.is_active ?? false)
        })

        if (rpcError) {
            setError(rpcError.message)
        }

        router.refresh()
        setIsLoading(false)
    }

    const handleSaveTemplate = async () => {
        if (!editingConfig?.template) return
        setIsLoading(true)
        setError(null)

        const supabase = createClient()

        const { error: templateError } = await supabase.rpc('update_reminder_template', {
            p_template_id: editingConfig.template.id,
            p_subject: editSubject,
            p_body: editBody
        })

        if (templateError) {
            setError(templateError.message)
            setIsLoading(false)
            return
        }

        const newCron = useCustomEditCron ? customEditCron : editCronPreset || editingConfig.trigger_cron
        if (newCron !== editingConfig.trigger_cron) {
            const { error: scheduleError } = await supabase.rpc('update_automation_schedule', {
                p_automation_id: editingConfig.id,
                p_trigger_cron: newCron
            })

            if (scheduleError) {
                setError(scheduleError.message)
                setIsLoading(false)
                return
            }
        }

        router.refresh()
        setIsLoading(false)
        setExpandedId(null)
    }

    const handleCreateAutomation = async () => {
        if (!newName.trim() || !newTemplateId) {
            setError('Please fill in all required fields')
            return
        }

        setIsLoading(true)
        setError(null)

        const supabase = createClient()
        const cronExpression = useCustomCron ? customCron : newCronPreset

        const { error: createError } = await supabase.rpc('create_full_automation', {
            p_name: newName.trim(),
            p_reminder_type: newReminderType,
            p_trigger_cron: cronExpression,
            p_template_id: newTemplateId,
            p_is_active: true
        })

        if (createError) {
            setError(createError.message)
            setIsLoading(false)
            return
        }

        setNewName('')
        setNewReminderType('birthday')
        setNewTemplateId('')
        setNewCronPreset('0 9 * * *')
        setUseCustomCron(false)
        setCustomCron('')
        setIsCreateOpen(false)

        router.refresh()
        setIsLoading(false)
    }

    const handleDeleteAutomation = async (id: string) => {
        setIsLoading(true)
        setError(null)

        const supabase = createClient()
        const { error: deleteError } = await supabase.rpc('delete_automation', {
            p_automation_id: id
        })

        if (deleteError) {
            setError(deleteError.message)
        }

        setDeleteConfirmId(null)
        router.refresh()
        setIsLoading(false)
    }

    const handleSendEmail = async () => {
        if (!composeSubject.trim() || !composeBody.trim()) {
            setError('Please fill in subject and body')
            return
        }

        if (recipientMode === 'select' && selectedRecipients.length === 0) {
            setError('Please select at least one recipient')
            return
        }

        setIsLoading(true)
        setError(null)
        setSuccessMessage(null)

        const supabase = createClient()

        try {
            let result
            if (recipientMode === 'select') {
                const { data, error } = await supabase.rpc('send_manual_email', {
                    p_recipient_ids: selectedRecipients,
                    p_subject: composeSubject,
                    p_body: composeBody,
                    p_use_template_variables: useTemplateVars
                })
                result = { data, error }
            } else {
                const { data, error } = await supabase.rpc('send_email_to_all', {
                    p_subject: composeSubject,
                    p_body: composeBody,
                    p_use_template_variables: useTemplateVars,
                    p_department: recipientMode === 'department' ? selectedDepartment : undefined
                })
                result = { data, error }
            }

            if (result.error) {
                setError(result.error.message)
            } else {
                const response = result.data as { message?: string; queued?: number }
                setSuccessMessage(response?.message || 'Emails queued successfully!')
                // Reset form
                setComposeSubject('')
                setComposeBody('')
                setSelectedRecipients([])
                setSelectedTemplate('')
            }
        } catch (err) {
            setError('Failed to send email')
        }

        setIsLoading(false)
    }

    const insertVariable = (variable: string, target: 'edit' | 'compose' = 'edit') => {
        if (target === 'compose') {
            setComposeBody((prev) => prev + ' ' + variable)
        } else {
            setEditBody((prev) => prev + ' ' + variable)
        }
    }

    const toggleRecipient = (id: string) => {
        setSelectedRecipients(prev =>
            prev.includes(id)
                ? prev.filter(r => r !== id)
                : [...prev, id]
        )
    }

    const selectAllRecipients = () => {
        setSelectedRecipients(employees.map(e => e.id))
    }

    const clearAllRecipients = () => {
        setSelectedRecipients([])
    }

    const applyTemplate = (templateId: string) => {
        const template = templates.find(t => t.id === templateId)
        if (template) {
            setComposeSubject(template.subject_template || '')
            setComposeBody(template.body_template || '')
        }
        setSelectedTemplate(templateId)
    }

    const getRequiredVariablesMessage = (template: ReminderTemplate | null): string | null => {
        if (!template?.required_variables || template.required_variables.length === 0) {
            return null
        }
        const vars = template.required_variables.map(v => `{{${v}}}`).join(', ')
        return `Required variables: ${vars}`
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
                    Email & Reminders
                </span>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-800 dark:text-red-200 font-medium">Error</p>
                        <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
                    </div>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-red-500 hover:text-red-700"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Success Alert */}
            {successMessage && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-green-800 dark:text-green-200 font-medium">Success</p>
                        <p className="text-green-600 dark:text-green-300 text-sm">{successMessage}</p>
                    </div>
                    <button
                        onClick={() => setSuccessMessage(null)}
                        className="ml-auto text-green-500 hover:text-green-700"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
                <button
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'automations'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    onClick={() => setActiveTab('automations')}
                >
                    <Clock className="h-4 w-4 inline-block mr-2" />
                    Automated Reminders
                </button>
                <button
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'compose'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    onClick={() => setActiveTab('compose')}
                >
                    <Mail className="h-4 w-4 inline-block mr-2" />
                    Compose Email
                </button>
            </div>

            {/* Automations Tab */}
            {activeTab === 'automations' && (
                <>
                    {/* Header */}
                    <div className="flex flex-wrap justify-between items-center gap-3">
                        <div>
                            <h1 className="text-slate-900 dark:text-white text-2xl font-semibold tracking-tight">
                                Automated Reminders
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                Configure automated email reminders for birthdays, anniversaries, and task deadlines
                            </p>
                        </div>

                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white">
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Rule
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>Create Automation Rule</DialogTitle>
                                    <DialogDescription>
                                        Set up a new automated reminder with custom scheduling.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="new-name">Rule Name *</Label>
                                        <Input
                                            id="new-name"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder="e.g., Daily Birthday Check"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Reminder Type *</Label>
                                        <Select value={newReminderType} onValueChange={(v) => setNewReminderType(v as ReminderType)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(Object.keys(reminderTypeLabels) as ReminderType[]).map((type) => (
                                                    <SelectItem key={type} value={type}>
                                                        {reminderTypeLabels[type]}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {reminderTypeDescriptions[newReminderType]}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Email Template *</Label>
                                        <Select value={newTemplateId} onValueChange={setNewTemplateId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a template" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {templates.map((template) => (
                                                    <SelectItem key={template.id} value={template.id}>
                                                        {template.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            Schedule
                                        </Label>

                                        <div className="flex items-center gap-2 mb-2">
                                            <Switch
                                                checked={useCustomCron}
                                                onCheckedChange={setUseCustomCron}
                                            />
                                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                                Use custom cron expression
                                            </span>
                                        </div>

                                        {useCustomCron ? (
                                            <div className="space-y-2">
                                                <Input
                                                    value={customCron}
                                                    onChange={(e) => setCustomCron(e.target.value)}
                                                    placeholder="0 9 * * *"
                                                    className="font-mono"
                                                />
                                                <p className="text-xs text-slate-500">
                                                    Format: minute hour day-of-month month day-of-week
                                                </p>
                                            </div>
                                        ) : (
                                            <Select value={newCronPreset} onValueChange={setNewCronPreset}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {defaultCronPresets.map((preset) => (
                                                        <SelectItem key={preset.value} value={preset.value}>
                                                            {preset.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>

                                    {(newReminderType === 'birthday' || newReminderType === 'anniversary') && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2">
                                            <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                            <div className="text-sm text-amber-800 dark:text-amber-200">
                                                <p className="font-medium">Data Requirement</p>
                                                <p className="text-amber-700 dark:text-amber-300">
                                                    {newReminderType === 'birthday'
                                                        ? 'Only employees with a Date of Birth set in their profile will receive reminders.'
                                                        : 'Only employees with a Work Anniversary date set in their profile will receive reminders.'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white"
                                        onClick={handleCreateAutomation}
                                        disabled={isLoading || !newName.trim() || !newTemplateId}
                                    >
                                        {isLoading ? 'Creating...' : 'Create Rule'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Info Card */}
                    <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <Info className="h-5 w-5 text-[#1387ec] flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-slate-600 dark:text-slate-300">
                                    <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">How it works</p>
                                    <p>
                                        When a rule runs at the scheduled time, it checks for matching employees and queues email notifications.
                                        Emails are only sent if there are matching records.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Rules List */}
                    <div className="flex flex-col gap-4">
                        {automationConfigs.length === 0 ? (
                            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                <CardContent className="p-8 text-center text-slate-500">
                                    <p className="text-lg font-medium mb-2">No automation rules yet</p>
                                    <p className="text-sm">Create your first automated reminder rule to get started.</p>
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
                                                <div className="flex items-center gap-2">
                                                    <h2 className="font-semibold text-slate-900 dark:text-white">
                                                        {config.name}
                                                    </h2>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {reminderTypeLabels[config.reminder_type]}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {cronToHuman(config.trigger_cron)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Dialog open={deleteConfirmId === config.id} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-slate-400 hover:text-red-500"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setDeleteConfirmId(config.id)
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Delete Automation Rule</DialogTitle>
                                                        <DialogDescription>
                                                            Are you sure you want to delete &ldquo;{config.name}&rdquo;? This action cannot be undone.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <DialogFooter>
                                                        <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                                                        <Button
                                                            variant="destructive"
                                                            onClick={() => handleDeleteAutomation(config.id)}
                                                            disabled={isLoading}
                                                        >
                                                            {isLoading ? 'Deleting...' : 'Delete'}
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>

                                            {expandedId === config.id ? (
                                                <ChevronUp className="h-5 w-5 text-slate-500" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 text-slate-500" />
                                            )}
                                        </div>
                                    </div>

                                    {expandedId === config.id && config.template && (
                                        <div className="border-t border-slate-200 dark:border-slate-800 p-4">
                                            <div className="flex gap-6">
                                                <div className="flex-grow space-y-4">
                                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3">
                                                        <Label className="flex items-center gap-2 font-semibold">
                                                            <Clock className="h-4 w-4" />
                                                            Schedule
                                                        </Label>

                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Switch
                                                                checked={useCustomEditCron}
                                                                onCheckedChange={setUseCustomEditCron}
                                                            />
                                                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                                                Use custom cron expression
                                                            </span>
                                                        </div>

                                                        {useCustomEditCron ? (
                                                            <div className="space-y-2">
                                                                <Input
                                                                    value={customEditCron}
                                                                    onChange={(e) => setCustomEditCron(e.target.value)}
                                                                    placeholder="0 9 * * *"
                                                                    className="font-mono bg-white dark:bg-slate-900"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <Select
                                                                value={editCronPreset || config.trigger_cron}
                                                                onValueChange={setEditCronPreset}
                                                            >
                                                                <SelectTrigger className="bg-white dark:bg-slate-900">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {defaultCronPresets.map((preset) => (
                                                                        <SelectItem key={preset.value} value={preset.value}>
                                                                            {preset.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    </div>

                                                    {getRequiredVariablesMessage(config.template) && (
                                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2">
                                                            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                                                {getRequiredVariablesMessage(config.template)}
                                                            </p>
                                                        </div>
                                                    )}

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

                                                    <div className="flex justify-end gap-3 pt-2">
                                                        <Button variant="ghost" onClick={() => setExpandedId(null)} disabled={isLoading}>
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white"
                                                            onClick={handleSaveTemplate}
                                                            disabled={isLoading}
                                                        >
                                                            {isLoading ? 'Saving...' : 'Save Changes'}
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="w-56 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                                                    <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-3">
                                                        Available Variables
                                                    </h3>
                                                    <div className="flex flex-col gap-2">
                                                        {availableVariables.map((variable) => (
                                                            <button
                                                                key={variable.key}
                                                                className="text-left w-full text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600"
                                                                onClick={() => insertVariable(variable.key, 'edit')}
                                                            >
                                                                <code className="text-[#1387ec]">{variable.key}</code>
                                                                <p className="text-xs text-slate-400 mt-0.5">{variable.description}</p>
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
                </>
            )}

            {/* Compose Email Tab */}
            {activeTab === 'compose' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Email Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Mail className="h-5 w-5 text-[#1387ec]" />
                                    Compose Email
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Template Selection */}
                                <div className="space-y-2">
                                    <Label>Start from Template (Optional)</Label>
                                    <Select value={selectedTemplate} onValueChange={applyTemplate}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a template to use" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates.map((template) => (
                                                <SelectItem key={template.id} value={template.id}>
                                                    {template.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Subject */}
                                <div className="space-y-2">
                                    <Label htmlFor="compose-subject">Subject *</Label>
                                    <Input
                                        id="compose-subject"
                                        value={composeSubject}
                                        onChange={(e) => setComposeSubject(e.target.value)}
                                        placeholder="Enter email subject..."
                                        disabled={isLoading}
                                    />
                                </div>

                                {/* Body */}
                                <div className="space-y-2">
                                    <Label htmlFor="compose-body">Message *</Label>
                                    <Textarea
                                        id="compose-body"
                                        value={composeBody}
                                        onChange={(e) => setComposeBody(e.target.value)}
                                        rows={10}
                                        placeholder="Write your email message here..."
                                        className="resize-none"
                                        disabled={isLoading}
                                    />
                                </div>

                                {/* Template Variables Toggle */}
                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <Switch
                                        checked={useTemplateVars}
                                        onCheckedChange={setUseTemplateVars}
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                            Use Template Variables
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Replace variables like {'{{name}}'} with actual employee data
                                        </p>
                                    </div>
                                </div>

                                {/* Variables Helper */}
                                {useTemplateVars && (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                                        <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-2">
                                            Available Variables
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {availableVariables.map((variable) => (
                                                <button
                                                    key={variable.key}
                                                    className="px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded hover:border-[#1387ec] hover:text-[#1387ec] transition-colors"
                                                    onClick={() => insertVariable(variable.key, 'compose')}
                                                >
                                                    <code>{variable.key}</code>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Send Button */}
                                <div className="flex justify-end pt-4">
                                    <Button
                                        className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white"
                                        onClick={handleSendEmail}
                                        disabled={isLoading || !composeSubject.trim() || !composeBody.trim()}
                                    >
                                        <Send className="h-4 w-4 mr-2" />
                                        {isLoading ? 'Sending...' : 'Send Email'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recipients Panel */}
                    <div className="space-y-4">
                        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Users className="h-5 w-5 text-[#1387ec]" />
                                    Recipients
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Recipient Mode */}
                                <div className="space-y-2">
                                    <Label>Send To</Label>
                                    <Select value={recipientMode} onValueChange={(v) => setRecipientMode(v as 'select' | 'all' | 'department')}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="select">Select Recipients</SelectItem>
                                            <SelectItem value="all">All Employees</SelectItem>
                                            <SelectItem value="department">By Department</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Department Selection */}
                                {recipientMode === 'department' && (
                                    <div className="space-y-2">
                                        <Label>Department</Label>
                                        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select department" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {departments.map((dept) => (
                                                    <SelectItem key={dept} value={dept}>
                                                        {dept}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Individual Selection */}
                                {recipientMode === 'select' && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-500">
                                                {selectedRecipients.length} selected
                                            </span>
                                            <div className="flex gap-2">
                                                <button
                                                    className="text-xs text-[#1387ec] hover:underline"
                                                    onClick={selectAllRecipients}
                                                >
                                                    Select All
                                                </button>
                                                <button
                                                    className="text-xs text-slate-500 hover:underline"
                                                    onClick={clearAllRecipients}
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        </div>

                                        <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                                            {employees.map((employee) => (
                                                <div
                                                    key={employee.id}
                                                    className={`flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border-b last:border-b-0 border-slate-100 dark:border-slate-800 ${selectedRecipients.includes(employee.id) ? 'bg-[#1387ec]/5' : ''
                                                        }`}
                                                    onClick={() => toggleRecipient(employee.id)}
                                                >
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedRecipients.includes(employee.id)
                                                            ? 'bg-[#1387ec] border-[#1387ec]'
                                                            : 'border-slate-300 dark:border-slate-600'
                                                        }`}>
                                                        {selectedRecipients.includes(employee.id) && (
                                                            <CheckCircle2 className="h-3 w-3 text-white" />
                                                        )}
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                                            {employee.full_name}
                                                        </p>
                                                        <p className="text-xs text-slate-500 truncate">
                                                            {employee.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* Summary */}
                                {recipientMode === 'all' && (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <p className="text-sm text-slate-600 dark:text-slate-300">
                                            Email will be sent to <strong>{employees.length}</strong> active employees
                                        </p>
                                    </div>
                                )}

                                {recipientMode === 'department' && selectedDepartment && (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <p className="text-sm text-slate-600 dark:text-slate-300">
                                            Email will be sent to <strong>{employees.filter(e => e.department === selectedDepartment).length}</strong> employees in {selectedDepartment}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Info Card */}
                        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                            <CardContent className="p-4">
                                <div className="flex gap-2">
                                    <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        Emails are queued and sent by the email service. They may take a few minutes to be delivered.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    )
}
