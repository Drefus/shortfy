import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        // Ponto de entrada: apenas lê variáveis de ambiente e chama listen().
        'src/server.ts',
        // Arquivos só de tipos não geram código JavaScript a ser executado.
        'src/**/*.d.ts',
        'src/**/*.types.ts',
        // Acesso a PostgreSQL real: testes e CI rodam com STORAGE=memory, sem banco.
        // O comportamento é o mesmo contrato de LinkRepository já coberto pelos
        // testes do InMemoryLinkRepository; testá-lo exigiria um banco de verdade
        // (teste de integração), e mocks de `pg` testariam apenas a implementação.
        'src/repositories/postgres-link-repository.ts',
        // Script de migração: executa SQL contra o banco configurado em DATABASE_URL.
        'src/db/migrate.ts',
      ],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
