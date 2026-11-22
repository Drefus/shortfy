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

- Henrique Castro Caetano - 2023104941
- Pedro Henrique Fernandes de Oliveira - 2023104968

## Sobre o sistema

## Tecnologias

## Uso de IA

Foi utilizada IA para auxilio do desenvolvimento do codigo da aplicação

## Execução dos testes
