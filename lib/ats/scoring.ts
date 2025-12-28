/**
 * ATS Scoring System
 * Calculates resume compatibility scores against job requirements
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

// Types
export interface ParsedResumeData {
  candidate_name: string | null
  email: string | null
  phone: string | null
  skills: string[]
  experience_years: number | null
  education: EducationEntry[]
  work_experience: WorkExperience[]
  raw_text: string | null
}

export interface EducationEntry {
  degree: string
  institution: string
  year: number | null
  field?: string
}

export interface WorkExperience {
  title: string
  company: string
  duration: string
  description?: string
}

export interface JobRequirements {
  title: string
  required_skills: string[]
  preferred_skills: string[]
  experience_years_min: number
  experience_years_max: number | null
  education_requirements: string[]
  description: string
}

export interface ATSScoreResult {
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

// Scoring Weights
const WEIGHTS = {
  SKILL_MATCH: 0.40,
  EXPERIENCE: 0.30,
  EDUCATION: 0.15,
  KEYWORD_DENSITY: 0.15,
}

/**
 * Calculate ATS score for a resume against a job
 */
export function calculateATSScore(
  resume: ParsedResumeData,
  job: JobRequirements
): ATSScoreResult {
  // Calculate individual scores
  const skillResult = calculateSkillScore(resume.skills, job.required_skills, job.preferred_skills)
  const experienceScore = calculateExperienceScore(
    resume.experience_years,
    job.experience_years_min,
    job.experience_years_max
  )
  const educationScore = calculateEducationScore(resume.education, job.education_requirements)
  const keywordResult = calculateKeywordDensityScore(resume.raw_text || '', job)

  // Calculate weighted overall score
  const overall_score = Math.round(
    skillResult.score * WEIGHTS.SKILL_MATCH +
    experienceScore.score * WEIGHTS.EXPERIENCE +
    educationScore.score * WEIGHTS.EDUCATION +
    keywordResult.score * WEIGHTS.KEYWORD_DENSITY
  )

  return {
    overall_score,
    skill_match_score: Math.round(skillResult.score),
    experience_score: Math.round(experienceScore.score),
    education_score: Math.round(educationScore.score),
    keyword_density_score: Math.round(keywordResult.score),
    keyword_matches: keywordResult.matches,
    score_breakdown: {
      required_skills_matched: skillResult.requiredMatched,
      required_skills_missing: skillResult.requiredMissing,
      preferred_skills_matched: skillResult.preferredMatched,
      experience_assessment: experienceScore.assessment,
      education_assessment: educationScore.assessment,
      keyword_analysis: keywordResult.analysis,
    },
  }
}

/**
 * Calculate skill match score
 */
function calculateSkillScore(
  resumeSkills: string[],
  requiredSkills: string[],
  preferredSkills: string[]
): {
  score: number
  requiredMatched: string[]
  requiredMissing: string[]
  preferredMatched: string[]
} {
  const normalizedResumeSkills = resumeSkills.map(s => s.toLowerCase().trim())

  // Match required skills (fuzzy matching)
  const requiredMatched: string[] = []
  const requiredMissing: string[] = []

  for (const skill of requiredSkills) {
    if (fuzzySkillMatch(skill, normalizedResumeSkills)) {
      requiredMatched.push(skill)
    } else {
      requiredMissing.push(skill)
    }
  }

  // Match preferred skills
  const preferredMatched: string[] = []
  for (const skill of preferredSkills) {
    if (fuzzySkillMatch(skill, normalizedResumeSkills)) {
      preferredMatched.push(skill)
    }
  }

  // Calculate score: 80% for required, 20% for preferred
  const requiredScore = requiredSkills.length > 0
    ? (requiredMatched.length / requiredSkills.length) * 80
    : 80

  const preferredScore = preferredSkills.length > 0
    ? (preferredMatched.length / preferredSkills.length) * 20
    : 20

  return {
    score: requiredScore + preferredScore,
    requiredMatched,
    requiredMissing,
    preferredMatched,
  }
}

/**
 * Fuzzy skill matching - handles variations like "React" vs "ReactJS" vs "React.js"
 */
function fuzzySkillMatch(skill: string, resumeSkills: string[]): boolean {
  const normalizedSkill = skill.toLowerCase().trim()

  // Direct match
  if (resumeSkills.includes(normalizedSkill)) return true

  // Check for partial matches and common variations
  const variations = generateSkillVariations(normalizedSkill)
  for (const variation of variations) {
    if (resumeSkills.some(rs => rs.includes(variation) || variation.includes(rs))) {
      return true
    }
  }

  return false
}

