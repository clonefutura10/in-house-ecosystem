'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, ListTodo, Clock, CalendarClock } from 'lucide-react'

interface AdminDashboardProps {
    userName: string
}

// Mock data for demo - in production, this would come from the database
const stats = [
    { title: 'Total Employees', value: '1,254', icon: Users },
    { title: 'Active Tasks', value: '312', icon: ListTodo },
    { title: 'Pending Approvals', value: '48', icon: Clock },
    { title: 'Upcoming Deadlines', value: '12', icon: CalendarClock },
]

const recentActivity = [
    { name: 'Olivia Rhye', action: 'logged in.', time: '2m ago' },
    { name: 'Phoenix Baker', action: "updated task 'Q3 Marketing Plan'.", time: '15m ago' },
    { name: 'Lana Steiner', action: "requested approval for 'New Website Mockup'.", time: '45m ago' },
    { name: 'Alex Turner', action: 'logged out.', time: '1h ago' },
]

function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
}

export function AdminDashboard({ userName }: AdminDashboardProps) {
    const greeting = getGreeting()
    const firstName = userName.split(' ')[0]

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
                {stats.map((stat) => {
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

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                {/* Task Completion Rate Chart */}
                <Card className="xl:col-span-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-slate-800 dark:text-slate-200">
                            Task Completion Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 flex items-end">
                            {/* Simple SVG wave chart placeholder */}
                            <svg
                                className="w-full h-full"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 12"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    className="text-slate-900 dark:text-white"
                                    d="M0 8C1.5 8 2 4 4 4C6 4 6.5 8 8 8C9.5 8 10 4 12 4C14 4 14.5 8 16 8C17.5 8 18 4 20 4C22 4 22.5 8 24 8"
                                    vectorEffect="non-scaling-stroke"
                                />
                            </svg>
                        </div>
                    </CardContent>
                </Card>

                {/* Department Performance Chart */}
                <Card className="xl:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-slate-800 dark:text-slate-200">
                            Department Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 flex items-end justify-between gap-3">
                            {[60, 75, 90, 50, 80].map((height, index) => (
                                <div key={index} className="flex flex-col h-full justify-end w-full">
                                    <div
                                        className={`rounded-t-md transition-all ${height === 90
                                                ? 'bg-slate-900 dark:bg-slate-200'
                                                : 'bg-slate-200 dark:bg-slate-700'
                                            }`}
                                        style={{ height: `${height}%` }}
                                    />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardHeader>
                    <CardTitle className="text-slate-800 dark:text-slate-200">
                        Recent Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4">
                        {recentActivity.map((activity, index) => (
                            <li
                                key={index}
                                className={`flex items-center justify-between py-2 ${index !== recentActivity.length - 1
                                        ? 'border-b border-slate-100 dark:border-slate-800'
                                        : ''
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="size-8">
                                        <AvatarImage src={undefined} alt={activity.name} />
                                        <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">
                                            {activity.name.split(' ').map((n) => n[0]).join('')}
                                        </AvatarFallback>
                                    </Avatar>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        <span className="font-medium text-slate-800 dark:text-slate-100">
                                            {activity.name}
                                        </span>{' '}
                                        {activity.action}
                                    </p>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {activity.time}
                                </p>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}
