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

  // 选用神高亮：本卦未必含某固定六亲（这正是伏神存在的原因），
  // 故遍历 5 个用神，断言至少有一个能点亮 ≥1 行（六爻必含若干六亲，必然成立）。
  const liuqins = ['父母', '兄弟', '子孙', '妻财', '官鬼']
  let highlighted = 0
  for (const lq of liuqins) {
    await page.getByTestId(`yongshen-${lq}`).click()
    highlighted = await page.locator('[data-testid="pan-row"][data-highlight="true"]').count()
    if (highlighted > 0) break
  }
  expect(highlighted).toBeGreaterThan(0)

  await expect(page.getByRole('button', { name: /分享/ })).toBeVisible()
})
