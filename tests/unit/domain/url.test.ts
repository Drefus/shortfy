import { describe, expect, it } from 'vitest';
import { InvalidUrlError } from '../../../src/domain/errors.js';
import { MAX_URL_LENGTH, isValidUrl, normalizeUrl } from '../../../src/domain/url.js';

describe('normalizeUrl', () => {
  it('aceita uma URL https e a devolve normalizada', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
  });

  it('aceita uma URL http', () => {
    expect(normalizeUrl('http://example.com/pagina')).toBe('http://example.com/pagina');
  });

  it('remove espaços nas extremidades', () => {
    expect(normalizeUrl('   https://example.com/a   ')).toBe('https://example.com/a');
  });

  it('preserva query string e fragmento', () => {
    expect(normalizeUrl('https://example.com/busca?q=teste#topo')).toBe(
      'https://example.com/busca?q=teste#topo',
    );
  });

  it('converte o domínio para minúsculas', () => {
    expect(normalizeUrl('https://EXAMPLE.com/Caminho')).toBe('https://example.com/Caminho');
  });

  it('rejeita string vazia', () => {
    expect(() => normalizeUrl('')).toThrow(InvalidUrlError);
  });

  it('rejeita string contendo apenas espaços', () => {
    expect(() => normalizeUrl('   ')).toThrow('A URL não pode ser vazia.');
  });

  it('rejeita texto que não é URL', () => {
    expect(() => normalizeUrl('isto não é uma url')).toThrow('A URL informada não é válida.');
  });

  it('rejeita URL sem protocolo', () => {
    expect(() => normalizeUrl('example.com')).toThrow(InvalidUrlError);
  });

  it.each(['ftp://example.com', 'javascript:alert(1)', 'mailto:alguem@example.com', 'file:///etc/passwd'])(
    'rejeita o protocolo não suportado em %s',
    (url) => {
      expect(() => normalizeUrl(url)).toThrow('A URL deve usar o protocolo http ou https.');
    },
  );

  it('rejeita URL maior que o limite de caracteres', () => {
    const longa = `https://example.com/${'a'.repeat(MAX_URL_LENGTH)}`;
    expect(() => normalizeUrl(longa)).toThrow(`no máximo ${MAX_URL_LENGTH} caracteres`);
  });

  it('aceita URL exatamente no limite de caracteres', () => {
    const prefixo = 'https://example.com/';
    const url = prefixo + 'a'.repeat(MAX_URL_LENGTH - prefixo.length);
    expect(normalizeUrl(url)).toBe(url);
  });
});

describe('isValidUrl', () => {
  it('retorna true para URL válida', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  it('retorna false para URL inválida', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
  });
});
