'use client'

import Link from 'next/link'
import { format, isPast, isToday } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, CheckCircle, Clock, ListTodo, AlertCircle } from 'lucide-react'
import type { Database } from '@/types/supabase'

type Task = Database['public']['Tables']['tasks']['Row']
type TaskStatus = Database['public']['Enums']['task_status']

interface EmployeeStats {
    tasksCompletedThisMonth: number
    pendingReviews: number
    tasksDueToday: number
    totalTasks: number
}

interface EmployeeDashboardProps {
    userName: string
    stats: EmployeeStats
    highPriorityTasks: Task[]
}

function getStatusBadge(status: TaskStatus) {
    const variants: Record<TaskStatus, { label: string; className: string }> = {
        todo: {
            label: 'Not Started',
            className: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
        },
        in_progress: {
            label: 'In Progress',
            className: 'bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-200',
        },
        review: {
            label: 'In Review',
            className: 'bg-[#1387ec]/10 text-[#1387ec] dark:bg-[#1387ec]/20',
        },
        done: {
            label: 'Completed',
            className: 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900',
        },
        blocked: {
            label: 'Blocked',
            className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        },
    }

    const { label, className } = variants[status] || variants.todo
    return (
        <Badge variant="secondary" className={className}>
            {label}
        </Badge>
    )
}

function formatDueDate(dueDate: string | null) {
    if (!dueDate) return '—'
    const date = new Date(dueDate)
    return format(date, 'MMM d, yyyy')
}

function isOverdue(dueDate: string | null, status: TaskStatus | null) {
    if (!dueDate || status === 'done') return false
    return isPast(new Date(dueDate)) && !isToday(new Date(dueDate))
}

export function EmployeeDashboard({ userName, stats, highPriorityTasks }: EmployeeDashboardProps) {
    const firstName = userName.split(' ')[0]

    return (
        <div className="space-y-6">
            {/* Breadcrumbs */}
            <div className="flex flex-wrap gap-2">
                <Link
                    href="/dashboard"
                    className="text-slate-500 dark:text-slate-400 text-base font-medium leading-normal hover:text-[#1387ec]"
                >
                    Home
                </Link>
                <span className="text-slate-500 dark:text-slate-400 text-base font-medium leading-normal">
                    /
                </span>
                <span className="text-slate-900 dark:text-slate-100 text-base font-medium leading-normal">
                    My Work
                </span>
            </div>

            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-slate-900 dark:text-white text-2xl font-semibold leading-tight tracking-tight">
                    My Work Dashboard
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Hello, {firstName}.{' '}
                    {stats.tasksDueToday > 0 ? (
                        <>
                            You have{' '}
                            <span className="font-semibold text-[#1387ec]">
                                {stats.tasksDueToday} {stats.tasksDueToday === 1 ? 'task' : 'tasks'}
                            </span>{' '}
                            due today.
                        </>
                    ) : (
                        'No tasks due today. Keep up the great work!'
                    )}
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {stats.tasksCompletedThisMonth}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Completed This Month</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <Clock className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {stats.pendingReviews}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Pending Reviews</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {stats.tasksDueToday}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Due Today</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <ListTodo className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {stats.totalTasks}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Total Active Tasks</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Tasks */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* High Priority Tasks */}
                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <CardHeader className="border-b border-slate-200 dark:border-slate-800">
                            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                                High Priority Tasks
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {highPriorityTasks.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                    <p className="font-medium">All caught up!</p>
                                    <p className="text-sm">No high priority tasks pending.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {highPriorityTasks.map((task) => (
                                        <Link
                                            key={task.id}
                                            href="/tasks"
                                            className="grid grid-cols-3 gap-4 p-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                        >
                                            <p className="font-medium text-slate-800 dark:text-slate-200 col-span-2 md:col-span-1">
                                                {task.title}
                                            </p>
                                            <p
                                                className={`font-medium text-sm ${isOverdue(task.due_date, task.status)
                                                        ? 'text-red-500'
                                                        : 'text-slate-600 dark:text-slate-400'
                                                    }`}
                                            >
                                                {formatDueDate(task.due_date)}
                                                {isOverdue(task.due_date, task.status) && (
                                                    <span className="ml-1 text-xs">(Overdue)</span>
                                                )}
                                            </p>
                                            <div className="text-right">
                                                {task.status && getStatusBadge(task.status)}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* View All Tasks Button */}
                    <Link
                        href="/tasks"
                        className="flex items-center justify-center gap-3 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                        <PlusCircle className="h-8 w-8 text-[#1387ec] group-hover:scale-110 transition-transform" />
                        <span className="text-lg font-semibold text-[#1387ec]">
                            View All Tasks
                        </span>
                    </Link>
                </div>

                {/* Right Column - Quick Stats Summary */}
                <div className="flex flex-col gap-6">
                    <Card className="bg-slate-900 dark:bg-slate-800 border-0">
                        <CardContent className="p-6">
                            <h3 className="text-slate-400 text-sm font-medium mb-4">
                                This Month&apos;s Progress
                            </h3>
                            <p className="text-5xl font-bold text-white mb-2">
                                {stats.tasksCompletedThisMonth}
                            </p>
                            <p className="text-slate-400 text-sm">
                                Tasks completed
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <CardContent className="p-6">
                            <h3 className="text-base font-medium text-slate-600 dark:text-slate-400 mb-4">
                                Task Status Overview
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Active Tasks</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">{stats.totalTasks}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">In Review</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">{stats.pendingReviews}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Due Today</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">{stats.tasksDueToday}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
