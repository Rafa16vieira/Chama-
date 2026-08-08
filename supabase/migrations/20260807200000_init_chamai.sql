-- =============================================================================
-- Chamaí — migration inicial (Postgres / Supabase)
-- Expand-friendly: cria tipos, tabelas, FKs, índices, RLS, seed, realtime.
-- Rollback: ver seção final (comentada) / arquivo *_down.sql se necessário.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensões
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 2. Enums (expand: novos valores via ALTER TYPE ... ADD VALUE)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Tabelas
-- -----------------------------------------------------------------------------

-- 3.1 sectors (setores destino dos chamados)
CREATE TABLE IF NOT EXISTS public.sectors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL,
  name        text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sectors_slug_format CHECK (slug ~ '^[a-z0-9_]+$'),
  CONSTRAINT sectors_slug_unique UNIQUE (slug),
  CONSTRAINT sectors_name_unique UNIQUE (name)
);

COMMENT ON TABLE public.sectors IS 'Setores internos (ex.: Administração, TI).';
COMMENT ON COLUMN public.sectors.slug IS 'Chave estável: administracao | ti.';

-- 3.2 rooms (salas)
CREATE TABLE IF NOT EXISTS public.rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  code        text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rooms_name_unique UNIQUE (name),
  CONSTRAINT rooms_code_unique UNIQUE (code)
);

COMMENT ON TABLE public.rooms IS 'Salas físicas / locais de origem do chamado.';

-- 3.3 profiles (1:1 com auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text,
  role        public.app_role NOT NULL DEFAULT 'user',
  sector_id   uuid REFERENCES public.sectors (id) ON DELETE RESTRICT,
  whatsapp    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_email_unique UNIQUE (email),
  CONSTRAINT profiles_whatsapp_format CHECK (
    whatsapp IS NULL OR whatsapp ~ '^\+?[1-9]\d{7,14}$'
  ),
  -- user: nome obrigatório
  CONSTRAINT profiles_user_requires_name CHECK (
    role <> 'user'::public.app_role OR (full_name IS NOT NULL AND length(btrim(full_name)) > 0)
  ),
  -- admin: setor obrigatório; whatsapp opcional
  CONSTRAINT profiles_admin_requires_sector CHECK (
    role <> 'admin'::public.app_role OR sector_id IS NOT NULL
  ),
  -- super_admin: sem setor (evita ambiguidade de escopo)
  CONSTRAINT profiles_super_admin_no_sector CHECK (
    role <> 'super_admin'::public.app_role OR sector_id IS NULL
  )
);

COMMENT ON TABLE public.profiles IS 'Perfil de app ligado a auth.users.';
COMMENT ON COLUMN public.profiles.role IS 'super_admin | admin | user.';
COMMENT ON COLUMN public.profiles.sector_id IS 'Obrigatório para admin (administracao|ti).';
COMMENT ON COLUMN public.profiles.whatsapp IS 'Opcional; típico de admin. E.164 sem espaços.';

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);
CREATE INDEX IF NOT EXISTS profiles_sector_id_idx ON public.profiles (sector_id)
  WHERE sector_id IS NOT NULL;

-- 3.4 tickets (chamados)
CREATE TABLE IF NOT EXISTS public.tickets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid NOT NULL REFERENCES public.rooms (id) ON DELETE RESTRICT,
  sector_id       uuid NOT NULL REFERENCES public.sectors (id) ON DELETE RESTRICT,
  created_by      uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  requester_name  text NOT NULL,
  description     text NOT NULL,
  status          public.ticket_status NOT NULL DEFAULT 'open',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tickets_requester_name_nonempty CHECK (length(btrim(requester_name)) > 0),
  CONSTRAINT tickets_description_nonempty CHECK (length(btrim(description)) > 0)
);

COMMENT ON TABLE public.tickets IS 'Chamados internos: sala + setor destino + solicitante + descrição + status.';
COMMENT ON COLUMN public.tickets.requester_name IS 'Snapshot do nome no momento da abertura.';
COMMENT ON COLUMN public.tickets.sector_id IS 'Setor destino (Administração ou TI).';

