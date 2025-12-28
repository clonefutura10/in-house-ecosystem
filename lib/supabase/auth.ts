import { cache } from 'react'
import { createClient } from './server'

export interface CachedUser {
    id: string
    email: string
    full_name: string
    avatar_url: string | null
    role: 'admin' | 'employee'
}

/**
 * Cached function to get the current authenticated user and their profile.
 * This uses React's cache() to deduplicate calls within the same request,
 * so multiple server components can call this without making duplicate DB queries.
 */
export const getAuthenticatedUser = cache(async (): Promise<CachedUser | null> => {
    const supabase = await createClient()

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        return null
    }

    // Fetch user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role')
        .eq('id', user.id)
        .single()

    if (!profile) {
        // Return basic user info if no profile exists
        return {
            id: user.id,
            email: user.email || '',
            full_name: user.email?.split('@')[0] || 'User',
            avatar_url: null,
            role: 'employee',
        }
    }

    return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        role: profile.role as 'admin' | 'employee',
    }
})
