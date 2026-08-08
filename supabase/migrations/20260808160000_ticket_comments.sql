-- =============================================================================
-- Chamaí — comentários em chamados + notificações ao solicitante
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid NOT NULL REFERENCES public.tickets (id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_comments_body_nonempty CHECK (length(btrim(body)) > 0)
);

COMMENT ON TABLE public.ticket_comments IS 'Comentários de staff (admin/super_admin) em chamados.';

CREATE INDEX IF NOT EXISTS ticket_comments_ticket_created_idx
  ON public.ticket_comments (ticket_id, created_at ASC);

CREATE INDEX IF NOT EXISTS ticket_comments_author_idx
  ON public.ticket_comments (author_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ticket_id   uuid REFERENCES public.tickets (id) ON DELETE CASCADE,
  comment_id  uuid REFERENCES public.ticket_comments (id) ON DELETE CASCADE,
  title       text NOT NULL,
  body        text NOT NULL,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS 'Notificações in-app para o solicitante do chamado.';

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS notifications_ticket_idx
  ON public.notifications (ticket_id);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Comentários: quem vê o ticket pode ler os comentários
DROP POLICY IF EXISTS ticket_comments_select_scoped ON public.ticket_comments;
CREATE POLICY ticket_comments_select_scoped
  ON public.ticket_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tickets t
      WHERE t.id = ticket_id
        AND (
          t.created_by = auth.uid()
          OR public.is_super_admin()
          OR (
            public.is_admin()
            AND t.sector_id = public.current_admin_sector_id()
          )
        )
    )
  );

-- Inserir: apenas staff com acesso ao ticket
DROP POLICY IF EXISTS ticket_comments_insert_staff ON public.ticket_comments;
CREATE POLICY ticket_comments_insert_staff
  ON public.ticket_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.is_super_admin()
      OR (
        public.is_admin()
        AND EXISTS (
          SELECT 1
          FROM public.tickets t
          WHERE t.id = ticket_id
            AND t.sector_id = public.current_admin_sector_id()
        )
      )
    )
  );

-- Notificações: só o destinatário
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Insert de notificações via service role (server action), sem policy INSERT authenticated

GRANT SELECT, INSERT ON public.ticket_comments TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- -----------------------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ticket_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_comments;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

ALTER TABLE public.ticket_comments REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- =============================================================================
-- Verificação
--   SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('ticket_comments','notifications');
-- Rollback (dev):
--   ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.notifications;
--   ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.ticket_comments;
--   DROP TABLE IF EXISTS public.notifications;
--   DROP TABLE IF EXISTS public.ticket_comments;
-- =============================================================================
