import { describe, expect, it } from 'vitest';
import { DIRECT_REFERRER, normalizeReferrer } from '../../../../src/domain/stats/referrer.js';

describe('normalizeReferrer', () => {
  it('deve devolver apenas o hostname de um referer https', () => {
    expect(normalizeReferrer('https://www.google.com/search?q=atalho')).toBe('www.google.com');
  });

  it('deve devolver o hostname de um referer http', () => {
    expect(normalizeReferrer('http://blog.example.com/post/1')).toBe('blog.example.com');
  });

  it('deve descartar a porta do referer', () => {
    expect(normalizeReferrer('https://example.com:8443/x')).toBe('example.com');
  });

  it('deve converter o hostname para minúsculas', () => {
    expect(normalizeReferrer('https://Twitter.COM/post')).toBe('twitter.com');
  });

  it('deve usar "direto" como valor de acesso direto', () => {
    expect(DIRECT_REFERRER).toBe('direto');
  });

  it.each([undefined, null, '', '   '])('deve devolver "direto" quando o referer é %j', (valor) => {
    expect(normalizeReferrer(valor)).toBe(DIRECT_REFERRER);
  });

  it('deve devolver "direto" para referer malformado', () => {
    expect(normalizeReferrer('não é uma url')).toBe(DIRECT_REFERRER);
  });

  it('deve devolver "direto" para referer com protocolo não http(s)', () => {
    expect(normalizeReferrer('android-app://com.exemplo.app')).toBe(DIRECT_REFERRER);
  });
});
