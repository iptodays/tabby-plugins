module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  moduleNameMapper: {
    '^@angular/core$': '<rootDir>/test/mocks/angular-core.ts',
    '^@ng-bootstrap/ng-bootstrap$': '<rootDir>/test/mocks/ng-bootstrap.ts',
    '^tabby-core$': '<rootDir>/test/mocks/tabby-core.ts',
    '^tabby-terminal$': '<rootDir>/test/mocks/tabby-terminal.ts',
    '^tabby-settings$': '<rootDir>/test/mocks/tabby-settings.ts',
  },
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
}
