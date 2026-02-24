-- Add contextual project/milestone fields and project scope control.
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS visibility_scope TEXT NOT NULL DEFAULT 'team',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_visibility_scope_check'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects
    ADD CONSTRAINT projects_visibility_scope_check
    CHECK (visibility_scope IN ('team', 'personal'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_projects_team_scope_created_at
ON public.projects (team_id, visibility_scope, created_at DESC);

ALTER TABLE public.milestones
ADD COLUMN IF NOT EXISTS description TEXT;
