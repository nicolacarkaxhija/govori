import {
  resolveInstance as resolveFromRegistry,
  type InstanceRegistry,
  type ResolvedInstance,
} from '@glotty/language';
import { govoriInstance } from '@glotty/instance-govori';
import { isvPack } from '@glotty/pack-isv';

/**
 * The registry: the one place this build enumerates shippable instances
 * and the packs they may reference (ADR 0029). Engine code never names
 * an instance or a language — it resolves through here, and only with
 * an explicit id. There is no default: a build without VITE_INSTANCE
 * must fail, never quietly become some product.
 */
const registry: InstanceRegistry = {
  instances: { govori: govoriInstance },
  packs: { isv: isvPack },
};

/**
 * MessageKey is anchored to the govori English catalog purely as the
 * developer-authored key inventory (a build-time artifact); runtime
 * catalogs and fallbacks always come from the resolved instance.
 */
export type { MessageKey } from '@glotty/instance-govori';

/** Fails fast: an unset or unknown instance id must never boot. */
export function resolveInstance(id: string | undefined): ResolvedInstance {
  return resolveFromRegistry(registry, id, 'VITE_INSTANCE');
}
