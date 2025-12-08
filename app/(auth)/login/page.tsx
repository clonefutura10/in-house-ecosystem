'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ZodError } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [formData, setFormData] = useState<LoginFormData>({
        email: '',
        password: '',
    })
    const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({})
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [authError, setAuthError] = useState<string | null>(null)

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
        // Clear error when user starts typing
        if (errors[name as keyof LoginFormData]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }))
        }
        if (authError) setAuthError(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setAuthError(null)

        // Validate form
        const result = loginSchema.safeParse(formData)
        if (!result.success) {
            const fieldErrors: Partial<Record<keyof LoginFormData, string>> = {}
            if ((result.error as any).errors) {
                ; (result.error as any).errors.forEach((err: any) => {
                    const field = err.path[0] as keyof LoginFormData
                    fieldErrors[field] = err.message
                })
            }
            setErrors(fieldErrors)
            return
        }

        setIsLoading(true)

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            })

            if (error) {
                setAuthError(error.message || 'An unexpected error occurred.')
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

    return (
        <div className="m-4 w-full max-w-md">
            <Card className="border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
                <CardHeader className="space-y-2 text-center pb-6">
                    <CardTitle className="text-3xl font-bold tracking-tight text-[#111827] dark:text-slate-50">
                        Welcome Back
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">
                        Enter your credentials to access your dashboard.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {authError && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                                {authError}
                            </div>
                        )}

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
                                disabled={isLoading}
                            />
                            {errors.email && (
                                <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                            )}
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
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className={`h-14 pr-12 bg-[#f6f7f8] dark:bg-[#101a22] border-slate-200 dark:border-slate-800 text-[#111827] dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#1387ec] focus:ring-[#1387ec]/50 ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''
                                        }`}
                                    disabled={isLoading}
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
                            {errors.password && (
                                <p className="text-sm text-red-500 mt-1">{errors.password}</p>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <Link
                                href="/forgot-password"
                                className="text-sm font-medium text-[#1387ec] hover:underline dark:text-[#1387ec]/90"
                            >
                                Forgot Password?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-[#1387ec] hover:bg-[#1387ec]/90 text-white font-bold tracking-wide text-base transition-all duration-200 shadow-lg hover:shadow-[#1387ec]/25"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </Button>

                        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                            Don&apos;t have an account?{' '}
                            <Link
                                href="/signup"
                                className="font-medium text-[#1387ec] hover:underline dark:text-[#1387ec]/90"
                            >
                                Sign up
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
