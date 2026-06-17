export type Yinyang = 'yin' | 'yang'

/** 一爻：阴阳 + 是否动爻（老阴/老阳为动） */
export interface Line {
  yinyang: Yinyang
  moving: boolean
}

/** 一卦：六爻，index 0 = 初爻(最下)，index 5 = 上爻(最上) */
export type Hexagram = [Line, Line, Line, Line, Line, Line]

/** 起卦方式：赛博(密码学随机) / 手动(逐爻录入) */
export type CastMode = 'cyber' | 'manual'
