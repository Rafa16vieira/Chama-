-- =============================================================================
-- Chamaí — chamados públicos (sem login)
-- created_by passa a ser opcional para solicitantes anônimos.
-- =============================================================================

ALTER TABLE public.tickets
  ALTER COLUMN created_by DROP NOT NULL;

COMMENT ON COLUMN public.tickets.created_by IS
  'Perfil do solicitante quando autenticado; NULL em chamados públicos.';

-- Leitura pública de salas/setores ativos (formulário sem login)
DROP POLICY IF EXISTS sectors_select_public_active ON public.sectors;
CREATE POLICY sectors_select_public_active
  ON public.sectors
  FOR SELECT
  TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS rooms_select_public_active ON public.rooms;
CREATE POLICY rooms_select_public_active
  ON public.rooms
  FOR SELECT
  TO anon
  USING (is_active = true);

GRANT SELECT ON public.sectors TO anon;
GRANT SELECT ON public.rooms TO anon;

-- =============================================================================
-- Verificação
--   SELECT column_name, is_nullable FROM information_schema.columns
--     WHERE table_name='tickets' AND column_name='created_by';
-- Rollback:
--   DROP POLICY IF EXISTS sectors_select_public_active ON public.sectors;
--   DROP POLICY IF EXISTS rooms_select_public_active ON public.rooms;
--   REVOKE SELECT ON public.sectors FROM anon;
--   REVOKE SELECT ON public.rooms FROM anon;
--   -- só se não houver tickets com created_by NULL:
--   -- ALTER TABLE public.tickets ALTER COLUMN created_by SET NOT NULL;
-- =============================================================================
