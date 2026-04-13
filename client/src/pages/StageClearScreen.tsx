/*
 * StageClearScreen - ステージクリア演出
 * ★獲得アニメーション + ストーリー続き + 次ステージへ
 */
import { useMemo } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { motion } from 'framer-motion';
import {
  getStageById,
  STAGES,
  loadStageProgress,
  getTotalStars,
  isStageUnlocked,
} from '@/lib/stageData';

const HERO_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663286960690/RthryRhRZNJvzXLKUFJiBd/hero-bg-JDykZ5tdFBU7vL2qTmUcmb.webp';

function StarReveal({ index, earned, delay }: { index: number; earned: boolean; delay: number }) {
  return (
    <motion.span
      initial={{ scale: 0, rotate: -180, opacity: 0 }}
      animate={{
        scale: earned ? [0, 1.4, 1] : [0, 1],
        rotate: earned ? [-180, 15, 0] : [-180, 0],
        opacity: 1,
      }}
      transition={{ delay, duration: 0.6, ease: 'easeOut' }}
      className={`inline-block text-5xl ${earned ? 'drop-shadow-lg' : ''}`}
      style={earned ? { textShadow: '0 0 20px rgba(255,200,50,0.6)' } : {}}
    >
      {earned ? '⭐' : '☆'}
    </motion.span>
  );
}

export default function StageClearScreen() {
  const setScreen = useGameStore(s => s.setScreen);
  const initStageGame = useGameStore(s => s.initStageGame);
  const stageMode = useGameStore(s => s.stageMode);
  const stageClearStars = useGameStore(s => s.stageClearStars);
  const currentTurn = useGameStore(s => s.currentTurn);

  const stageId = stageMode?.stageId ?? 0;
  const stage = getStageById(stageId);

  const progress = useMemo(() => loadStageProgress(), []);
  const totalStars = getTotalStars(progress);
  const maxStars = STAGES.length * 3;

  const isLastStage = stageId === STAGES.length;
  const nextStage = getStageById(stageId + 1);
  const nextUnlocked = nextStage ? isStageUnlocked(nextStage.id, progress) : false;

  const allCleared = useMemo(() => {
    return STAGES.every(s => progress[s.id]?.cleared);
  }, [progress]);

  if (!stage) return null;

  return (
    <div
      className="min-h-screen flex flex-col items-center relative overflow-hidden"
      style={{
        backgroundImage: `url(${HERO_BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a]/90 via-[#0a0a1a]/70 to-[#0a0a1a]/95" />

      {/* Confetti for 3 stars */}
      {stageClearStars >= 3 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {Array.from({ length: 30 }, (_, i) => (
            <motion.div
              key={i}
              initial={{
                x: `${Math.random() * 100}vw`,
                y: -20,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: '110vh',
                rotate: Math.random() * 720 - 360,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 1.5,
                ease: 'easeIn',
              }}
              className="absolute w-3 h-3 rounded-sm"
              style={{
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][i % 5],
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center w-full max-w-md px-4 pt-12">
        {/* Clear banner */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center"
        >
          <div className="text-6xl mb-2">
            {allCleared && isLastStage ? '👑' : '🎉'}
          </div>
          <h1 className="text-white font-black text-2xl">
            {allCleared && isLastStage ? '全ステージ制覇！' : 'ステージクリア！'}
          </h1>
          <p className="text-amber-400 font-bold text-sm mt-1">
            ステージ{stage.id}: {stage.title}
          </p>
        </motion.div>

        {/* Stars */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex gap-4 mt-8"
        >
          <StarReveal index={0} earned={stageClearStars >= 1} delay={0.6} />
          <StarReveal index={1} earned={stageClearStars >= 2} delay={1.0} />
          <StarReveal index={2} earned={stageClearStars >= 3} delay={1.4} />
        </motion.div>

        {/* Turn info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="mt-3 text-white/50 text-sm"
        >
          {currentTurn}ターンでクリア
        </motion.div>

        {/* Story text */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="mt-8 bg-white/5 backdrop-blur rounded-2xl p-5 border border-white/10"
        >
          <p className="text-white/80 text-sm leading-relaxed">
            {stage.clearText}
          </p>
        </motion.div>

        {/* Total stars */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2 }}
          className="mt-6 bg-amber-500/10 rounded-xl px-4 py-2 flex items-center gap-2"
        >
          <span className="text-amber-400 font-bold text-sm">★ 合計 {totalStars} / {maxStars}</span>
        </motion.div>

        {/* Hall of fame for all clear */}
        {allCleared && isLastStage && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 2.5, type: 'spring' }}
            className="mt-6 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-2xl p-5 border border-amber-500/30 text-center"
          >
            <div className="text-3xl mb-2">🏆</div>
            <h2 className="text-amber-400 font-black text-lg">殿堂入り！</h2>
            <p className="text-white/60 text-xs mt-1">全10ステージを制覇しました！</p>
          </motion.div>
        )}

        {/* Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 2.4 }}
          className="mt-8 w-full space-y-3 pb-8"
        >
          {nextStage && nextUnlocked && (
            <button
              onClick={() => initStageGame(nextStage.id)}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-base shadow-lg shadow-amber-500/30 active:scale-95 transition-transform"
            >
              次のステージへ →
            </button>
          )}
          <button
            onClick={() => setScreen('stage_select')}
            className="w-full py-3 rounded-xl bg-white/10 text-white font-bold text-sm active:scale-95 transition-transform"
          >
            ステージ選択にもどる
          </button>
          <button
            onClick={() => setScreen('title')}
            className="w-full py-3 rounded-xl bg-white/5 text-white/60 font-bold text-sm active:scale-95 transition-transform"
          >
            タイトルにもどる
          </button>
        </motion.div>
      </div>
    </div>
  );
}
