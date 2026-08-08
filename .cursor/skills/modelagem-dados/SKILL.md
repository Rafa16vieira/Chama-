---
name: modelagem-dados
description: Modela schemas, eventos e tabelas com chaves, qualidade e lineage mínima. Use when designing data models, event schemas, warehouses, ETL/ELT, or data quality checks.
---

# Modelagem de dados

## Passos

1. Definir entidade/evento e perguntas de negócio
2. Escolher grão (grain) e chaves
3. Versionar schema/contrato
4. Definir checks de qualidade
5. Planejar backfill e reprocessamento
6. Documentar lineage fonte → destino

## Template

```markdown
## Objetivo
## Grain
## Schema
## Chaves / unicidade
## Qualidade
## Lineage
## Backfill
```

## Regras

- Idempotência
- Minimizar PII
- Evitar pipelines sem contrato
