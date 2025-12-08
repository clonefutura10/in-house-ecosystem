'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlusCircle } from 'lucide-react'

interface EmployeeDashboardProps {
    userName: string
}

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'

interface Task {
    id: string
    title: string
    dueDate: string
    status: TaskStatus
    isOverdue: boolean
}

// Mock data for demo - in production, this would come from the database
const highPriorityTasks: Task[] = [
    {
        id: '1',
        title: 'Finalize Q4 Marketing Report',
        dueDate: 'Nov 15, 2023',
        status: 'in_progress',
        isOverdue: true,
    },
    {
        id: '2',
        title: 'Review New UX Designs',
        dueDate: 'Nov 22, 2023',
        status: 'todo',
        isOverdue: false,
    },
    {
        id: '3',
        title: 'Prepare Presentation for Client Meeting',
        dueDate: 'Nov 25, 2023',
        status: 'in_progress',
        isOverdue: false,
    },
]

const stats = {
    tasksCompletedThisMonth: 28,
    pendingReviews: 4,
    tasksDueToday: 5,
}

function getStatusBadge(status: TaskStatus) {
    const variants: Record<TaskStatus, { label: string; className: string }> = {
        todo: {
            label: 'Not Started',
            className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        },
        in_progress: {
            label: 'In Progress',
            className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        },
        review: {
            label: 'In Review',
            className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        },
        done: {
            label: 'Completed',
            className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        },
        blocked: {
            label: 'Blocked',
            className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        },
    }

    const { label, className } = variants[status]
    return (
        <Badge variant="secondary" className={className}>
            {label}
        </Badge>
    )
}

export function EmployeeDashboard({ userName }: EmployeeDashboardProps) {
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
                    Hello, {firstName}. You have{' '}
                    <span className="font-semibold text-[#1387ec]">
                        {stats.tasksDueToday} tasks
                    </span>{' '}
                    due today.
                </p>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Tasks */}
                <div className="lg:col-span-2 flex flex-col gap-8">
                    {/* High Priority Tasks */}
                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <CardHeader className="border-b border-slate-200 dark:border-slate-800">
                            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                                High Priority
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-200 dark:divide-slate-800">
                                {highPriorityTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="grid grid-cols-3 gap-4 p-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                    >
                                        <p className="font-medium text-slate-800 dark:text-slate-200 col-span-2 md:col-span-1">
                                            {task.title}
                                        </p>
                                        <p
                                            className={`font-medium text-sm ${task.isOverdue
                                                    ? 'text-red-500'
                                                    : 'text-slate-600 dark:text-slate-400'
                                                }`}
                                        >
                                            {task.dueDate}
                                        </p>
                                        <div className="text-right">{getStatusBadge(task.status)}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Create New Task Button */}
                    <Link
                        href="/tasks/new"
                        className="flex items-center justify-center gap-3 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                        <PlusCircle className="h-8 w-8 text-[#1387ec]" />
                        <span className="text-lg font-semibold text-[#1387ec]">
                            Create New Task
                        </span>
                    </Link>
                </div>

                {/* Right Column - Stats */}
                <div className="flex flex-col gap-8">
                    {/* Tasks Completed This Month */}
                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <CardContent className="p-6">
                            <h3 className="text-base font-medium text-slate-600 dark:text-slate-400 mb-2">
                                My Tasks Completed This Month
                            </h3>
                            <p className="text-4xl font-bold text-slate-900 dark:text-white">
                                {stats.tasksCompletedThisMonth}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Pending Reviews */}
                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <CardContent className="p-6">
                            <h3 className="text-base font-medium text-slate-600 dark:text-slate-400 mb-2">
                                Pending Reviews
                            </h3>
                            <p className="text-4xl font-bold text-slate-900 dark:text-white">
                                {stats.pendingReviews}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
