/**
 * LlamaParse API Client
 * Handles document parsing using the LlamaParse Cloud API
 */

const LLAMAPARSE_API_BASE = 'https://api.cloud.llamaindex.ai/api/v1/parsing'

interface UploadResponse {
  id: string
  status: string
}

interface JobStatusResponse {
  id: string
  status: 'PENDING' | 'SUCCESS' | 'ERROR' | 'PARTIAL_SUCCESS'
  error_code?: string
  error_message?: string
}

interface JobResultResponse {
  markdown: string
  text: string
  job_metadata: {
    pages: number
    credits_used: number
  }
}

/**
 * Get the LlamaParse API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY
  if (!apiKey) {
    throw new Error('LLAMA_CLOUD_API_KEY environment variable is not set')
  }
  return apiKey
}

/**
 * Upload a document to LlamaParse for parsing
 */
export async function uploadDocument(
  fileBuffer: Buffer,
  fileName: string,
  fileType: string = 'application/pdf'
): Promise<string> {
  const apiKey = getApiKey()

  const formData = new FormData()
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: fileType })
  formData.append('file', blob, fileName)

  // Configure parsing options
  formData.append('result_type', 'markdown')
  formData.append('parsing_instruction', `
    This is a resume/CV document. Please extract:
    - Full name and contact information (email, phone)
    - Skills and technologies
    - Work experience with company names, job titles, and durations
    - Education with degrees, institutions, and graduation years
    - Any certifications or achievements
    Format the output as clean markdown.
  `)

  const response = await fetch(`${LLAMAPARSE_API_BASE}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LlamaParse upload failed: ${response.status} - ${error}`)
  }

  const data: UploadResponse = await response.json()
  return data.id
}

/**
 * Get the status of a parsing job
 */
export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const apiKey = getApiKey()

  const response = await fetch(`${LLAMAPARSE_API_BASE}/job/${jobId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LlamaParse status check failed: ${response.status} - ${error}`)
  }

  return response.json()
}

/**
 * Get the result of a completed parsing job
 */
export async function getJobResult(jobId: string): Promise<JobResultResponse> {
  const apiKey = getApiKey()

  const response = await fetch(`${LLAMAPARSE_API_BASE}/job/${jobId}/result/markdown`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LlamaParse result fetch failed: ${response.status} - ${error}`)
  }

  return response.json()
}

/**
 * Poll for job completion with timeout
 */
export async function waitForCompletion(
  jobId: string,
  maxAttempts: number = 60,
  intervalMs: number = 2000
): Promise<JobStatusResponse> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await getJobStatus(jobId)

    if (status.status === 'SUCCESS' || status.status === 'PARTIAL_SUCCESS') {
      return status
    }

    if (status.status === 'ERROR') {
      throw new Error(`Parsing failed: ${status.error_message || 'Unknown error'}`)
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }

  throw new Error('Parsing timeout: Job did not complete within expected time')
}

/**
 * Parse a document and return the markdown result
 */
export async function parseDocument(
  fileBuffer: Buffer,
  fileName: string,
  fileType: string = 'application/pdf'
): Promise<{ jobId: string; markdown: string }> {
  // Upload the document
  const jobId = await uploadDocument(fileBuffer, fileName, fileType)

  // Wait for completion
  await waitForCompletion(jobId)

  // Get the result
  const result = await getJobResult(jobId)

  return {
    jobId,
    markdown: result.markdown || result.text,
  }
}
