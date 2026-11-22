import { describe, expect, it } from 'vitest';
import {
  ConfigError,
  DEFAULT_PORT,
  DEFAULT_RATE_LIMIT_PER_MINUTE,
  DEFAULT_TRUST_PROXY,
  loadConfig,
} from '../../src/config.js';

const NEON_URL =
  'postgresql://user:senha@ep-exemplo.sa-east-1.aws.neon.tech/neondb?sslmode=require';

describe('loadConfig', () => {
  it('deve usar valores padrão quando nenhuma variável está definida', () => {
    expect(loadConfig({})).toEqual({
      port: DEFAULT_PORT,
      baseUrl: `http://localhost:${DEFAULT_PORT}`,
      storage: 'memory',
      rateLimitPerMinute: DEFAULT_RATE_LIMIT_PER_MINUTE,
      trustProxy: DEFAULT_TRUST_PROXY,
      enableTestRoutes: false,
    });
  });

  it('deve ler a configuração de produção completa', () => {
    const config = loadConfig({
      PORT: '10000',
      BASE_URL: 'https://shortfy.onrender.com',
      STORAGE: 'postgres',
      DATABASE_URL: NEON_URL,
      RATE_LIMIT_PER_MINUTE: '60',
      TRUST_PROXY: '2',
    });

    expect(config).toEqual({
      port: 10000,
      baseUrl: 'https://shortfy.onrender.com',
      storage: 'postgres',
      databaseUrl: NEON_URL,
      rateLimitPerMinute: 60,
      trustProxy: 2,
      enableTestRoutes: false,
    });
  });

  it('deve tratar variáveis vazias como não definidas', () => {
    const config = loadConfig({ PORT: '', STORAGE: '  ', BASE_URL: '' });

    expect(config.port).toBe(DEFAULT_PORT);
    expect(config.storage).toBe('memory');
    expect(config.baseUrl).toBe(`http://localhost:${DEFAULT_PORT}`);
  });

  it('deve usar a porta informada no endereço base padrão', () => {
    expect(loadConfig({ PORT: '4173' }).baseUrl).toBe('http://localhost:4173');
  });

  it('deve usar RENDER_EXTERNAL_URL quando BASE_URL não está definida', () => {
    const config = loadConfig({ RENDER_EXTERNAL_URL: 'https://shortfy.onrender.com' });

    expect(config.baseUrl).toBe('https://shortfy.onrender.com');
  });

  it('deve dar prioridade a BASE_URL sobre RENDER_EXTERNAL_URL', () => {
    const config = loadConfig({
      BASE_URL: 'https://sho.rt',
      RENDER_EXTERNAL_URL: 'https://shortfy.onrender.com',
    });

    expect(config.baseUrl).toBe('https://sho.rt');
  });

  it('deve remover barras finais de BASE_URL', () => {
    expect(loadConfig({ BASE_URL: 'https://sho.rt//' }).baseUrl).toBe('https://sho.rt');
  });

  it('deve ignorar DATABASE_URL quando o armazenamento é em memória', () => {
    expect(loadConfig({ DATABASE_URL: NEON_URL })).not.toHaveProperty('databaseUrl');
  });

  it('deve habilitar as rotas de teste apenas com NODE_ENV=test', () => {
    expect(loadConfig({ NODE_ENV: 'test' }).enableTestRoutes).toBe(true);
    expect(loadConfig({ NODE_ENV: 'production' }).enableTestRoutes).toBe(false);
  });

  it('deve aceitar TRUST_PROXY=0 para desligar a confiança no proxy', () => {
    expect(loadConfig({ TRUST_PROXY: '0' }).trustProxy).toBe(0);
  });

  it.each([
    [{ STORAGE: 'sqlite' }, /STORAGE inválido/],
    [{ STORAGE: 'postgres' }, /DATABASE_URL não definida/],
    [{ PORT: 'abc' }, /PORT inválida/],
    [{ PORT: '0' }, /PORT inválida/],
    [{ PORT: '70000' }, /PORT inválida/],
    [{ PORT: '3000.5' }, /PORT inválida/],
    [{ RATE_LIMIT_PER_MINUTE: '0' }, /RATE_LIMIT_PER_MINUTE inválida/],
    [{ TRUST_PROXY: '-1' }, /TRUST_PROXY inválida/],
    [{ BASE_URL: 'shortfy.onrender.com' }, /BASE_URL inválida/],
    [{ BASE_URL: 'ftp://shortfy.app' }, /BASE_URL deve usar http ou https/],
  ])('deve rejeitar a configuração %o', (env, mensagem) => {
    expect(() => loadConfig(env)).toThrow(ConfigError);
    expect(() => loadConfig(env)).toThrow(mensagem);
  });
});
