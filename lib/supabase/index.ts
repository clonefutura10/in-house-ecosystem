// Re-export Supabase clients
// Use createClient from './client' for client components
// Use createClient from './server' for server components

export { createClient as createBrowserClient } from './client'
// Note: Server client should be imported directly to avoid issues
