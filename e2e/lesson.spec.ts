import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
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
  const prompt = page.locator('.card-prompt');
  await expect(prompt).toBeVisible();
  const word = (await prompt.innerText()).trim();
  const answer = word === 'hlěb' ? 'bread' : 'water';
  await page.click(`.choice:has-text("${answer}")`);
  await expect(page.locator('.card-feedback')).toContainText('Pravilno');
  await page.click('text=Continue');
  await expect(page.locator('.lesson-count')).toHaveText('1 answered');
});

test('the script toggle rewrites the prompt in Cyrillic', async ({ page }) => {
  await page.click('text=Start learning');
  const prompt = page.locator('.card-prompt');
  await expect(prompt).toBeVisible();
  const latin = (await prompt.innerText()).trim();
  await page.click("button[aria-label='Switch script']");
  const cyrillic = (await prompt.innerText()).trim();
  expect(cyrillic).not.toBe(latin);
  expect(cyrillic).toMatch(/^[Ѐ-ӿѐ-џ]+$/u);
});

test('typed answers are checked tolerantly', async ({ page }) => {
  await page.click('text=Start learning');
  await page.click('.choice >> nth=0');
  await page.click('text=Continue');
  const input = page.locator('.typed-input');
  await expect(input).toBeVisible();
  const prompt = (await page.locator('.card-prompt').innerText()).trim();
  await input.fill(prompt === 'hlěb' ? 'hleb' : 'voda');
  await page.click('text=Check');
  await expect(page.locator('.card-feedback')).toContainText('Pravilno');
});
