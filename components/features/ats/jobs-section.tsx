'use client'

import { useState, Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { AddJobDialog } from './add-job-dialog'


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

interface JobsSectionProps {
    jobs: Job[]
    onJobCreated: (job: Job) => void
    onJobUpdated: (job: Job) => void
    onJobDeleted: (jobId: string) => void
}

export function JobsSection({ jobs, onJobCreated, onJobUpdated, onJobDeleted }: JobsSectionProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingJob, setEditingJob] = useState<Job | null>(null)
    const [expandedJobId, setExpandedJobId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    const handleAddJob = () => {
        setEditingJob(null)
        setIsDialogOpen(true)
    }

    const handleEditJob = (job: Job) => {
        setEditingJob(job)
        setIsDialogOpen(true)
    }

    const handleDeleteJob = async (jobId: string) => {
        if (!confirm('Are you sure you want to archive this job?')) return

        setIsDeleting(jobId)
        try {
            const response = await fetch(`/api/ats/jobs?id=${jobId}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                onJobDeleted(jobId)
            }
        } catch (error) {
            console.error('Failed to delete job:', error)
        } finally {
            setIsDeleting(null)
        }
    }

    const handleJobSaved = (job: Job) => {
        if (editingJob) {
            onJobUpdated(job)
        } else {
            onJobCreated(job)
        }
        setIsDialogOpen(false)
        setEditingJob(null)
    }

    const toggleExpanded = (jobId: string) => {
        setExpandedJobId(prev => prev === jobId ? null : jobId)
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Job Listings</CardTitle>
                <Button onClick={handleAddJob}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Job
                </Button>
            </CardHeader>
            <CardContent>
                {jobs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No jobs created yet.</p>
                        <p className="text-sm">Click &quot;Add Job&quot; to create your first job listing.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-8"></TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Experience</TableHead>
                                <TableHead>Skills</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {jobs.map((job) => (
                                <Fragment key={job.id}>
                                    <TableRow key={job.id}>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleExpanded(job.id)}
                                            >
                                                {expandedJobId === job.id ? (
                                                    <ChevronUp className="h-4 w-4" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="font-medium">{job.title}</TableCell>
                                        <TableCell>{job.department || '-'}</TableCell>
                                        <TableCell>
                                            {job.experience_years_min}
                                            {job.experience_years_max ? `-${job.experience_years_max}` : '+'} yrs
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {job.required_skills.slice(0, 3).map((skill) => (
                                                    <Badge key={skill} variant="secondary" className="text-xs">
                                                        {skill}
                                                    </Badge>
                                                ))}
                                                {job.required_skills.length > 3 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{job.required_skills.length - 3}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(job.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditJob(job)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteJob(job.id)}
                                                    disabled={isDeleting === job.id}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    {expandedJobId === job.id && (
                                        <TableRow key={`${job.id}-expanded`}>
                                            <TableCell colSpan={7} className="bg-muted/50">
                                                <div className="p-4 space-y-4">
                                                    <div>
                                                        <h4 className="font-semibold mb-2">Description</h4>
                                                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                                                            {job.description}
                                                        </p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <h4 className="font-semibold mb-2">Required Skills</h4>
                                                            <div className="flex flex-wrap gap-1">
                                                                {job.required_skills.map((skill) => (
                                                                    <Badge key={skill} variant="default" className="text-xs">
                                                                        {skill}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold mb-2">Preferred Skills</h4>
                                                            <div className="flex flex-wrap gap-1">
                                                                {job.preferred_skills.map((skill) => (
                                                                    <Badge key={skill} variant="outline" className="text-xs">
                                                                        {skill}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {job.education_requirements.length > 0 && (
                                                        <div>
                                                            <h4 className="font-semibold mb-2">Education</h4>
                                                            <div className="flex flex-wrap gap-1">
                                                                {job.education_requirements.map((edu) => (
                                                                    <Badge key={edu} variant="secondary" className="text-xs">
                                                                        {edu}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            <AddJobDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onJobSaved={handleJobSaved}
                editingJob={editingJob}
            />
        </Card>
    )
}
