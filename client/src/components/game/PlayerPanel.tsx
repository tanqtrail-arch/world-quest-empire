/*
 * PlayerPanel - プレイヤー情報パネル
 * Design: 画面下部に現在のプレイヤーの国旗・国名・VP・資源を表示
 * ローカル対戦では現在のターンのプレイヤーを表示
 * 資源が変化した時にパルスアニメーションを表示
 */
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { RESOURCE_INFO, type ResourceType } from '@/lib/gameTypes';
import { motion, AnimatePresence } from 'framer-motion';

const resourceOrder: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];

export default function PlayerPanel() {
  const players = useGameStore(s => s.players);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const currentTurn = useGameStore(s => s.currentTurn);
  const maxTurns = useGameStore(s => s.maxTurns);
  const longestRoadPlayerId = useGameStore(s => s.longestRoadPlayerId);

  const player = players[currentPlayerIndex];

  // Track previous resource values for change detection
  const prevResources = useRef<Record<ResourceType, number>>({
    rubber: 0, oil: 0, gold: 0, food: 0,
  });
  const [changedResources, setChangedResources] = useState<Set<ResourceType>>(new Set());

  useEffect(() => {
    if (!player) return;

    const changed = new Set<ResourceType>();
    resourceOrder.forEach(res => {
      if (player.resources[res] !== prevResources.current[res]) {
        changed.add(res);
      }
    });

    if (changed.size > 0) {
      setChangedResources(changed);
      const timer = setTimeout(() => {
        setChangedResources(new Set());
      }, 1200);

      prevResources.current = { ...player.resources };
      return () => clearTimeout(timer);
    }

    prevResources.current = { ...player.resources };
  }, [player?.resources.rubber, player?.resources.oil, player?.resources.gold, player?.resources.food, player?.id]);

  if (!player) return null;

  const hasLongestRoad = longestRoadPlayerId === player.id;

  return (
    <div
      className="rounded-t-2xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
      style={{
        background: 'linear-gradient(180deg, #8B6914 0%, #6B4E12 50%, #5A3E0E 100%)',
        borderTop: `3px solid ${player.color}`,
      }}
    >
      {/* Player Info Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Large Flag */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-3xl shadow-lg border-2"
            style={{
              background: `${player.color}33`,
              borderColor: player.color,
            }}
          >
            {player.flagEmoji}
          </div>
          <div>
            <div className="text-white font-heading font-bold text-lg leading-tight flex items-center gap-1.5">
              {player.countryName}
              {player.isAI && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-amber-200">AI</span>}
              {player.isHuman && <span className="text-[10px] bg-blue-500/50 px-1.5 py-0.5 rounded text-blue-100">👤</span>}
            </div>
            <div className="text-amber-200/80 text-xs font-heading flex items-center gap-1">
              {player.name}
              {hasLongestRoad && (
                <span className="text-[9px] bg-yellow-500/30 px-1 rounded text-yellow-300">🛤️最長の道</span>
              )}
            </div>
          </div>
        </div>

        {/* VP */}
        <div className="flex items-center gap-1.5">
          <span className="text-yellow-400 text-xl">★</span>
          <span className="font-score text-3xl font-bold text-white drop-shadow-lg">
            {player.victoryPoints}
          </span>
        </div>

        {/* Turn Counter */}
        <div
          className="rounded-xl px-3 py-1.5 text-center"
          style={{ background: 'rgba(0,0,0,0.3)' }}
        >
          <div className="text-amber-200/70 text-[10px] font-heading">ターン</div>
          <div className="font-score text-lg font-bold text-white leading-tight">
            {currentTurn}/{maxTurns}
          </div>
        </div>
      </div>

      {/* Resources Row */}
      <div className="grid grid-cols-4 gap-1.5 md:gap-2.5">
        {resourceOrder.map(res => {
          const info = RESOURCE_INFO[res];
          const count = player.resources[res];
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
              className={`${info.bgClass} rounded-xl py-1.5 px-1 text-center shadow-md relative overflow-hidden`}
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
                    className="absolute inset-0 bg-white/40 rounded-xl"
                  />
                )}
              </AnimatePresence>

              <div className="text-white text-xs md:text-sm font-heading flex items-center justify-center gap-0.5">
                <span>{info.icon}</span>
                <span>{info.name}</span>
              </div>
              <motion.div
                key={`${res}-${count}`}
                initial={isChanged ? { scale: 1.5, color: '#FFD700' } : {}}
                animate={{ scale: 1, color: '#ffffff' }}
                transition={{ duration: 0.4 }}
                className="font-score text-2xl md:text-3xl font-bold text-white drop-shadow-md"
              >
                {count}
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
