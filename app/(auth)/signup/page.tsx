'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ZodError } from 'zod'
import { createClient } from '@/lib/supabase/client'
import {
    signupStep1Schema,
    signupStep2Schema,
    signupStep3Schema,
    type SignupStep1Data,
    type SignupStep2Data,
    type SignupStep3Data,
    type SignupFormData,
} from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, Loader2, ArrowLeft, ArrowRight, Check, User, Briefcase, Mail, CheckCircle2 } from 'lucide-react'

const STEPS = [
    { id: 1, title: 'Account', icon: Mail, description: 'Create your credentials' },
    { id: 2, title: 'Personal', icon: User, description: 'Tell us about yourself' },
    { id: 3, title: 'Professional', icon: Briefcase, description: 'Your work details' },
    { id: 4, title: 'Review', icon: CheckCircle2, description: 'Confirm your details' },
]

const DEPARTMENTS = [
    'Engineering',
    'Design',
    'Marketing',
    'Sales',
    'Finance',
    'Human Resources',
    'Operations',
    'Customer Support',
    'Product',
    'Other',
]

export default function SignupPage() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(1)
    const [formData, setFormData] = useState<SignupFormData>({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        department: '',
        jobTitle: '',
    })
    const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [authError, setAuthError] = useState<string | null>(null)

    const progress = (currentStep / STEPS.length) * 100

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }))
        }
        if (authError) setAuthError(null)
    }

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }))
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }))
        }
    }

    const validateCurrentStep = (): boolean => {
        let result
        switch (currentStep) {
            case 1:
                result = signupStep1Schema.safeParse(formData)
                break
            case 2:
                result = signupStep2Schema.safeParse(formData)
                break
            case 3:
                result = signupStep3Schema.safeParse(formData)
                break
            default:
                return true
        }

        if (!result.success) {
            const fieldErrors: Partial<Record<string, string>> = {}
                ; (result.error as any).errors.forEach((err: any) => {
                    const field = err.path[0] as string
                    fieldErrors[field] = err.message
                })
            setErrors(fieldErrors)
            return false
        }

        setErrors({})
        return true
    }

    const handleNext = () => {
        if (validateCurrentStep()) {
            setCurrentStep((prev) => Math.min(prev + 1, STEPS.length))
        }
    }

    const handleBack = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1))
    }

    const handleSubmit = async () => {
        setAuthError(null)
        setIsLoading(true)

        try {
            const supabase = createClient()

            // Create auth user with all profile data in metadata
            // The database trigger will automatically create the complete profile
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        department: formData.department || null,
                        job_title: formData.jobTitle || null,
                    },
                },
            })

            if (signUpError) {
                setAuthError(signUpError.message)
                setIsLoading(false)
                return
            }

            if (!authData.user) {
                setAuthError('Failed to create account. Please try again.')
                setIsLoading(false)
                return
            }

            // Hard redirect to ensure middleware picks up the new session
            window.location.href = '/dashboard'
        } catch {
            setAuthError('An unexpected error occurred. Please try again.')
            setIsLoading(false)
        }
    }

    const renderStepIndicator = () => (
        <div className="mb-8">
            <Progress value={progress} className="h-2 mb-4" />
            <div className="flex justify-between">
                {STEPS.map((step) => {
                    const StepIcon = step.icon
                    const isActive = currentStep === step.id
                    const isCompleted = currentStep > step.id

                    return (
                        <div
                            key={step.id}
                            className={`flex flex-col items-center ${isActive ? 'text-[#1387ec]' : isCompleted ? 'text-green-500' : 'text-slate-400'
                                }`}
                        >
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${isActive
                                    ? 'bg-[#1387ec] text-white shadow-lg shadow-[#1387ec]/30'
                                    : isCompleted
                                        ? 'bg-green-500 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800'
                                    }`}
                            >
                                {isCompleted ? <Check className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                            </div>
                            <span className="text-xs font-medium hidden sm:block">{step.title}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )

    const renderStep1 = () => (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-medium text-[#111827] dark:text-slate-200">
                    Email Address
                </Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`h-14 bg-[#f6f7f8] dark:bg-[#101a22] border-slate-200 dark:border-slate-800 text-[#111827] dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#1387ec] focus:ring-[#1387ec]/50 ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''
                        }`}
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-medium text-[#111827] dark:text-slate-200">
                    Password
                </Label>
                <div className="relative">
                    <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`h-14 pr-12 bg-[#f6f7f8] dark:bg-[#101a22] border-slate-200 dark:border-slate-800 text-[#111827] dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#1387ec] focus:ring-[#1387ec]/50 ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''
                            }`}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
                {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                <p className="text-xs text-slate-500">
                    Must be at least 8 characters with uppercase, lowercase, and a number
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-base font-medium text-[#111827] dark:text-slate-200">
                    Confirm Password
                </Label>
                <div className="relative">
                    <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={`h-14 pr-12 bg-[#f6f7f8] dark:bg-[#101a22] border-slate-200 dark:border-slate-800 text-[#111827] dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#1387ec] focus:ring-[#1387ec]/50 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''
                            }`}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        tabIndex={-1}
                    >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
                {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
            </div>
        </div>
    )

    const renderStep2 = () => (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="fullName" className="text-base font-medium text-[#111827] dark:text-slate-200">
                    Full Name
                </Label>
                <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`h-14 bg-[#f6f7f8] dark:bg-[#101a22] border-slate-200 dark:border-slate-800 text-[#111827] dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#1387ec] focus:ring-[#1387ec]/50 ${errors.fullName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''
                        }`}
                />
                {errors.fullName && <p className="text-sm text-red-500">{errors.fullName}</p>}
            </div>
        </div>
    )

    const renderStep3 = () => (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="department" className="text-base font-medium text-[#111827] dark:text-slate-200">
                    Department <span className="text-slate-400">(Optional)</span>
                </Label>
                <Select value={formData.department} onValueChange={(value) => handleSelectChange('department', value)} >
                    <SelectTrigger className="h-14 bg-[#f6f7f8] dark:bg-[#101a22] border-slate-200 dark:border-slate-800 text-[#111827] dark:text-slate-50">
                        <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                    <SelectContent>
                        {DEPARTMENTS.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                                {dept}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="jobTitle" className="text-base font-medium text-[#111827] dark:text-slate-200">
                    Job Title <span className="text-slate-400">(Optional)</span>
                </Label>
                <Input
                    id="jobTitle"
                    name="jobTitle"
                    type="text"
                    placeholder="e.g., Software Engineer"
                    value={formData.jobTitle} onChange={handleInputChange}
                    className="h-14 bg-[#f6f7f8] dark:bg-[#101a22] border-slate-200 dark:border-slate-800 text-[#111827] dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#1387ec] focus:ring-[#1387ec]/50"
                />
            </div>
        </div>
    )

    const renderStep4 = () => (
        <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-[#111827] dark:text-slate-50 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-[#1387ec]" />
                    Account Details
                </h3>
                <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Email</span><span className="font-medium text-[#111827] dark:text-slate-50">{formData.email}</span>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-[#111827] dark:text-slate-50 flex items-center gap-2">
                    <User className="h-5 w-5 text-[#1387ec]" />
                    Personal Information
                </h3>
                <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Full Name</span><span className="font-medium text-[#111827] dark:text-slate-50">{formData.fullName}</span>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-[#111827] dark:text-slate-50 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-[#1387ec]" />
                    Professional Information
                </h3>
                <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Department</span><span className="font-medium text-[#111827] dark:text-slate-50">{formData.department || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Job Title</span><span className="font-medium text-[#111827] dark:text-slate-50">{formData.jobTitle || 'Not specified'}</span>
                    </div>
                </div>
            </div>

            {authError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                    {authError}
                </div>
            )}
        </div>
    )

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 1:
                return renderStep1()
            case 2:
                return renderStep2()
            case 3:
                return renderStep3()
            case 4:
                return renderStep4()
            default:
                return null
        }
    }

    const currentStepInfo = STEPS[currentStep - 1]

    return (
        <div className="m-4 w-full max-w-md">
            <Card className="border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
                <CardHeader className="space-y-2 text-center pb-4">
                    <CardTitle className="text-3xl font-bold tracking-tight text-[#111827] dark:text-slate-50">
                        Create Account
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">
                        {currentStepInfo.description}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {renderStepIndicator()}

                    <div className="min-h-[280px]">{renderCurrentStep()}</div>

                    <div className="flex gap-3 mt-8">
                        {currentStep > 1 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                disabled={isLoading}
                                className="flex-1 h-12 font-semibold"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>
                        )}

                        {currentStep < STEPS.length ? (
                            <Button
                                type="button"
                                onClick={handleNext}
                                className="flex-1 h-12 bg-[#1387ec] hover:bg-[#1387ec]/90 text-white font-bold tracking-wide transition-all duration-200 shadow-lg hover:shadow-[#1387ec]/25"
                            >
                                Next
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="flex-1 h-12 bg-[#1387ec] hover:bg-[#1387ec]/90 text-white font-bold tracking-wide transition-all duration-200 shadow-lg hover:shadow-[#1387ec]/25"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        <Check className="mr-2 h-5 w-5" />
                                        Create Account
                                    </>
                                )}
                            </Button>
                        )}
                    </div>

                    <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                        Already have an account?{' '}
                        <Link
                            href="/login"
                            className="font-medium text-[#1387ec] hover:underline dark:text-[#1387ec]/90"
                        >
                            Sign in
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
