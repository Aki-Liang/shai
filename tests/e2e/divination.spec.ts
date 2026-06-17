import { test, expect } from '@playwright/test'

test('完整占卦流程到出卦 + 排盘 + 选用神高亮', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('心有所问')).toBeVisible()
  await page.getByRole('textbox').fill('我该换工作吗？')
  await page.getByRole('button', { name: /摇卦/ }).click()
  await page.getByRole('button', { name: /跳过/ }).click()

  // 排盘要素
  await expect(page.getByText('卦辞')).toBeVisible()
  await expect(page.getByText(/旬空/)).toBeVisible()
  await expect(page.getByTestId('pan-row').first()).toBeVisible()

  // 选用神：遍历 5 六亲，至少一个能点亮 ≥1 行
  const liuqins = ['父母', '兄弟', '子孙', '妻财', '官鬼']
  let highlighted = 0
  for (const lq of liuqins) {
    await page.getByTestId(`yongshen-${lq}`).click()
    highlighted = await page.locator('[data-testid="pan-row"][data-highlight="true"]').count()
    if (highlighted > 0) break
  }
  expect(highlighted).toBeGreaterThan(0)
  // 用神分析面板出现，且至少一条受力行
  await expect(page.getByTestId('yongshen-panel')).toBeVisible()
  expect(await page.getByTestId('force-row').count()).toBeGreaterThan(0)

  // 世爻为用：必有唯一持世爻被点亮
  await page.getByTestId('yongshen-世').click()
  expect(await page.locator('[data-testid="pan-row"][data-highlight="true"]').count()).toBe(1)
  await expect(page.getByTestId('yongshen-panel')).toBeVisible()

  await expect(page.getByRole('button', { name: /分享/ })).toBeVisible()
})
