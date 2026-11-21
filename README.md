# Atalho

[![CI](https://github.com/Drefus/tp-testes-shortfy/actions/workflows/ci.yml/badge.svg)](https://github.com/Drefus/tp-testes-shortfy/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Drefus/tp-testes-shortfy/branch/main/graph/badge.svg)](https://codecov.io/gh/Drefus/tp-testes-shortfy)

Encurtador de links com estatísticas de acesso, desenvolvido para a disciplina de Teste de Software (UFMG).

## Stack

Node.js 20, TypeScript, Express, EJS, Chart.js, PostgreSQL (`pg`).
Testes: Vitest + `@vitest/coverage-v8` (unidade), Supertest (API) e Playwright (e2e).

## Arquitetura

```
src/
  domain/        regras puras (validação de URL, slugs, estatísticas)
  repositories/  interface LinkRepository + InMemory / Postgres
  services/      casos de uso
  http/          rotas Express
  views/         páginas EJS
```

A implementação do repositório é escolhida por `STORAGE=memory|postgres`. Testes e CI usam sempre `memory`.

## Scripts

| Comando                 | Descrição                            |
| ----------------------- | ------------------------------------ |
| `npm run lint`          | ESLint                               |
| `npm run typecheck`     | Verificação de tipos                 |
| `npm test`              | Testes de unidade e integração       |
| `npm run test:coverage` | Testes com cobertura (mínimo de 80%) |
| `npm run build`         | Compila para `dist/`                 |

## Configuração

Copie `.env.example` para `.env` e ajuste as variáveis.
