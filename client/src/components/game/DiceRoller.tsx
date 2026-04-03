/*
 * DiceRoller - サイコロコンポーネント
 * Design: 大きなサイコロボタン、結果表示
 */
import { useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { motion, AnimatePresence } from 'framer-motion';

// Dice face dots
function DiceFace({ value, size = 56 }: { value: number; size?: number }) {
  const dotSize = size * 0.14;
  const pad = size * 0.22;
  const mid = size / 2;

  const positions: Record<number, [number, number][]> = {
    1: [[mid, mid]],
    2: [[pad, pad], [size - pad, size - pad]],
    3: [[pad, pad], [mid, mid], [size - pad, size - pad]],
    4: [[pad, pad], [size - pad, pad], [pad, size - pad], [size - pad, size - pad]],
    5: [[pad, pad], [size - pad, pad], [mid, mid], [pad, size - pad], [size - pad, size - pad]],
    6: [[pad, pad], [size - pad, pad], [pad, mid], [size - pad, mid], [pad, size - pad], [size - pad, size - pad]],
  };

  return (
    <div
      className="relative rounded-xl shadow-lg"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #FDFEFE 0%, #F0E6D3 100%)',
        border: '3px solid #8B6914',
        boxShadow: '0 3px 0 #5C3D2E, 0 5px 10px rgba(0,0,0,0.3)',
      }}
    >
      {(positions[value] || []).map(([x, y], i) => (
        <div
          key={i}
          className="absolute rounded-full bg-[#2C3E50]"
          style={{
            width: dotSize,
            height: dotSize,
            left: x - dotSize / 2,
            top: y - dotSize / 2,
          }}
        />
      ))}
    </div>
  );
}

export default function DiceRoller() {
  const { phase, diceResult, doRollDice } = useGameStore();
  const [isRolling, setIsRolling] = useState(false);

  const handleRoll = () => {
    if (phase !== 'rolling' || isRolling) return;
    setIsRolling(true);
    setTimeout(() => {
      doRollDice();
      setIsRolling(false);
    }, 600);
  };

  if (phase !== 'rolling' && !diceResult) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      {phase === 'rolling' && !isRolling && (
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRoll}
          className="game-btn-primary text-xl px-8 py-4 rounded-2xl glow-pulse"
        >
          🎲 サイコロを振る！
        </motion.button>
      )}

      {isRolling && (
        <div className="flex gap-3">
          <motion.div
            animate={{ rotate: [0, 90, 180, 270, 360], scale: [1, 1.2, 1, 1.1, 1] }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          >
            <DiceFace value={Math.ceil(Math.random() * 6)} />
          </motion.div>
          <motion.div
            animate={{ rotate: [0, -90, -180, -270, -360], scale: [1, 1.1, 1, 1.2, 1] }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          >
            <DiceFace value={Math.ceil(Math.random() * 6)} />
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {diceResult && !isRolling && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex items-center gap-3"
          >
            <DiceFace value={diceResult[0]} />
            <DiceFace value={diceResult[1]} />
            <div className="bg-amber-500 text-white font-score text-2xl font-bold rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
              {diceResult[0] + diceResult[1]}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
