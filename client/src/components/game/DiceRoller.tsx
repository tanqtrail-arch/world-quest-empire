/*
 * DiceRoller - サイコロコンポーネント
 * Design: 大きなサイコロボタン、結果表示、資源獲得通知
 * - サイコロ後にどのタイルから何の資源を得たか表示
 */
import { useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { RESOURCE_INFO } from '@/lib/gameTypes';
import { motion, AnimatePresence } from 'framer-motion';

// Dice face dots
function DiceFace({ value, size = 52 }: { value: number; size?: number }) {
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
  const { phase, diceResult, doRollDice, resourceGains, showResourceGains, dismissResourceGains, tiles } = useGameStore();
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

  const diceTotal = diceResult ? diceResult[0] + diceResult[1] : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Roll Button */}
      {phase === 'rolling' && !isRolling && (
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRoll}
          className="game-btn-primary text-lg px-6 py-3 rounded-2xl glow-pulse"
        >
          🎲 サイコロを振る！
        </motion.button>
      )}

      {/* Rolling Animation */}
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

      {/* Dice Result + Resource Gains */}
      <AnimatePresence>
        {diceResult && !isRolling && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex flex-col items-center gap-1.5"
          >
            {/* Dice faces + total */}
            <div className="flex items-center gap-2">
              <DiceFace value={diceResult[0]} size={44} />
              <DiceFace value={diceResult[1]} size={44} />
              <div className="bg-amber-500 text-white font-score text-xl font-bold rounded-full w-9 h-9 flex items-center justify-center shadow-lg">
                {diceTotal}
              </div>
            </div>

            {/* Resource Gain Notification */}
            {showResourceGains && resourceGains.length > 0 && (
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="parchment rounded-xl px-3 py-2 max-w-xs"
                onClick={dismissResourceGains}
              >
                <div className="text-amber-900 font-heading font-bold text-xs text-center mb-1">
                  📦 資源ゲット！（タイル {diceTotal} から）
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {resourceGains.map((gain, i) => {
                    const info = RESOURCE_INFO[gain.resource];
                    return (
                      <motion.span
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-white text-xs font-bold"
                        style={{ background: info.color }}
                      >
                        {info.icon} {info.name} +{gain.amount}
                        <span className="text-white/70 ml-0.5 text-[10px]">
                          ({gain.playerName})
                        </span>
                      </motion.span>
                    );
                  })}
                </div>
                <div className="text-amber-600 text-[10px] text-center mt-1">
                  タップして閉じる
                </div>
              </motion.div>
            )}

            {/* No resources gained message */}
            {showResourceGains === false && diceResult && phase === 'action' && resourceGains.length === 0 && (
              <div className="text-white/80 text-xs font-heading bg-black/40 rounded-lg px-3 py-1">
                この出目 ({diceTotal}) のタイルに拠点がないので資源はもらえなかった…
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
