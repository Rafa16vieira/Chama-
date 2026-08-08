# Chamaí

Sistema de chamados internos por sala e setor (Administração / TI), com login, realtime e alertas WhatsApp opcionais.

## Stack

- **App:** Next.js 16 (App Router) + Tailwind CSS v4 — pasta `web/`
- **Auth + DB realtime:** Supabase (Postgres + Auth + Realtime)
- **Schema:** `supabase/migrations/20260807200000_init_chamai.sql`

## Papéis

| Role | Pode |
| --- | --- |
| `super_admin` | Ver todos os chamados, CRUD salas/setores, criar admins, WhatsApp, trocar senha |
| `admin` | Ver/atender chamados do seu setor, WhatsApp, trocar senha |
| `user` | Abrir chamado (sala + setor + descrição), ver os próprios, trocar senha |

Admin principal (seed): `rafaelvieiraalbu@gmail.com` / `123456`

## Setup rápido

1. Crie um projeto no [Supabase](https://supabase.com).
2. No SQL Editor (ou CLI), rode a migration em `supabase/migrations/`.
3. Em **Authentication → URL Configuration**, adicione:
   - Site URL: `http://localhost:3000`
   - Redirect: `http://localhost:3000/auth/callback`
4. Copie `web/.env.example` → `web/.env.local` e preencha as keys.
5. Instale e suba o app:

```bash
cd web
npm install
npm run dev
```

6. Crie o admin principal:

```bash
# na raiz do repo
ALLOW_DEV_SEED=1 node scripts/seed-admin.mjs
```

7. (Opcional) WhatsApp: configure `WHATSAPP_WEBHOOK_URL` (+ secret). No **Perfil**, cada admin grava o número em E.164 (`+5511...`). Ao abrir um chamado, o webhook recebe solicitante, sala e descrição.

## Fluxos principais

- **Usuário:** Cadastro (nome obrigatório) → Abrir chamado → Meus chamados (vê comentários/notificações do setor)
- **Admin setor:** Fila realtime em `/setor` → atualizar status → comentar (notifica o solicitante)
- **Super admin:** `/salas`, `/setores`, `/admins` + fila completa
- **Trocar senha:** Perfil → enviar validação por e-mail → `/atualizar-senha`

Após a migration inicial, rode também `20260808160000_ticket_comments.sql` (comentários + notificações).

## Paleta

Escala de cinza + lilás/roxo nos detalhes (`web/src/app/styles.css`). Neutros na maior parte da UI; acentos em CTAs, foco, badges e live.

## Placeholders

- Logo: `web/public/logo.png`
- Favicon: `web/public/favicon.png`

Substitua pelos assets finais quando disponíveis.

## Agents / rules / skills

Ver `AGENTS.md` e `.cursor/` para personas, regras e skills usadas no desenho deste sistema.
