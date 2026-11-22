import { describe, expect, it } from 'vitest';
import { InvalidUrlError } from '../../../src/domain/errors.js';
import { MAX_URL_LENGTH, isValidUrl, validateUrl } from '../../../src/domain/url.js';

describe('validateUrl', () => {
  describe('URLs válidas', () => {
    it('deve aceitar URL com protocolo https', () => {
      expect(validateUrl('https://example.com/pagina')).toBe('https://example.com/pagina');
    });

    it('deve aceitar URL com protocolo http', () => {
      expect(validateUrl('http://example.com/pagina')).toBe('http://example.com/pagina');
    });

    it('deve devolver a URL em forma canônica com barra final no domínio', () => {
      expect(validateUrl('https://example.com')).toBe('https://example.com/');
    });

    it('deve converter o domínio para minúsculas', () => {
      expect(validateUrl('https://EXAMPLE.com/Caminho')).toBe('https://example.com/Caminho');
    });

    it('deve preservar query string e fragmento', () => {
      expect(validateUrl('https://example.com/busca?q=teste#topo')).toBe(
        'https://example.com/busca?q=teste#topo',
      );
    });

    it('deve aceitar URL com porta explícita', () => {
      expect(validateUrl('https://example.com:8443/x')).toBe('https://example.com:8443/x');
    });

    it('deve aceitar URL com exatamente o tamanho máximo', () => {
      const prefixo = 'https://example.com/';
      const url = prefixo + 'a'.repeat(MAX_URL_LENGTH - prefixo.length);
      expect(validateUrl(url)).toBe(url);
    });
  });

  describe('URLs inválidas', () => {
    it('deve rejeitar URL vazia', () => {
      expect(() => validateUrl('')).toThrow('A URL não pode ser vazia.');
    });

    it('deve rejeitar URL com um caractere acima do tamanho máximo', () => {
      const prefixo = 'https://example.com/';
      const url = prefixo + 'a'.repeat(MAX_URL_LENGTH - prefixo.length + 1);
      expect(() => validateUrl(url)).toThrow(`no máximo ${MAX_URL_LENGTH} caracteres`);
    });

    it('deve rejeitar URL com espaço no meio', () => {
      expect(() => validateUrl('https://example.com/minha pagina')).toThrow(
        'A URL não pode conter espaços.',
      );
    });

    it('deve rejeitar URL com quebra de linha', () => {
      expect(() => validateUrl('https://example.com/\nmais')).toThrow(InvalidUrlError);
    });

    it('deve rejeitar URL malformada', () => {
      expect(() => validateUrl('http://exa[mple.com')).toThrow('A URL informada é malformada.');
    });

    it('deve rejeitar texto sem protocolo', () => {
      expect(() => validateUrl('example.com')).toThrow(InvalidUrlError);
    });

    it('deve rejeitar URL com protocolo ftp', () => {
      expect(() => validateUrl('ftp://example.com/arquivo')).toThrow(
        'A URL deve usar o protocolo http ou https.',
      );
    });

    it('deve rejeitar URL com protocolo javascript:', () => {
      expect(() => validateUrl('javascript:alert(1)')).toThrow(
        'A URL deve usar o protocolo http ou https.',
      );
    });

    it('deve rejeitar URL com protocolo data:', () => {
      expect(() => validateUrl('data:text/html,<h1>oi</h1>')).toThrow(
        'A URL deve usar o protocolo http ou https.',
      );
    });

    it('deve rejeitar URL com protocolo file:', () => {
      expect(() => validateUrl('file:///etc/passwd')).toThrow(
        'A URL deve usar o protocolo http ou https.',
      );
    });

    it('deve rejeitar URL sem host', () => {
      expect(() => validateUrl('https:///caminho')).toThrow('A URL deve conter um domínio válido.');
    });

    it('deve rejeitar URL com host sem domínio de topo', () => {
      expect(() => validateUrl('https://intranet/pagina')).toThrow(
        'A URL deve conter um domínio válido.',
      );
    });
  });

  describe('proteção contra loops', () => {
    const options = { shortenerHost: 'shortfy.app' };

    it('deve rejeitar URL que aponta para o próprio encurtador', () => {
      expect(() => validateUrl('https://shortfy.app/abc1234', options)).toThrow(
        'A URL não pode apontar para o próprio encurtador.',
      );
    });

    it('deve rejeitar URL para o encurtador independentemente de maiúsculas', () => {
      expect(() => validateUrl('https://SHORTFY.app/abc1234', options)).toThrow(InvalidUrlError);
    });

    it('deve rejeitar URL para um subdomínio do encurtador', () => {
      expect(() => validateUrl('https://www.shortfy.app/abc1234', options)).toThrow(
        InvalidUrlError,
      );
    });

    it('deve aceitar domínio que apenas termina com o mesmo texto do encurtador', () => {
      expect(validateUrl('https://meushortfy.app/', options)).toBe('https://meushortfy.app/');
    });

    it('deve aceitar qualquer domínio quando o host do encurtador não é informado', () => {
      expect(validateUrl('https://shortfy.app/abc1234')).toBe('https://shortfy.app/abc1234');
    });
  });
});

describe('isValidUrl', () => {
  it('deve retornar true para URL válida', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  it('deve retornar false para URL inválida', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
  });

  it('deve considerar o host do encurtador ao validar', () => {
    expect(isValidUrl('https://shortfy.app/x', { shortenerHost: 'shortfy.app' })).toBe(false);
  });
});
