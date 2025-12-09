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
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Plus,
    Trash2,
    AlertCircle,
    FileText,
    Link as LinkIcon,
    Edit,
    CheckCircle2,
    Info
} from 'lucide-react'

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

interface TemplateUsage {
    count: number
    automations: { id: string; name: string }[]
}

interface TemplatesPageClientProps {
    templates: ReminderTemplate[]
    templateUsage: Record<string, TemplateUsage>
}

const availableVariables = [
    { key: '{{name}}', description: 'Employee full name' },
    { key: '{{email}}', description: 'Employee email address' },
    { key: '{{department}}', description: 'Employee department' },
    { key: '{{job_title}}', description: 'Employee job title' },
    { key: '{{company}}', description: 'Company name' },
]

export function TemplatesPageClient({ templates, templateUsage }: TemplatesPageClientProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Create template dialog
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newName, setNewName] = useState('')
    const [newSubject, setNewSubject] = useState('')
    const [newBody, setNewBody] = useState('')
    const [newDescription, setNewDescription] = useState('')
    const [newRequiredVars, setNewRequiredVars] = useState<string[]>([])

    // Edit template dialog
    const [editingTemplate, setEditingTemplate] = useState<ReminderTemplate | null>(null)
    const [editName, setEditName] = useState('')
    const [editSubject, setEditSubject] = useState('')
    const [editBody, setEditBody] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [editRequiredVars, setEditRequiredVars] = useState<string[]>([])

    // Delete confirmation
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    const openEditDialog = (template: ReminderTemplate) => {
        setEditingTemplate(template)
        setEditName(template.name)
        setEditSubject(template.subject_template || '')
        setEditBody(template.body_template)
        setEditDescription(template.description || '')
        setEditRequiredVars(template.required_variables || [])
    }

    const handleCreateTemplate = async () => {
        if (!newName.trim() || !newBody.trim()) {
            setError('Name and body are required')
            return
        }

        setIsLoading(true)
        setError(null)

        const supabase = createClient()
        const { error: createError } = await supabase.rpc('create_reminder_template', {
            p_name: newName.trim(),
            p_subject: newSubject.trim(),
            p_body: newBody.trim(),
            p_channels: ['email']
        })

        if (createError) {
            setError(createError.message)
            setIsLoading(false)
            return
        }

        setSuccessMessage('Template created successfully!')
        setIsCreateOpen(false)
        setNewName('')
        setNewSubject('')
        setNewBody('')
        setNewDescription('')
        setNewRequiredVars([])
        router.refresh()
        setIsLoading(false)
    }

    const handleUpdateTemplate = async () => {
        if (!editingTemplate) return

        setIsLoading(true)
        setError(null)

        const supabase = createClient()
        const { error: updateError } = await supabase.rpc('update_reminder_template_full', {
            p_template_id: editingTemplate.id,
            p_name: editName.trim(),
            p_subject: editSubject.trim(),
            p_body: editBody.trim(),
            p_description: editDescription.trim() || undefined,
            p_required_variables: editRequiredVars
        })

        if (updateError) {
            setError(updateError.message)
            setIsLoading(false)
            return
        }

        setSuccessMessage('Template updated successfully!')
        setEditingTemplate(null)
        router.refresh()
        setIsLoading(false)
    }

    const handleDeleteTemplate = async () => {
        if (!deleteConfirmId) return

        setIsLoading(true)
        setError(null)

        const supabase = createClient()
        const { data, error: deleteError } = await supabase.rpc('delete_reminder_template', {
            p_template_id: deleteConfirmId
        })

        if (deleteError) {
            setError(deleteError.message)
            setIsLoading(false)
            setDeleteConfirmId(null)
            return
        }

        const result = data as { success?: boolean; message?: string }
        setSuccessMessage(result?.message || 'Template deleted successfully!')
        setDeleteConfirmId(null)
        router.refresh()
        setIsLoading(false)
    }

    const insertVariable = (variable: string, target: 'create' | 'edit') => {
        if (target === 'create') {
            setNewBody(prev => prev + ' ' + variable)
        } else {
            setEditBody(prev => prev + ' ' + variable)
        }
    }

    const getUsage = (templateId: string): TemplateUsage => {
        return templateUsage[templateId] || { count: 0, automations: [] }
    }

    return (
        <div className="space-y-6">
            {/* Breadcrumbs */}
            <div className="flex flex-wrap gap-2">
                <Link
                    href="/templates"
                    className="text-slate-500 dark:text-slate-400 text-base font-medium hover:text-[#1387ec]"
                >
                    Settings
                </Link>
                <span className="text-slate-500 dark:text-slate-400">/</span>
                <span className="text-slate-900 dark:text-slate-100 text-base font-medium">
                    Reminder Templates
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

            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                    <h1 className="text-slate-900 dark:text-white text-2xl font-semibold tracking-tight">
                        Reminder Templates
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Create and manage email templates for automated reminders
                    </p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white">
                            <Plus className="h-4 w-4 mr-2" />
                            New Template
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create Template</DialogTitle>
                            <DialogDescription>
                                Create a new email template that can be used with automated reminders.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-name">Template Name *</Label>
                                <Input
                                    id="new-name"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g., Birthday Greeting"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="new-description">Description</Label>
                                <Input
                                    id="new-description"
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder="Brief description of this template"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="new-subject">Email Subject</Label>
                                <Input
                                    id="new-subject"
                                    value={newSubject}
                                    onChange={(e) => setNewSubject(e.target.value)}
                                    placeholder="e.g., Happy Birthday, {{name}}!"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="new-body">Email Body *</Label>
                                <Textarea
                                    id="new-body"
                                    value={newBody}
                                    onChange={(e) => setNewBody(e.target.value)}
                                    rows={8}
                                    placeholder="Write your email content here..."
                                />
                            </div>

                            {/* Variables Helper */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                                <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-2">
                                    Available Variables
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {availableVariables.map((variable) => (
                                        <button
                                            key={variable.key}
                                            type="button"
                                            className="px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded hover:border-[#1387ec] hover:text-[#1387ec] transition-colors"
                                            onClick={() => insertVariable(variable.key, 'create')}
                                        >
                                            <code>{variable.key}</code>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    Click a variable to insert it into the body
                                </p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white"
                                onClick={handleCreateTemplate}
                                disabled={isLoading || !newName.trim() || !newBody.trim()}
                            >
                                {isLoading ? 'Creating...' : 'Create Template'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.length === 0 ? (
                    <Card className="col-span-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <CardContent className="p-8 text-center text-slate-500">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                            <p className="text-lg font-medium mb-2">No templates yet</p>
                            <p className="text-sm">Create your first email template to get started.</p>
                        </CardContent>
                    </Card>
                ) : (
                    templates.map((template) => {
                        const usage = getUsage(template.id)
                        const isInUse = usage.count > 0

                        return (
                            <Card
                                key={template.id}
                                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-[#1387ec]/50 transition-colors"
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-grow min-w-0">
                                            <CardTitle className="text-base font-semibold truncate">
                                                {template.name}
                                            </CardTitle>
                                            {template.description && (
                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                    {template.description}
                                                </p>
                                            )}
                                        </div>
                                        {isInUse && (
                                            <Badge variant="secondary" className="flex-shrink-0">
                                                <LinkIcon className="h-3 w-3 mr-1" />
                                                {usage.count} rule{usage.count > 1 ? 's' : ''}
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-2">
                                    {/* Subject Preview */}
                                    {template.subject_template && (
                                        <div className="mb-3">
                                            <p className="text-xs text-slate-500 mb-1">Subject:</p>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                                                {template.subject_template}
                                            </p>
                                        </div>
                                    )}

                                    {/* Body Preview */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-3">
                                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                                            {template.body_template}
                                        </p>
                                    </div>

                                    {/* Required Variables */}
                                    {template.required_variables && template.required_variables.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {template.required_variables.map((v) => (
                                                <span
                                                    key={v}
                                                    className="px-1.5 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded"
                                                >
                                                    {`{{${v}}}`}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => openEditDialog(template)}
                                        >
                                            <Edit className="h-4 w-4 mr-1" />
                                            Edit
                                        </Button>

                                        <Dialog
                                            open={deleteConfirmId === template.id}
                                            onOpenChange={(open) => !open && setDeleteConfirmId(null)}
                                        >
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className={isInUse ? 'text-slate-400 cursor-not-allowed' : 'text-red-500 hover:text-red-700 hover:border-red-300'}
                                                    disabled={isInUse}
                                                    onClick={() => setDeleteConfirmId(template.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Delete Template</DialogTitle>
                                                    <DialogDescription>
                                                        Are you sure you want to delete &ldquo;{template.name}&rdquo;? This action cannot be undone.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <DialogFooter>
                                                    <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        onClick={handleDeleteTemplate}
                                                        disabled={isLoading}
                                                    >
                                                        {isLoading ? 'Deleting...' : 'Delete'}
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>

                                    {/* In-use warning */}
                                    {isInUse && (
                                        <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                                            <Info className="h-4 w-4 flex-shrink-0" />
                                            <span>
                                                Used by: {usage.automations.map(a => a.name).join(', ')}
                                            </span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>

            {/* Edit Template Dialog */}
            <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Template</DialogTitle>
                        <DialogDescription>
                            Update the template content and settings.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Template Name *</Label>
                            <Input
                                id="edit-name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Input
                                id="edit-description"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-subject">Email Subject</Label>
                            <Input
                                id="edit-subject"
                                value={editSubject}
                                onChange={(e) => setEditSubject(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-body">Email Body *</Label>
                            <Textarea
                                id="edit-body"
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                rows={8}
                            />
                        </div>

                        {/* Variables Helper */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                            <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-2">
                                Available Variables
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {availableVariables.map((variable) => (
                                    <button
                                        key={variable.key}
                                        type="button"
                                        className="px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded hover:border-[#1387ec] hover:text-[#1387ec] transition-colors"
                                        onClick={() => insertVariable(variable.key, 'edit')}
                                    >
                                        <code>{variable.key}</code>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingTemplate(null)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white"
                            onClick={handleUpdateTemplate}
                            disabled={isLoading || !editName.trim() || !editBody.trim()}
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
