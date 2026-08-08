# AGENTS.md — Chamaí

Instruções base para agents neste repositório. Detalhes por domínio ficam em `.cursor/rules/` e personas em `.cursor/agents/`.

## Princípios

- Responder em PT-BR, de forma direta
- Menor mudança possível; sem refactors fora do pedido
- Consultar o usuário antes de definir paleta de cores
- CSS com Tailwind v4; reúso em `styles.css`; bordas arredondadas

## Subagents (`.cursor/agents/`)

| Agent | Uso |
| --- | --- |
| `ux-ui` | Fluxos, usabilidade, hierarquia, a11y de interface |
| `frontend` | Implementação React/TS + Tailwind |
| `backend` | APIs, serviços, auth, regras de negócio |
| `design-grafico` | Identidade, tipografia, assets, direção de arte |
| `ci-cd` | Pipelines, Actions, deploy, quality gates |
| `engenheiro-de-dados` | ETL/ELT, eventos, qualidade de dados |
| `dba` | Schema, migrations, índices, performance SQL |
| `qa` | Test plans, regressão, critérios de aceite |
| `security` | Authz, secrets, OWASP, revisão sensível |

Exemplo: `Use o subagent ux-ui para revisar a landing`.

## Rules (`.cursor/rules/`)

- `project-core.mdc` — sempre
- `style-rules.mdc` — visual/CSS (sempre + globs)
- `frontend.mdc`, `backend.mdc`, `database.mdc`, `ci-cd.mdc`, `testing.mdc`, `data-engineering.mdc`, `security.mdc` — por contexto

## Skills (`.cursor/skills/`)

- `review-ui` — auditoria visual/UX
- `audit-acessibilidade` — checklist a11y
- `desenhar-api` — contrato de API
- `migracao-banco` — migrations seguras
- `setup-pipeline` — CI/CD
- `modelagem-dados` — schemas/eventos
- `checklist-deploy` — go-live/release
