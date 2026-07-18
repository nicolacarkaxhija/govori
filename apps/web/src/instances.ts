import type { InstanceConfig, LanguagePack } from '@glotty/language';
import { govoriInstance } from '@glotty/instance-govori';
import { isvPack } from '@glotty/pack-isv';

/**
 * The registry: the one place this build enumerates shippable instances
 * and the packs they may reference (ADR 0029). Engine code never names
 * an instance or a language — it resolves through here, and only with
 * an explicit id. There is no default: a build without VITE_INSTANCE
 * must fail, never quietly become some product.
 */
const instances: Readonly<Record<string, InstanceConfig>> = {
  govori: govoriInstance,
};

const packs: Readonly<Record<string, LanguagePack>> = {
  isv: isvPack,
};

/**
 * MessageKey is anchored to the govori English catalog purely as the
 * developer-authored key inventory (a build-time artifact); runtime
 * catalogs and fallbacks always come from the resolved instance.
 */
export type { MessageKey } from '@glotty/instance-govori';

export interface ResolvedInstance {
  instance: InstanceConfig;
  pack: LanguagePack;
}

/** Fails fast: an unset or unknown instance id must never boot. */
export function resolveInstance(id: string | undefined): ResolvedInstance {
  const known = Object.keys(instances).join(', ');
  if (id === undefined || id === '') {
    throw new Error(`VITE_INSTANCE is not set; known instances: ${known}`);
  }
  const instance = instances[id];
  if (instance === undefined) {
    throw new Error(`unknown instance '${id}'; known instances: ${known}`);
  }
  const pack = packs[instance.packId];
  if (pack === undefined) {
    throw new Error(`instance '${id}' names unknown pack '${instance.packId}'`);
  }
  return { instance, pack };
}