/**
 * Generate common skill name variations
 */
function generateSkillVariations(skill: string): string[] {
  const variations = [skill]

  // Handle .js suffix
  if (skill.endsWith('js')) {
    variations.push(skill.replace('js', '.js'))
    variations.push(skill.replace('js', ''))
  } else if (skill.endsWith('.js')) {
    variations.push(skill.replace('.js', 'js'))
    variations.push(skill.replace('.js', ''))
  }

  // Handle common prefixes/suffixes
  const withoutSymbols = skill.replace(/[.\-_]/g, '')
  if (withoutSymbols !== skill) variations.push(withoutSymbols)

  return variations
}

/**
 * Calculate experience match score
 */
function calculateExperienceScore(
  candidateYears: number | null,
  minYears: number,
  maxYears: number | null
): { score: number; assessment: string } {
  if (candidateYears === null) {
    return { score: 50, assessment: 'Experience years not detected in resume' }
  }

  // Within range
  if (candidateYears >= minYears && (maxYears === null || candidateYears <= maxYears)) {
    return { score: 100, assessment: `Perfect match: ${candidateYears} years (required: ${minYears}-${maxYears || 'any'})` }
  }

  // Over-qualified by 1-3 years
  if (maxYears && candidateYears > maxYears && candidateYears <= maxYears + 3) {
    return { score: 85, assessment: `Slightly overqualified: ${candidateYears} years (max: ${maxYears})` }
  }

  // Over-qualified by more than 3 years
  if (maxYears && candidateYears > maxYears + 3) {
    return { score: 70, assessment: `Overqualified: ${candidateYears} years (max: ${maxYears})` }
  }

  // Under-qualified by 1-2 years
  if (candidateYears < minYears && candidateYears >= minYears - 2) {
    return { score: 60, assessment: `Slightly under requirement: ${candidateYears} years (min: ${minYears})` }
  }

  // Significantly under-qualified
  return { score: 40, assessment: `Below requirement: ${candidateYears} years (min: ${minYears})` }
}

/**
 * Calculate education match score
 */
function calculateEducationScore(
  education: EducationEntry[],
  requirements: string[]
): { score: number; assessment: string } {
  if (requirements.length === 0) {
    return { score: 100, assessment: 'No specific education requirements' }
  }

  if (education.length === 0) {
    return { score: 30, assessment: 'No education information found in resume' }
  }

  // Education level hierarchy
  const levelHierarchy: Record<string, number> = {
    'phd': 5, 'doctorate': 5,
    'master': 4, 'masters': 4, 'mba': 4, 'ms': 4, 'ma': 4,
    'bachelor': 3, 'bachelors': 3, 'bs': 3, 'ba': 3, 'btech': 3, 'be': 3,
    'associate': 2,
    'diploma': 1, 'certificate': 1,
    'high school': 0, 'ged': 0,
  }

  // Find highest education level in resume
  let highestLevel = -1
  let highestDegree = ''
  for (const edu of education) {
    const degreeNormalized = edu.degree.toLowerCase()
    for (const [key, level] of Object.entries(levelHierarchy)) {
      if (degreeNormalized.includes(key) && level > highestLevel) {
        highestLevel = level
        highestDegree = edu.degree
      }
    }
  }

  // Find required education level
  let requiredLevel = -1
  let requiredDegree = ''
  for (const req of requirements) {
    const reqNormalized = req.toLowerCase()
    for (const [key, level] of Object.entries(levelHierarchy)) {
      if (reqNormalized.includes(key) && level > requiredLevel) {
        requiredLevel = level
        requiredDegree = req
      }
    }
  }

  if (highestLevel === -1) {
    return { score: 50, assessment: `Could not match education level. Found: ${education.map(e => e.degree).join(', ')}` }
  }

  if (requiredLevel === -1) {
    return { score: 80, assessment: `Education found: ${highestDegree}` }
  }

  // Compare levels
  if (highestLevel >= requiredLevel) {
    return { score: 100, assessment: `Meets requirement: ${highestDegree} (required: ${requiredDegree})` }
  } else if (highestLevel === requiredLevel - 1) {
    return { score: 60, assessment: `One level below: ${highestDegree} (required: ${requiredDegree})` }
  } else {
    return { score: 35, assessment: `Below requirement: ${highestDegree} (required: ${requiredDegree})` }
  }
}

/**
 * Calculate keyword density score
 */
