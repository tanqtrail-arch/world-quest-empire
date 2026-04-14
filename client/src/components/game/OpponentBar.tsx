/*
 * OpponentBar - 対戦相手情報バー
 * Design: 画面上部に他プレイヤーの国旗・VP・資源を表示
 * AIターン中は行動中のプレイヤーをハイライト表示
 * 資源獲得時にポップアップアニメーション表示
 */
import { useEffect, useRef, useState, memo } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { RESOURCE_INFO, type ResourceType } from '@/lib/gameTypes';
import { motion, AnimatePresence } from 'framer-motion';

const resourceOrder: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];

interface ResourcePopupItem {
  id: string;
  playerId: string;
  resource: ResourceType;
  amount: number;
}

function OpponentBar() {
  const players = useGameStore(s => s.players);
  const currentPlayerIndex = useGameStore(s => s.currentPlayerIndex);
  const isPlayingAI = useGameStore(s => s.isPlayingAI);
  const currentAIAction = useGameStore(s => s.currentAIAction);
  const resourceGains = useGameStore(s => s.resourceGains);
  const showResourceGains = useGameStore(s => s.showResourceGains);
  const currentPlayer = players[currentPlayerIndex];
  const [popups, setPopups] = useState<ResourcePopupItem[]>([]);

  // Track previous resources for change detection per player
  const prevResourcesRef = useRef<Record<string, Record<ResourceType, number>>>({});
  const [changedMap, setChangedMap] = useState<Record<string, Set<ResourceType>>>({});

  // Show opponents (not current player in local mode, show all non-active)
  const opponents = players.filter(p => p.id !== currentPlayer?.id);

  // Detect resource changes for each opponent
  useEffect(() => {
    const newChangedMap: Record<string, Set<ResourceType>> = {};

    opponents.forEach(opp => {
      const prev = prevResourcesRef.current[opp.id] || { rubber: 0, oil: 0, gold: 0, food: 0 };
      const changed = new Set<ResourceType>();
      resourceOrder.forEach(res => {
        if (opp.resources[res] !== prev[res]) {
          changed.add(res);
        }
      });
      if (changed.size > 0) {
        newChangedMap[opp.id] = changed;
      }
      prevResourcesRef.current[opp.id] = { ...opp.resources };
    });

    if (Object.keys(newChangedMap).length > 0) {
      setChangedMap(newChangedMap);
      const timer = setTimeout(() => setChangedMap({}), 1200);
      return () => clearTimeout(timer);
    }
  }, [(opponents ?? []).map(o => `${o.id}-${o.resources.rubber}-${o.resources.oil}-${o.resources.gold}-${o.resources.food}`).join(',')]);

  // Show resource gain popups for opponents
  useEffect(() => {
    if (!currentAIAction || currentAIAction.type !== 'resource_gain') return;
    if (!currentAIAction.resource || !currentAIAction.resourceAmount) return;

    const newPopup: ResourcePopupItem = {
      id: `${Date.now()}-${Math.random()}`,
      playerId: currentAIAction.playerId,
      resource: currentAIAction.resource,
      amount: currentAIAction.resourceAmount,
    };
    setPopups(prev => [...prev, newPopup]);

    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== newPopup.id));
    }, 2000);
  }, [currentAIAction]);

  // Also show popups from dice roll resource gains
  useEffect(() => {
    if (!showResourceGains || !resourceGains?.length) return;

    const newPopups = resourceGains
      .filter(g => opponents.some(o => o.id === g.playerId))
      .map(g => ({
        id: `${Date.now()}-${Math.random()}-${g.resource}`,
        playerId: g.playerId,
        resource: g.resource,
        amount: g.amount,
      }));

    if (newPopups.length === 0) return;
    setPopups(prev => [...prev, ...newPopups]);

    setTimeout(() => {
      setPopups(prev => prev.filter(p => !newPopups.some(np => np.id === p.id)));
    }, 2500);
  }, [showResourceGains, resourceGains]);

  return (
    <div className="flex gap-1.5 px-2 py-1.5 overflow-x-auto md:flex-col md:overflow-x-visible md:overflow-y-auto md:px-0 md:py-0">
      {opponents.map(opp => {
        const isActive = isPlayingAI && currentAIAction?.playerId === opp.id;
        const playerPopups = popups.filter(p => p.playerId === opp.id);
        const playerChanged = changedMap[opp.id] || new Set();

        return (
          <motion.div
            key={opp.id}
            animate={isActive ? {
              scale: [1, 1.05, 1],
              boxShadow: [`0 0 0px ${opp.color}`, `0 0 16px ${opp.color}`, `0 0 0px ${opp.color}`],
            } : { scale: 1 }}
            transition={isActive ? { duration: 1.5, repeat: Infinity } : {}}
            className="relative flex items-center gap-1.5 rounded-xl px-2 py-1.5 shrink-0 transition-all duration-300"
            style={{
              background: isActive ? `${opp.color}44` : 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
              border: `2px solid ${isActive ? opp.color : opp.color + '88'}`,
            }}
          >
            {/* Flag */}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-xl shrink-0"
              style={{
                background: `${opp.color}33`,
                border: `1.5px solid ${opp.color}`,
              }}
            >
              {opp.flagEmoji}
            </div>
            <div className="text-white text-xs font-heading leading-tight">
              <div className="font-bold flex items-center gap-1">
                {opp.countryName}
                {opp.isAI && <span className="text-[9px] text-white/50">AI</span>}
                {isActive && (
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="text-[10px] bg-white/20 px-1 rounded text-yellow-300"
                  >
                    行動中
                  </motion.span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-yellow-400">★</span>
                <span className="font-score font-bold">{opp.victoryPoints}</span>
                <span className="text-white/60 ml-0.5 text-[10px]">
                  {resourceOrder.map(res => {
                    const isResChanged = playerChanged.has(res);
                    return (
                      <span
                        key={`${res}-${opp.resources[res]}`}
                        className={`inline-block resource-num ${isResChanged ? 'pulse-num' : ''}`}
                        style={isResChanged ? { color: '#FFD700', textShadow: '0 0 6px #FFD70080' } : undefined}
                      >
                        {RESOURCE_INFO[res].icon}{opp.resources[res]}
                      </span>
                    );
                  })}
                </span>
              </div>
            </div>

            {/* Resource gain popup */}
            <AnimatePresence>
              {playerPopups.map((popup, idx) => {
                const info = RESOURCE_INFO[popup.resource];
                return (
                  <motion.div
                    key={popup.id}
                    initial={{ y: 0, opacity: 0, scale: 0.5 }}
                    animate={{ y: -40 - idx * 30, opacity: 1, scale: 1 }}
                    exit={{ y: -70, opacity: 0, scale: 0.5 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="absolute left-1/2 -translate-x-1/2 top-0 z-50 pointer-events-none"
                  >
                    <div
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-sm shadow-xl whitespace-nowrap"
                      style={{
                        background: `linear-gradient(135deg, ${info.color}, ${info.color}cc)`,
                        color: '#fff',
                        border: '2px solid rgba(255,255,255,0.5)',
                        boxShadow: `0 2px 12px ${info.color}80`,
                      }}
                    >
                      <span className="text-base">{info.icon}</span>
                      <span className="font-score">+{popup.amount}</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

export default memo(OpponentBar);
