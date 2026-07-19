import {
  resolveInstance as resolveFromRegistry,
  type InstanceRegistry,
  type ResolvedInstance,
} from '@glotty/language';
import { folInstance } from '@glotty/instance-fol';
import { govoriInstance } from '@glotty/instance-govori';
import { enPack } from '@glotty/pack-en';
import { isvPack } from '@glotty/pack-isv';
import { sqPack } from '@glotty/pack-sq';

/**
 * The registry: the one place this deployable enumerates shippable
 * instances and the packs they may reference (ADR 0029). The engine has
 * no default product — a process without GLOTTY_INSTANCE must fail,
 * never quietly become some instance.
 */
const registry: InstanceRegistry = {
  instances: { govori: govoriInstance, fol: folInstance },
  packs: { en: enPack, isv: isvPack, sq: sqPack },
};

/** Fails fast: an unset or unknown instance id must never boot. */
export function resolveApiInstance(id: string | undefined): ResolvedInstance {
  return resolveFromRegistry(registry, id, 'GLOTTY_INSTANCE');
}
