'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Loader2, Calendar } from 'lucide-react'

type Profile = {
    id: string
    full_name: string
    avatar_url: string | null
    email: string
}

interface CreateTaskDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    profiles: Profile[]
    currentUserId: string
    isAdmin: boolean
}

type Priority = 'low' | 'medium' | 'high'

export function CreateTaskDialog({
    open,
    onOpenChange,
    profiles,
    currentUserId,
    isAdmin,
}: CreateTaskDialogProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignee: '',
        priority: 'medium' as Priority,
        dueDate: '',
    })
    const [error, setError] = useState<string | null>(null)

    // Reset form when dialog closes or opens
    useEffect(() => {
        if (!open) {
            setFormData({
                title: '',
                description: '',
                assignee: isAdmin ? '' : currentUserId, // Pre-select current user for employees
                priority: 'medium',
                dueDate: '',
            })
            setError(null)
        } else if (!isAdmin) {
            // When opening for non-admin, set assignee to current user
            setFormData(prev => ({ ...prev, assignee: currentUserId }))
        }
    }, [open, isAdmin, currentUserId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!formData.title.trim()) {
            setError('Title is required')
            return
        }

        setIsLoading(true)

        try {
            const supabase = createClient()

            const { error: insertError } = await supabase.from('tasks').insert({
                title: formData.title.trim(),
                description: formData.description.trim() || null,
                assigned_to: formData.assignee || null,
                priority: formData.priority,
                due_date: formData.dueDate || null,
                status: 'todo',
                created_by: currentUserId,
            })

            if (insertError) {
                setError(insertError.message)
                return
            }

            // Reset form and close
            setFormData({
                title: '',
                description: '',
                assignee: '',
                priority: 'medium',
                dueDate: '',
            })
            onOpenChange(false)
            router.refresh()
        } catch {
            setError('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Create Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            placeholder="e.g., Finalize Q4 report"
                            value={formData.title}
                            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Add a more detailed description..."
                            value={formData.description}
                            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                            disabled={isLoading}
                            rows={3}
                        />
                    </div>

                    {/* Assignee */}
                    <div className="space-y-2">
                        <Label htmlFor="assignee">
                            Assignee
                            {!isAdmin && <span className="text-xs text-slate-400 ml-2">(Assigned to you)</span>}
                        </Label>
                        <Select
                            value={formData.assignee}
                            onValueChange={(value) => setFormData((prev) => ({ ...prev, assignee: value }))}
                            disabled={isLoading || !isAdmin}
                        >
                            <SelectTrigger className={!isAdmin ? 'opacity-60' : ''}>
                                <SelectValue placeholder="Select a team member" />
                            </SelectTrigger>
                            <SelectContent>
                                {profiles.map((profile) => (
                                    <SelectItem key={profile.id} value={profile.id}>
                                        {profile.full_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                        <Label>Priority</Label>
                        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {(['low', 'medium', 'high'] as const).map((priority) => (
                                <button
                                    key={priority}
                                    type="button"
                                    onClick={() => setFormData((prev) => ({ ...prev, priority }))}
                                    disabled={isLoading}
                                    className={`flex-1 py-2 text-sm font-medium transition-colors ${formData.priority === priority
                                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2">
                        <Label htmlFor="dueDate">Due Date</Label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="dueDate"
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                                disabled={isLoading}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Task'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
