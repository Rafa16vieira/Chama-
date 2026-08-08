---
name: checklist-deploy
description: Monta checklist de deploy/release com migrations, envs, rollback e validação. Use when preparing production deploy, release, hotfix, or go-live.
---

# Checklist de deploy

## Antes

- [ ] CI verde
- [ ] Migrations revisadas + rollback
- [ ] Env/secrets do ambiente conferidos
- [ ] Feature flags (se houver) definidas
- [ ] Comunicação/impacto conhecido

## Durante

- [ ] Ordem correta (migration → app ou conforme plano)
- [ ] Monitorar erros/latência
- [ ] Smoke test dos fluxos críticos

## Depois

- [ ] Validar métricas e logs
- [ ] Confirmar rollback path ainda válido
- [ ] Anotar follow-ups

## Saída

Lista priorizada com dono/ação e critério de sucesso.
