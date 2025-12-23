'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import {
    Search,
    Target,
    CheckCircle2,
    Clock,
    AlertCircle,
    BarChart3,
    Download,
    RefreshCw,
    Star,
    FileText,
    Users,
    Award,
    Loader2,
    Calendar,
    Edit,
    TrendingUp,
} from 'lucide-react'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

interface PerformanceMetric {
    id: string
    user_id: string
    period_start: string
    period_end: string
    tasks_assigned: number
    tasks_completed: number
    tasks_on_time: number
    tasks_overdue: number
    completion_rate: number
    on_time_rate: number
    overall_score: number
    incentive_percentage: number
    attendance_rate: number
    quality_rating: number
    manager_notes: string | null
    user?: {
        id: string
        full_name: string
        email: string
        avatar_url: string | null
        department: string | null
    }
}

interface Appraisal {
    id: string
    user_id: string
    reviewer_id: string
    period: string
    period_year: number
    period_number: number
    productivity_score: number
    quality_score: number
    teamwork_score: number
    communication_score: number
    initiative_score: number
    overall_score: number
    strengths: string | null
    areas_for_improvement: string | null
    goals_for_next_period: string | null
    manager_comments: string | null
    status: string
    is_published: boolean
    user?: {
        id: string
        full_name: string
        email: string
        avatar_url: string | null
    }
    reviewer?: {
        id: string
        full_name: string
    }
}

interface Task {
    id: string
    status: string
    assigned_to: string | null
    due_date: string | null
    updated_at: string | null
    created_at: string | null
}

interface PerformancePageClientProps {
    currentUser: Profile | null
    isAdmin: boolean
    employees: Partial<Profile>[]
    performanceMetrics: PerformanceMetric[]
    appraisals: Appraisal[]
    tasks: Task[]
}

const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-blue-600 dark:text-blue-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
}

