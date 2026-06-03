import { test, expect } from '@playwright/test'

test('homepage loads dashboard', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Open Payments')).toBeVisible()
  await expect(page.getByText('Compliance workspace')).toBeVisible()
})

test('connectivity API returns health', async ({ request }) => {
  const response = await request.get('/api/connectivity')
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body.success).toBe(true)
  expect(body.data?.overall).toBeDefined()
})

test('openapi spec is available', async ({ request }) => {
  const response = await request.get('/api/openapi')
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  expect(body.openapi).toBe('3.0.3')
})
