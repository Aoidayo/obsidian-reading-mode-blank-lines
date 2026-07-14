import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const tempDir = await mkdtemp(path.join(tmpdir(), 'blank-line-analysis-'));
const outfile = path.join(tempDir, 'blank-line-analysis.mjs');

await esbuild.build({
  entryPoints: ['src/blank-line-analysis.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2018',
  external: ['obsidian'],
});

const {
  normalizeMarkdownLines,
  findEligibleBlankLineRuns,
  classifySectionBlankLines,
} = await import(pathToFileURL(outfile).href);

try {
  {
    const lines = normalizeMarkdownLines('Alpha\n\n\nBeta');
    assert.deepEqual(findEligibleBlankLineRuns(lines), [
      { startLine: 1, endLine: 2, count: 2 },
    ]);
  }

  {
    const lines = normalizeMarkdownLines('Alpha\n\n```ts\n\ncode\n```\n\nBeta');
    assert.deepEqual(findEligibleBlankLineRuns(lines), [
      { startLine: 1, endLine: 1, count: 1 },
      { startLine: 6, endLine: 6, count: 1 },
    ]);
  }

  {
    const lines = normalizeMarkdownLines('Alpha\n\n$$\n\nx = y\n$$\n\nBeta');
    assert.deepEqual(findEligibleBlankLineRuns(lines), [
      { startLine: 1, endLine: 1, count: 1 },
      { startLine: 6, endLine: 6, count: 1 },
    ]);
  }

  {
    const lines = normalizeMarkdownLines('\n# Title\n\nBody\n\n');
    assert.deepEqual(classifySectionBlankLines(lines, 1, 3), {
      leading: 1,
      trailing: 2,
      internal: [{ startLine: 2, endLine: 2, count: 1 }],
    });
  }

  {
    const lines = normalizeMarkdownLines('> Alpha\n>\n> Beta\n\nAfter');
    assert.deepEqual(classifySectionBlankLines(lines, 0, 2), {
      leading: 0,
      trailing: 1,
      internal: [{ startLine: 1, endLine: 1, count: 1 }],
    });
  }

  {
    const lines = normalizeMarkdownLines('> [!quote] Quote\n> Body\n\n**Next**');
    assert.deepEqual(classifySectionBlankLines(lines, 0, 2), {
      leading: 0,
      trailing: 1,
      internal: [],
    });
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
