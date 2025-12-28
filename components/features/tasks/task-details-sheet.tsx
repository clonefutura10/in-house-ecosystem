'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Archive, CheckCircle, Send, Loader2, X, ChevronRight, ArchiveRestore } from 'lucide-react'
import type { Database } from '@/types/supabase'

type Task = Database['public']['Tables']['tasks']['Row'] & {
    assignee?: {
        id: string
        full_name: string
        avatar_url: string | null
        email: string
    } | null
}

type TaskComment = Database['public']['Tables']['task_comments']['Row'] & {
    user?: {
        id: string
        full_name: string
        avatar_url: string | null
    } | null
}

type Profile = {
    id: string
    full_name: string
    avatar_url: string | null
    email: string
}

type TaskStatus = Database['public']['Enums']['task_status']
type TaskPriority = Database['public']['Enums']['task_priority']

interface TaskDetailsSheetProps {
    task: Task | null
    onClose: () => void
    profiles: Profile[]
    isAdmin: boolean
}

const statusOptions: { value: TaskStatus; label: string }[] = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'In Review' },
    { value: 'done', label: 'Done' },
    { value: 'blocked', label: 'Blocked' },
]

const priorityOptions: { value: TaskPriority; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
]

export function TaskDetailsSheet({ task, onClose, profiles, isAdmin }: TaskDetailsSheetProps) {
    const router = useRouter()
    const [localTask, setLocalTask] = useState<Task | null>(task)
    const [comments, setComments] = useState<TaskComment[]>([])
    const [newComment, setNewComment] = useState('')
    const [isLoadingComments, setIsLoadingComments] = useState(false)
    const [isSendingComment, setIsSendingComment] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)

    // Sync local task with prop when it changes
    useEffect(() => {
        setLocalTask(task)
    }, [task])

    useEffect(() => {
        if (localTask) {
            fetchComments()
        }
    }, [localTask?.id])

    const fetchComments = async () => {
        if (!localTask) return
        setIsLoadingComments(true)

        const supabase = createClient()
        const { data } = await supabase
            .from('task_comments')
            .select(`
        *,
        user:profiles!task_comments_user_id_fkey(id, full_name, avatar_url)
      `)
            .eq('task_id', localTask.id)
            .order('created_at', { ascending: true })

        setComments(data || [])
        setIsLoadingComments(false)
    }

    const handleSendComment = async () => {
        if (!localTask || !newComment.trim()) return

        setIsSendingComment(true)
        const supabase = createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase.from('task_comments').insert({
            task_id: localTask.id,
            user_id: user.id,
            content: newComment.trim(),
        })

        setNewComment('')
        fetchComments()
        setIsSendingComment(false)
    }

    const handleUpdateTask = async (field: string, value: string) => {
        if (!localTask) return
        setIsUpdating(true)

        // Optimistically update local state
        setLocalTask(prev => prev ? { ...prev, [field]: value } : null)

        const supabase = createClient()
        await supabase.from('tasks').update({ [field]: value }).eq('id', localTask.id)

        router.refresh()
        setIsUpdating(false)
    }

    const handleMarkComplete = async () => {
        if (!localTask) return
        setIsUpdating(true)

        setLocalTask(prev => prev ? { ...prev, status: 'done' } : null)

        const supabase = createClient()
        await supabase.from('tasks').update({ status: 'done' }).eq('id', localTask.id)

        router.refresh()
        onClose()
        setIsUpdating(false)
    }

    const handleToggleArchive = async () => {
        if (!localTask) return
        setIsUpdating(true)

        const newArchivedState = !localTask.is_archived

        const supabase = createClient()
        await supabase.from('tasks').update({ is_archived: newArchivedState }).eq('id', localTask.id)

        router.refresh()
        onClose()
        setIsUpdating(false)
    }

    const getInitials = (name: string) => {
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    }

    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return '1 day ago'
        if (diffDays < 7) return `${diffDays} days ago`
        return format(date, 'MMM d, yyyy')
    }

    return (
        <Sheet open={!!localTask} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-full sm:max-w-[750px] overflow-y-auto p-6">
                {localTask && (
                    <>
                        <SheetHeader className="space-y-4">
                            {/* Breadcrumb */}
                            <div className="flex items-center gap-1 text-sm text-slate-500">
                                <span>Projects</span>
                                <ChevronRight className="h-4 w-4" />
                                <span>Tasks</span>
                                <ChevronRight className="h-4 w-4" />
                                <span className="text-slate-900 dark:text-white">Details</span>
                            </div>

                            <SheetTitle className="text-xl font-semibold text-left">
                                {localTask.title}
                            </SheetTitle>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={handleToggleArchive} disabled={isUpdating}>
                                    {localTask.is_archived ? (
                                        <>
                                            <ArchiveRestore className="h-4 w-4 mr-1" />
                                            Restore
                                        </>
                                    ) : (
                                        <>
                                            <Archive className="h-4 w-4 mr-1" />
                                            Archive
                                        </>
                                    )}
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white"
                                    onClick={handleMarkComplete}
                                    disabled={isUpdating || localTask.status === 'done'}
                                >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Mark Complete
                                </Button>
                            </div>
                        </SheetHeader>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                            {/* Left Column - Main Content */}
                            <div className="md:col-span-2 space-y-6">
                                {/* Description */}
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                                        Description
                                    </h3>
                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                        {localTask.description || 'No description provided.'}
                                    </p>
                                </div>

                                {/* Tags */}
                                {localTask.tags && localTask.tags.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                                            Tags
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {localTask.tags.map((tag, index) => (
                                                <Badge key={index} variant="secondary" className="bg-[#1387ec]/10 text-[#1387ec]">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Comments */}
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                                        Comments
                                    </h3>
                                    <div className="space-y-4">
                                        {isLoadingComments ? (
                                            <div className="flex justify-center py-4">
                                                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                            </div>
                                        ) : comments.length === 0 ? (
                                            <p className="text-sm text-slate-400">No comments yet.</p>
                                        ) : (
                                            comments.map((comment) => (
                                                <div key={comment.id} className="flex gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={comment.user?.avatar_url || undefined} />
                                                        <AvatarFallback className="text-xs bg-slate-200 dark:bg-slate-700">
                                                            {comment.user ? getInitials(comment.user.full_name) : '?'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-sm text-slate-900 dark:text-white">
                                                                {comment.user?.full_name || 'Unknown'}
                                                            </span>
                                                            <span className="text-xs text-slate-400">
                                                                {comment.created_at && formatRelativeTime(comment.created_at)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                                                            {comment.content}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}

                                        {/* Add Comment */}
                                        <div className="flex gap-3 mt-4">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback className="text-xs bg-[#1387ec] text-white">
                                                    You
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 flex gap-2">
                                                <Input
                                                    placeholder="Write a comment..."
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                                                    disabled={isSendingComment}
                                                />
                                                <Button
                                                    size="icon"
                                                    className="bg-[#1387ec] hover:bg-[#1387ec]/90"
                                                    onClick={handleSendComment}
                                                    disabled={isSendingComment || !newComment.trim()}
                                                >
                                                    {isSendingComment ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Send className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Metadata */}
                            <div className="space-y-4">
                                {/* Status */}
                                <div>
                                    <label className="text-xs font-medium text-slate-500 block mb-2">
                                        Status
                                    </label>
                                    <Select
                                        value={localTask.status || 'todo'}
                                        onValueChange={(value) => handleUpdateTask('status', value)}
                                        disabled={isUpdating}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Assignee */}
                                <div>
                                    <label className="text-xs font-medium text-slate-500 block mb-2">
                                        Assignee
                                    </label>
                                    <Select
                                        value={localTask.assigned_to || ''}
                                        onValueChange={(value) => handleUpdateTask('assigned_to', value)}
                                        disabled={isUpdating || !isAdmin}
                                    >
                                        <SelectTrigger className={`w-full ${!isAdmin ? 'opacity-60' : ''}`}>
                                            <SelectValue placeholder="Unassigned" />
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
                                <div>
                                    <label className="text-xs font-medium text-slate-500 block mb-2">
                                        Priority
                                    </label>
                                    <Select
                                        value={localTask.priority || 'medium'}
                                        onValueChange={(value) => handleUpdateTask('priority', value)}
                                        disabled={isUpdating || !isAdmin}
                                    >
                                        <SelectTrigger className={`w-full ${!isAdmin ? 'opacity-60' : ''}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {priorityOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Due Date */}
                                <div>
                                    <label className="text-xs font-medium text-slate-500 block mb-2">
                                        Due Date
                                    </label>
                                    <Input
                                        type="date"
                                        value={localTask.due_date ? localTask.due_date.split('T')[0] : ''}
                                        onChange={(e) => handleUpdateTask('due_date', e.target.value)}
                                        disabled={isUpdating || !isAdmin}
                                        className={!isAdmin ? 'opacity-60' : ''}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    )
}
