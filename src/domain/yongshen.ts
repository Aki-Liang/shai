import { LiuQin } from './liuqin'

export interface YongShenHint {
  liuqin: LiuQin
  hint: string
}

/** 「问什么取什么」口诀（传统简化版），供用户自选用神时参考 */
export const YONGSHEN_HINTS: YongShenHint[] = [
  { liuqin: '父母', hint: '长辈师长 · 文书学业 · 房屋车舟 · 天时雨水' },
  { liuqin: '兄弟', hint: '兄弟朋友 · 同辈同事 · 竞争 · 破财劫财' },
  { liuqin: '子孙', hint: '子女晚辈 · 下属 · 医药 · 六畜 · 解忧福神' },
  { liuqin: '妻财', hint: '钱财货物 · 妻子 · 薪资利润' },
  { liuqin: '官鬼', hint: '功名事业 · 丈夫 · 官非盗贼 · 疾病忧疑 · 雷电' },
]

/** 用神目标：5 六亲之一，或世爻 */
export type YongTarget = LiuQin | '世'

/** 世爻为用：测自身/综合运势/不知取何用神时 */
export const SHI_YONG_HINT = '测自身 · 综合运势 · 不知取何用神时，以世爻为用'
