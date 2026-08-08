---
name: desenhar-api
description: Desenha contratos de API (endpoints, schemas, erros, auth) antes da implementação. Use when creating or changing APIs, endpoints, services, or request/response contracts.
---

# Desenhar API

## Passos

1. Definir recurso e casos de uso
2. Escolher verbos/rotas e idempotência
3. Especificar authn/authz
4. Definir request/response e erros (`code` + `message`)
5. Listar edge cases e limites (rate, pagination)
6. Só então implementar (se pedido)

## Template

```markdown
## Recurso
## Endpoints
| Method | Path | Auth | Descrição |
## Schemas
## Erros
| code | status | quando |
## Notas
```

## Regras

- Validação na borda
- Sem vazar detalhes internos em erros
- Backward-compatible quando houver clientes
