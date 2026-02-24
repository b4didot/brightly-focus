-- Allow standalone items by making milestone optional.
ALTER TABLE public.items
ALTER COLUMN milestone_id DROP NOT NULL;
