'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
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
import { Search, Bell, Mail, MessageSquare, Hash, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import type { Database } from '@/types/supabase'

type NotificationChannel = Database['public']['Enums']['notification_channel']

type Notification = Database['public']['Tables']['notifications']['Row'] & {
    recipient?: {
        id: string
        full_name: string
        email: string
        avatar_url: string | null
    } | null
}

interface NotificationsPageClientProps {
    notifications: Notification[]
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: {
        label: 'Pending',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
        icon: Clock,
    },
    sent: {
        label: 'Sent',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
        icon: CheckCircle2,
    },
    failed: {
        label: 'Failed',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
        icon: XCircle,
    },
    processing: {
        label: 'Processing',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
        icon: Loader2,
    },
}

const channelConfig: Record<NotificationChannel, { label: string; icon: React.ElementType; color: string }> = {
    system: {
        label: 'System',
        icon: Bell,
        color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    },
    email: {
        label: 'Email',
        icon: Mail,
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
    },
    slack: {
        label: 'Slack',
        icon: Hash,
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200',
    },
    whatsapp: {
        label: 'WhatsApp',
        icon: MessageSquare,
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200',
    },
}

export function NotificationsPageClient({ notifications }: NotificationsPageClientProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [channelFilter, setChannelFilter] = useState<string>('all')

    const filteredNotifications = notifications.filter((notification) => {
        const matchesSearch =
            notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (notification.recipient?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
        const matchesStatus = statusFilter === 'all' || notification.status === statusFilter
        const matchesChannel = channelFilter === 'all' || notification.channel === channelFilter
        return matchesSearch && matchesStatus && matchesChannel
    })

    const getInitials = (name: string) => {
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    }

    // Count stats
    const stats = {
        total: notifications.length,
        pending: notifications.filter((n) => n.status === 'pending').length,
        sent: notifications.filter((n) => n.status === 'sent').length,
        failed: notifications.filter((n) => n.status === 'failed').length,
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
                    Notifications
                </span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-slate-900 dark:text-white text-2xl font-semibold tracking-tight">
                        Notifications
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        View and manage all system notifications
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Total</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.total}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <p className="text-yellow-600 dark:text-yellow-400 text-sm">Pending</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.pending}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <p className="text-green-600 dark:text-green-400 text-sm">Sent</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.sent}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <p className="text-red-600 dark:text-red-400 text-sm">Failed</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.failed}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        type="search"
                        placeholder="Search notifications..."
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
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                    <SelectTrigger className="w-[140px] bg-white dark:bg-slate-900">
                        <SelectValue placeholder="Channel" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Channels</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="slack">Slack</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Notifications Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-800">
                            <TableHead className="w-[100px]">Status</TableHead>
                            <TableHead className="min-w-[250px]">Title / Message</TableHead>
                            <TableHead className="w-[100px]">Channel</TableHead>
                            <TableHead className="w-[180px]">Recipient</TableHead>
                            <TableHead className="w-[140px]">Scheduled</TableHead>
                            <TableHead className="w-[140px]">Sent At</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredNotifications.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                                    {searchQuery || statusFilter !== 'all' || channelFilter !== 'all'
                                        ? 'No notifications found matching your filters.'
                                        : 'No notifications yet.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredNotifications.map((notification) => {
                                const status = statusConfig[notification.status || 'pending']
                                const channel = channelConfig[notification.channel]
                                const StatusIcon = status?.icon || Clock
                                const ChannelIcon = channel?.icon || Bell

                                return (
                                    <TableRow
                                        key={notification.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    >
                                        <TableCell>
                                            <Badge variant="secondary" className={status?.color || ''}>
                                                <StatusIcon className="h-3 w-3 mr-1" />
                                                {status?.label || notification.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <p className="font-medium text-slate-900 dark:text-white truncate max-w-[300px]">
                                                    {notification.title}
                                                </p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[300px]">
                                                    {notification.message}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={channel?.color || ''}>
                                                <ChannelIcon className="h-3 w-3 mr-1" />
                                                {channel?.label || notification.channel}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {notification.recipient ? (
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={notification.recipient.avatar_url || undefined} />
                                                        <AvatarFallback className="text-xs bg-[#1387ec] text-white">
                                                            {getInitials(notification.recipient.full_name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                                                        {notification.recipient.full_name}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-sm">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                                            {notification.scheduled_for
                                                ? format(new Date(notification.scheduled_for), 'MMM d, h:mm a')
                                                : '—'}
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                                            {notification.sent_at
                                                ? format(new Date(notification.sent_at), 'MMM d, h:mm a')
                                                : '—'}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