const getScoreBadge = (score: number) => {
    if (score >= 85) return { label: 'Excellent', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' }
    if (score >= 70) return { label: 'Good', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' }
    if (score >= 50) return { label: 'Average', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' }
    return { label: 'Needs Improvement', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' }
}

const getQualityStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
        <Star
            key={i}
            className={`h-3 w-3 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
        />
    ))
}

export function PerformancePageClient({
    currentUser,
    isAdmin,
    employees,
    performanceMetrics,
    appraisals,
    tasks,
}: PerformancePageClientProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedPeriod, setSelectedPeriod] = useState('monthly')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isAppraisalDialogOpen, setIsAppraisalDialogOpen] = useState(false)
    const [isEditMetricsDialogOpen, setIsEditMetricsDialogOpen] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
    const [selectedMetric, setSelectedMetric] = useState<PerformanceMetric | null>(null)
    const [publishingAppraisalId, setPublishingAppraisalId] = useState<string | null>(null)

    // Form states
    const [appraisalForm, setAppraisalForm] = useState({
        productivity: 3,
        quality: 3,
        teamwork: 3,
        communication: 3,
        initiative: 3,
        strengths: '',
        improvements: '',
        goals: '',
        comments: '',
    })

    const [metricsForm, setMetricsForm] = useState({
        attendance_rate: 100,
        quality_rating: 3,
        manager_notes: '',
    })

    // Get current user's metrics for employee view
    const myMetrics = useMemo(() => {
        if (isAdmin) return null
        return performanceMetrics.find(m => m.user_id === currentUser?.id)
    }, [performanceMetrics, currentUser, isAdmin])

    const myAppraisals = useMemo(() => {
        if (isAdmin) return []
        return appraisals.filter(a => a.user_id === currentUser?.id && a.is_published)
    }, [appraisals, currentUser, isAdmin])

    // Calculate summary stats
    const summaryStats = useMemo(() => {
        const activeEmployees = employees.filter(e => e.status === 'active' && e.role === 'employee')
        const completedTasks = tasks.filter(t => t.status === 'done').length
        const totalTasks = tasks.length
        const overdueTasks = tasks.filter(t =>
            t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
        ).length

        const avgScore = performanceMetrics.length > 0
            ? performanceMetrics.reduce((sum, m) => sum + (m.overall_score || 0), 0) / performanceMetrics.length
            : 0

        return {
            totalEmployees: activeEmployees.length,
            completedTasks,
            totalTasks,
            overdueTasks,
            avgPerformanceScore: Math.round(avgScore),
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        }
    }, [employees, tasks, performanceMetrics])

    // Filter metrics
    const filteredMetrics = useMemo(() => {
        return performanceMetrics.filter(metric => {
            const matchesSearch = !searchQuery ||
                metric.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                metric.user?.department?.toLowerCase().includes(searchQuery.toLowerCase())
            return matchesSearch
        })
    }, [performanceMetrics, searchQuery])

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    const handleGenerateReport = async () => {
        setIsGenerating(true)
        const supabase = createClient()

        // Determine which function to call based on period
        const functionName = selectedPeriod === 'quarterly'
            ? 'generate_quarterly_performance'
            : 'generate_monthly_performance'

        const params = selectedPeriod === 'quarterly'
            ? { p_year: new Date().getFullYear(), p_quarter: Math.ceil((new Date().getMonth() + 1) / 3) }
            : { p_year: new Date().getFullYear(), p_month: new Date().getMonth() + 1 }

        const { data, error } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(
            functionName,
            params
        )

        if (error) {
            console.error('Error generating report:', error)
            // Fallback to monthly if quarterly doesn't exist
            if (selectedPeriod === 'quarterly') {
                const { data: monthlyData, error: monthlyError } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(
                    'generate_monthly_performance',
                    { p_year: new Date().getFullYear(), p_month: new Date().getMonth() + 1 }
                )
                if (!monthlyError) {
                    console.log('Fallback to monthly report:', monthlyData)
                    router.refresh()
                }
            }
        } else {
            console.log('Report generated:', data)
            router.refresh()
        }

        setIsGenerating(false)
    }

    const handleCreateAppraisal = async () => {
        if (!selectedEmployee) return

        const supabase = createClient()
        const { error } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(
            'upsert_appraisal',
            {
                p_user_id: selectedEmployee,
                p_period: selectedPeriod,
                p_period_year: new Date().getFullYear(),
                p_period_number: selectedPeriod === 'quarterly'
                    ? Math.ceil((new Date().getMonth() + 1) / 3)
                    : new Date().getMonth() + 1,
                p_productivity_score: appraisalForm.productivity,
                p_quality_score: appraisalForm.quality,
                p_teamwork_score: appraisalForm.teamwork,
                p_communication_score: appraisalForm.communication,
                p_initiative_score: appraisalForm.initiative,
                p_strengths: appraisalForm.strengths || null,
                p_areas_for_improvement: appraisalForm.improvements || null,
                p_goals: appraisalForm.goals || null,
                p_comments: appraisalForm.comments || null,
            }
        )

        if (error) {
            console.error('Error creating appraisal:', error)
        } else {
            setIsAppraisalDialogOpen(false)
            setSelectedEmployee(null)
            setAppraisalForm({
                productivity: 3, quality: 3, teamwork: 3, communication: 3, initiative: 3,
                strengths: '', improvements: '', goals: '', comments: '',
            })
            router.refresh()
        }
    }

    const handleUpdateMetrics = async () => {
        if (!selectedMetric) return

        const supabase = createClient()

        // Update performance_metrics with quality rating and attendance
        const { error } = await supabase
            .from('performance_metrics' as 'profiles')
            .update({
                attendance_rate: metricsForm.attendance_rate,
                quality_rating: metricsForm.quality_rating,
                manager_notes: metricsForm.manager_notes || null,
                reviewed_by: currentUser?.id,
                reviewed_at: new Date().toISOString(),
            } as never)
            .eq('id', selectedMetric.id)

        if (error) {
            console.error('Error updating metrics:', error)
        } else {
            setIsEditMetricsDialogOpen(false)
            setSelectedMetric(null)
            router.refresh()
        }
    }

    const openEditMetricsDialog = (metric: PerformanceMetric) => {
        setSelectedMetric(metric)
        setMetricsForm({
            attendance_rate: metric.attendance_rate || 100,
            quality_rating: metric.quality_rating || 3,
            manager_notes: metric.manager_notes || '',
        })
        setIsEditMetricsDialogOpen(true)
    }

    const handlePublishAppraisal = async (appraisalId: string) => {
        setPublishingAppraisalId(appraisalId)
        const supabase = createClient()

        // Direct update instead of RPC - more reliable
        const { error } = await supabase
            .from('appraisals' as 'profiles') // Type workaround
            .update({
                is_published: true,
                status: 'published',
                published_at: new Date().toISOString(),
            } as never)
            .eq('id', appraisalId)

        if (error) {
            console.error('Error publishing appraisal:', error.message, error)
            alert(`Failed to publish: ${error.message}`)
        } else {
            router.refresh()
        }
        setPublishingAppraisalId(null)
    }

    const handleExportReport = () => {
        const headers = ['Employee', 'Department', 'Period', 'Tasks Completed', 'Completion Rate', 'On-Time Rate', 'Quality Rating', 'Attendance', 'Overall Score', 'Incentive %']
        const rows = filteredMetrics.map(m => [
            m.user?.full_name || 'Unknown',
            m.user?.department || '-',
            `${format(new Date(m.period_start), 'MMM yyyy')}`,
            m.tasks_completed,
            `${m.completion_rate}%`,
            `${m.on_time_rate}%`,
            `${m.quality_rating}/5`,
            `${m.attendance_rate}%`,
            m.overall_score,
            `${m.incentive_percentage}%`,
        ])

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `performance-report-${format(new Date(), 'yyyy-MM')}.csv`
        a.click()
    }

    // ========================================
    // EMPLOYEE VIEW (Non-Admin)
    // ========================================
    if (!isAdmin) {
        return (
            <div className="space-y-6">
                {/* Breadcrumbs */}
                <div className="flex flex-wrap gap-2">
                    <Link href="/dashboard" className="text-slate-500 dark:text-slate-400 text-base font-medium hover:text-[#1387ec]">
                        Home
                    </Link>
                    <span className="text-slate-500 dark:text-slate-400">/</span>
                    <span className="text-slate-900 dark:text-slate-100 text-base font-medium">
                        My Performance
                    </span>
                </div>

                {/* Header */}
                <div>
                    <h1 className="text-slate-900 dark:text-white text-2xl font-semibold tracking-tight">
                        My Performance Summary
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        View your performance metrics and appraisals
                    </p>
                </div>

                {/* My Performance Card */}
                {myMetrics ? (
                    <Card className="border-2 border-[#1387ec]/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-[#1387ec]" />
                                Current Month Performance
                            </CardTitle>
                            <CardDescription>
                                {format(new Date(myMetrics.period_start), 'MMMM yyyy')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <p className="text-3xl font-bold text-[#1387ec]">{myMetrics.tasks_completed}</p>
                                    <p className="text-sm text-slate-500">Tasks Completed</p>
                                    <p className="text-xs text-slate-400">of {myMetrics.tasks_assigned} assigned</p>
                                </div>
                                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <p className={`text-3xl font-bold ${getScoreColor(myMetrics.completion_rate)}`}>
                                        {myMetrics.completion_rate}%
                                    </p>
                                    <p className="text-sm text-slate-500">Completion Rate</p>
                                    <Progress value={myMetrics.completion_rate} className="mt-2 h-1.5" />
                                </div>
                                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <p className={`text-3xl font-bold ${getScoreColor(myMetrics.on_time_rate)}`}>
                                        {myMetrics.on_time_rate}%
                                    </p>
                                    <p className="text-sm text-slate-500">On-Time Rate</p>
                                    <Progress value={myMetrics.on_time_rate} className="mt-2 h-1.5" />
                                </div>
                                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <p className={`text-3xl font-bold ${getScoreColor(myMetrics.overall_score)}`}>
                                        {myMetrics.overall_score}
                                    </p>
                                    <p className="text-sm text-slate-500">Overall Score</p>
                                    <Badge className={`mt-2 ${getScoreBadge(myMetrics.overall_score).color}`}>
                                        {getScoreBadge(myMetrics.overall_score).label}
                                    </Badge>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mt-6">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-500">Quality Rating</span>
                                        <div className="flex gap-0.5">{getQualityStars(myMetrics.quality_rating)}</div>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-500">Attendance</span>
                                        <span className="font-medium">{myMetrics.attendance_rate}%</span>
                                    </div>
                                </div>
                            </div>

                            {myMetrics.incentive_percentage > 0 && (
                                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Award className="h-5 w-5 text-green-600" />
                                            <span className="font-medium text-green-800 dark:text-green-300">Incentive Earned</span>
                                        </div>
                                        <span className="text-2xl font-bold text-green-600">+{myMetrics.incentive_percentage}%</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="py-12 text-center text-slate-500">
                            No performance data available yet. Check back after your manager generates the report.
                        </CardContent>
                    </Card>
                )}

                {/* My Appraisals */}
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">My Appraisals</h2>
                    {myAppraisals.length === 0 ? (
                        <Card>
                            <CardContent className="py-8 text-center text-slate-500">
                                No published appraisals yet.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {myAppraisals.map((appraisal) => (
                                <Card key={appraisal.id}>
                                    <CardHeader>
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-base">
                                                {appraisal.period} Review - {appraisal.period_year}
                                            </CardTitle>
                                            <Badge className="bg-green-100 text-green-800">Published</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-5 gap-4 mb-4">
                                            {[
                                                { label: 'Productivity', value: appraisal.productivity_score },
                                                { label: 'Quality', value: appraisal.quality_score },
                                                { label: 'Teamwork', value: appraisal.teamwork_score },
                                                { label: 'Communication', value: appraisal.communication_score },
                                                { label: 'Initiative', value: appraisal.initiative_score },
                                            ].map((item) => (
                                                <div key={item.label} className="text-center">
                                                    <p className="text-lg font-bold">{item.value}/5</p>
                                                    <p className="text-xs text-slate-500">{item.label}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                            <span className="text-sm font-medium">Overall Score</span>
                                            <span className={`text-xl font-bold ${getScoreColor(appraisal.overall_score * 20)}`}>
                                                {appraisal.overall_score.toFixed(1)}/5
                                            </span>
                                        </div>
                                        {appraisal.strengths && (
                                            <div className="mt-4">
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Strengths</p>
                                                <p className="text-sm text-slate-500 mt-1">{appraisal.strengths}</p>
                                            </div>
                                        )}
                                        {appraisal.areas_for_improvement && (
                                            <div className="mt-4">
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Areas for Improvement</p>
                                                <p className="text-sm text-slate-500 mt-1">{appraisal.areas_for_improvement}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // ========================================
    // ADMIN/MANAGER VIEW
    // ========================================
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
                    Performance
                </span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-slate-900 dark:text-white text-2xl font-semibold tracking-tight">
                        Performance Management
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Track performance metrics, appraisals, and incentives
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-[130px] bg-white dark:bg-slate-900">
                            <Calendar className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        onClick={handleExportReport}
                        disabled={filteredMetrics.length === 0}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                    <Button
                        className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white"
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Generate Report
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {summaryStats.totalEmployees}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Employees</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {summaryStats.completedTasks}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Completed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {summaryStats.totalTasks - summaryStats.completedTasks}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">In Progress</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {summaryStats.overdueTasks}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Overdue</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {summaryStats.completionRate}%
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Completion</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {summaryStats.avgPerformanceScore}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Avg Score</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for different views */}
            <Tabs defaultValue="metrics" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="metrics" className="gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Performance Metrics
                    </TabsTrigger>
                    <TabsTrigger value="appraisals" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Appraisals
                    </TabsTrigger>
                    <TabsTrigger value="team" className="gap-2">
                        <Users className="h-4 w-4" />
                        Team Overview
                    </TabsTrigger>
                </TabsList>

                {/* Performance Metrics Tab */}
                <TabsContent value="metrics" className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                type="search"
                                placeholder="Search employees..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-white dark:bg-slate-900"
                            />
                        </div>
                    </div>

                    {/* Metrics Table */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 dark:bg-slate-800">
                                    <TableHead className="min-w-[200px]">Employee</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead className="text-center">Tasks</TableHead>
                                    <TableHead className="text-center">Completion</TableHead>
                                    <TableHead className="text-center">On-Time</TableHead>
                                    <TableHead className="text-center">Quality</TableHead>
                                    <TableHead className="text-center">Attendance</TableHead>
                                    <TableHead className="text-center">Score</TableHead>
                                    <TableHead className="text-center">Incentive</TableHead>
                                    <TableHead className="text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMetrics.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                                            No performance data available. Click &quot;Generate Report&quot; to calculate metrics.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredMetrics.map((metric) => {
                                        const scoreBadge = getScoreBadge(metric.overall_score)
                                        return (
                                            <TableRow key={metric.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={metric.user?.avatar_url || undefined} />
                                                            <AvatarFallback className="text-xs bg-[#1387ec] text-white">
                                                                {getInitials(metric.user?.full_name || 'U')}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium text-slate-900 dark:text-white">
                                                                {metric.user?.full_name}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {metric.user?.department || 'No department'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-600 dark:text-slate-300">
                                                    {format(new Date(metric.period_start), 'MMM yyyy')}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="font-medium">{metric.tasks_completed}</span>
                                                    <span className="text-slate-400">/{metric.tasks_assigned}</span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`font-medium ${getScoreColor(metric.completion_rate)}`}>
                                                            {metric.completion_rate}%
                                                        </span>
                                                        <Progress value={metric.completion_rate} className="w-16 h-1.5" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`font-medium ${getScoreColor(metric.on_time_rate)}`}>
                                                            {metric.on_time_rate}%
                                                        </span>
                                                        <Progress value={metric.on_time_rate} className="w-16 h-1.5" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center gap-0.5">
                                                        {getQualityStars(metric.quality_rating)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className={`font-medium ${getScoreColor(metric.attendance_rate)}`}>
                                                        {metric.attendance_rate}%
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className={scoreBadge.color}>
                                                        {metric.overall_score}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="font-medium text-green-600 dark:text-green-400">
                                                        +{metric.incentive_percentage}%
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditMetricsDialog(metric)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                {/* Appraisals Tab */}
                <TabsContent value="appraisals" className="space-y-4">
                    <div className="flex justify-end">
                        <Button
                            className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white"
                            onClick={() => setIsAppraisalDialogOpen(true)}
                        >
                            <Star className="h-4 w-4 mr-2" />
                            New Appraisal
                        </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {appraisals.length === 0 ? (
                            <Card className="col-span-full">
                                <CardContent className="py-12 text-center text-slate-500">
                                    No appraisals yet. Click &quot;New Appraisal&quot; to create one.
                                </CardContent>
                            </Card>
                        ) : (
                            appraisals.map((appraisal) => (
                                <Card key={appraisal.id}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={appraisal.user?.avatar_url || undefined} />
                                                    <AvatarFallback className="bg-[#1387ec] text-white">
                                                        {getInitials(appraisal.user?.full_name || 'U')}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <CardTitle className="text-base">{appraisal.user?.full_name}</CardTitle>
                                                    <CardDescription>
                                                        {appraisal.period} - {appraisal.period_year}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <Badge className={appraisal.is_published
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                            }>
                                                {appraisal.is_published ? 'Published' : 'Draft'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-500">Overall Score</span>
                                                <span className={`text-lg font-bold ${getScoreColor(appraisal.overall_score * 20)}`}>
                                                    {appraisal.overall_score.toFixed(1)}/5
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-5 gap-1">
                                                {[
                                                    { label: 'P', value: appraisal.productivity_score },
                                                    { label: 'Q', value: appraisal.quality_score },
                                                    { label: 'T', value: appraisal.teamwork_score },
                                                    { label: 'C', value: appraisal.communication_score },
                                                    { label: 'I', value: appraisal.initiative_score },
                                                ].map((item) => (
                                                    <div key={item.label} className="text-center">
                                                        <div className="text-xs text-slate-400">{item.label}</div>
                                                        <div className="text-sm font-medium">{item.value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            {appraisal.manager_comments && (
                                                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mt-2">
                                                    &quot;{appraisal.manager_comments}&quot;
                                                </p>
                                            )}
                                            {!appraisal.is_published && (
                                                <Button
                                                    size="sm"
                                                    className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => handlePublishAppraisal(appraisal.id)}
                                                    disabled={publishingAppraisalId === appraisal.id}
                                                >
                                                    {publishingAppraisalId === appraisal.id ? (
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                                    )}
                                                    Publish to Employee
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                {/* Team Overview Tab */}
                <TabsContent value="team" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {employees.filter(e => e.role === 'employee' && e.status === 'active').map((employee) => {
                            const empMetrics = performanceMetrics.find(m => m.user_id === employee.id)
                            const empTasks = tasks.filter(t => t.assigned_to === employee.id)
                            const completedCount = empTasks.filter(t => t.status === 'done').length

                            return (
                                <Card key={employee.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={employee.avatar_url || undefined} />
                                                <AvatarFallback className="bg-[#1387ec] text-white">
                                                    {getInitials(employee.full_name || 'U')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-slate-900 dark:text-white truncate">
                                                    {employee.full_name}
                                                </h3>
                                                <p className="text-sm text-slate-500 truncate">
                                                    {employee.job_title || employee.department || 'Employee'}
                                                </p>
                                                <div className="flex items-center gap-4 mt-3">
                                                    <div className="text-center">
                                                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                                                            {completedCount}
                                                        </p>
                                                        <p className="text-xs text-slate-500">Tasks Done</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className={`text-lg font-bold ${getScoreColor(empMetrics?.overall_score || 0)}`}>
                                                            {empMetrics?.overall_score || '-'}
                                                        </p>
                                                        <p className="text-xs text-slate-500">Score</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="flex justify-center gap-0.5">
                                                            {getQualityStars(empMetrics?.quality_rating || 0)}
                                                        </div>
                                                        <p className="text-xs text-slate-500">Quality</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-lg font-bold text-green-600">
                                                            {empMetrics?.incentive_percentage || 0}%
                                                        </p>
                                                        <p className="text-xs text-slate-500">Incentive</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Edit Metrics Dialog */}
            <Dialog open={isEditMetricsDialogOpen} onOpenChange={setIsEditMetricsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Performance Metrics</DialogTitle>
                        <DialogDescription>
                            Update quality rating, attendance, and add manager notes.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Quality Rating</Label>
                                <span className="text-sm font-medium">{metricsForm.quality_rating}/5</span>
                            </div>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                    <button
                                        key={rating}
                                        type="button"
                                        onClick={() => setMetricsForm(prev => ({ ...prev, quality_rating: rating }))}
                                        className={`p-2 rounded-lg transition-colors ${rating <= metricsForm.quality_rating
                                            ? 'bg-yellow-100 text-yellow-600'
                                            : 'bg-slate-100 text-slate-400'
                                            }`}
                                    >
                                        <Star className={`h-5 w-5 ${rating <= metricsForm.quality_rating ? 'fill-current' : ''}`} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <Label>Attendance Rate (%)</Label>
                                <span className="text-sm font-medium">{metricsForm.attendance_rate}%</span>
                            </div>
                            <Slider
                                value={[metricsForm.attendance_rate]}
                                onValueChange={([value]) => setMetricsForm(prev => ({ ...prev, attendance_rate: value }))}
                                min={0}
                                max={100}
                                step={1}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Manager Notes</Label>
                            <Textarea
                                value={metricsForm.manager_notes}
                                onChange={(e) => setMetricsForm(prev => ({ ...prev, manager_notes: e.target.value }))}
                                placeholder="Add notes about this employee's performance..."
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditMetricsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white"
                            onClick={handleUpdateMetrics}
                        >
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Appraisal Dialog */}
            <Dialog open={isAppraisalDialogOpen} onOpenChange={setIsAppraisalDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create Performance Appraisal</DialogTitle>
                        <DialogDescription>
                            Rate the employee&apos;s performance across different categories.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label>Select Employee</Label>
                            <Select value={selectedEmployee || ''} onValueChange={setSelectedEmployee}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose an employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.filter(e => e.role === 'employee').map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id!}>
                                            {emp.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-4">
                            {[
                                { key: 'productivity', label: 'Productivity' },
                                { key: 'quality', label: 'Quality of Work' },
                                { key: 'teamwork', label: 'Teamwork' },
                                { key: 'communication', label: 'Communication' },
                                { key: 'initiative', label: 'Initiative' },
                            ].map((item) => (
                                <div key={item.key} className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>{item.label}</Label>
                                        <span className="text-sm font-medium">
                                            {appraisalForm[item.key as keyof typeof appraisalForm]}/5
                                        </span>
                                    </div>
                                    <Slider
                                        value={[appraisalForm[item.key as keyof typeof appraisalForm] as number]}
                                        onValueChange={([value]) => setAppraisalForm(prev => ({
                                            ...prev,
                                            [item.key]: value
                                        }))}
                                        min={1}
                                        max={5}
                                        step={0.5}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <Label>Strengths</Label>
                            <Textarea
                                value={appraisalForm.strengths}
                                onChange={(e) => setAppraisalForm(prev => ({ ...prev, strengths: e.target.value }))}
                                placeholder="What are their key strengths?"
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Areas for Improvement</Label>
                            <Textarea
                                value={appraisalForm.improvements}
                                onChange={(e) => setAppraisalForm(prev => ({ ...prev, improvements: e.target.value }))}
                                placeholder="What areas need improvement?"
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Goals for Next Period</Label>
                            <Textarea
                                value={appraisalForm.goals}
                                onChange={(e) => setAppraisalForm(prev => ({ ...prev, goals: e.target.value }))}
                                placeholder="Set goals for the next review period"
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Manager Comments</Label>
                            <Textarea
                                value={appraisalForm.comments}
                                onChange={(e) => setAppraisalForm(prev => ({ ...prev, comments: e.target.value }))}
                                placeholder="Additional comments"
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAppraisalDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white"
                            onClick={handleCreateAppraisal}
                            disabled={!selectedEmployee}
                        >
                            Save Appraisal
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
