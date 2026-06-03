import { test, expect } from '@playwright/test'

test('homepage loads dashboard', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Knowledge Nexus Framework')).toBeVisible()
})

test('connectivity API returns health', async ({ request }) => {
  const response = await request.get('/api/connectivity')
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body.overall).toBeDefined()
})

test('openapi spec is available', async ({ request }) => {
  const response = await request.get('/api/openapi')
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body.openapi).toBe('3.0.3')
})
