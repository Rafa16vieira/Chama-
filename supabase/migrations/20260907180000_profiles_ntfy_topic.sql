-- Expand: tópico ntfy pessoal por perfil (admins/super_admins).
-- Quem tem o tópico cadastrado recebe push ao abrir chamado do seu escopo
-- (admin do setor OU super_admin), igual ao filtro do WhatsApp.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ntfy_topic text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_ntfy_topic_format;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_ntfy_topic_format
  CHECK (
    ntfy_topic IS NULL
    OR ntfy_topic ~ '^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$'
  );

COMMENT ON COLUMN public.profiles.ntfy_topic IS
  'Tópico ntfy pessoal (ex.: chamai-rafael-x7k2). Só admins/super_admins usam; vazio = sem push.';

-- Verificação:
--   SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='profiles' AND column_name='ntfy_topic';

-- Rollback:
--   ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_ntfy_topic_format;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS ntfy_topic;
