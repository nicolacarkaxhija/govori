import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The seam (ADR 0042): the engine ships no palette. Every colour a screen
// paints must arrive as a custom property the active instance defines in
// its theme, so no engine stylesheet may hard-code one. A hex literal or a
// raw rgb()/rgba()/hsl() colour here is a leaked palette; a grep guard keeps
// the boundary honest without a running browser.
// Vitest runs with the web package as its root, so engine sheets resolve
// off the working directory (jsdom hands import.meta.url an http origin).
const stylesDir = join(process.cwd(), 'src', 'styles');

const COLOUR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/;

describe('engine stylesheets declare no palette', () => {
  const engineSheets = readdirSync(stylesDir).filter((name) =>
    name.endsWith('.css'),
  );

  it('ships at least the base and learn sheets', () => {
    expect(engineSheets).toContain('base.css');
    expect(engineSheets).toContain('learn.css');
  });

  it.each(engineSheets)('leaves no colour literal in %s', (name) => {
    const source = readFileSync(join(stylesDir, name), 'utf8');
    const offenders = source
      .split('\n')
      .map((line, index) => ({ line: line.trim(), number: index + 1 }))
      .filter((entry) => COLOUR_LITERAL.test(entry.line));
    expect(offenders, `${name} hard-codes a colour`).toEqual([]);
  });
});
