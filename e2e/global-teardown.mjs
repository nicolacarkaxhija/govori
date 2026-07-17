export default async function globalTeardown() {
  const state = globalThis.__E2E__;
  if (state === undefined) {
    return;
  }
  state.apiProcess.kill();
  state.webProcess.kill();
  await state.container.stop();
}
