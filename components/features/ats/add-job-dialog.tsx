'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Loader2, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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

interface AddJobDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onJobSaved: (job: Job) => void
    editingJob: Job | null
}

const departments = [
    'Engineering',
    'Marketing',
    'Sales',
    'Human Resources',
    'Finance',
    'Operations',
    'Customer Support',
    'Product',
    'Design',
    'Legal',
]

const educationOptions = [
    "Bachelor's degree",
    "Master's degree",
    'PhD',
    'Associate degree',
    'High School Diploma',
    'Certification',
]

export function AddJobDialog({
    open,
    onOpenChange,
    onJobSaved,
    editingJob,
}: AddJobDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isExtracting, setIsExtracting] = useState(false)
    const [error, setError] = useState('')

    // Form state
    const [title, setTitle] = useState(editingJob?.title || '')
    const [department, setDepartment] = useState(editingJob?.department || '')
    const [description, setDescription] = useState(editingJob?.description || '')
    const [requiredSkills, setRequiredSkills] = useState<string[]>(editingJob?.required_skills || [])
    const [preferredSkills, setPreferredSkills] = useState<string[]>(editingJob?.preferred_skills || [])
    const [experienceMin, setExperienceMin] = useState(editingJob?.experience_years_min || 0)
    const [experienceMax, setExperienceMax] = useState<number | null>(editingJob?.experience_years_max || null)
    const [educationReqs, setEducationReqs] = useState<string[]>(editingJob?.education_requirements || [])

    // Skill input state
    const [skillInput, setSkillInput] = useState('')
    const [preferredSkillInput, setPreferredSkillInput] = useState('')

    const resetForm = () => {
        setTitle('')
        setDepartment('')
        setDescription('')
        setRequiredSkills([])
        setPreferredSkills([])
        setExperienceMin(0)
        setExperienceMax(null)
        setEducationReqs([])
        setError('')
    }

    const handleClose = () => {
        resetForm()
        onOpenChange(false)
    }

    const addSkill = (type: 'required' | 'preferred') => {
        const input = type === 'required' ? skillInput : preferredSkillInput
        const setInput = type === 'required' ? setSkillInput : setPreferredSkillInput
        const skills = type === 'required' ? requiredSkills : preferredSkills
        const setSkills = type === 'required' ? setRequiredSkills : setPreferredSkills

        const newSkills = input.split(',').map(s => s.trim()).filter(s => s && !skills.includes(s))
        if (newSkills.length > 0) {
            setSkills([...skills, ...newSkills])
            setInput('')
        }
    }

    const removeSkill = (skill: string, type: 'required' | 'preferred') => {
        const setSkills = type === 'required' ? setRequiredSkills : setPreferredSkills
        setSkills(prev => prev.filter(s => s !== skill))
    }

    const toggleEducation = (edu: string) => {
        if (educationReqs.includes(edu)) {
            setEducationReqs(prev => prev.filter(e => e !== edu))
        } else {
            setEducationReqs(prev => [...prev, edu])
        }
    }

    const handleExtractKeywords = async () => {
        if (!description) {
            setError('Please enter a job description first')
            return
        }

        setIsExtracting(true)
        setError('')

        try {
            const response = await fetch('/api/ats/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title || 'Temp',
                    description,
                    auto_extract_keywords: true,
                }),
            })

            const data = await response.json()
            if (data.job) {
                // Use extracted data but don't save yet
                setRequiredSkills(prev => [...new Set([...prev, ...(data.job.required_skills || [])])])
                setPreferredSkills(prev => [...new Set([...prev, ...(data.job.preferred_skills || [])])])
                setEducationReqs(prev => [...new Set([...prev, ...(data.job.education_requirements || [])])])

                // Delete the temp job
                await fetch(`/api/ats/jobs?id=${data.job.id}`, { method: 'DELETE' })
            }
        } catch (err) {
            console.error('Failed to extract keywords:', err)
            setError('Failed to extract keywords from description')
        } finally {
            setIsExtracting(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!title.trim()) {
            setError('Title is required')
            return
        }
        if (!description.trim()) {
            setError('Description is required')
            return
        }

        setIsLoading(true)

        try {
            const method = editingJob ? 'PATCH' : 'POST'
            const body = {
                ...(editingJob && { id: editingJob.id }),
                title: title.trim(),
                department: department || null,
                description: description.trim(),
                required_skills: requiredSkills,
                preferred_skills: preferredSkills,
                experience_years_min: experienceMin,
                experience_years_max: experienceMax,
                education_requirements: educationReqs,
            }

            const response = await fetch('/api/ats/jobs', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save job')
            }

            onJobSaved(data.job)
            handleClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save job')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingJob ? 'Edit Job' : 'Add New Job'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Job Title *</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Senior Software Engineer"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="department">Department</Label>
                            <Select value={department} onValueChange={setDepartment}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept} value={dept}>
                                            {dept}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="description">Job Description *</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleExtractKeywords}
                                disabled={isExtracting || !description}
                            >
                                {isExtracting ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4 mr-2" />
                                )}
                                Extract Keywords
                            </Button>
                        </div>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter the full job description..."
                            rows={6}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="expMin">Min Experience (years)</Label>
                            <Input
                                id="expMin"
                                type="number"
                                min={0}
                                value={experienceMin}
                                onChange={(e) => setExperienceMin(parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="expMax">Max Experience (years)</Label>
                            <Input
                                id="expMax"
                                type="number"
                                min={0}
                                value={experienceMax ?? ''}
                                onChange={(e) => setExperienceMax(e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="Leave empty for no max"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Required Skills</Label>
                        <div className="flex gap-2">
                            <Input
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}
                                placeholder="Type skill and press Add (comma-separated)"
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('required'))}
                            />
                            <Button type="button" variant="secondary" onClick={() => addSkill('required')}>
                                Add
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {requiredSkills.map((skill) => (
                                <Badge key={skill} variant="default" className="gap-1">
                                    {skill}
                                    <X
                                        className="h-3 w-3 cursor-pointer"
                                        onClick={() => removeSkill(skill, 'required')}
                                    />
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Preferred Skills</Label>
                        <div className="flex gap-2">
                            <Input
                                value={preferredSkillInput}
                                onChange={(e) => setPreferredSkillInput(e.target.value)}
                                placeholder="Type skill and press Add (comma-separated)"
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('preferred'))}
                            />
                            <Button type="button" variant="secondary" onClick={() => addSkill('preferred')}>
                                Add
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {preferredSkills.map((skill) => (
                                <Badge key={skill} variant="outline" className="gap-1">
                                    {skill}
                                    <X
                                        className="h-3 w-3 cursor-pointer"
                                        onClick={() => removeSkill(skill, 'preferred')}
                                    />
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Education Requirements</Label>
                        <div className="flex flex-wrap gap-2">
                            {educationOptions.map((edu) => (
                                <Badge
                                    key={edu}
                                    variant={educationReqs.includes(edu) ? 'default' : 'outline'}
                                    className="cursor-pointer"
                                    onClick={() => toggleEducation(edu)}
                                >
                                    {edu}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingJob ? 'Update Job' : 'Create Job'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
