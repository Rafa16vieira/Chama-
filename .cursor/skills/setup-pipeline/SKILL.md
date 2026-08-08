---
name: setup-pipeline
description: Configura ou corrige pipelines CI/CD (lint, test, build, deploy) com secrets seguros e fail-fast. Use when creating GitHub Actions, fixing CI, setting up deploy workflows, or release automation.
---

# Setup de pipeline

## Workflow

1. Mapear comandos locais (lint/test/build)
2. Criar/ajustar workflow fail-fast
3. Paralelizar jobs independentes
4. Adicionar cache de dependências
5. Configurar secrets/vars (documentar, não hardcodar)
6. Definir ambiente de deploy e gates

## Checklist

- [ ] Lint + typecheck + test + build
- [ ] Secrets só no provedor CI
- [ ] Cache configurado
- [ ] Artefatos/logs úteis em falha
- [ ] Instruções de validação local

## Saída

- Arquivo(s) de workflow
- Lista de secrets/vars
- Como validar
