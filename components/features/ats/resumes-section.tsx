'use client'

import { useState, useRef, useCallback, Fragment } from 'react'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Upload,
    Trash2,
    Loader2,
    FileText,
    Calculator,
    AlertCircle,
    CheckCircle2,
    Clock,
    Download,
    Eye,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ATSScoreCard } from './ats-score-card'


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
}

interface ParsedData {
    candidate_name: string | null
    email: string | null
    phone: string | null
    skills: string[]
    experience_years: number | null
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

interface Score {
    resume_id: string
    overall_score: number
    skill_match_score: number
    experience_score: number
    education_score: number
    keyword_density_score: number
    keyword_matches: string[]
    score_breakdown: {
        required_skills_matched: string[]
        required_skills_missing: string[]
        preferred_skills_matched: string[]
        experience_assessment: string
        education_assessment: string
        keyword_analysis: string
    }
}

interface ResumesSectionProps {
    resumes: Resume[]
    jobs: Job[]
    initialScores?: Score[]
    onResumeAdded: (resume: Resume) => void
    onResumeUpdated: (resume: Resume) => void
    onResumeDeleted: (resumeId: string) => void
}

export function ResumesSection({
    resumes,
    jobs,
    initialScores = [],
    onResumeAdded,
    onResumeUpdated,
    onResumeDeleted,
}: ResumesSectionProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [selectedJobId, setSelectedJobId] = useState<string>('')
    const [isScoring, setIsScoring] = useState(false)
    // Initialize scores from prop, indexed by resume_id
    const [scores, setScores] = useState<Record<string, Score>>(() => {
        const scoreMap: Record<string, Score> = {}
        for (const score of initialScores) {
            scoreMap[score.resume_id] = score
        }
        return scoreMap
    })
    const [expandedResumeId, setExpandedResumeId] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [filterJobId, setFilterJobId] = useState<string>('all') // 'all', 'global', or job id
    const [uploadJobId, setUploadJobId] = useState<string>('global') // 'global' or job id
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Filter resumes based on selected filter
    const filteredResumes = resumes.filter((resume) => {
        if (filterJobId === 'all') return true
        if (filterJobId === 'global') return !resume.job_id
        return resume.job_id === filterJobId
    })

    // Sort by ATS score (highest first), resumes without scores go to the end
    const sortedResumes = [...filteredResumes].sort((a, b) => {
        const scoreA = scores[a.id]?.overall_score ?? -1
        const scoreB = scores[b.id]?.overall_score ?? -1
        return scoreB - scoreA
    })

    const handleFileSelect = () => {
        fileInputRef.current?.click()
    }

    const uploadFiles = async (files: FileList | File[]) => {
        const fileArray = Array.from(files)
        const validFiles = fileArray.filter(
            (f) => f.type === 'application/pdf' || f.name.endsWith('.docx')
        )

        if (validFiles.length === 0) {
            alert('Please upload PDF or DOCX files only')
            return
        }

        setIsUploading(true)
        const supabase = createClient()

        for (const file of validFiles) {
            try {
                // Upload to Supabase storage
                const fileName = `${Date.now()}-${file.name}`
                const { error: uploadError } = await supabase.storage
                    .from('resumes')
                    .upload(fileName, file)

                if (uploadError) {
                    console.error('Upload error:', uploadError)
                    continue
                }

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('resumes')
                    .getPublicUrl(fileName)

                // Create resume record with optional job association
                const response = await fetch('/api/ats/resumes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file_name: file.name,
                        file_url: urlData.publicUrl,
                        file_type: file.type,
                        file_size: file.size,
                        job_id: uploadJobId === 'global' ? null : uploadJobId,
                    }),
                })

                const data = await response.json()
                if (data.resume) {
                    onResumeAdded({ ...data.resume, parsed_data: null, uploader: null })

                    // Auto-trigger parsing
                    parseResume(data.resume.id)
                }
            } catch (error) {
                console.error('Failed to upload file:', error)
            }
        }

        setIsUploading(false)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            uploadFiles(e.target.files)
        }
    }

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files) {
            uploadFiles(e.dataTransfer.files)
        }
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const parseResume = async (resumeId: string) => {
        try {
            await fetch('/api/ats/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resumeId }),
            })

            // Poll for completion
            const pollInterval = setInterval(async () => {
                const response = await fetch(`/api/ats/parse?resumeId=${resumeId}`)
                const data = await response.json()

                if (data.status === 'completed' || data.status === 'failed') {
                    clearInterval(pollInterval)
                    // Refresh the resume data
                    const updatedResume = resumes.find((r) => r.id === resumeId)
                    if (updatedResume) {
                        onResumeUpdated({
                            ...updatedResume,
                            parsing_status: data.status,
                            parsing_error: data.error,
                            parsed_data: data.parsedData ? [data.parsedData] : null,
                        })
                    }
                }
            }, 2000)
        } catch (error) {
            console.error('Failed to parse resume:', error)
        }
    }

    const handleDeleteResume = async (resumeId: string) => {
        if (!confirm('Are you sure you want to delete this resume?')) return

        try {
            const response = await fetch(`/api/ats/resumes?id=${resumeId}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                onResumeDeleted(resumeId)
            }
        } catch (error) {
            console.error('Failed to delete resume:', error)
        }
    }

    const handleCalculateScores = async () => {
        if (!selectedJobId) {
            alert('Please select a job first')
            return
        }

        // Use filtered resumes, not all resumes
        const completedResumes = filteredResumes.filter((r) => r.parsing_status === 'completed')
        if (completedResumes.length === 0) {
            alert('No parsed resumes available in current filter. Please wait for parsing to complete or adjust filter.')
            return
        }

        setIsScoring(true)

        try {
            const response = await fetch('/api/ats/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resumeIds: completedResumes.map((r) => r.id),
                    jobId: selectedJobId,
                }),
            })

            const data = await response.json()

            if (data.scores) {
                const scoreMap: Record<string, Score> = {}
                for (const score of data.scores) {
                    scoreMap[score.resumeId] = score
                }
                setScores(scoreMap)
            }
        } catch (error) {
            console.error('Failed to calculate scores:', error)
        } finally {
            setIsScoring(false)
        }
    }

    const getStatusIcon = (status: Resume['parsing_status']) => {
        switch (status) {
            case 'pending':
                return <Clock className="h-4 w-4 text-muted-foreground" />
            case 'processing':
                return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            case 'completed':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />
            case 'failed':
                return <AlertCircle className="h-4 w-4 text-destructive" />
        }
    }

    const getStatusBadge = (status: Resume['parsing_status']) => {
        const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
            pending: 'secondary',
            processing: 'outline',
            completed: 'default',
            failed: 'destructive',
        }
        return (
            <Badge variant={variants[status]} className="gap-1">
                {getStatusIcon(status)}
                {status}
            </Badge>
        )
    }

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return '-'
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <Card>
            <CardHeader className="space-y-4">
                {/* Row 1: Title and Filter */}
                <div className="flex flex-row items-center justify-between">
                    <CardTitle>Resumes</CardTitle>
                    <Select value={filterJobId} onValueChange={setFilterJobId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter resumes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Resumes</SelectItem>
                            <SelectItem value="global">Global (No Job)</SelectItem>
                            {jobs.map((job) => (
                                <SelectItem key={job.id} value={job.id}>
                                    {job.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Row 2: Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Left: Upload section */}
                    <div className="flex items-center gap-3">
                        <Select value={uploadJobId} onValueChange={setUploadJobId}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="global">Global Pool</SelectItem>
                                {jobs.map((job) => (
                                    <SelectItem key={job.id} value={job.id}>
                                        {job.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleFileSelect} disabled={isUploading}>
                            {isUploading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Upload className="h-4 w-4 mr-2" />
                            )}
                            Upload
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.docx"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>

                    {/* Right: Scoring section */}
                    <div className="flex items-center gap-3">
                        <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Select job" />
                            </SelectTrigger>
                            <SelectContent>
                                {jobs.map((job) => (
                                    <SelectItem key={job.id} value={job.id}>
                                        {job.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="secondary"
                            onClick={handleCalculateScores}
                            disabled={!selectedJobId || isScoring}
                        >
                            {isScoring ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Calculator className="h-4 w-4 mr-2" />
                            )}
                            Calculate Scores
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Drop Zone */}
                <div
                    className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-colors ${isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                        }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                        Drag and drop PDF or DOCX files here, or click the Upload button
                    </p>
                </div>

                {filteredResumes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>{filterJobId === 'all' ? 'No resumes uploaded yet.' : 'No resumes found for this filter.'}</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>File Name</TableHead>
                                <TableHead>Candidate</TableHead>
                                <TableHead>Job</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>ATS Score</TableHead>
                                <TableHead>Uploaded</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedResumes.map((resume) => {
                                const parsedData = resume.parsed_data?.[0]
                                const score = scores[resume.id]

                                return (
                                    <Fragment key={resume.id}>
                                        <TableRow
                                            key={resume.id}
                                            className="cursor-pointer"
                                            onClick={() =>
                                                setExpandedResumeId((prev) =>
                                                    prev === resume.id ? null : resume.id
                                                )
                                            }
                                        >
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                    {resume.file_name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {parsedData?.candidate_name || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {resume.job ? (
                                                    <Badge variant="secondary">{resume.job.title}</Badge>
                                                ) : (
                                                    <Badge variant="outline">Global</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(resume.parsing_status)}</TableCell>
                                            <TableCell>
                                                {score ? (
                                                    <ATSScoreCard score={score} compact />
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(resume.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            window.open(resume.file_url, '_blank')
                                                        }}
                                                        title="View"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            const link = document.createElement('a')
                                                            link.href = resume.file_url
                                                            link.download = resume.file_name
                                                            link.click()
                                                        }}
                                                        title="Download"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleDeleteResume(resume.id)
                                                        }}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {expandedResumeId === resume.id && (
                                            <TableRow key={`${resume.id}-expanded`}>
                                                <TableCell colSpan={7} className="bg-muted/50">
                                                    <div className="p-4 space-y-4">
                                                        {parsedData && (
                                                            <div className="grid grid-cols-3 gap-4">
                                                                <div>
                                                                    <h4 className="font-semibold mb-2">Contact</h4>
                                                                    <p className="text-sm">
                                                                        {parsedData.email || 'No email'}
                                                                    </p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {parsedData.phone || 'No phone'}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-semibold mb-2">Experience</h4>
                                                                    <p className="text-sm">
                                                                        {parsedData.experience_years
                                                                            ? `${parsedData.experience_years} years`
                                                                            : 'Not detected'}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-semibold mb-2">Skills</h4>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {parsedData.skills
                                                                            .slice(0, 10)
                                                                            .map((skill) => (
                                                                                <Badge
                                                                                    key={skill}
                                                                                    variant="secondary"
                                                                                    className="text-xs"
                                                                                >
                                                                                    {skill}
                                                                                </Badge>
                                                                            ))}
                                                                        {parsedData.skills.length > 10 && (
                                                                            <Badge variant="outline" className="text-xs">
                                                                                +{parsedData.skills.length - 10}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {score && (
                                                            <ATSScoreCard score={score} detailed />
                                                        )}
                                                        {resume.parsing_status === 'failed' && (
                                                            <div className="text-destructive text-sm">
                                                                Error: {resume.parsing_error || 'Unknown error'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                )
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}
