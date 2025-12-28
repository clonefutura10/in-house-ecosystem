'use client'

import { createContext, useContext, ReactNode } from 'react'

export interface UserInfo {
    id: string
    full_name: string
    email: string
    avatar_url?: string | null
    role: 'admin' | 'employee'
}

const UserContext = createContext<UserInfo | null>(null)

interface UserProviderProps {
    user: UserInfo
    children: ReactNode
}

export function UserProvider({ user, children }: UserProviderProps) {
    return (
        <UserContext.Provider value={user}>
            {children}
        </UserContext.Provider>
    )
}

export function useUser() {
    const context = useContext(UserContext)
    if (!context) {
        throw new Error('useUser must be used within a UserProvider')
    }
    return context
}

export function useOptionalUser() {
    return useContext(UserContext)
}
