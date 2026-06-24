import { test, expect } from '@playwright/test'

test('完整占卦流程到出卦 + 排盘 + 选用神高亮', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('心有所问')).toBeVisible()
  await page.getByRole('textbox').fill('我该换工作吗？')
  await page.getByRole('button', { name: '诚心摇卦' }).click()
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

  await page.getByTestId('ai-prompt-btn').click()
  await expect(page.getByTestId('ai-prompt-text')).toBeVisible()
})

test('手动摇卦：逐爻录入成卦出排盘', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox').fill('手动测试')
  await page.getByTestId('mode-manual').click()
  await page.getByRole('button', { name: '手动起卦' }).click()
  await expect(page.getByTestId('manual-cast')).toBeVisible()
  // 顺序解锁：自下而上（初爻在最末一行）逐爻点三枚阳
  const rows = await page.getByTestId('manual-yao').all()
  for (const row of rows.reverse()) {
    for (const b of await row.getByRole('button', { name: '阳' }).all()) await b.click()
  }
  await page.getByTestId('make-hexagram').click()
  await expect(page.getByTestId('pan-row').first()).toBeVisible()
})

test('起卦记录：起卦后进历史 → 重开 → 删除', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox').fill('记录测试问题')
  await page.getByRole('button', { name: '诚心摇卦' }).click()
  await page.getByRole('button', { name: /跳过/ }).click()
  await expect(page.getByText('卦辞')).toBeVisible()

  // 回首页 → 进历史
  await page.getByRole('button', { name: /再 占 一 卦/ }).click()
  await page.getByTestId('open-history').click()
  await expect(page.getByTestId('history-view')).toBeVisible()
  await expect(page.getByText('记录测试问题')).toBeVisible()

  // 重开记录 → 出结果 → 底部「返回记录」
  await page.getByTestId('history-item').first().click()
  await expect(page.getByText('卦辞')).toBeVisible()
  await page.getByRole('button', { name: /返 回 记 录/ }).click()
  await expect(page.getByTestId('history-view')).toBeVisible()

  // 删除（接受 confirm）→ 空态
  page.on('dialog', (d) => d.accept())
  await page.getByTestId('history-delete').first().click()
  await expect(page.getByTestId('history-empty')).toBeVisible()
})
