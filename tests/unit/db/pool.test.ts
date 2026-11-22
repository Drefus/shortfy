import { afterEach, describe, expect, it, vi } from 'vitest';
import type pg from 'pg';
import { buildPoolConfig, createPool } from '../../../src/db/pool.js';

const NEON_URL =
  'postgresql://user:senha@ep-exemplo.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

describe('buildPoolConfig', () => {
  it('deve exigir SSL com verificação de certificado para o Neon', () => {
    expect(buildPoolConfig(NEON_URL).ssl).toEqual({ rejectUnauthorized: true });
  });

  it('deve remover sslmode e channel_binding da string de conexão', () => {
    expect(buildPoolConfig(NEON_URL).connectionString).toBe(
      'postgresql://user:senha@ep-exemplo.sa-east-1.aws.neon.tech/neondb',
    );
  });

  it('deve preservar os demais parâmetros da string de conexão', () => {
    const config = buildPoolConfig(
      'postgresql://u:s@db.exemplo.com/app?sslmode=require&application_name=shortfy',
    );

    expect(config.connectionString).toBe(
      'postgresql://u:s@db.exemplo.com/app?application_name=shortfy',
    );
  });

  it('deve habilitar channel binding quando a URL o exige', () => {
    expect(buildPoolConfig(NEON_URL).enableChannelBinding).toBe(true);
    expect(buildPoolConfig('postgresql://u:s@db.exemplo.com/app').enableChannelBinding).toBe(false);
  });

  it('deve usar SSL mesmo quando a URL remota não informa sslmode', () => {
    expect(buildPoolConfig('postgresql://u:s@db.exemplo.com/app').ssl).toEqual({
      rejectUnauthorized: true,
    });
  });

  it.each(['localhost', '127.0.0.1', '[::1]'])(
    'deve desligar o SSL para o banco local %s',
    (host) => {
      expect(buildPoolConfig(`postgresql://u:s@${host}:5432/app`).ssl).toBe(false);
    },
  );

  it('deve desligar o SSL quando sslmode=disable', () => {
    expect(buildPoolConfig('postgresql://u:s@db.exemplo.com/app?sslmode=disable').ssl).toBe(false);
  });

  it('deve rejeitar uma DATABASE_URL malformada', () => {
    expect(() => buildPoolConfig('não é uma url')).toThrow('DATABASE_URL malformada.');
  });
});

describe('createPool', () => {
  let pool: pg.Pool | undefined;

  afterEach(async () => {
    await pool?.end();
    pool = undefined;
  });

  it('deve exigir DATABASE_URL', () => {
    expect(() => createPool('')).toThrow('DATABASE_URL não definida');
  });

  it('deve criar o pool sem abrir conexões e tratar erros de conexões ociosas', () => {
    pool = createPool(NEON_URL);

    expect(pool.totalCount).toBe(0);
    expect(pool.listenerCount('error')).toBe(1);
  });

  it('deve registrar no log, sem encerrar o processo, a queda de uma conexão ociosa', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    pool = createPool(NEON_URL);

    pool.emit('error', new Error('terminating connection due to administrator command'));

    expect(log).toHaveBeenCalledWith(
      'Conexão ociosa com o banco encerrada:',
      'terminating connection due to administrator command',
    );
    log.mockRestore();
  });
});
