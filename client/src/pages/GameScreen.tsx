/*
 * GameScreen - メインゲーム画面
 * Design: ポップ冒険RPGスタイル
 * Layout:
 *   スマホ (< md): 縦1カラム (100dvh flex column)
 *   PC/タブレット (>= md): 左=マップ全面 + 右=固定サイドバー(w-80/lg:w-96)
 * - オーバーレイ: AIターン演出 + イベントポップアップ + ハンドオフ画面
 */
import HexMap from '@/components/game/HexMap';
import OpponentBar from '@/components/game/OpponentBar';
import PlayerPanel from '@/components/game/PlayerPanel';
import DiceRoller from '@/components/game/DiceRoller';
import ActionMenu from '@/components/game/ActionMenu';
import EventPopup from '@/components/game/EventPopup';
import EventCardDisplay, { CardPickerView } from '@/components/game/EventCardDisplay';
import GamblePopup from '@/components/game/GamblePopup';
import QuizPopup from '@/components/game/QuizPopup';
import GameLog from '@/components/game/GameLog';
import AITurnOverlay from '@/components/game/AITurnOverlay';
import ResourcePopup from '@/components/game/ResourcePopup';
import { useGameStore, AI_SPEED_INFO } from '@/lib/gameStore';
import { useState, useEffect, useRef } from 'react';
import { TURN_TIMER_SECONDS } from '@/lib/gameTypes';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';

// AI speed cycle button (slow → normal → fast → slow…)
// 丸いアイコンボタン: 🐢/🏃/⚡をタップでサイクル切替
function AISpeedButton({ className = '' }: { className?: string }) {
  const aiSpeed = useGameStore(s => s.aiSpeed);
  const cycleAiSpeed = useGameStore(s => s.cycleAiSpeed);
  const info = AI_SPEED_INFO[aiSpeed];
  return (
    <button
      onClick={cycleAiSpeed}
      title={`AI速度: ${info.label}（タップで切替）`}
      aria-label={`AI速度: ${info.label}`}
      className={`w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 active:scale-90 backdrop-blur-sm text-white flex items-center justify-center text-xl shadow-lg border border-white/20 transition-all ${className}`}
    >
      <span className="leading-none">{info.icon}</span>
    </button>
  );
}

const BOARD_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663286960690/RthryRhRZNJvzXLKUFJiBd/game-board-bg-8s6c49wGQN8mc2Rzb2agwx.webp';

function TileHelpTooltip({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-12 right-2 z-40 parchment rounded-xl p-4 max-w-xs shadow-2xl"
    >
      <button onClick={onClose} className="absolute top-2 right-2 text-amber-700">
        <X size={16} />
      </button>
      <h3 className="font-heading font-bold text-amber-900 mb-2">🗺️ あそびかた</h3>
      <div className="text-amber-800 text-xs space-y-2 leading-relaxed">
        <p>
          <strong>🎲 サイコロの出目</strong>でタイルから資源がもらえるよ！
          各タイルには数字が書いてあって、サイコロの合計がその数字と同じなら、
          そのタイルの頂点に拠点がある人が資源をゲット！
        </p>
        <p>
          <strong>🛤️ 道を建てて</strong>拠点を広げよう！道がつながった先の頂点に新しい拠点を建てられるよ。
        </p>
        <p>
          <strong>🏠 拠点</strong>は隣接する2〜3つのタイルから資源がもらえる。
          <strong>🏰 都市</strong>にすると資源が2倍！
        </p>
        <p>
          <strong>🛤️ 最長の道</strong>を持つプレイヤーは+2勝利点ボーナス！
        </p>
        <div className="flex gap-1 flex-wrap mt-1">
          <span className="inline-block bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full">🌿ゴム</span>
          <span className="inline-block bg-slate-700 text-white text-[10px] px-2 py-0.5 rounded-full">🛢️石油</span>
          <span className="inline-block bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full">💰金</span>
          <span className="inline-block bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">🌾食料</span>
        </div>
      </div>
    </motion.div>
  );
}

// Tutorial hint bubble - shows tutorialMessage from store for all stages
function TutorialBubble() {
  const tutorialMessage = useGameStore(s => s.tutorialMessage);
  const dismissTutorialMessage = useGameStore(s => s.dismissTutorialMessage);

  if (!tutorialMessage) return null;

  return (
    <motion.div
      key={tutorialMessage}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mx-2 mb-1"
    >
      <button
        onClick={dismissTutorialMessage}
        className="w-full bg-blue-600/90 backdrop-blur-sm text-white text-sm font-bold px-4 py-2 rounded-xl shadow-lg text-center"
      >
        💡 {tutorialMessage}
        <span className="block text-xs text-white/60 mt-0.5">タップで閉じる</span>
      </button>
    </motion.div>
  );
}

