export { CHAINS, type Chain, type ProviderResult, type DataSourceProvider } from './types.js';
export { getProvider, registerProvider, resetProvider } from './registry.js';
export { NansenProvider } from './nansen.js';
export { FreeProvider } from './free-provider.js';

import { getProvider, registerProvider } from './registry.js';
import { NansenProvider } from './nansen.js';
import { FreeProvider } from './free-provider.js';

let initialized = false;

export function initProvider(): void {
  if (initialized) return;
  const mode = process.env.DATA_PROVIDER ?? 'free';
  if (mode === 'nansen') {
    registerProvider(new NansenProvider());
  } else {
    registerProvider(new FreeProvider());
  }
  initialized = true;
}

export function provider() {
  initProvider();
  return getProvider();
}
