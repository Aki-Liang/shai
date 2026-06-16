import { test, expect } from '@playwright/test'

test('完整占卦流程到出卦', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('心有所问')).toBeVisible()
  await page.getByRole('textbox').fill('我该换工作吗？')
  await page.getByRole('button', { name: /摇卦/ }).click()
  await page.getByRole('button', { name: /跳过/ }).click()
  await expect(page.getByText('卦辞')).toBeVisible()
  await expect(page.getByRole('button', { name: /分享/ })).toBeVisible()
})
