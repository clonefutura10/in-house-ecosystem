'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Plus, Pencil, Ban, MoreVertical, UserCheck } from 'lucide-react'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

interface TeamPageClientProps {
    employees: Profile[]
    isAdmin: boolean
    currentUserId: string
}

export function TeamPageClient({ employees, isAdmin, currentUserId }: TeamPageClientProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [isUpdating, setIsUpdating] = useState<string | null>(null)

    const filteredEmployees = employees.filter((emp) => {
        const searchLower = searchQuery.toLowerCase()
        return (
            emp.full_name.toLowerCase().includes(searchLower) ||
            emp.email.toLowerCase().includes(searchLower) ||
            (emp.department?.toLowerCase().includes(searchLower) ?? false) ||
            (emp.job_title?.toLowerCase().includes(searchLower) ?? false)
        )
    })

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const handleToggleStatus = async (employee: Profile) => {
        if (!isAdmin) return

        setIsUpdating(employee.id)
        const supabase = createClient()

        const newStatus = employee.status === 'active' ? 'inactive' : 'active'

        const { error } = await supabase
            .from('profiles')
            .update({ status: newStatus })
            .eq('id', employee.id)

        if (error) {
            console.error('Error updating status:', error)
        } else {
            router.refresh()
        }

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
                <Link
                    href="/team"
                    className="text-slate-500 dark:text-slate-400 text-base font-medium hover:text-[#1387ec]"
                >
                    Users
                </Link>
                <span className="text-slate-500 dark:text-slate-400">/</span>
                <span className="text-slate-900 dark:text-slate-100 text-base font-medium">
                    Employee Directory
                </span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-slate-900 dark:text-white text-2xl font-semibold tracking-tight">
                    Employee Directory
                </h1>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            type="search"
                            placeholder="Search employees..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                        />
                    </div>
                    {/* Add Employee - Admin only */}
                    {isAdmin && (
                        <Button className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white whitespace-nowrap">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Employee
                        </Button>
                    )}
                </div>
            </div>

            {/* Employees Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-800">
                            <TableHead className="min-w-[250px]">Name</TableHead>
                            <TableHead>Job Title</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredEmployees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-slate-500">
                                    {searchQuery ? 'No employees found matching your search.' : 'No employees yet.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredEmployees.map((employee) => (
                                <TableRow
                                    key={employee.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={employee.avatar_url || undefined} alt={employee.full_name} />
                                                <AvatarFallback className="bg-[#1387ec] text-white text-sm">
                                                    {getInitials(employee.full_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium text-slate-900 dark:text-white">
                                                    {employee.full_name}
                                                    {employee.id === currentUserId && (
                                                        <span className="ml-2 text-xs text-slate-400">(You)</span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                                    {employee.email}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-600 dark:text-slate-300">
                                        {employee.job_title || '—'}
                                    </TableCell>
                                    <TableCell className="text-slate-600 dark:text-slate-300">
                                        {employee.department || '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="secondary"
                                            className={
                                                employee.role === 'admin'
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                    : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                                            }
                                        >
                                            {employee.role === 'admin' ? 'Admin' : 'Employee'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="secondary"
                                            className={
                                                employee.status === 'active'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : employee.status === 'inactive'
                                                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                            }
                                        >
                                            <span
                                                className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${employee.status === 'active'
                                                        ? 'bg-green-500'
                                                        : employee.status === 'inactive'
                                                            ? 'bg-red-500'
                                                            : 'bg-yellow-500'
                                                    }`}
                                            />
                                            {employee.status === 'active' ? 'Active' : employee.status === 'inactive' ? 'Inactive' : 'Suspended'}
                                        </Badge>
                                    </TableCell>
                                    {isAdmin && (
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-2">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem>
                                                            <Pencil className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleToggleStatus(employee)}
                                                            disabled={isUpdating === employee.id || employee.id === currentUserId}
                                                        >
                                                            {employee.status === 'active' ? (
                                                                <>
                                                                    <Ban className="h-4 w-4 mr-2" />
                                                                    Deactivate
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <UserCheck className="h-4 w-4 mr-2" />
                                                                    Activate
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
