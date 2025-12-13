'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Loader2 } from 'lucide-react'

interface AddEmployeeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const departments = [
    'Engineering',
    'Marketing',
    'Sales',
    'Human Resources',
    'Finance',
    'Operations',
    'Customer Support',
    'Product',
    'Design',
    'Legal',
]

export function AddEmployeeDialog({ open, onOpenChange }: AddEmployeeDialogProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Form state
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [department, setDepartment] = useState('')
    const [jobTitle, setJobTitle] = useState('')
    const [role, setRole] = useState<'employee' | 'admin'>('employee')

    const resetForm = () => {
        setEmail('')
        setPassword('')
        setFullName('')
        setDepartment('')
        setJobTitle('')
        setRole('employee')
        setError(null)
        setSuccess(false)
    }

    const handleClose = () => {
        resetForm()
        onOpenChange(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        // Validation
        if (!email || !password || !fullName) {
            setError('Email, password, and full name are required')
            setIsLoading(false)
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            setIsLoading(false)
            return
        }

        try {
            const supabase = createClient()

            // Create the user using Supabase Auth
            // Note: This uses the admin API to create users
            // In production, you might want to use a server action or edge function
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            })

            if (authError) {
                // Check if user already exists
                if (authError.message.includes('already registered')) {
                    setError('An account with this email already exists')
                } else {
                    setError(authError.message)
                }
                setIsLoading(false)
                return
            }

            if (!authData.user) {
                setError('Failed to create user account')
                setIsLoading(false)
                return
            }

            // Update the profile with additional details
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    department: department || null,
                    job_title: jobTitle || null,
                    role: role,
                    status: 'active',
                })
                .eq('id', authData.user.id)

            if (profileError) {
                console.error('Profile update error:', profileError)
                // User was created but profile update failed
                // This is non-critical as the trigger should have created the profile
            }

            setSuccess(true)
            setTimeout(() => {
                handleClose()
                router.refresh()
            }, 1500)
        } catch (err) {
            console.error('Error creating employee:', err)
            setError('An unexpected error occurred')
        }

        setIsLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add New Employee</DialogTitle>
                    <DialogDescription>
                        Create a new employee account. They will receive an email to confirm their account.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                            <p className="text-sm text-green-600 dark:text-green-300">
                                ✓ Employee account created successfully!
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="fullName">Full Name *</Label>
                            <Input
                                id="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="John Smith"
                                disabled={isLoading || success}
                            />
                        </div>

                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="john@company.com"
                                disabled={isLoading || success}
                            />
                        </div>

                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="password">Password *</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Minimum 6 characters"
                                disabled={isLoading || success}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="department">Department</Label>
                            <Select value={department} onValueChange={setDepartment} disabled={isLoading || success}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept} value={dept}>
                                            {dept}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="jobTitle">Job Title</Label>
                            <Input
                                id="jobTitle"
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                placeholder="Software Engineer"
                                disabled={isLoading || success}
                            />
                        </div>

                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select value={role} onValueChange={(v) => setRole(v as 'employee' | 'admin')} disabled={isLoading || success}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="employee">Employee</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">
                                Admins have full access to manage tasks, employees, and settings.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-[#1387ec] hover:bg-[#1387ec]/90 text-white"
                            disabled={isLoading || success || !email || !password || !fullName}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Employee'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
