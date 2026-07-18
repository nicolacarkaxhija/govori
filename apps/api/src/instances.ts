import {
  resolveInstance as resolveFromRegistry,
  type InstanceRegistry,
  type ResolvedInstance,
} from '@glotty/language';
import { govoriInstance } from '@glotty/instance-govori';
import { isvPack } from '@glotty/pack-isv';

/**
 * The registry: the one place this deployable enumerates shippable
 * instances and the packs they may reference (ADR 0029). The engine has
 * no default product — a process without GLOTTY_INSTANCE must fail,
 * never quietly become some instance.
 */
const registry: InstanceRegistry = {
  instances: { govori: govoriInstance },
  packs: { isv: isvPack },
};

/** Fails fast: an unset or unknown instance id must never boot. */
export function resolveApiInstance(id: string | undefined): ResolvedInstance {
  return resolveFromRegistry(registry, id, 'GLOTTY_INSTANCE');
}
