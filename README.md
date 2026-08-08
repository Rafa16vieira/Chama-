# Chamaí

O **Chamaí** é um sistema de chamados internos: a pessoa informa a sala e o setor responsável (Administração ou TI), e a equipe acompanha e responde em tempo real.

## Quem usa o sistema

### Solicitante (usuário comum)
- Cria uma conta com nome, e-mail e senha
- Abre um chamado escolhendo a **sala**, o **setor** e a **descrição** do problema
- Acompanha os próprios chamados em **abertos** e **resolvidos**
- Recebe **comentários** da equipe no chamado (com notificação na tela)

### Administrador de setor
- Atende a fila de chamados do seu setor (Administração ou TI)
- Atualiza o status: aberto, em andamento, resolvido ou cancelado
- Escreve **comentários** que o solicitante vê e é notificado
- Pode cadastrar um número de **WhatsApp** no perfil para alertas de novos chamados (quando configurado)

### Administrador principal
- Faz tudo que um admin de setor faz, em **todos** os setores
- Gerencia **salas** (criar, editar, desativar)
- Gerencia **setores**
- Cria novos **admins** e define a qual setor cada um pertence

## Fluxo típico

1. O solicitante entra e abre um chamado (sala + setor + descrição).
2. O setor correspondente vê o chamado na fila (atualização em tempo real).
3. A equipe pode assumir, comentar e mudar o status até resolver.
4. O solicitante acompanha o andamento e as respostas em **Meus chamados**.

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

O Chamaí centraliza pedidos por sala, direciona para Administração ou TI, permite acompanhamento em tempo real e mantém o solicitante informado por comentários e notificações.

## Deploy (Vercel)

O app Next.js fica na pasta `web/`. Na Vercel:

1. **Settings → General → Root Directory** → defina `web` → Save
2. Em **Environment Variables**, cadastre:
   - `NEXT_PUBLIC_SITE_URL` = URL do projeto na Vercel (ex.: `https://seu-app.vercel.app`)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. **Deployments → Redeploy** o último deploy (ou faça um novo push)
4. No Supabase → **Authentication → URL Configuration**:
   - Site URL = a mesma URL da Vercel
   - Redirect URLs = `https://seu-app.vercel.app/auth/callback`

Sem o Root Directory em `web`, a Vercel costuma responder **404**.
