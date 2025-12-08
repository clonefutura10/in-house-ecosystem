import { z } from 'zod'

// Login validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
})

export type LoginFormData = z.infer<typeof loginSchema>

// Signup Step 1: Account credentials
export const signupStep1Schema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    // .regex(
    //   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    //   'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    // )
    ,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type SignupStep1Data = z.infer<typeof signupStep1Schema>

// Signup Step 2: Personal information
export const signupStep2Schema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
})

export type SignupStep2Data = z.infer<typeof signupStep2Schema>

// Signup Step 3: Professional information
export const signupStep3Schema = z.object({
  department: z.string().optional(),
  jobTitle: z.string().optional(),
})

export type SignupStep3Data = z.infer<typeof signupStep3Schema>

// Complete signup form data
export const signupSchema = signupStep1Schema
  .merge(signupStep2Schema)
  .merge(signupStep3Schema)

export type SignupFormData = z.infer<typeof signupSchema>
