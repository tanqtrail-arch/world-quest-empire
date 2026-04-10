/*
 * AIResourcePanel - AIターン中に画面上部にそのAIの資源パネルを表示
 * Design: PlayerPanelと同じデザイン（国旗、国名、★VP、ゴム/石油/金/食料の4カード）
 * AIがアクションするたびに数字がリアルタイムで変動＋パルスアニメーション
 * AIターンが終わったら非表示
 */
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { RESOURCE_INFO, type ResourceType } from '@/lib/gameTypes';
import { motion, AnimatePresence } from 'framer-motion';

const resourceOrder: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];

export default function AIResourcePanel() {
  const players = useGameStore(s => s.players);
  const phase = useGameStore(s => s.phase);
  const isPlayingAI = useGameStore(s => s.isPlayingAI);
  const currentAIAction = useGameStore(s => s.currentAIAction);
  const longestRoadPlayerId = useGameStore(s => s.longestRoadPlayerId);

  // Find the AI player currently acting
  const aiPlayer = currentAIAction
    ? players.find(p => p.id === currentAIAction.playerId)
    : null;

  // Track previous resource values for change detection
  const prevResources = useRef<Record<ResourceType, number>>({
    rubber: 0, oil: 0, gold: 0, food: 0,
  });
  const [changedResources, setChangedResources] = useState<Set<ResourceType>>(new Set());

  // Reset prev when AI player changes
  const prevPlayerId = useRef<string | null>(null);
  useEffect(() => {
    if (aiPlayer && aiPlayer.id !== prevPlayerId.current) {
      prevResources.current = { ...aiPlayer.resources };
      prevPlayerId.current = aiPlayer.id;
      setChangedResources(new Set());
    }
  }, [aiPlayer?.id]);

  // Detect resource changes
  useEffect(() => {
    if (!aiPlayer) return;

    const changed = new Set<ResourceType>();
    resourceOrder.forEach(res => {
      if (aiPlayer.resources[res] !== prevResources.current[res]) {
        changed.add(res);
      }
    });

    if (changed.size > 0) {
      setChangedResources(changed);
      const timer = setTimeout(() => {
        setChangedResources(new Set());
      }, 1200);

      prevResources.current = { ...aiPlayer.resources };
      return () => clearTimeout(timer);
    }

    prevResources.current = { ...aiPlayer.resources };
  }, [aiPlayer?.resources.rubber, aiPlayer?.resources.oil, aiPlayer?.resources.gold, aiPlayer?.resources.food]);

  const isVisible = phase === 'ai_turn' && isPlayingAI && aiPlayer;

  return (
    <AnimatePresence>
      {isVisible && aiPlayer && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="shrink-0 mx-2 overflow-hidden"
        >
          <div
            className="rounded-2xl px-3 py-2 shadow-lg"
            style={{
              background: `linear-gradient(180deg, ${aiPlayer.color}cc 0%, ${aiPlayer.color}99 50%, ${aiPlayer.color}77 100%)`,
              borderTop: `3px solid ${aiPlayer.color}`,
              borderBottom: `2px solid ${aiPlayer.color}66`,
            }}
          >
            {/* Player Info Row */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                {/* Flag */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl shadow-lg border-2"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    borderColor: 'rgba(255,255,255,0.4)',
                  }}
                >
                  {aiPlayer.flagEmoji}
                </div>
                <div>
                  <div className="text-white font-heading font-bold text-base leading-tight flex items-center gap-1.5">
                    {aiPlayer.countryName}
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white/90">AI</span>
                    <motion.span
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="text-[10px] bg-white/30 px-1.5 py-0.5 rounded text-white"
                    >
                      行動中
                    </motion.span>
                  </div>
                  <div className="text-white/70 text-xs font-heading flex items-center gap-1">
                    {aiPlayer.name}
                    {longestRoadPlayerId === aiPlayer.id && (
                      <span className="text-[9px] bg-yellow-500/30 px-1 rounded text-yellow-200">🛤️最長の道</span>
                    )}
                  </div>
                </div>
              </div>

              {/* VP */}
              <div className="flex items-center gap-1.5">
                <span className="text-yellow-300 text-lg">★</span>
                <span className="font-score text-2xl font-bold text-white drop-shadow-lg">
                  {aiPlayer.victoryPoints}
                </span>
              </div>
            </div>

            {/* Resources Row */}
            <div className="grid grid-cols-4 gap-1.5">
              {resourceOrder.map(res => {
                const info = RESOURCE_INFO[res];
                const count = aiPlayer.resources[res];
                const isChanged = changedResources.has(res);
                return (
                  <motion.div
                    key={res}
                    animate={
                      isChanged
                        ? { scale: [1, 1.15, 1], opacity: 1 }
                        : count > 0
                          ? { opacity: 1 }
                          : { opacity: 0.5 }
                    }
                    transition={isChanged ? { duration: 0.5, ease: 'easeInOut' } : {}}
                    className={`${info.bgClass} rounded-lg py-1 px-1 text-center shadow-md relative overflow-hidden`}
                    style={{
                      border: `2px solid ${isChanged ? '#fff' : info.color}`,
                      boxShadow: isChanged
                        ? `0 0 16px ${info.color}80, 0 0 4px #fff`
                        : count > 0
                          ? `0 0 8px ${info.color}40`
                          : 'none',
                    }}
                  >
                    {/* Flash effect on change */}
                    <AnimatePresence>
                      {isChanged && (
                        <motion.div
                          initial={{ opacity: 0.8 }}
                          animate={{ opacity: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.8 }}
                          className="absolute inset-0 bg-white/40 rounded-lg"
                        />
                      )}
                    </AnimatePresence>

                    <div className="text-white text-[10px] md:text-xs font-heading flex items-center justify-center gap-0.5">
                      <span>{info.icon}</span>
                      <span>{info.name}</span>
                    </div>
                    <motion.div
                      key={`${res}-${count}`}
                      initial={isChanged ? { scale: 1.5, color: '#FFD700' } : {}}
                      animate={{ scale: 1, color: '#ffffff' }}
                      transition={{ duration: 0.4 }}
                      className="font-score text-xl md:text-2xl font-bold text-white drop-shadow-md"
                    >
                      {count}
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
