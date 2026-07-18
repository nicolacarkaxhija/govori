export * from './schemas.js';

// The forge still imports these unparameterized; they are deprecated at
// the declaration site, so re-exporting them is the one sanctioned use.
/* eslint-disable @typescript-eslint/no-deprecated */
export {
  ContentArtifactSchema,
  CurriculumArtifactSchema,
  ItemSchema,
  MorphologyArtifactSchema,
  parseContentArtifact,
  parseCurriculumArtifact,
  parseMorphologyArtifact,
} from './forge-compat.js';
/* eslint-enable @typescript-eslint/no-deprecated */
