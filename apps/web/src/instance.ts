import { resolveInstance } from './instances';

/**
 * The single entry point handing the running app its instance and pack
 * (ADR 0029): resolved once from VITE_INSTANCE, failing fast when the
 * build was not told which product it is.
 */
const resolved = resolveInstance(import.meta.env.VITE_INSTANCE);

export const instance = resolved.instance;
export const pack = resolved.pack;
