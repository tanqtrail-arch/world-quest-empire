/*
 * StageSelectScreen - ステージ選択画面
 * 世界地図風の背景にステージが道でつながって並ぶ。
 * クリア済み=金色、未クリア=灰色、挑戦可能=光るアニメーション。
 */
import { useState, useMemo } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  STAGES,
  loadStageProgress,
  isStageUnlocked,
  getTotalStars,
  type StageDefinition,
  type StageProgressMap,
} from '@/lib/stageData';

const HERO_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663286960690/RthryRhRZNJvzXLKUFJiBd/hero-bg-JDykZ5tdFBU7vL2qTmUcmb.webp';

// ★ display helper
function Stars({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={i < count ? 'text-yellow-400 drop-shadow' : 'text-gray-500/50'}
          style={{ fontSize: 'inherit' }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

// Difficulty badge
function DiffBadge({ difficulty }: { difficulty: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    easy: { label: 'かんたん', cls: 'bg-green-600/80 text-green-100' },
    normal: { label: 'ふつう', cls: 'bg-yellow-600/80 text-yellow-100' },
    hard: { label: 'むずかしい', cls: 'bg-red-600/80 text-red-100' },
  };
  const d = map[difficulty] ?? map.normal;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${d.cls}`}>
      {d.label}
    </span>
  );
}

// --- Stage Node on the map route ---
function StageNode({
  stage,
  progress,
  unlocked,
  isNext,
  onSelect,
}: {
  stage: StageDefinition;
  progress: StageProgressMap;
  unlocked: boolean;
  isNext: boolean;
  onSelect: (s: StageDefinition) => void;
}) {
  const p = progress[stage.id];
  const cleared = !!p?.cleared;
  const stars = p?.stars ?? 0;

  // Visual states
  const nodeColor = cleared
    ? 'from-yellow-400 to-amber-500 shadow-amber-400/40'
    : isNext
      ? 'from-blue-400 to-indigo-500 shadow-blue-400/40'
      : 'from-gray-500 to-gray-600 shadow-gray-500/20';

  return (
    <motion.button
      onClick={() => unlocked && onSelect(stage)}
      disabled={!unlocked}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: stage.id * 0.06, type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative flex items-center gap-3 w-full rounded-2xl p-3 transition-all
        ${unlocked ? 'cursor-pointer active:scale-95' : 'cursor-not-allowed opacity-50'}
        bg-gradient-to-r ${nodeColor} shadow-lg`}
      style={{ minHeight: 64 }}
    >
      {/* Stage number circle */}
      <div
        className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-black text-lg
          ${cleared ? 'bg-white text-amber-600' : isNext ? 'bg-white text-indigo-600' : 'bg-white/30 text-white/70'}`}
      >
        {cleared ? '✓' : stage.id}
      </div>

      {/* Text */}
      <div className="flex-1 text-left min-w-0">
        <div className="font-bold text-white text-sm leading-tight truncate drop-shadow">
          {stage.title}
        </div>
        <div className="text-white/70 text-xs truncate">
          {stage.subtitle} ・ {stage.era}
        </div>
      </div>

      {/* Stars */}
      <div className="flex-shrink-0 text-base">
        {unlocked ? <Stars count={stars} /> : <span className="text-white/30 text-lg">🔒</span>}
      </div>

      {/* Pulsing glow for next stage */}
      {isNext && !cleared && (
        <span className="absolute inset-0 rounded-2xl animate-pulse ring-2 ring-blue-300/60 pointer-events-none" />
      )}
    </motion.button>
  );
}

// --- Connector line between stages ---
function Connector({ cleared }: { cleared: boolean }) {
  return (
    <div className="flex justify-center">
      <div
        className={`w-1 h-6 rounded-full ${cleared ? 'bg-amber-400/70' : 'bg-white/20'}`}
      />
    </div>
  );
}

// --- Stage Detail Modal ---
function StageDetailModal({
  stage,
  progress,
  onClose,
  onStart,
}: {
  stage: StageDefinition;
  progress: StageProgressMap;
  onClose: () => void;
  onStart: () => void;
}) {
  const p = progress[stage.id];
  const stars = p?.stars ?? 0;
  const bestTurns = p?.bestTurns;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, scale: 0.9, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 40, scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-b from-[#1a1a3e] to-[#0f0f2a] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/20 to-indigo-500/20 px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl font-black text-white">
              {stage.id}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-black text-lg leading-tight">{stage.title}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-white/60 text-sm">{stage.era}</span>
                <DiffBadge difficulty={stage.difficulty} />
              </div>
            </div>
          </div>
          {/* Stars row */}
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="text-xl"><Stars count={stars} /></span>
            {bestTurns != null && (
              <span className="text-white/50">ベスト: {bestTurns}ターン</span>
            )}
          </div>
        </div>

        {/* Story */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-white/80 text-sm leading-relaxed">
            {stage.storyText}
          </p>

          {/* Clear condition */}
          <div className="bg-white/5 rounded-xl p-3 space-y-1.5">
            <div className="text-amber-400 font-bold text-xs">クリア条件</div>
            <div className="text-white text-sm">
              {describeClearCondition(stage)}
            </div>
          </div>

          {/* Star conditions */}
          <div className="bg-white/5 rounded-xl p-3 space-y-1">
            <div className="text-amber-400 font-bold text-xs">★獲得条件</div>
            <div className="text-white/70 text-xs space-y-0.5">
              <div>★ クリア条件を達成する</div>
              <div>★★ {stage.starConditions.star2TurnLimit}ターン以内にクリア</div>
              <div>★★★ クイズ全問正解 + {stage.starConditions.star3TurnLimit}ターン以内</div>
            </div>
          </div>

          {/* Special rules */}
          {describeSpecialRules(stage).length > 0 && (
            <div className="bg-red-500/10 rounded-xl p-3 space-y-1">
              <div className="text-red-400 font-bold text-xs">特殊ルール</div>
              {describeSpecialRules(stage).map((rule, i) => (
                <div key={i} className="text-white/70 text-xs">⚠️ {rule}</div>
              ))}
            </div>
          )}

          {/* AI info */}
          <div className="bg-white/5 rounded-xl p-3">
            <div className="text-blue-400 font-bold text-xs mb-1">対戦相手</div>
            <div className="text-white/70 text-xs">
              {stage.aiSlots.length === 0
                ? 'なし（チュートリアル）'
                : `AI ${stage.aiSlots.length}体 (${stage.aiSlots.map(a => a.difficulty === 'easy' ? 'よわい' : a.difficulty === 'normal' ? 'ふつう' : 'つよい').join(', ')})`
              }
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold text-sm active:scale-95 transition-transform"
          >
            もどる
          </button>
          <button
            onClick={onStart}
            className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm shadow-lg shadow-amber-500/30 active:scale-95 transition-transform"
          >
            🏴 挑戦する！
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Helpers ---

function describeClearCondition(stage: StageDefinition): string {
  const c = stage.clearCondition;
  switch (c.type) {
    case 'vp':
      return c.beforeAI
        ? `AIより先に勝利点${c.value}に到達`
        : `勝利点${c.value}に到達`;
    case 'settlements':
      return `拠点を${c.value}つ建設`;
    case 'ports':
      return `港を${c.value}つ確保`;
    case 'survive_turns':
      return `${c.value}ターン生き残り、勝利点${c.minVP}以上を維持`;
    case 'coop_vp':
      return `全プレイヤーがそれぞれ勝利点${c.minVPEach}以上`;
    default:
      return 'クリア条件を達成';
  }
}

function describeSpecialRules(stage: StageDefinition): string[] {
  const rules: string[] = [];
  const sr = stage.specialRules;
  if (sr.resourceHalved) rules.push('全員の初期資源が半分');
  if (sr.eventRateMultiplier && sr.eventRateMultiplier > 1) rules.push(`イベント発生率 ${sr.eventRateMultiplier}倍`);
  if (sr.outerBaseDecayInterval) rules.push(`${sr.outerBaseDecayInterval}ターンごとに最外拠点が消滅`);
  if (sr.coopMode) rules.push('協力モード: 全員が仲間！');
  if (sr.turnLimit) rules.push(`${sr.turnLimit}ターン制限`);
  if (sr.noTrade) rules.push('交易禁止');
  return rules;
}

// =============================================
// MAIN COMPONENT
// =============================================

export default function StageSelectScreen() {
  const setScreen = useGameStore(s => s.setScreen);
  const initStageGame = useGameStore(s => s.initStageGame);
  const [selectedStage, setSelectedStage] = useState<StageDefinition | null>(null);

  const progress = useMemo(() => loadStageProgress(), []);
  const totalStars = getTotalStars(progress);
  const maxStars = STAGES.length * 3;

  // First unlocked & uncleared stage
  const nextStageId = useMemo(() => {
    for (const s of STAGES) {
      if (isStageUnlocked(s.id, progress) && !progress[s.id]?.cleared) return s.id;
    }
    return null;
  }, [progress]);

  const handleStart = () => {
    if (!selectedStage) return;
    initStageGame(selectedStage.id);
    setSelectedStage(null);
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        backgroundImage: `url(${HERO_BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a]/90 via-[#0a0a1a]/80 to-[#0a0a1a]/95" />

      {/* Header */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 px-4 pt-4 pb-2"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScreen('title')}
            className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white text-lg active:scale-90 transition-transform"
          >
            ←
          </button>
          <div className="flex-1">
            <h1 className="text-white font-black text-lg">🗺️ ステージモード</h1>
          </div>
          <div className="bg-amber-500/20 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
            <span className="text-amber-400 text-sm font-bold">★ {totalStars}</span>
            <span className="text-white/40 text-xs">/ {maxStars}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(totalStars / maxStars) * 100}%` }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
          />
        </div>
      </motion.div>

      {/* Stage list (scrollable route) */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {STAGES.map((stage, i) => {
          const unlocked = isStageUnlocked(stage.id, progress);
          const isNext = stage.id === nextStageId;
          const prevCleared = i > 0 && !!progress[STAGES[i - 1].id]?.cleared;

          return (
            <div key={stage.id}>
              {i > 0 && <Connector cleared={prevCleared} />}
              <StageNode
                stage={stage}
                progress={progress}
                unlocked={unlocked}
                isNext={isNext}
                onSelect={setSelectedStage}
              />
            </div>
          );
        })}

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>

      {/* Stage detail modal */}
      <AnimatePresence>
        {selectedStage && (
          <StageDetailModal
            stage={selectedStage}
            progress={progress}
            onClose={() => setSelectedStage(null)}
            onStart={handleStart}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
