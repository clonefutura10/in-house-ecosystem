'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { z } from 'zod'

const emailSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
})

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // Validate email
        const result = emailSchema.safeParse({ email })
        if (!result.success) {
            setError(result.error.message)
            return
        }

        setIsLoading(true)

        try {
            const supabase = createClient()
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (resetError) {
                setError(resetError.message)
                return
            }

            setIsSubmitted(true)
        } catch {
            setError('An unexpected error occurred. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    if (isSubmitted) {
        return (
            <div className="m-4 w-full max-w-md">
                <Card className="border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
                    <CardHeader className="space-y-4 text-center pb-6">
                        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight text-[#111827] dark:text-slate-50">
                            Check Your Email
                        </CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400">
                            We&apos;ve sent a password reset link to <strong className="text-[#111827] dark:text-slate-200">{email}</strong>.
                            Please check your inbox and follow the instructions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-sm text-slate-600 dark:text-slate-400">
                            <p>Didn&apos;t receive the email?</p>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>Check your spam folder</li>
                                <li>Make sure you entered the correct email</li>
                                <li>Wait a few minutes and try again</li>
                            </ul>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                                setIsSubmitted(false)
                                setEmail('')
                            }}
                        >
                            Try another email
                        </Button>
                        <Link href="/login" className="block">
                            <Button variant="ghost" className="w-full gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Login
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="m-4 w-full max-w-md">
            <Card className="border-slate-200 bg-white/80 backdrop-blur-sm shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
                <CardHeader className="space-y-2 text-center pb-6">
                    <div className="mx-auto w-16 h-16 rounded-full bg-[#1387ec]/10 flex items-center justify-center mb-2">
                        <Mail className="h-8 w-8 text-[#1387ec]" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-[#111827] dark:text-slate-50">
                        Forgot Password?
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">
                        No worries! Enter your email and we&apos;ll send you reset instructions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                                {error}
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
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value)
                                    if (error) setError(null)
                                }}
                                className={`h-14 bg-[#f6f7f8] dark:bg-[#101a22] border-slate-200 dark:border-slate-800 text-[#111827] dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#1387ec] focus:ring-[#1387ec]/50 ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''
                                    }`}
                                disabled={isLoading}
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-[#1387ec] hover:bg-[#1387ec]/90 text-white font-bold tracking-wide text-base transition-all duration-200 shadow-lg hover:shadow-[#1387ec]/25"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                'Send Reset Link'
                            )}
                        </Button>

                        <Link href="/login" className="block">
                            <Button variant="ghost" className="w-full gap-2" type="button">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Login
                            </Button>
                        </Link>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
