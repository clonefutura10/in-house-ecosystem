-- Add job_id to ats_resumes for optional job association
-- Resumes with NULL job_id are "global" and can be scored against any job
-- Resumes with a job_id are associated with that specific job

ALTER TABLE ats_resumes
ADD COLUMN job_id uuid REFERENCES ats_jobs(id) ON DELETE SET NULL;

-- Create index for filtering by job
CREATE INDEX idx_ats_resumes_job_id ON ats_resumes(job_id);

-- Add comment for clarity
COMMENT ON COLUMN ats_resumes.job_id IS 'Optional job association. NULL means global resume.';
