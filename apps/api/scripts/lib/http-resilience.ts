/**
 * Shim de compatibilidade — a implementação vive em src/lib/http-resilience.ts
 * (T448: src não pode importar de scripts/ — o tsc -p do builder Docker muda o
 * rootDir inferido e o output vira dist/src/server.js; ver PR #160/#161).
 */
export * from '../../src/lib/http-resilience.js';
