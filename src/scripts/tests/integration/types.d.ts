declare module '**/tests/integration/*.test' {
  export function testSlackIntegration(): Promise<void>;
  export function testDatabaseIntegration(): Promise<void>;
} 