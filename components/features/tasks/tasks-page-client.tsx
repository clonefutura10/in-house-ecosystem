'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Plus, MoreVertical, Archive, ArchiveRestore, CheckCircle } from 'lucide-react'

import { TaskDetailsSheet } from './task-details-sheet'
import type { Database } from '@/types/supabase'
import { CreateTaskDialog } from './create-task-dialog'

type Task = Database['public']['Tables']['tasks']['Row'] & {
    assignee?: {
        id: string
        full_name: string
        avatar_url: string | null
        email: string
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

interface TasksPageClientProps {
    tasks: Task[]
    archivedTasks: Task[]
    profiles: Profile[]
    isAdmin: boolean
    currentUserId: string
}

const statusConfig: Record<TaskStatus, { label: string; color: string; dotColor: string }> = {
    todo: { label: 'To Do', color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200', dotColor: 'bg-slate-500' },
    in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', dotColor: 'bg-yellow-500' },
    review: { label: 'In Review', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', dotColor: 'bg-purple-500' },
    done: { label: 'Done', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', dotColor: 'bg-green-500' },
    blocked: { label: 'Blocked', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', dotColor: 'bg-red-500' },
}

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
    low: { label: 'Low', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
    medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' },
    high: { label: 'High', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200' },
    urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' },
}

export function TasksPageClient({ tasks, archivedTasks, profiles, isAdmin, currentUserId }: TasksPageClientProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [priorityFilter, setPriorityFilter] = useState<string>('all')
    const [viewMode, setViewMode] = useState<'active' | 'archived'>('active')
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [isUpdating, setIsUpdating] = useState<string | null>(null)

    const currentTasks = viewMode === 'active' ? tasks : archivedTasks

    const filteredTasks = currentTasks.filter((task) => {
        const matchesSearch =
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
        return matchesSearch && matchesStatus && matchesPriority
    })

    const getInitials = (name: string) => {
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    }

    const handleArchiveTask = async (taskId: string) => {
        setIsUpdating(taskId)
        const supabase = createClient()

        await supabase.from('tasks').update({ is_archived: true }).eq('id', taskId)
        router.refresh()
        setIsUpdating(null)
    }

    const handleRestoreTask = async (taskId: string) => {
        setIsUpdating(taskId)
        const supabase = createClient()

        await supabase.from('tasks').update({ is_archived: false }).eq('id', taskId)
        router.refresh()
        setIsUpdating(null)
    }

    const handleMarkComplete = async (taskId: string) => {
        setIsUpdating(taskId)
        const supabase = createClient()

        await supabase.from('tasks').update({ status: 'done' }).eq('id', taskId)
        router.refresh()
        setIsUpdating(null)
    }

    return (
        <div className="space-y-6">
            {/* Breadcrumbs */}
            <div className="flex flex-wrap gap-2">
                <Link
                    href="/dashboard"
                    className="text-slate-500 dark:text-slate-400 text-base font-medium hover:text-[#1387ec]"
                >
                    Home
                </Link>
                <span className="text-slate-500 dark:text-slate-400">/</span>
                <span className="text-slate-900 dark:text-slate-100 text-base font-medium">
                    My Tasks
                </span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-slate-900 dark:text-white text-2xl font-semibold tracking-tight">
                    Task List
                </h1>
                <div className="flex items-center gap-2">
                    {/* View Mode Tabs */}
                    <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <button
                            onClick={() => setViewMode('active')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'active'
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            Active
                            {tasks.length > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-slate-200 dark:bg-slate-700">
                                    {tasks.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setViewMode('archived')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'archived'
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <Archive className="h-4 w-4 inline-block mr-1" />
                            Archived
                            {archivedTasks.length > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-slate-200 dark:bg-slate-700">
                                    {archivedTasks.length}
                                </span>
                            )}
                        </button>
                    </div>
                    <Button
                        className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white"
                        onClick={() => setIsCreateDialogOpen(true)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Task
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        type="search"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] bg-white dark:bg-slate-900">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="review">In Review</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[140px] bg-white dark:bg-slate-900">
                        <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Tasks Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-800">
                            <TableHead className="w-[120px]">Status</TableHead>
                            <TableHead className="min-w-[300px]">Task Name</TableHead>
                            <TableHead className="w-[100px]">Priority</TableHead>
                            <TableHead className="w-[150px]">Assignee</TableHead>
                            <TableHead className="w-[120px]">Due Date</TableHead>
                            <TableHead className="w-[80px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                                    {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                                        ? 'No tasks found matching your filters.'
                                        : 'No tasks yet. Create your first task!'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTasks.map((task) => (
                                <TableRow
                                    key={task.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                                    onClick={() => setSelectedTask(task)}
                                >
                                    <TableCell>
                                        {task.status && (
                                            <Badge variant="secondary" className={statusConfig[task.status].color}>
                                                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${statusConfig[task.status].dotColor}`} />
                                                {statusConfig[task.status].label}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {task.title}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {task.priority && (
                                            <Badge variant="secondary" className={priorityConfig[task.priority].color}>
                                                {priorityConfig[task.priority].label}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {task.assignee ? (
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={task.assignee.avatar_url || undefined} />
                                                    <AvatarFallback className="text-xs bg-[#1387ec] text-white">
                                                        {getInitials(task.assignee.full_name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-[100px]">
                                                    {task.assignee.full_name}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400">Unassigned</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-slate-600 dark:text-slate-300">
                                        {task.due_date
                                            ? format(new Date(task.due_date), 'MMM d, yyyy')
                                            : '—'}
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {viewMode === 'active' ? (
                                                    <>
                                                        <DropdownMenuItem
                                                            onClick={() => handleMarkComplete(task.id)}
                                                            disabled={isUpdating === task.id || task.status === 'done'}
                                                        >
                                                            <CheckCircle className="h-4 w-4 mr-2" />
                                                            Mark Complete
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleArchiveTask(task.id)}
                                                            disabled={isUpdating === task.id}
                                                        >
                                                            <Archive className="h-4 w-4 mr-2" />
                                                            Archive
                                                        </DropdownMenuItem>
                                                    </>
                                                ) : (
                                                    <DropdownMenuItem
                                                        onClick={() => handleRestoreTask(task.id)}
                                                        disabled={isUpdating === task.id}
                                                    >
                                                        <ArchiveRestore className="h-4 w-4 mr-2" />
                                                        Restore
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create Task Dialog */}
            <CreateTaskDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                profiles={profiles}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
            />

            {/* Task Details Sheet */}
            <TaskDetailsSheet
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
                profiles={profiles}
                isAdmin={isAdmin}
            />
        </div>
    )
}