function calculateKeywordDensityScore(
  resumeText: string,
  job: JobRequirements
): { score: number; matches: string[]; analysis: string } {
  if (!resumeText) {
    return { score: 50, matches: [], analysis: 'No resume text available for keyword analysis' }
  }

  const textLower = resumeText.toLowerCase()

  // Extract keywords from job description and requirements
  const keywords = new Set<string>()

  // Add skills
  job.required_skills.forEach(s => keywords.add(s.toLowerCase()))
  job.preferred_skills.forEach(s => keywords.add(s.toLowerCase()))

  // Extract important words from description (2+ words that appear technical)
  const descWords = job.description.toLowerCase().split(/\s+/)
  for (const word of descWords) {
    if (word.length > 3 && !commonWords.has(word)) {
      keywords.add(word)
    }
  }

  // Count matches
  const matches: string[] = []
  for (const keyword of keywords) {
    if (textLower.includes(keyword)) {
      matches.push(keyword)
    }
  }

  const matchRatio = keywords.size > 0 ? matches.length / keywords.size : 0
  const score = Math.min(100, matchRatio * 100 + 20) // Base 20 + up to 80 for matches

  return {
    score,
    matches,
    analysis: `Found ${matches.length}/${keywords.size} keywords from job description`,
  }
}

// Common words to exclude from keyword extraction
const commonWords = new Set([
  'the', 'and', 'for', 'with', 'you', 'our', 'will', 'are', 'have', 'this',
  'that', 'from', 'they', 'your', 'work', 'team', 'role', 'join', 'about',
  'experience', 'required', 'preferred', 'looking', 'seeking', 'must', 'should',
  'able', 'ability', 'years', 'strong', 'good', 'excellent', 'great', 'plus',
])

/**
 * Extract structured data from parsed resume markdown using OpenAI
 */
export async function extractResumeData(markdownContent: string): Promise<ParsedResumeData> {
  const llm = new ChatOpenAI({
    model: 'gpt-4.1-mini-2025-04-14',
    temperature: 0.1,
  })

  const systemPrompt = `You are an expert resume parser. Extract structured information from the provided resume content.

Return a valid JSON object with this exact structure:
{
  "candidate_name": "Full Name or null",
  "email": "email@example.com or null",
  "phone": "phone number or null",
  "skills": ["skill1", "skill2", ...],
  "experience_years": 5.5 (total years as number or null),
  "education": [{"degree": "Bachelor's in CS", "institution": "University", "year": 2020, "field": "Computer Science"}],
  "work_experience": [{"title": "Job Title", "company": "Company", "duration": "2 years", "description": "Brief description"}]
}

Guidelines:
- Extract ALL skills mentioned including technologies, tools, programming languages, frameworks
- Calculate total experience years from work history dates
- Include all education entries
- Include all work experience entries
- Return valid JSON only, no markdown formatting`

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(`Parse this resume:\n\n${markdownContent}`),
  ])

  try {
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
    // Clean the response - remove any markdown code blocks
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleanedContent)

    return {
      candidate_name: parsed.candidate_name || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experience_years: typeof parsed.experience_years === 'number' ? parsed.experience_years : null,
      education: Array.isArray(parsed.education) ? parsed.education : [],
      work_experience: Array.isArray(parsed.work_experience) ? parsed.work_experience : [],
      raw_text: markdownContent,
    }
  } catch {
    console.error('Failed to parse LLM response as JSON')
    return {
      candidate_name: null,
      email: null,
      phone: null,
      skills: [],
      experience_years: null,
      education: [],
      work_experience: [],
      raw_text: markdownContent,
    }
  }
}

/**
 * Extract keywords from job description using OpenAI
 */
export async function extractJobKeywords(description: string): Promise<{
  required_skills: string[]
  preferred_skills: string[]
  education_requirements: string[]
}> {
  const llm = new ChatOpenAI({
    model: 'gpt-4.1-mini-2025-04-14',
    temperature: 0.1,
  })

  const systemPrompt = `Analyze this job description and extract key requirements.

Return a valid JSON object:
{
  "required_skills": ["Must-have skills and technologies"],
  "preferred_skills": ["Nice-to-have skills"],
  "education_requirements": ["Education requirements like Bachelor's degree in CS"]
}

Be specific and include:
- Programming languages
- Frameworks and libraries
- Tools and platforms
- Soft skills
- Certifications

Return valid JSON only.`

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(description),
  ])

  try {
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleanedContent)
  } catch {
    return {
      required_skills: [],
      preferred_skills: [],
      education_requirements: [],
    }
  }
}