// Event card 3D flip host — shows human's drawn card (phase==='event') or AI's drawn card
function EventCardDisplayHost() {
  const phase = useGameStore(s => s.phase);
  const currentEvent = useGameStore(s => s.currentEvent);
  const currentAIAction = useGameStore(s => s.currentAIAction);
  const handleEvent = useGameStore(s => s.handleEvent);
  const resourcePickMode = useGameStore(s => s.resourcePickMode);

  // Priority 1: human event card
  if (phase === 'event' && currentEvent && !resourcePickMode) {
    return <EventCardDisplay card={currentEvent} onDismiss={handleEvent} />;
  }

  // Priority 2: AI event card action
  if (currentAIAction?.type === 'event_card' && currentAIAction.eventCard) {
    return <EventCardDisplay card={currentAIAction.eventCard} />;
  }

  return null;
}

// Handoff screen for local multiplayer
function HandoffOverlay() {
  const phase = useGameStore(s => s.phase);
  const players = useGameStore(s => s.players);
  const handoffPlayerIndex = useGameStore(s => s.handoffPlayerIndex);
  const confirmHandoff = useGameStore(s => s.confirmHandoff);

  if (phase !== 'handoff' || handoffPlayerIndex === null) return null;

  const nextPlayer = players[handoffPlayerIndex];
  if (!nextPlayer) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${nextPlayer.color}88, ${nextPlayer.color}44)`, backdropFilter: 'blur(12px)' }}
    >
      <motion.div
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        className="parchment rounded-3xl p-8 mx-4 max-w-sm w-full text-center shadow-2xl"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-7xl mb-4"
        >
          {nextPlayer.flagEmoji}
        </motion.div>
        <h2 className="font-heading text-2xl font-bold text-amber-900 mb-2">
          {nextPlayer.name}のターン！
        </h2>
        <p className="text-amber-700 text-sm mb-6">
          📱 端末を{nextPlayer.name}に渡してください
        </p>
        <button
          onClick={confirmHandoff}
          className="game-btn-primary text-lg px-10 py-3 rounded-2xl"
          style={{ backgroundColor: nextPlayer.color }}
        >
          準備OK！
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ---- Turn Timer Display ---- */
function TurnTimerDisplay() {
  const turnTimeRemaining = useGameStore(s => s.turnTimeRemaining);
  const turnTimerActive = useGameStore(s => s.turnTimerActive);
  const timerEnabled = useGameStore(s => s.timerEnabled);
  const isPlayingAI = useGameStore(s => s.isPlayingAI);
  const phase = useGameStore(s => s.phase);
  const tickTurnTimer = useGameStore(s => s.tickTurnTimer);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerEnabled && turnTimerActive) {
      timerRef.current = setInterval(() => {
        tickTurnTimer();
      }, 1000);
    }
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [timerEnabled, turnTimerActive, tickTurnTimer]);

  if (!timerEnabled || isPlayingAI || phase === 'setup' || phase === 'finished' || phase === 'handoff') {
    return null;
  }

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const progress = turnTimeRemaining / TURN_TIMER_SECONDS;
  const dashOffset = circumference * (1 - progress);

  const isYellow = turnTimeRemaining <= 15 && turnTimeRemaining > 5;
  const isRed = turnTimeRemaining <= 5;
  const strokeColor = isRed ? '#EF4444' : isYellow ? '#F59E0B' : '#3B82F6';
  const textColor = isRed ? 'text-red-500' : isYellow ? 'text-amber-500' : 'text-blue-500';

  return (
    <motion.div
      animate={isRed ? { scale: [1, 1.05, 1] } : {}}
      transition={isRed ? { duration: 0.5, repeat: Infinity } : {}}
      className="absolute top-2 left-2 z-30"
    >
      <div className="relative w-11 h-11 md:w-12 md:h-12">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r={radius} fill="rgba(0,0,0,0.4)" stroke="#ffffff33" strokeWidth={3} />
          <circle
            cx="22" cy="22" r={radius} fill="none"
            stroke={strokeColor}
            strokeWidth={3}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-score font-bold text-xs md:text-sm ${textColor}`}>
            {turnTimeRemaining}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function GameScreen() {
  const phase = useGameStore(s => s.phase);
  const isPlayingAI = useGameStore(s => s.isPlayingAI);
  const currentAIAction = useGameStore(s => s.currentAIAction);
  const setupPhase = useGameStore(s => s.setupPhase);
  const players = useGameStore(s => s.players);
  const [showHelp, setShowHelp] = useState(false);

  const isSetup = phase === 'setup';
  const setupPlayer = setupPhase ? players[setupPhase.currentPlayerIndex] : null;

  /* ---- Banner shown on map overlay (setup / AI turn) ---- */
  const bannerOverlay = (
    <>
      <AnimatePresence>
        {isSetup && setupPlayer && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-20"
          >
            <div
              className="text-center py-1.5 px-4 rounded-lg text-white text-sm font-heading font-bold shadow-lg whitespace-nowrap"
              style={{ backgroundColor: setupPlayer.color + 'dd' }}
            >
              {setupPlayer.flagEmoji} {setupPlayer.name}の初期配置
              {setupPhase?.round === 1 ? '（1回目）' : '（2回目）'}
              {setupPlayer.isAI && ' — AI配置中…'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isPlayingAI && currentAIAction && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-20"
          >
            <div
              className="text-center py-1.5 px-4 rounded-lg text-white text-sm font-heading font-bold shadow-lg whitespace-nowrap"
              style={{ backgroundColor: currentAIAction.playerColor + 'dd' }}
            >
              {currentAIAction.playerFlag} {currentAIAction.playerName}が行動中…
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <div
      className="relative overflow-hidden select-none"
      style={{
        height: '100dvh',
        backgroundImage: `url(${BOARD_BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />

      {/* ===== Mobile layout (< md): vertical single column ===== */}
      <div className="relative z-10 flex flex-col md:hidden" style={{ height: '100dvh' }}>
        <div className="shrink-0 relative">
          <OpponentBar />
          {/* 右上の固定ボタン群: 速度切替 + ヘルプ (z-50で最前面) */}
          <div className="absolute top-2 right-2 z-50 flex items-center gap-1.5">
            <AISpeedButton />
            <button
              onClick={() => setShowHelp(!showHelp)}
              aria-label="ヘルプ"
              className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 active:scale-90 backdrop-blur-sm text-white flex items-center justify-center shadow-lg border border-white/20 transition-all"
            >
              <HelpCircle size={20} />
            </button>
          </div>
          <AnimatePresence>
            {showHelp && <TileHelpTooltip onClose={() => setShowHelp(false)} />}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {isSetup && setupPlayer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="shrink-0 mx-2"
            >
              <div
                className="text-center py-2 px-3 rounded-lg text-white text-sm font-heading font-bold shadow-lg"
                style={{ backgroundColor: setupPlayer.color + 'dd' }}
              >
                {setupPlayer.flagEmoji} {setupPlayer.name}の初期配置
                {setupPhase?.round === 1 ? '（1回目）' : '（2回目）'}
                {setupPlayer.isAI && ' — AI配置中…'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isPlayingAI && currentAIAction && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="shrink-0 mx-2"
            >
              <div
                className="text-center py-1.5 px-3 rounded-lg text-white text-sm font-heading font-bold shadow-lg"
                style={{ backgroundColor: currentAIAction.playerColor + 'dd' }}
              >
                {currentAIAction.playerFlag} {currentAIAction.playerName}が行動中…
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col items-center justify-center gap-1 px-2 overflow-hidden">
          <HexMap />
          {!isPlayingAI && !isSetup && phase !== 'handoff' && <DiceRoller />}
        </div>

        <AnimatePresence mode="wait">
          <TutorialBubble />
        </AnimatePresence>

        <div className="shrink-0 flex flex-col gap-1 pb-1">
          <GameLog />
          {!isSetup && <PlayerPanel />}
          {!isPlayingAI && !isSetup && phase !== 'handoff' && <ActionMenu />}
        </div>
      </div>

      {/* ===== Desktop / Tablet layout (>= md): map left + sidebar right ===== */}
      <div className="relative z-10 hidden md:flex" style={{ height: '100dvh' }}>
        {/* Left: Map fills entire height */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2">
          {bannerOverlay}
          <div className="absolute top-2 right-2 z-50">
            <button
              onClick={() => setShowHelp(!showHelp)}
              aria-label="ヘルプ"
              className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 active:scale-90 backdrop-blur-sm text-white flex items-center justify-center shadow-lg border border-white/20 transition-all"
            >
              <HelpCircle size={20} />
            </button>
          </div>
          <AnimatePresence>
            {showHelp && <TileHelpTooltip onClose={() => setShowHelp(false)} />}
          </AnimatePresence>
          <div className="w-full h-full overflow-auto flex items-center justify-center">
            <HexMap />
          </div>
        </div>

        {/* Right: Fixed sidebar (内容が画面高を超えたら内部でスクロール可能) */}
        <div
          className="w-80 lg:w-96 shrink-0 flex flex-col gap-1.5 p-2 overflow-y-auto bg-black/30 backdrop-blur-sm"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          {/* AI速度切替 (サイドバー上部) */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            <span className="text-white/70 text-xs font-bold">AI速度</span>
            <AISpeedButton />
          </div>
          <OpponentBar />
          {!isSetup && <PlayerPanel />}
          {!isPlayingAI && !isSetup && phase !== 'handoff' && <DiceRoller />}
          <AnimatePresence mode="wait">
            <TutorialBubble />
          </AnimatePresence>
          {!isPlayingAI && !isSetup && phase !== 'handoff' && <ActionMenu />}
          <div className="flex-1 min-h-0">
            <GameLog />
          </div>
        </div>
      </div>

      {/* Overlay Components (shared for both layouts) */}
      <AITurnOverlay />
      <ResourcePopup />
      <EventPopup />
      <CardPickerView />
      <EventCardDisplayHost />
      <GamblePopup />
      <QuizPopup />
      <AnimatePresence>
        <HandoffOverlay />
      </AnimatePresence>
    </div>
  );
}
