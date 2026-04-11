/*
 * AITurnOverlay - AIプレイヤーの行動を1つずつアニメーション付きで表示
 * Design: 画面中央に大きなカード型の演出で、サイコロ・資源・建設を順番に見せる
 */
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, type AIAction } from '@/lib/gameStore';
import { RESOURCE_INFO } from '@/lib/gameTypes';

// Duration for each action display (ms)
// Durations cut ~30% from previous values for snappier AI playback.
const ACTION_DURATIONS: Record<AIAction['type'], number> = {
  turn_start: 1050,
  dice_roll: 1550,
  resource_gain: 1050,
  dice_gains: 1250,
  lucky_seven: 1400,
  no_resource: 850,
  build_settlement: 1250,
  upgrade_city: 1250,
  build_road: 1050,
  event: 1550,
  event_card: 2800,
  turn_end: 550,
  // AI quiz: 1.05s thinking + 1.05s answer reveal + 1.05s result = ~3150ms
  ai_quiz: 3150,
};

function DiceFace({ value }: { value: number }) {
  const pipPositions: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
  };
  const pips = pipPositions[value] || [];

  return (
    <div className="w-16 h-16 bg-white rounded-xl shadow-lg border-2 border-amber-300 relative">
      {pips.map(([x, y], i) => (
        <div
          key={i}
          className="absolute w-3 h-3 bg-red-600 rounded-full"
          style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
        />
      ))}
    </div>
  );
}

