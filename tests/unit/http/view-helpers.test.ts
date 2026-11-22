import { describe, expect, it } from 'vitest';
import {
  deviceLabel,
  formatDateTime,
  formatDay,
  shortUrlFor,
} from '../../../src/http/view-helpers.js';

describe('shortUrlFor', () => {
  it('deve juntar o endereço base e o código', () => {
    expect(shortUrlFor('https://shortfy.app', 'abc1234')).toBe('https://shortfy.app/abc1234');
  });

  it('deve evitar barra duplicada quando a base termina com barra', () => {
    expect(shortUrlFor('https://shortfy.app/', 'abc1234')).toBe('https://shortfy.app/abc1234');
  });
});

describe('deviceLabel', () => {
  it('deve traduzir o tipo de dispositivo para português', () => {
    expect(deviceLabel('mobile')).toBe('Celular');
  });
});

describe('formatDateTime', () => {
  it('deve exibir a data no horário de Brasília', () => {
    const texto = formatDateTime(new Date('2026-03-10T02:30:00Z'));

    expect(texto).toContain('09/03/2026');
    expect(texto).toContain('23:30');
  });

  it('deve exibir travessão quando não há data', () => {
    expect(formatDateTime(null)).toBe('—');
  });
});

describe('formatDay', () => {
  it('deve converter AAAA-MM-DD para DD/MM', () => {
    expect(formatDay('2026-03-09')).toBe('09/03');
  });
});
