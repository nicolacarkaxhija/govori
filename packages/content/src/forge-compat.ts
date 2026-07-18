import { isvPack } from '@glotty/pack-isv';
import { makeContentSchemas } from './schemas.js';

/**
 * Interslavic-bound schemas kept solely for the content forge, which
 * still imports them unparameterized (ADR 0037). Everything else binds
 * its own language at the composition root via `makeContentSchemas`.
 */
const isvSchemas = makeContentSchemas((text) =>
  isvPack.validateCanonical(text),
);

/** @deprecated Bind your own pack via `makeContentSchemas` instead. */
export const ItemSchema = isvSchemas.ItemSchema;
/** @deprecated Bind your own pack via `makeContentSchemas` instead. */
export const ContentArtifactSchema = isvSchemas.ContentArtifactSchema;
/** @deprecated Bind your own pack via `makeContentSchemas` instead. */
export const CurriculumArtifactSchema = isvSchemas.CurriculumArtifactSchema;
/** @deprecated Bind your own pack via `makeContentSchemas` instead. */
export const MorphologyArtifactSchema = isvSchemas.MorphologyArtifactSchema;
/** @deprecated Bind your own pack via `makeContentSchemas` instead. */
export const parseContentArtifact = isvSchemas.parseContentArtifact;
/** @deprecated Bind your own pack via `makeContentSchemas` instead. */
export const parseCurriculumArtifact = isvSchemas.parseCurriculumArtifact;
/** @deprecated Bind your own pack via `makeContentSchemas` instead. */
export const parseMorphologyArtifact = isvSchemas.parseMorphologyArtifact;
