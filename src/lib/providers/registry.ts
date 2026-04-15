import type { DataSourceProvider } from './types.js';

let current: DataSourceProvider | null = null;

export function registerProvider(provider: DataSourceProvider): void {
  current = provider;
}

export function getProvider(): DataSourceProvider {
  if (!current) throw new Error('No data source provider registered. Call registerProvider() first.');
  return current;
}

export function resetProvider(): void {
  current = null;
}
