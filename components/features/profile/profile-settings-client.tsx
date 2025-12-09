'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Mail, Building, Briefcase, Calendar, Cake, Save } from 'lucide-react'

// Extended profile type with new date fields (will be in generated types after migration)
interface Profile {
    id: string
    email: string
    full_name: string
    avatar_url: string | null
    role: 'admin' | 'employee'
    status: 'active' | 'inactive' | 'suspended'
    department: string | null
    job_title: string | null
    joining_date: string | null
    date_of_birth?: string | null
    work_anniversary?: string | null
    created_at: string | null
    updated_at: string | null
}

interface ProfileSettingsClientProps {
    profile: Profile
}

export function ProfileSettingsClient({ profile }: ProfileSettingsClientProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [isSaved, setIsSaved] = useState(false)

    // Editable fields
    const [department, setDepartment] = useState(profile.department || '')
    const [jobTitle, setJobTitle] = useState(profile.job_title || '')
    const [dateOfBirth, setDateOfBirth] = useState(
        profile.date_of_birth ? profile.date_of_birth.split('T')[0] : ''
    )
    const [workAnniversary, setWorkAnniversary] = useState(
        profile.work_anniversary ? profile.work_anniversary.split('T')[0] : ''
    )

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const handleSave = async () => {
        setIsLoading(true)
        setIsSaved(false)

        const supabase = createClient()

        const { error } = await supabase
            .from('profiles')
            .update({
                department: department || null,
                job_title: jobTitle || null,
                date_of_birth: dateOfBirth || null,
                work_anniversary: workAnniversary || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id)

        if (!error) {
            setIsSaved(true)
            router.refresh()
            setTimeout(() => setIsSaved(false), 3000)
        }

        setIsLoading(false)
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Breadcrumbs */}
            <div className="flex flex-wrap gap-2">
                <Link
                    href="/dashboard"
                    className="text-slate-500 dark:text-slate-400 text-base font-medium hover:text-[#1387ec]"
                >
                    Dashboard
                </Link>
                <span className="text-slate-500 dark:text-slate-400">/</span>
                <span className="text-slate-900 dark:text-slate-100 text-base font-medium">
                    My Profile
                </span>
            </div>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                    My Profile
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Update your personal information
                </p>
            </div>

            {/* Profile Card */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardHeader className="border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback className="bg-[#1387ec] text-white text-lg">
                                {getInitials(profile.full_name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-xl">{profile.full_name}</CardTitle>
                            <p className="text-slate-500 dark:text-slate-400">{profile.email}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    {/* Non-editable fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-slate-500">
                                <User className="h-4 w-4" />
                                Full Name
                            </Label>
                            <Input
                                value={profile.full_name}
                                disabled
                                className="bg-slate-50 dark:bg-slate-800 opacity-60"
                            />
                            <p className="text-xs text-slate-400">Contact admin to change your name</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-slate-500">
                                <Mail className="h-4 w-4" />
                                Email
                            </Label>
                            <Input
                                value={profile.email}
                                disabled
                                className="bg-slate-50 dark:bg-slate-800 opacity-60"
                            />
                            <p className="text-xs text-slate-400">Contact admin to change your email</p>
                        </div>
                    </div>

                    <hr className="border-slate-200 dark:border-slate-800" />

                    {/* Editable fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="department" className="flex items-center gap-2">
                                <Building className="h-4 w-4" />
                                Department
                            </Label>
                            <Input
                                id="department"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                placeholder="e.g., Engineering"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="jobTitle" className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4" />
                                Job Title
                            </Label>
                            <Input
                                id="jobTitle"
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                placeholder="e.g., Software Developer"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
                                <Cake className="h-4 w-4" />
                                Date of Birth
                            </Label>
                            <Input
                                id="dateOfBirth"
                                type="date"
                                value={dateOfBirth}
                                onChange={(e) => setDateOfBirth(e.target.value)}
                                disabled={isLoading}
                            />
                            <p className="text-xs text-slate-400">Used for birthday reminders</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="workAnniversary" className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Work Anniversary / Joining Date
                            </Label>
                            <Input
                                id="workAnniversary"
                                type="date"
                                value={workAnniversary}
                                onChange={(e) => setWorkAnniversary(e.target.value)}
                                disabled={isLoading}
                            />
                            <p className="text-xs text-slate-400">Used for anniversary reminders</p>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center gap-4 pt-4">
                        <Button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                        {isSaved && (
                            <span className="text-sm text-green-600 dark:text-green-400">
                                ✓ Changes saved successfully
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
