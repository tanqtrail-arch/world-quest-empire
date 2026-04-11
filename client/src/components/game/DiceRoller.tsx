/*
 * DiceRoller - サイコロコンポーネント
 * Design: 大きなサイコロボタン、結果表示
 * - 資源獲得の詳細表示はHexMapのDiceResultZoomに委譲
 * - 金4枚で7確定ボタン
 */
import { useState, memo } from 'react';
import { useGameStore } from '@/lib/gameStore';
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

function DiceRoller() {
  console.count('[render] DiceRoller');
  const phase = useGameStore(s => s.phase);
  const diceResult = useGameStore(s => s.diceResult);
  const doRollDice = useGameStore(s => s.doRollDice);
  const doForceSevenDice = useGameStore(s => s.doForceSevenDice);
  const players = useGameStore(s => s.players);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const usedGoldDice = useGameStore(s => s.usedGoldDice);
  const [isRolling, setIsRolling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const player = players[currentPlayerIndex];
  const canForce = phase === 'rolling' && !isRolling && !usedGoldDice && player && player.resources.gold >= 4;

  const handleRoll = () => {
    if (phase !== 'rolling' || isRolling) return;
    setIsRolling(true);
    setTimeout(() => {
      doRollDice();
      setIsRolling(false);
    }, 600);
  };

  const handleForceSeven = () => {
    setShowConfirm(false);
    setIsRolling(true);
    setTimeout(() => {
      doForceSevenDice();
      setIsRolling(false);
    }, 600);
  };

  if (phase !== 'rolling' && !diceResult) return null;

  const diceTotal = diceResult ? diceResult[0] + diceResult[1] : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Confirm Dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="parchment rounded-xl p-3 mb-1 text-center shadow-lg max-w-xs"
          >
            <p className="font-heading font-bold text-amber-900 text-sm mb-2">
              💰 金4枚を使って7を出す？
            </p>
            <p className="text-amber-700 text-xs mb-3">
              全資源+1 & 歴史クイズが発動！
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleForceSeven}
                className="px-4 py-2 rounded-lg font-heading font-bold text-sm text-white bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all"
              >
                はい！
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-lg font-heading font-bold text-sm text-amber-700 bg-amber-100 hover:bg-amber-200 active:scale-95 transition-all"
              >
                やめる
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roll Buttons */}
      {phase === 'rolling' && !isRolling && !showConfirm && (
        <div className="flex items-center gap-2">
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

          {/* Force Seven Button */}
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            whileHover={canForce ? { scale: 1.05 } : {}}
            whileTap={canForce ? { scale: 0.95 } : {}}
            onClick={() => canForce && setShowConfirm(true)}
            disabled={!canForce}
            className={`relative px-3 py-3 rounded-2xl font-heading font-bold text-sm transition-all ${
              canForce
                ? 'text-amber-900 border-2 border-amber-400 hover:border-amber-500'
                : 'text-gray-400 border-2 border-gray-300 opacity-40'
            }`}
            style={canForce ? {
              background: 'linear-gradient(135deg, #FFF8E1, #FFE082)',
              boxShadow: '0 0 8px rgba(255,215,0,0.3), 0 2px 4px rgba(0,0,0,0.15)',
            } : {
              background: '#f3f4f6',
            }}
          >
            💰×4
            <br />
            🎲7
            {canForce && (
              <motion.div
                className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.button>
        </div>
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

      {/* Dice Result - compact display */}
      <AnimatePresence>
        {diceResult && !isRolling && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex items-center gap-2"
          >
            <DiceFace value={diceResult[0]} size={40} />
            <DiceFace value={diceResult[1]} size={40} />
            <div className="bg-amber-500 text-white font-score text-xl font-bold rounded-full w-9 h-9 flex items-center justify-center shadow-lg">
              {diceTotal}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(DiceRoller);
