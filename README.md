# Chamaí

O **Chamaí** é um sistema de chamados internos: a pessoa informa a sala e o setor responsável (Administração ou TI), e a equipe acompanha e responde em tempo real.

## Quem usa o sistema

### Solicitante (sem login)
- Acessa a página inicial do site
- Abre um chamado com **sala**, **setor**, **nome** e **descrição**
- Não vê links para as áreas internas (login e painéis são endereços conhecidos pela equipe)

### Usuário autenticado
- Acompanha chamados próprios (quando aplicável) e o perfil
- Troca de senha com validação por e-mail

### Administrador de setor
- Atende a fila de chamados do seu setor (Administração ou TI)
- Atualiza o status: aberto, em andamento, resolvido ou cancelado
- Escreve **comentários** que o solicitante autenticado vê e é notificado
- Pode cadastrar um número de **WhatsApp** e/ou um **tópico ntfy** no perfil para alertas de novos chamados do seu escopo

### Administrador principal
- Faz tudo que um admin de setor faz, em **todos** os setores
- Gerencia **salas** (criar, editar, desativar)
- Gerencia **setores**
- Cria novos **admins** e define a qual setor cada um pertence

## Fluxo típico

1. Qualquer pessoa abre a home e envia um chamado (sala + setor + nome + descrição).
2. O setor correspondente vê o chamado na fila (atualização em tempo real).
3. A equipe pode assumir, comentar e mudar o status até resolver.
4. Quem tem login acessa as áreas internas por URL conhecida (ex.: `/login`, `/setor`).

## Status dos chamados

| Status | Significado |
| --- | --- |
| Aberto | Acabou de ser criado / aguardando atendimento |
| Em andamento | A equipe está tratando |
| Resolvido | Concluído (fica na seção colapsada de resolvidos) |
| Cancelado | Encerrado sem resolução (também na seção de resolvidos) |

## Conta e segurança

- Login por e-mail e senha
- Troca de senha com **validação por e-mail**
- Cada perfil acessa apenas o que o seu papel permite

## Resumo

O Chamaí centraliza pedidos por sala, direciona para Administração ou TI, permite acompanhamento em tempo real e mantém o solicitante informado por comentários e notificações (quando autenticado).

## Deploy (Vercel)

O app Next.js fica na pasta `web/`. Na Vercel:

1. **Settings → General → Root Directory** → defina `web` → Save
2. Em **Environment Variables**, cadastre:
   - `NEXT_PUBLIC_SITE_URL` = URL do projeto na Vercel (ex.: `https://seu-app.vercel.app`)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - (Opcional) `NTFY_BASE_URL` = `https://ntfy.sh` (padrão) ou seu servidor ntfy
   - (Opcional) `NTFY_TOKEN` = token se o servidor exigir autenticação
3. **Deployments → Redeploy** o último deploy (ou faça um novo push)
4. No Supabase → rode a migration `profiles_ntfy_topic` e em **Authentication → URL Configuration**:
   - Site URL = a mesma URL da Vercel
   - Redirect URLs = `https://seu-app.vercel.app/auth/callback`

Cada admin configura o **tópico ntfy** em **Perfil** e assina o mesmo tópico no app ntfy. Só recebe push de chamados que já entrariam na fila dele (setor do admin; todos os setores no super admin).

Sem o Root Directory em `web`, a Vercel costuma responder **404**.
