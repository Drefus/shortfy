import { describe, expect, it } from 'vitest';
import { InvalidUrlError } from '../../../src/domain/errors.js';
import { normalizeUrl, parseTargetUrl } from '../../../src/domain/url-normalization.js';

describe('normalizeUrl', () => {
  it('deve remover espaços nas pontas', () => {
    expect(normalizeUrl('   https://example.com/a   ')).toBe('https://example.com/a');
  });

  it('deve adicionar https:// quando o protocolo não é informado', () => {
    expect(normalizeUrl('example.com/pagina')).toBe('https://example.com/pagina');
  });

  it('deve adicionar https:// a domínio com porta sem protocolo', () => {
    expect(normalizeUrl('example.com:8080/x')).toBe('https://example.com:8080/x');
  });

  it('deve manter o protocolo http quando informado', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('deve reconhecer o protocolo independentemente de maiúsculas', () => {
    expect(normalizeUrl('HTTPS://example.com')).toBe('HTTPS://example.com');
  });

  it('deve preservar protocolo não suportado para que a validação o rejeite', () => {
    expect(normalizeUrl('ftp://example.com')).toBe('ftp://example.com');
  });

  it('deve preservar o esquema javascript: sem adicionar https://', () => {
    expect(normalizeUrl('javascript:alert(1)')).toBe('javascript:alert(1)');
  });

  it('deve devolver string vazia quando a entrada contém apenas espaços', () => {
    expect(normalizeUrl('   ')).toBe('');
  });
});

describe('parseTargetUrl', () => {
  it('deve aceitar domínio digitado sem protocolo', () => {
    expect(parseTargetUrl('  example.com  ')).toBe('https://example.com/');
  });

  it('deve rejeitar entrada contendo apenas espaços', () => {
    expect(() => parseTargetUrl('   ')).toThrow('A URL não pode ser vazia.');
  });

  it('deve rejeitar javascript: mesmo após a normalização', () => {
    expect(() => parseTargetUrl('javascript:alert(1)')).toThrow(InvalidUrlError);
  });

  it('deve rejeitar texto com espaços internos após a normalização', () => {
    expect(() => parseTargetUrl('isto não é url')).toThrow('A URL não pode conter espaços.');
  });

  it('deve repassar o host do encurtador para a validação', () => {
    expect(() => parseTargetUrl('shortfy.app/abc', { shortenerHost: 'shortfy.app' })).toThrow(
      'A URL não pode apontar para o próprio encurtador.',
    );
  });
});