function ActionContent({ action }: { action: AIAction }) {
  switch (action.type) {
    case 'turn_start':
      return (
        <div className="text-center py-2">
          <div className="text-5xl mb-3">{action.playerFlag}</div>
          <div className="text-2xl font-heading font-bold" style={{ color: action.playerColor }}>
            {action.playerName}のターン！
          </div>
        </div>
      );

    case 'dice_roll':
      return (
        <div className="text-center py-2">
          <div className="text-sm text-amber-700 font-bold mb-2">
            {action.playerFlag} {action.playerName}
          </div>
          <div className="text-xl font-heading font-bold text-amber-900 mb-4">
            🎲 サイコロを振った！
          </div>
          <div className="flex items-center justify-center gap-4 mb-3">
            {action.dice && (
              <>
                <motion.div
                  initial={{ rotate: -360, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                >
                  <DiceFace value={action.dice[0]} />
                </motion.div>
                <span className="text-3xl font-bold text-amber-800">+</span>
                <motion.div
                  initial={{ rotate: 360, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.2 }}
                >
                  <DiceFace value={action.dice[1]} />
                </motion.div>
                <span className="text-3xl font-bold text-amber-800">=</span>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.5 }}
                  className="text-4xl font-heading font-black text-red-600 bg-amber-100 rounded-full w-14 h-14 flex items-center justify-center border-3 border-amber-400 shadow-lg"
                >
                  {action.diceTotal}
                </motion.div>
              </>
            )}
          </div>
          {action.gainsSummary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-base font-bold text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1.5 border border-emerald-200"
            >
              → {action.gainsSummary}
            </motion.div>
          )}
          {!action.gainsSummary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-sm text-gray-500"
            >
              資源獲得なし
            </motion.div>
          )}
        </div>
      );

    case 'resource_gain': {
      const resInfo = action.resource ? RESOURCE_INFO[action.resource] : null;
      return (
        <div className="text-center py-2">
          <div className="text-sm text-amber-700 font-bold mb-2">
            {action.playerFlag} {action.playerName}
          </div>
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="text-5xl mb-3"
          >
            {resInfo?.icon || '📦'}
          </motion.div>
          <div className="text-xl font-heading font-bold text-amber-900">
            {resInfo?.name}を
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.5, 1] }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-3xl text-red-600 mx-1 inline-block"
            >
              {action.resourceAmount}
            </motion.span>
            つゲット！
          </div>
        </div>
      );
    }

    case 'dice_gains': {
      // Group gains by player
      const gainsByPlayer = new Map<string, string[]>();
      (action.diceGains || []).forEach(g => {
        const list = gainsByPlayer.get(g.playerId) || [];
        list.push(`${RESOURCE_INFO[g.resource].icon}+${g.amount}`);
        gainsByPlayer.set(g.playerId, list);
      });
      const { players } = useGameStore.getState();
      return (
        <div className="text-center py-2">
          <div className="text-sm text-amber-700 font-bold mb-2">資源獲得！</div>
          <div className="space-y-1.5">
            {Array.from(gainsByPlayer.entries()).map(([pid, parts]) => {
              const p = players.find(pp => pp.id === pid);
              return (
                <motion.div
                  key={pid}
                  initial={{ opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="flex items-center gap-2 bg-white/80 rounded-lg px-3 py-1.5 text-sm"
                  style={{ borderLeft: `4px solid ${p?.color || '#888'}` }}
                >
                  <span className="text-base">{p?.flagEmoji}</span>
                  <span className="font-bold text-amber-900">{p?.name}</span>
                  <span className="ml-auto font-bold text-emerald-700">{parts.join(' ')}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      );
    }

    case 'lucky_seven':
      return (
        <div className="text-center py-2">
          <div className="text-sm text-amber-700 font-bold mb-2">
            {action.playerFlag} {action.playerName}
          </div>
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: [0, 1.3, 1], rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-5xl mb-3"
          >
            🎉
          </motion.div>
          <div className="text-xl font-heading font-bold text-amber-900 mb-2">
            ラッキー7！全資源+1！
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg font-bold text-emerald-700 bg-emerald-50 rounded-lg px-4 py-2 border border-emerald-200 inline-block"
          >
            🌿+1 🛢️+1 💰+1 🌾+1
          </motion.div>
        </div>
      );

    case 'no_resource':
      return (
        <div className="text-center py-2">
          <div className="text-sm text-amber-700 font-bold mb-2">
            {action.playerFlag} {action.playerName}
          </div>
          <div className="text-4xl mb-3">😢</div>
          <div className="text-base text-amber-800">
            出目 {action.diceTotal} のタイルに拠点がなく<br />資源はもらえなかった…
          </div>
        </div>
      );

    case 'build_road':
      return (
        <div className="text-center py-2">
          <div className="text-sm text-amber-700 font-bold mb-2">
            {action.playerFlag} {action.playerName}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-5xl mb-3"
          >
            {action.buildType === '交換' ? '🔄' : '🛤️'}
          </motion.div>
          {action.costText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm font-bold text-red-600 bg-red-50 rounded-lg px-3 py-1 mb-2 inline-block border border-red-200"
            >
              {action.costText}
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-heading font-bold text-amber-900"
          >
            {action.buildType === '交換' ? '資源を交換した！' : '道を建設した！'}
          </motion.div>
        </div>
      );

    case 'build_settlement':
      return (
        <div className="text-center py-2">
          <div className="text-sm text-amber-700 font-bold mb-2">
            {action.playerFlag} {action.playerName}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-5xl mb-3"
          >
            🏠
          </motion.div>
          {action.costText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm font-bold text-red-600 bg-red-50 rounded-lg px-3 py-1 mb-2 inline-block border border-red-200"
            >
              {action.costText}
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-heading font-bold text-amber-900"
          >
            拠点を建設した！
          </motion.div>
        </div>
      );

    case 'upgrade_city':
      return (
        <div className="text-center py-2">
          <div className="text-sm text-amber-700 font-bold mb-2">
            {action.playerFlag} {action.playerName}
          </div>
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: [0.5, 1.4, 1] }}
            transition={{ duration: 0.6 }}
            className="text-5xl mb-3"
          >
            🏰
          </motion.div>
          {action.costText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm font-bold text-red-600 bg-red-50 rounded-lg px-3 py-1 mb-2 inline-block border border-red-200"
            >
              {action.costText}
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl font-heading font-bold text-amber-900"
          >
            都市にアップグレード！
          </motion.div>
        </div>
      );

    case 'event': {
      const isPositiveEvent = action.eventCategory === 'positive';
      return (
        <motion.div
          animate={!isPositiveEvent ? { x: [0, -4, 4, -3, 3, -1, 1, 0] } : {}}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-center py-2"
        >
          {/* Player label */}
          <div className="text-sm font-bold mb-2" style={{ color: action.playerColor }}>
            {action.playerFlag} {action.playerName}
          </div>

          {/* Large event icon */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: [0, 1.3, 1], rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-6xl mb-2"
          >
            {action.eventIcon || '⚡'}
          </motion.div>

          {/* Event category badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${
              isPositiveEvent
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                : 'bg-red-100 text-red-700 border border-red-300'
            }`}
          >
            {isPositiveEvent ? '✨ ボーナス' : '⚠️ トラブル'}
          </motion.div>

          {/* Event title */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className={`text-xl font-heading font-bold mb-2 ${
              isPositiveEvent ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {action.eventTitle}
          </motion.div>

          {/* Event result detail */}
          {action.eventDetail && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`text-base font-bold rounded-xl px-4 py-2 border ${
                isPositiveEvent
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {action.eventDetail}
            </motion.div>
          )}
        </motion.div>
      );
    }

    case 'turn_end':
      return (
        <div className="text-center py-1 text-base text-amber-700">
          {action.playerFlag} {action.playerName}のターン終了
        </div>
      );

    case 'ai_quiz':
      // Rendered by QuizPopup (full-screen overlay) — overlay card stays empty
      return null;

    default:
      return null;
  }
}

export default function AITurnOverlay() {
  const phase = useGameStore(s => s.phase);
  const isPlayingAI = useGameStore(s => s.isPlayingAI);
  const currentAIAction = useGameStore(s => s.currentAIAction);
  const aiQueueLength = useGameStore(s => s.aiActionQueue.length);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);

  // Use a ref-based approach to avoid dependency issues
  useEffect(() => {
    if (phase !== 'ai_turn' || !isPlayingAI) {
      startedRef.current = false;
      return;
    }

    // Start the queue playback
    if (!startedRef.current && !currentAIAction && aiQueueLength > 0) {
      startedRef.current = true;
      useGameStore.getState().playNextAIAction();
    }
  }, [phase, isPlayingAI, currentAIAction, aiQueueLength]);

  // When currentAIAction changes, schedule the next one
  useEffect(() => {
    if (!currentAIAction || phase !== 'ai_turn') return;

    const duration = ACTION_DURATIONS[currentAIAction.type] || 1200;

    timerRef.current = setTimeout(() => {
      const state = useGameStore.getState();
      if (state.aiActionQueue.length > 0) {
        state.playNextAIAction();
      } else {
        // All done
        startedRef.current = false;
        if (state.winner) {
          useGameStore.setState({
            phase: 'finished',
            screen: 'result',
            isPlayingAI: false,
            currentAIAction: null,
            aiActionQueue: [],
            highlightedTileIds: [],
          });
        } else {
          // Check if next player is human (local multiplayer handoff)
          const nextIdx = state.currentPlayerIndex;
          const nextPlayer = state.players[nextIdx];
          if (nextPlayer && nextPlayer.isHuman) {
            // Show handoff screen
            useGameStore.setState({
              phase: 'handoff',
              isPlayingAI: false,
              currentAIAction: null,
              aiActionQueue: [],
              highlightedTileIds: [],
              handoffPlayerIndex: nextIdx,
            });
          } else {
            useGameStore.setState({
              phase: 'rolling',
              isPlayingAI: false,
              currentAIAction: null,
              aiActionQueue: [],
              highlightedTileIds: [],
            });
          }
        }
      }
    }, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentAIAction, phase]);

  if (phase !== 'ai_turn' || !isPlayingAI) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Dimmed background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/40 pointer-events-auto"
      />

      {/* Action card — hidden during ai_quiz (QuizPopup takes over) */}
      <AnimatePresence mode="sync">
        {currentAIAction && currentAIAction.type !== 'ai_quiz' && (
          <motion.div
            key={`${currentAIAction.type}-${currentAIAction.playerId}-${aiQueueLength}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } }}
            exit={{ opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }}
            className="relative z-10 bg-amber-50 rounded-2xl p-8 mx-4 min-w-[300px] max-w-[380px] shadow-2xl border-2"
            style={{
              borderTop: currentAIAction.type === 'event'
                ? `5px solid ${currentAIAction.eventCategory === 'positive' ? '#27AE60' : '#E74C3C'}`
                : `5px solid ${currentAIAction.playerColor}`,
              borderColor: currentAIAction.type === 'event'
                ? (currentAIAction.eventCategory === 'positive' ? '#27AE6060' : '#E74C3C60')
                : '#fde68a',
              background: currentAIAction.type === 'event'
                ? (currentAIAction.eventCategory === 'positive'
                    ? 'linear-gradient(180deg, #E8F8F5 0%, #D5F5E3 100%)'
                    : 'linear-gradient(180deg, #FDEDEC 0%, #F5B7B1 100%)')
                : 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)',
              boxShadow: currentAIAction.type === 'event'
                ? `0 0 30px ${currentAIAction.eventCategory === 'positive' ? '#27AE6040' : '#E74C3C40'}, 0 8px 32px rgba(0,0,0,0.2)`
                : undefined,
            }}
          >
            <ActionContent action={currentAIAction} />

            {/* Progress indicator */}
            <div className="flex justify-center items-center gap-1.5 mt-4">
              {Array.from({ length: Math.min(aiQueueLength + 1, 10) }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={i === 0 ? { scale: 0 } : {}}
                  animate={i === 0 ? { scale: 1 } : {}}
                  className={`rounded-full ${i === 0 ? 'w-2.5 h-2.5 bg-amber-600' : 'w-1.5 h-1.5 bg-amber-300'}`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
