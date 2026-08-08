---
name: migracao-banco
description: Planeja e escreve migrations SQL seguras com expand/contract, rollback e verificação. Use when creating database migrations, altering schemas, adding indexes, or changing columns in production-safe ways.
---

# Migração de banco

## Workflow

1. Descrever mudança e risco (lock, backfill, downtime)
2. Escolher estratégia: simples vs expand → backfill → contract
3. Escrever migration + rollback/caminho reverso
4. Incluir índices/constraints necessários
5. Adicionar queries de verificação pós-deploy
6. Documentar ordem de deploy (app vs migration)

## Checklist

- [ ] Reversível ou com plano de rollback
- [ ] Sem alteração perigosa in-place sem plano
- [ ] Backfill separado se volume alto
- [ ] Índices alinhados a queries
- [ ] Verificação pós-deploy definida

## Saída

- SQL/migration
- Riscos
- Ordem de rollout
- Queries de verificação
