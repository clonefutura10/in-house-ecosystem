'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface Score {
    resume_id?: string
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

interface ATSScoreCardProps {
    score: Score
    compact?: boolean
    detailed?: boolean
}

export function ATSScoreCard({ score, compact, detailed }: ATSScoreCardProps) {
    const getScoreColor = (value: number) => {
        if (value >= 80) return 'text-green-600'
        if (value >= 60) return 'text-yellow-600'
        return 'text-red-600'
    }

    const getProgressColor = (value: number) => {
        if (value >= 80) return 'bg-green-600'
        if (value >= 60) return 'bg-yellow-600'
        return 'bg-red-600'
    }

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <div
                    className={`font-bold text-lg ${getScoreColor(score.overall_score)}`}
                >
                    {Math.round(score.overall_score)}%
                </div>
                <div className="w-16">
                    <Progress
                        value={score.overall_score}
                        className="h-2"
                    />
                </div>
            </div>
        )
    }

    if (detailed) {
        return (
            <div className="space-y-4 border rounded-lg p-4 bg-background">
                <div className="flex items-center justify-between">
                    <h4 className="font-semibold">ATS Score Breakdown</h4>
                    <div className={`text-2xl font-bold ${getScoreColor(score.overall_score)}`}>
                        {Math.round(score.overall_score)}%
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <ScoreItem
                        label="Skills Match"
                        value={score.skill_match_score}
                        weight="40%"
                        getColor={getProgressColor}
                    />
                    <ScoreItem
                        label="Experience"
                        value={score.experience_score}
                        weight="30%"
                        getColor={getProgressColor}
                    />
                    <ScoreItem
                        label="Education"
                        value={score.education_score}
                        weight="15%"
                        getColor={getProgressColor}
                    />
                    <ScoreItem
                        label="Keywords"
                        value={score.keyword_density_score}
                        weight="15%"
                        getColor={getProgressColor}
                    />
                </div>

                <div className="space-y-3 pt-2 border-t">
                    {score.score_breakdown.required_skills_matched.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-green-600 mb-1">
                                ✓ Matched Required Skills
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {score.score_breakdown.required_skills_matched.map((skill) => (
                                    <Badge key={skill} variant="default" className="text-xs bg-green-600">
                                        {skill}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {score.score_breakdown.required_skills_missing.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-red-600 mb-1">
                                ✗ Missing Required Skills
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {score.score_breakdown.required_skills_missing.map((skill) => (
                                    <Badge key={skill} variant="destructive" className="text-xs">
                                        {skill}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {score.score_breakdown.preferred_skills_matched.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-blue-600 mb-1">
                                ✓ Matched Preferred Skills
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {score.score_breakdown.preferred_skills_matched.map((skill) => (
                                    <Badge key={skill} variant="secondary" className="text-xs">
                                        {skill}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="text-sm space-y-1">
                        <p>
                            <span className="font-medium">Experience: </span>
                            <span className="text-muted-foreground">
                                {score.score_breakdown.experience_assessment}
                            </span>
                        </p>
                        <p>
                            <span className="font-medium">Education: </span>
                            <span className="text-muted-foreground">
                                {score.score_breakdown.education_assessment}
                            </span>
                        </p>
                        <p>
                            <span className="font-medium">Keywords: </span>
                            <span className="text-muted-foreground">
                                {score.score_breakdown.keyword_analysis}
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // Default view
    return (
        <div className="flex items-center gap-3">
            <div
                className={`text-xl font-bold ${getScoreColor(score.overall_score)}`}
            >
                {Math.round(score.overall_score)}%
            </div>
            <div className="flex-1">
                <Progress value={score.overall_score} className="h-3" />
            </div>
        </div>
    )
}

function ScoreItem({
    label,
    value,
    weight,
    getColor,
}: {
    label: string
    value: number
    weight: string
    getColor: (value: number) => string
}) {
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                    {label} <span className="text-xs">({weight})</span>
                </span>
                <span className="font-medium">{Math.round(value)}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
                <div
                    className={`h-2 rounded-full transition-all ${getColor(value)}`}
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    )
}
