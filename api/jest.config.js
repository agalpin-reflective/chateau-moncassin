/** Tests unitaires et tests de routes : aucun n'a besoin de Postgres (le dépôt de commandes est remplacé par une version en mémoire). */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  setupFiles: ['<rootDir>/src/testEnv.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { diagnostics: { ignoreCodes: [151002] } }] },
};
