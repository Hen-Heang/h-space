"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "motion/react"
import { PartyPopper } from "lucide-react"

// Ported from Orbit components/ui/CompletionCelebration.tsx. A lightweight,
// dependency-free confetti burst + "Congratulations!" card. Render it once near
// the top of a screen and flip `show` to true when a task is completed; it
// auto-dismisses via `onDone`. Confetti is generated in an effect (not during
// render) to stay clear of the React Compiler purity rule.

const COLORS = ["#22c55e", "#06b6d4", "#3b82f6", "#f59e0b", "#ec4899", "#a855f7"]
const PIECE_COUNT = 44
const DURATION_MS = 2200

// Confetti scatter is generated once at module load — keeping Math.random out of
// render (React Compiler purity) and out of an effect (no setState churn). A
// fixed 44-piece scatter reads as varied; the repeat across bursts is invisible.
const PIECES = Array.from({ length: PIECE_COUNT }, (_, i) => ({
  id: i,
  x: (Math.random() * 2 - 1) * 340,
  peak: -(Math.random() * 220 + 120),
  rot: Math.random() * 720 - 360,
  delay: Math.random() * 0.18,
  color: COLORS[i % COLORS.length],
  size: 6 + Math.random() * 9,
}))

interface CompletionCelebrationProps {
  show: boolean
  onDone: () => void
  message?: string
  subtitle?: string
}

export function CompletionCelebration({
  show,
  onDone,
  message = "Congratulations!",
  subtitle = "Task completed",
}: CompletionCelebrationProps) {
  // Keep the latest onDone without making it an effect dependency, so parent
  // re-renders while shown don't restart the auto-dismiss timer.
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  // Arm the auto-dismiss whenever the burst is shown.
  useEffect(() => {
    if (!show) return
    const t = setTimeout(() => onDoneRef.current(), DURATION_MS)
    return () => clearTimeout(t)
  }, [show])

  if (typeof document === "undefined") return null

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {PIECES.map((p) => (
            <motion.span
              key={p.id}
              className="absolute rounded-[2px]"
              style={{
                width: p.size,
                height: p.size * 0.6,
                backgroundColor: p.color,
                top: "50%",
                left: "50%",
              }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
              animate={{ x: p.x, y: [0, p.peak, p.peak + 460], opacity: [1, 1, 0], rotate: p.rot }}
              transition={{ duration: 1.9, delay: p.delay, ease: [0.2, 0.8, 0.3, 1] }}
            />
          ))}

          <motion.div
            className="relative flex flex-col items-center gap-1.5 rounded-3xl border border-white/30 bg-white/80 px-9 py-7 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80"
            initial={{ scale: 0.5, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
          >
            <motion.div
              className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 11, delay: 0.05 }}
            >
              <PartyPopper aria-hidden="true" className="size-8" />
            </motion.div>
            <p className="text-xl font-bold tracking-tight text-foreground">{message}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {subtitle}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export default CompletionCelebration
