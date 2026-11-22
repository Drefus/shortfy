# Shortfy

[![CI](https://github.com/Drefus/shortfy/actions/workflows/ci.yml/badge.svg)](https://github.com/Drefus/shortfy/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Drefus/shortfy/branch/main/graph/badge.svg)](https://codecov.io/gh/Drefus/shortfy)

## Produção

Aplicação publicada em: **<!-- PREENCHER: URL do Render, ex.: https://shortfy.onrender.com -->**

> **Observação:** o serviço roda no plano gratuito do Render, que hiberna a aplicação após
> cerca de 15 minutos sem acessos. O primeiro acesso depois disso pode levar até um minuto
> enquanto o serviço é reativado; os acessos seguintes são imediatos. O banco (Neon, plano
> gratuito) também é suspenso quando fica ocioso e volta em poucos segundos.

O deploy é descrito em [`render.yaml`](render.yaml): o Render instala as dependências,
compila o projeto, aplica as migrações pendentes no banco e sobe o servidor, usando `/health`
como verificação de saúde. Um novo deploy só acontece depois que o CI passa nos três sistemas.

## Integrantes

<!-- Conferir os nomes completos e matrículas. -->

- Henrique Castro Caetano - 2023104941
- Pedro Henrique Fernandes de Oliveira - 2023104968

## Sobre o sistema

O Shortfy é um encurtador de links com estatísticas de acesso. O usuário informa uma URL longa
e recebe um link curto (por exemplo, `https://shortfy.onrender.com/aB3xY9z`). Cada acesso ao
link curto redireciona para a URL original e é registrado, permitindo acompanhar quantas vezes,
de onde e de quais dispositivos o link foi acessado.

### Funcionalidades

- **Encurtar links** pela página inicial ou pela API (`POST /api/links`), com código aleatório
  de 7 caracteres base62.
- **Normalização e validação da URL**: espaços nas pontas são removidos, `https://` é adicionado
  quando o protocolo é omitido, e URLs malformadas, sem domínio, com protocolo diferente de
  http/https, com mais de 2048 caracteres ou que apontam para o próprio encurtador são rejeitadas.
- **Apelido personalizado** (opcional): de 3 a 30 caracteres entre letras, números, `-` e `_`,
  sem palavras reservadas (`api`, `health`, `stats`...) e sem repetir um apelido em uso.
- **Data de expiração** (opcional): após o prazo, o link responde `410 Gone` em vez de
  redirecionar. A data digitada é interpretada no fuso do navegador.
- **Redirecionamento** `GET /:code` com `302` e registro do clique: origem (hostname do
  `Referer` ou "direto"), dispositivo (desktop, celular, tablet ou bot) e navegador.
- **Estatísticas** na página `/stats/:code` e na API (`GET /api/links/:code/stats`): total de
  cliques, gráfico dos últimos 7 dias, 5 principais origens, cliques por dispositivo e por
  navegador, e data do último acesso.
- **Links recentes** na página inicial, com botão para copiar o link curto.
- **Rate limit** de criação por IP (padrão de 30 links por minuto, configurável), com `429`
  quando excedido.
- **Páginas de erro** amigáveis (404, 410, 429, 500) sem expor detalhes internos.
- **Armazenamento intercambiável**: em memória (desenvolvimento, testes e CI) ou PostgreSQL
  (produção), escolhido por `STORAGE`.

### Arquitetura

O código é organizado em camadas, com dependências sempre apontando para dentro:

| Pasta              | Responsabilidade                                                                      |
| ------------------ | ------------------------------------------------------------------------------------- |
| `src/domain`       | Regras puras: validação de URL e apelido, geração de código, expiração, estatísticas. |
| `src/services`     | `LinkService`: orquestra criação, resolução e estatísticas sobre um repositório.      |
| `src/repositories` | Interface `LinkRepository` e implementações em memória e PostgreSQL.                  |
| `src/http`         | Rotas Express (API, páginas, redirecionamento), erros e rate limit.                   |
| `src/views`        | Páginas EJS renderizadas no servidor.                                                 |
| `src/config.ts`    | Leitura e validação das variáveis de ambiente.                                        |
| `db/migrations`    | Migrações SQL aplicadas por `npm run db:migrate`.                                     |

Relógio, gerador de códigos e repositório são injetados em `createApp`, o que torna os testes
determinísticos sem depender de banco, horário real ou aleatoriedade.

## Tecnologias

| Ferramenta                       | O que faz no projeto                                                                 | Por que foi escolhida                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Node.js 24**                   | Ambiente de execução do servidor.                                                    | Versão LTS, roda igual em Windows, macOS e Linux e é suportada pelo Render.                                    |
| **TypeScript** (modo estrito)    | Linguagem de todo o código e dos testes.                                             | Tipos pegam erros antes da execução e documentam contratos como `LinkRepository`.                              |
| **Express 4**                    | Servidor HTTP: rotas, middlewares, arquivos estáticos e tratamento de erros.         | Simples, maduro e fácil de testar em memória com Supertest.                                                    |
| **EJS**                          | Templates das páginas renderizadas no servidor.                                      | HTML com pouca lógica, sem etapa de build de front-end; formulários funcionam mesmo sem JavaScript.            |
| **Chart.js** (via CDN)           | Gráfico de cliques dos últimos 7 dias.                                               | Gráfico pronto e leve; a página também mostra uma tabela com os mesmos dados.                                  |
| **PostgreSQL** / `pg`            | Banco de dados de produção e driver de acesso.                                       | Banco relacional com índice único para os códigos; `pg` é o driver padrão para Node.                           |
| **Neon**                         | PostgreSQL gerenciado em produção.                                                   | Plano gratuito sem cartão, conexão por SSL e compatível com qualquer cliente PostgreSQL.                       |
| **Render**                       | Hospedagem do web service, configurado em `render.yaml`.                             | Plano gratuito, deploy a partir do GitHub e infraestrutura declarada em arquivo versionado.                    |
| **Vitest**                       | Testes de unidade e de integração.                                                   | Rápido, com suporte nativo a TypeScript e ESM e API compatível com Jest.                                       |
| **@vitest/coverage-v8**          | Cobertura de código, com limite mínimo de 80% em linhas, funções e branches.         | Usa a cobertura nativa do V8, sem instrumentar o código.                                                       |
| **Supertest**                    | Testes de integração das rotas HTTP.                                                 | Faz requisições ao app Express sem abrir porta de rede.                                                        |
| **Playwright**                   | Testes end-to-end no Chromium, com o servidor real.                                  | Navegador real, espera automática por elementos e relatório com rastros em caso de falha.                      |
| **ESLint 9 + typescript-eslint** | Análise estática do código.                                                          | Encontra erros comuns e padroniza o estilo; roda no CI.                                                        |
| **Prettier**                     | Formatação automática.                                                               | Elimina discussões de estilo e diffs de formatação.                                                            |
| **tsx** / **cross-env**          | `tsx` executa TypeScript direto (dev, e2e e migração); `cross-env` define variáveis. | Os mesmos scripts `npm` funcionam em Windows, macOS e Linux.                                                   |
| **GitHub Actions**               | CI: lint, typecheck, build, cobertura e e2e em Ubuntu, macOS e Windows.              | Integrado ao GitHub e gratuito para repositórios públicos; a matriz garante que o projeto roda nos 3 sistemas. |
| **Codecov**                      | Publica e acompanha a cobertura a cada push, com meta de 80% em `codecov.yml`.       | Mostra a cobertura por arquivo e por commit e gera o badge do README.                                          |

## Uso de IA

Foi utilizada IA para auxílio no desenvolvimento do código da aplicação.

<!-- PREENCHER: descrevam com as palavras de vocês. A estrutura abaixo é só um guia. -->

### Ferramentas utilizadas

| Ferramenta                     | Para que foi usada |
| ------------------------------ | ------------------ |
| <!-- ex.: Claude Code -->      | <!-- ... -->       |
| <!-- ex.: ChatGPT, Copilot --> | <!-- ... -->       |

### Uso por fase

| Fase                          | Como a IA foi usada | O que foi feito sem IA |
| ----------------------------- | ------------------- | ---------------------- |
| Configuração do projeto e CI  | <!-- ... -->        | <!-- ... -->           |
| Domínio e testes de unidade   | <!-- ... -->        | <!-- ... -->           |
| Repositórios e banco de dados | <!-- ... -->        | <!-- ... -->           |
| Serviço, rotas HTTP e páginas | <!-- ... -->        | <!-- ... -->           |
| Testes de integração e e2e    | <!-- ... -->        | <!-- ... -->           |
| Deploy em produção            | <!-- ... -->        | <!-- ... -->           |
| Documentação                  | <!-- ... -->        | <!-- ... -->           |

### Como revisamos o que foi gerado

<!-- Exemplos do que descrever:
- leitura de cada diff antes do commit e commits pequenos para facilitar a revisão;
- execução local de lint, typecheck e testes antes de cada push, e CI nos 3 sistemas;
- testes escritos ou conferidos à mão para casos de borda (ex.: expiração no instante exato);
- trechos gerados que foram rejeitados ou reescritos, e por quê;
- verificação manual da aplicação em produção. -->

### Limitações e aprendizados

<!-- O que a IA fez bem, onde errou e o que vocês aprenderam no processo. -->

## Execução dos testes

### Pré-requisitos

- **Node.js 24** (versão em [`.nvmrc`](.nvmrc)) e npm.
  - Windows: instalador em <https://nodejs.org> ou `winget install OpenJS.NodeJS.LTS`.
  - macOS: `brew install node@24` ou `nvm install` na pasta do projeto.
  - Linux: `nvm install` na pasta do projeto (ou o gerenciador de pacotes da distribuição).
- **Git**.

Nenhum banco de dados é necessário: os testes usam o armazenamento em memória.

### Instalação

Os comandos são os mesmos em Windows (PowerShell ou Prompt de Comando), macOS e Linux:

```bash
git clone https://github.com/Drefus/shortfy.git
cd shortfy
npm ci
```

Para os testes e2e, instale também o navegador do Playwright:

```bash
# Windows e macOS
npx playwright install chromium

# Linux (instala também as bibliotecas do sistema; pode pedir sudo)
npx playwright install --with-deps chromium
```

### Comandos

| Comando                 | O que faz                                                              |
| ----------------------- | ---------------------------------------------------------------------- |
| `npm test`              | Testes de unidade e de integração (Vitest).                            |
| `npm run test:coverage` | Os mesmos testes com relatório de cobertura (falha abaixo de 80%).     |
| `npm run test:e2e`      | Testes end-to-end (Playwright); sobe o servidor sozinho na porta 4173. |
| `npm run test:watch`    | Testes de unidade e integração em modo observação.                     |
| `npm run lint`          | ESLint.                                                                |
| `npm run typecheck`     | Verificação de tipos do TypeScript.                                    |

Para rodar só os testes de unidade ou só os de integração:

```bash
npx vitest run tests/unit
npx vitest run tests/integration
```

O relatório de cobertura fica em `coverage/index.html` e o do Playwright em
`playwright-report/index.html` (abra com `npx playwright show-report`). Os scripts usam
`cross-env`, então nenhuma variável de ambiente precisa ser definida à mão em nenhum sistema.

### Executar a aplicação localmente

```bash
npm run dev
```

Acesse <http://localhost:3000>. Para usar PostgreSQL em vez da memória, copie `.env.example`,
defina `STORAGE=postgres` e `DATABASE_URL`, e rode `npm run db:migrate` antes de
`npm run build && npm start`.