-- Índices alinhados a padrões de acesso
CREATE INDEX IF NOT EXISTS tickets_sector_status_created_idx
  ON public.tickets (sector_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS tickets_created_by_created_idx
  ON public.tickets (created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS tickets_room_id_idx
  ON public.tickets (room_id);

CREATE INDEX IF NOT EXISTS tickets_status_created_idx
  ON public.tickets (status, created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. updated_at automático
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sectors_set_updated_at ON public.sectors;
CREATE TRIGGER sectors_set_updated_at
  BEFORE UPDATE ON public.sectors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS rooms_set_updated_at ON public.rooms;
CREATE TRIGGER rooms_set_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tickets_set_updated_at ON public.tickets;
CREATE TRIGGER tickets_set_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. Helpers RLS (SECURITY DEFINER, search_path fixo)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role FROM public.profiles p WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'super_admin'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.current_admin_sector_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.sector_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.role = 'admin'::public.app_role;
$$;

-- -----------------------------------------------------------------------------
-- 6. Bootstrap de profile no signup (+ promoção do super_admin por e-mail)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role := 'user';
  v_name text;
BEGIN
  v_name := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), '');

  IF lower(NEW.email) = 'rafaelvieiraalbu@gmail.com' THEN
    v_role := 'super_admin';
  END IF;

  -- role=user exige full_name (CHECK); fallback evita falha no signup sem metadata
  IF v_role = 'user'::public.app_role AND v_name IS NULL THEN
    v_name := split_part(NEW.email, '@', 1);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, v_name, v_role)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        -- promove se o e-mail canônico fizer login depois
        role = CASE
          WHEN lower(EXCLUDED.email) = 'rafaelvieiraalbu@gmail.com'
            THEN 'super_admin'::public.app_role
          ELSE public.profiles.role
        END,
        updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Impede auto-elevação de role / troca de sector_id (exceto super_admin)
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- auth.uid() nulo: migration / service role / bootstrap
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Não é permitido alterar role';
  END IF;

  IF NEW.sector_id IS DISTINCT FROM OLD.sector_id THEN
    RAISE EXCEPTION 'Não é permitido alterar sector_id';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Não é permitido alterar email';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_privileges ON public.profiles;
CREATE TRIGGER profiles_protect_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- -----------------------------------------------------------------------------
-- 7. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.sectors  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets  ENABLE ROW LEVEL SECURITY;

-- ---- sectors ----
DROP POLICY IF EXISTS sectors_select_authenticated ON public.sectors;
CREATE POLICY sectors_select_authenticated
  ON public.sectors
  FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_super_admin());

DROP POLICY IF EXISTS sectors_insert_super_admin ON public.sectors;
CREATE POLICY sectors_insert_super_admin
  ON public.sectors
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS sectors_update_super_admin ON public.sectors;
CREATE POLICY sectors_update_super_admin
  ON public.sectors
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS sectors_delete_super_admin ON public.sectors;
CREATE POLICY sectors_delete_super_admin
  ON public.sectors
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- ---- rooms ----
DROP POLICY IF EXISTS rooms_select_authenticated ON public.rooms;
CREATE POLICY rooms_select_authenticated
  ON public.rooms
  FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_super_admin());

DROP POLICY IF EXISTS rooms_insert_super_admin ON public.rooms;
CREATE POLICY rooms_insert_super_admin
  ON public.rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS rooms_update_super_admin ON public.rooms;
CREATE POLICY rooms_update_super_admin
  ON public.rooms
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS rooms_delete_super_admin ON public.rooms;
CREATE POLICY rooms_delete_super_admin
  ON public.rooms
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- ---- profiles ----
-- Leitura: próprio perfil; admin vê usuários (para atendimento); super_admin vê todos
DROP POLICY IF EXISTS profiles_select_self_or_staff ON public.profiles;
CREATE POLICY profiles_select_self_or_staff
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.is_super_admin()
    OR public.is_admin()
  );

-- Insert: apenas via trigger SECURITY DEFINER (sem policy INSERT para authenticated)
-- Update próprio: nome / whatsapp; role/sector/email protegidos por trigger
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Super_admin: CRUD completo de profiles (promover admin, atribuir setor, etc.)
DROP POLICY IF EXISTS profiles_all_super_admin ON public.profiles;
CREATE POLICY profiles_all_super_admin
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ---- tickets ----
DROP POLICY IF EXISTS tickets_select_scoped ON public.tickets;
CREATE POLICY tickets_select_scoped
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_super_admin()
    OR (
      public.is_admin()
      AND sector_id = public.current_admin_sector_id()
    )
  );

DROP POLICY IF EXISTS tickets_insert_authenticated ON public.tickets;
CREATE POLICY tickets_insert_authenticated
  ON public.tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_id AND r.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.sectors s
      WHERE s.id = sector_id AND s.is_active = true
    )
  );

-- User: não altera ticket após criar (apenas staff)
-- Admin: atualiza tickets do próprio setor (status, etc.)
-- Super_admin: qualquer ticket
DROP POLICY IF EXISTS tickets_update_staff ON public.tickets;
CREATE POLICY tickets_update_staff
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_admin()
      AND sector_id = public.current_admin_sector_id()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_admin()
      AND sector_id = public.current_admin_sector_id()
    )
  );

