/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { JobsSection } from './jobs-section'
import { ResumesSection } from './resumes-section'
import { Briefcase, FileText } from 'lucide-react'

interface Job {
    id: string
    title: string
    department: string | null
    description: string
    required_skills: string[]
    preferred_skills: string[]
    experience_years_min: number
    experience_years_max: number | null
    education_requirements: string[]
    is_archived: boolean
    created_at: string
    creator: { full_name: string } | null
}

interface Resume {
    id: string
    file_name: string
    file_url: string
    file_type: string | null
    file_size: number | null
    job_id: string | null
    job?: { id: string; title: string } | null
    parsing_status: 'pending' | 'processing' | 'completed' | 'failed'
    parsing_error: string | null
    created_at: string
    uploader: { full_name: string } | null
    parsed_data: ParsedData[] | null
}

interface ParsedData {
    candidate_name: string | null
    email: string | null
    phone: string | null
    skills: string[]
    experience_years: number | null
}

interface Score {
    resume_id: string
    job_id: string
    overall_score: number
    skill_match_score: number
    experience_score: number
    education_score: number
    keyword_density_score: number
    keyword_matches: string[]
    score_breakdown: Record<string, unknown>
}

interface ATSPageClientProps {
    initialJobs: Job[]
    initialResumes: Resume[]
    initialScores: Score[]
}

export function ATSPageClient({ initialJobs, initialResumes, initialScores }: ATSPageClientProps) {
    const [jobs, setJobs] = useState<Job[]>(initialJobs)
    const [resumes, setResumes] = useState<Resume[]>(initialResumes)

    const handleJobCreated = (job: Job) => {
        setJobs(prev => [job, ...prev])
    }

    const handleJobUpdated = (updatedJob: Job) => {
        setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j))
    }

    const handleJobDeleted = (jobId: string) => {
        setJobs(prev => prev.filter(j => j.id !== jobId))
    }

    const handleResumeAdded = (resume: Resume) => {
        setResumes(prev => [resume, ...prev])
    }

    const handleResumeUpdated = (updatedResume: Resume) => {
        setResumes(prev => prev.map(r => r.id === updatedResume.id ? updatedResume : r))
    }

    const handleResumeDeleted = (resumeId: string) => {
        setResumes(prev => prev.filter(r => r.id !== resumeId))
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">ATS & Resume Parser</h1>
                <p className="text-muted-foreground mt-1">
                    Manage job listings, parse resumes, and calculate ATS compatibility scores
                </p>
            </div>

            <Tabs defaultValue="jobs" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="jobs" className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Jobs ({jobs.length})
                    </TabsTrigger>
                    <TabsTrigger value="resumes" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Resumes ({resumes.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="jobs" className="mt-6">
                    <JobsSection
                        jobs={jobs}
                        onJobCreated={handleJobCreated}
                        onJobUpdated={handleJobUpdated}
                        onJobDeleted={handleJobDeleted}
                    />
                </TabsContent>

                <TabsContent value="resumes" className="mt-6">
                    <ResumesSection
                        resumes={resumes}
                        jobs={jobs}
                        initialScores={initialScores as any}
                        onResumeAdded={handleResumeAdded}
                        onResumeUpdated={handleResumeUpdated}
                        onResumeDeleted={handleResumeDeleted}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
