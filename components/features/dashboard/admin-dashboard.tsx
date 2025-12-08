'use client'

import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, ListTodo, Clock, CalendarClock, CheckCircle } from 'lucide-react'
import type { Database } from '@/types/supabase'

type Task = Database['public']['Tables']['tasks']['Row'] & {
    assignee?: {
        id: string
        full_name: string
        avatar_url: string | null
    } | null
}

interface AdminStats {
    totalEmployees: number
    activeTasks: number
    pendingReviews: number
    upcomingDeadlines: number
    completedThisMonth: number
    totalTasksThisMonth: number
}

interface AdminDashboardProps {
    userName: string
    stats: AdminStats
    recentActivity: Task[]
}

function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
}

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function getActivityDescription(task: Task): string {
    if (!task.status) return 'was updated'

    switch (task.status) {
        case 'done':
            return 'was completed'
        case 'in_progress':
            return 'is in progress'
        case 'review':
            return 'is awaiting review'
        case 'blocked':
            return 'is blocked'
        default:
            return 'was updated'
    }
}

export function AdminDashboard({ userName, stats, recentActivity }: AdminDashboardProps) {
    const greeting = getGreeting()
    const firstName = userName.split(' ')[0]

    const statCards = [
        { title: 'Total Employees', value: stats.totalEmployees, icon: Users },
        { title: 'Active Tasks', value: stats.activeTasks, icon: ListTodo },
        { title: 'Pending Reviews', value: stats.pendingReviews, icon: Clock },
        { title: 'Upcoming Deadlines', value: stats.upcomingDeadlines, icon: CalendarClock },
    ]

    // Calculate completion rate
    const completionRate = stats.totalTasksThisMonth > 0
        ? Math.round((stats.completedThisMonth / stats.totalTasksThisMonth) * 100)
        : 0

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    {greeting}, {firstName}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Here&apos;s what&apos;s happening with your team today.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat) => {
                    const Icon = stat.icon
                    return (
                        <Card key={stat.title} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <h2 className="font-medium text-slate-600 dark:text-slate-400">
                                        {stat.title}
                                    </h2>
                                    <Icon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                                </div>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                                    {stat.value}
                                </p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* This Month's Summary */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardHeader>
                    <CardTitle className="text-slate-800 dark:text-slate-200">
                        This Month&apos;s Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-6">
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <p className="text-4xl font-bold text-slate-900 dark:text-white">
                                {stats.completedThisMonth}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Tasks Completed
                            </p>
                        </div>
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <p className="text-4xl font-bold text-slate-900 dark:text-white">
                                {stats.totalTasksThisMonth}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Total Tasks
                            </p>
                        </div>
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <p className="text-4xl font-bold text-slate-900 dark:text-white">
                                {completionRate}%
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Completion Rate
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardHeader>
                    <CardTitle className="text-slate-800 dark:text-slate-200">
                        Recent Task Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {recentActivity.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                            <p>No recent activity</p>
                        </div>
                    ) : (
                        <ul className="space-y-4">
                            {recentActivity.map((task, index) => (
                                <li
                                    key={task.id}
                                    className={`flex items-center justify-between py-2 ${index !== recentActivity.length - 1
                                        ? 'border-b border-slate-100 dark:border-slate-800'
                                        : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="size-8">
                                            <AvatarImage src={task.assignee?.avatar_url || undefined} />
                                            <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">
                                                {task.assignee ? getInitials(task.assignee.full_name) : '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">
                                            <span className="font-medium text-slate-800 dark:text-slate-100">
                                                {task.title}
                                            </span>{' '}
                                            {getActivityDescription(task)}
                                            {task.assignee && (
                                                <span className="text-slate-500">
                                                    {' '}by {task.assignee.full_name}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {task.updated_at && formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
