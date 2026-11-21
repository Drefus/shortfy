import { describe, expect, it } from 'vitest';
import {
  AliasTakenError,
  DomainError,
  InvalidAliasError,
  InvalidUrlError,
  LinkExpiredError,
  LinkNotFoundError,
} from '../../../src/domain/errors.js';

describe('erros de domínio', () => {
  it.each([
    new InvalidUrlError('x'),
    new InvalidAliasError('x'),
    new AliasTakenError('promo'),
    new LinkNotFoundError('abc1234'),
    new LinkExpiredError('abc1234'),
  ])('deve permitir capturar $name como DomainError', (erro) => {
    expect(erro).toBeInstanceOf(DomainError);
  });

  it('deve usar o nome da subclasse como nome do erro', () => {
    expect(new InvalidUrlError('x').name).toBe('InvalidUrlError');
  });

  it('deve informar o alias em uso na mensagem de AliasTakenError', () => {
    expect(new AliasTakenError('promo').message).toBe('O alias "promo" já está em uso.');
  });

  it('deve informar o código procurado na mensagem de LinkNotFoundError', () => {
    expect(new LinkNotFoundError('abc1234').message).toContain('"abc1234"');
  });

  it('deve informar o código expirado na mensagem de LinkExpiredError', () => {
    expect(new LinkExpiredError('abc1234').message).toBe('O link "abc1234" expirou.');
  });
});
