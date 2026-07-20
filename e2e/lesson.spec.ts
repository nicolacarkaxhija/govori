import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    // The first-run onboarding is covered by its own spec; the lesson
    // flows start from a returning learner's state.
    localStorage.setItem('govori.onboarded', '1');
  });
  await page.reload();
});

test('home shows the brand served by the api', async ({ page }) => {
  await expect(page.locator('.hero-name')).toHaveText('Govori');
  await expect(page).toHaveTitle(/Interslavic Learning App/);
});

test('a learner answers a card and the local log advances', async ({
  page,
}) => {
  await page.click('text=Start learning');
  await page.click('text=Lekcija 1');
  const prompt = page.locator('.card-prompt');
  await expect(prompt).toBeVisible();
  const word = (await prompt.innerText()).trim();
  const answer = word === 'hlěb' ? 'bread' : 'water';
  await page.click(`.choice:has-text("${answer}")`);
  await expect(page.locator('.card-feedback')).toContainText('Correct');
  await page.click('text=Continue');
  await expect(page.locator('.lesson-count')).toHaveText('1 answered');
});

test('the display script setting rewrites prompts in Cyrillic', async ({
  page,
}) => {
  await page.click("button[aria-label='Settings']");
  await page
    .locator("select[aria-label='Display script']")
    .selectOption('cyrillic');
  await page.click('text=Back');
  await page.click('text=Start learning');
  await page.click('text=Lekcija 1');
  const prompt = page.locator('.card-prompt');
  await expect(prompt).toBeVisible();
  expect((await prompt.innerText()).trim()).toMatch(/^[Ѐ-ӿѐ-џ]+$/u);
});

test('typed answers are checked tolerantly', async ({ page }) => {
  await page.click('text=Start learning');
  await page.click('text=Lekcija 1');
  await page.click('.choice >> nth=0');
  await page.click('text=Continue');
  const input = page.locator('.typed-input');
  await expect(input).toBeVisible();
  const prompt = (await page.locator('.card-prompt').innerText()).trim();
  await input.fill(prompt === 'hlěb' ? 'hleb' : 'voda');
  await page.click('text=Check');
  await expect(page.locator('.card-feedback')).toContainText('Correct');
});

test('a first visit walks through onboarding once', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.removeItem('govori.onboarded');
  });
  await page.reload();
  await expect(page.locator('.onboarding-title')).toBeVisible();
  await page.click('.onboarding button.primary');
  await page.click('.onboarding button.primary');
  await expect(page.locator('.hero-name')).toHaveText('Govori');
  await page.reload();
  await expect(page.locator('.hero-name')).toHaveText('Govori');
});
