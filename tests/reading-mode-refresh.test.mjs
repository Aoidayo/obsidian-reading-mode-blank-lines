import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const tempDir = await mkdtemp(path.join(tmpdir(), 'reading-mode-refresh-'));
const outfile = path.join(tempDir, 'reading-mode-refresh.mjs');

await esbuild.build({
  entryPoints: ['src/reading-mode-refresh.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2018',
});

const { ReadingModeRefreshCoordinator } = await import(pathToFileURL(outfile).href);

try {
  const view = { getMode: () => 'source', previewMode: { rerender() {} } };
  let refreshes = 0;
  view.previewMode.rerender = () => {
    refreshes++;
  };
  const coordinator = new ReadingModeRefreshCoordinator(() => view);

  coordinator.markViewDirty(view);
  view.getMode = () => 'preview';
  coordinator.refreshDirtyActiveView();
  coordinator.refreshDirtyActiveView();

  assert.equal(refreshes, 1);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
