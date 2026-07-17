import { spawn, execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const api = join(root, 'apps', 'api');
const web = join(root, 'apps', 'web');

async function waitFor(url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`service at ${url} never became ready`);
}

export default async function globalSetup() {
  const container = await new PostgreSqlContainer('postgres:17-alpine').start();
  const dbUrl = container.getConnectionUri();

  execFileSync(
    process.execPath,
    [join(api, 'dist', 'import-cli.js'), join(root, 'e2e', 'seed.json')],
    { env: { ...process.env, GOVORI_DB__URL: dbUrl }, stdio: 'inherit' },
  );
  execFileSync(
    process.execPath,
    [
      join(api, 'dist', 'import-cli.js'),
      '--curriculum',
      join(root, 'e2e', 'seed-curriculum.json'),
    ],
    { env: { ...process.env, GOVORI_DB__URL: dbUrl }, stdio: 'inherit' },
  );

  const apiProcess = spawn(process.execPath, [join(api, 'dist', 'main.js')], {
    env: {
      ...process.env,
      GOVORI_DB__URL: dbUrl,
      GOVORI_SERVER__PORT: '53150',
      GOVORI_SERVER__CORS_ORIGINS: 'http://127.0.0.1:53250',
    },
    stdio: 'inherit',
    detached: false,
  });

  const webProcess = spawn(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    [
      'exec',
      'vite',
      'preview',
      '--port',
      '53250',
      '--strictPort',
      '--host',
      '127.0.0.1',
    ],
    { cwd: web, stdio: 'inherit', shell: process.platform === 'win32' },
  );

  await waitFor('http://127.0.0.1:53150/health');
  await waitFor('http://127.0.0.1:53250/');

  globalThis.__E2E__ = { container, apiProcess, webProcess };
  await writeFile(
    join(root, 'e2e', '.state.json'),
    JSON.stringify({ apiPid: apiProcess.pid, webPid: webProcess.pid }),
  );
}
