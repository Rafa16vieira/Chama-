---
name: review-ui
description: Audita interfaces por hierarquia, clutter, brand-first, acessibilidade e aderência às regras visuais do Chamaí. Use when reviewing UI, screens, landings, components, or when the user asks for UX/UI review.
---

# Review UI

## Quando usar

Revisão de telas, landings, componentes ou PRs de frontend com impacto visual.

## Passos

1. Identifique o job da viewport/seção
2. Avalie brand-first, clutter e cards desnecessários
3. Cheque Tailwind v4 + reúso em `styles.css`
4. Verifique bordas suaves e ausência de paleta inventada
5. Cheque a11y (contraste, foco, labels, teclado)
6. Liste achados por prioridade

## Formato de saída

```markdown
## Veredito
[1–2 frases]

## Crítico
- ...

## Melhorias
- ...

## A11y
- ...

## Próximos passos
1. ...
```
