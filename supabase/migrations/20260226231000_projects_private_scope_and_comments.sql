-- Projects visibility migration: personal -> private, creator ownership, and project comments.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'project_visibility_scope'
  ) THEN
    CREATE TYPE public.project_visibility_scope AS ENUM ('team', 'private');
  END IF;
END
$$;

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS created_by_user_id UUID;

UPDATE public.projects
SET visibility_scope = 'private'
WHERE visibility_scope::text = 'personal';

ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS projects_visibility_scope_check;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'visibility_scope'
      AND udt_name <> 'project_visibility_scope'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE public.projects
      ALTER COLUMN visibility_scope DROP DEFAULT
    $sql$;

    EXECUTE $sql$
      ALTER TABLE public.projects
      ALTER COLUMN visibility_scope TYPE public.project_visibility_scope
      USING (
        CASE
          WHEN visibility_scope::text = 'personal' THEN 'private'
          WHEN visibility_scope IS NULL OR btrim(visibility_scope::text) = '' THEN 'team'
          ELSE visibility_scope::text
        END
      )::public.project_visibility_scope
    $sql$;
  END IF;
END
$$;

ALTER TABLE public.projects
ALTER COLUMN visibility_scope SET DEFAULT 'team';

ALTER TABLE public.projects
ALTER COLUMN visibility_scope SET NOT NULL;

UPDATE public.projects
SET created_by_user_id = default_user_id
WHERE created_by_user_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_created_by_user_id_fkey'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects
    ADD CONSTRAINT projects_created_by_user_id_fkey
    FOREIGN KEY (created_by_user_id)
    REFERENCES public.users(id);
  END IF;
END
$$;

ALTER TABLE public.projects
ALTER COLUMN created_by_user_id SET NOT NULL;

ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS projects_visibility_scope_check;

DROP INDEX IF EXISTS idx_projects_team_scope_created_at;

CREATE INDEX IF NOT EXISTS idx_projects_team_scope_created_at
ON public.projects (team_id, visibility_scope, created_at DESC);

CREATE TABLE IF NOT EXISTS public.project_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES public.users(id),
  parent_comment_id UUID NULL REFERENCES public.project_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_comments_project_created_at
ON public.project_comments (project_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_project_comments_parent_created_at
ON public.project_comments (parent_comment_id, created_at ASC);