DROP POLICY IF EXISTS tickets_delete_super_admin ON public.tickets;
CREATE POLICY tickets_delete_super_admin
  ON public.tickets
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- 8. Grants
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sectors  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms    TO authenticated;
GRANT SELECT, UPDATE              ON public.profiles    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets  TO authenticated;

GRANT EXECUTE ON FUNCTION public.current_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_admin_sector_id() TO authenticated;

-- -----------------------------------------------------------------------------
-- 9. Realtime (tickets)
-- -----------------------------------------------------------------------------
-- Idempotente: adiciona à publication se ainda não estiver
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
  END IF;
END $$;

-- Replica identity FULL: payloads de UPDATE/DELETE completos no Realtime
ALTER TABLE public.tickets REPLICA IDENTITY FULL;

-- -----------------------------------------------------------------------------
-- 10. Seed
-- -----------------------------------------------------------------------------
INSERT INTO public.sectors (slug, name)
VALUES
  ('administracao', 'Administração'),
  ('ti', 'TI')
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      is_active = true,
      updated_at = now();

INSERT INTO public.rooms (name, code)
VALUES
  ('Recepção', 'REC'),
  ('Sala 101', 'S101'),
  ('Sala 102', 'S102'),
  ('Sala de Reuniões', 'SR'),
  ('Auditório', 'AUD')
ON CONFLICT (name) DO UPDATE
  SET code = EXCLUDED.code,
      is_active = true,
      updated_at = now();

-- Promove super_admin se o usuário Auth já existir (signup anterior à migration)
UPDATE public.profiles p
SET
  role = 'super_admin'::public.app_role,
  sector_id = NULL,
  updated_at = now()
WHERE lower(p.email) = 'rafaelvieiraalbu@gmail.com'
  AND p.role IS DISTINCT FROM 'super_admin'::public.app_role;

-- =============================================================================
-- Notas de rollout
-- =============================================================================
-- 1. Aplicar esta migration (supabase db push / migration up).
-- 2. Garantir signup/login de rafaelvieiraalbu@gmail.com (Auth).
--    - Se já existir: UPDATE acima promove.
--    - Se novo: trigger handle_new_user atribui super_admin.
-- 3. Super_admin promove admins: UPDATE profiles SET role='admin', sector_id=...
-- 4. App: usuários role=user devem enviar full_name no metadata ou UPDATE do perfil
--    antes de operações que dependam do CHECK profiles_user_requires_name.
-- 5. Habilitar Realtime no dashboard se o projeto exigir confirmação manual
--    (a publication já inclui public.tickets).
--
-- Riscos
-- - DELETE em sectors/rooms com tickets: bloqueado por ON DELETE RESTRICT
--   (preferir is_active = false — soft deactivate).
-- - Elevação de privilégio em profiles bloqueada por trigger
--   protect_profile_privileges (role/sector_id/email).
-- - Seed NÃO cria auth.users (Supabase Auth); só promove profile se existir.
--
-- Verificação pós-deploy
--   SELECT slug, name FROM public.sectors ORDER BY slug;
--   SELECT name, code FROM public.rooms ORDER BY name;
--   SELECT id, email, role, sector_id FROM public.profiles
--     WHERE lower(email) = 'rafaelvieiraalbu@gmail.com';
--   SELECT tablename FROM pg_publication_tables
--     WHERE pubname = 'supabase_realtime' AND tablename = 'tickets';
--   SELECT polname, tablename FROM pg_policies
--     WHERE schemaname = 'public' ORDER BY tablename, polname;
--
-- Rollback (contract — só em ambiente sem dados críticos)
--   ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.tickets;
--   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--   DROP FUNCTION IF EXISTS public.handle_new_user();
--   DROP TABLE IF EXISTS public.tickets;
--   DROP TABLE IF EXISTS public.profiles;
--   DROP TABLE IF EXISTS public.rooms;
--   DROP TABLE IF EXISTS public.sectors;
--   DROP FUNCTION IF EXISTS public.current_admin_sector_id();
--   DROP FUNCTION IF EXISTS public.is_admin();
--   DROP FUNCTION IF EXISTS public.is_super_admin();
--   DROP FUNCTION IF EXISTS public.current_user_role();
--   DROP FUNCTION IF EXISTS public.current_profile();
--   DROP FUNCTION IF EXISTS public.set_updated_at();
--   DROP TYPE IF EXISTS public.ticket_status;
--   DROP TYPE IF EXISTS public.app_role;
-- =============================================================================
