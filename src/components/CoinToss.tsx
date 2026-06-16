import { motion } from 'framer-motion'

/** 三枚铜钱的抛掷视觉（纯展示）。spinning 时旋转上抛。 */
export function CoinToss({ spinning }: { spinning: boolean }) {
  return (
    <div className="flex gap-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-8 h-8 rounded-full border border-ink/50 flex items-center justify-center"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,.12)' }}
          animate={spinning ? { y: [-12, 0], rotateY: [0, 360] } : { y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.08, repeat: spinning ? Infinity : 0 }}
        >
          <span className="block w-2 h-2 border border-ink/60" />
        </motion.div>
      ))}
    </div>
  )
}
