/*
 * ResourcePopup - 資源獲得時にPlayerPanel上に浮き上がるポップアップ通知
 * Design: 資源アイコン + 数量が下から浮き上がってフェードアウト
 * AIターン中に人間プレイヤーが資源を獲得した場合にも表示
 */
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/gameStore';
import { RESOURCE_INFO, type ResourceType } from '@/lib/gameTypes';

interface PopupItem {
  id: string;
  resource: ResourceType;
  amount: number;
  playerName: string;
  isHumanPlayer: boolean;
}

export default function ResourcePopup() {
  const [popups, setPopups] = useState<PopupItem[]>([]);
  const players = useGameStore(s => s.players);
  const currentAIAction = useGameStore(s => s.currentAIAction);
  const isPlayingAI = useGameStore(s => s.isPlayingAI);
  const showResourceGains = useGameStore(s => s.showResourceGains);
  const resourceGains = useGameStore(s => s.resourceGains);

  // Find the human player
  const humanPlayer = players.find(p => !p.isAI);

  // Track AI action resource gains for human player
  useEffect(() => {
    if (!isPlayingAI || !currentAIAction || currentAIAction.type !== 'resource_gain') return;
    if (!humanPlayer) return;

    // Check if this resource gain is for the human player
    if (currentAIAction.playerId === humanPlayer.id) {
      const newPopup: PopupItem = {
        id: `${Date.now()}-${Math.random()}`,
        resource: currentAIAction.resource!,
        amount: currentAIAction.resourceAmount || 1,
        playerName: humanPlayer.name,
        isHumanPlayer: true,
      };
      setPopups(prev => [...prev, newPopup]);

      // Remove after animation
      setTimeout(() => {
        setPopups(prev => prev.filter(p => p.id !== newPopup.id));
      }, 2500);
    }
  }, [currentAIAction, isPlayingAI, humanPlayer]);

  // Track human player's own turn resource gains
  useEffect(() => {
    if (!showResourceGains || !resourceGains.length || !humanPlayer) return;

    const humanGains = resourceGains.filter(g => g.playerName === humanPlayer.name);
    if (humanGains.length === 0) return;

    const newPopups = humanGains.map(g => ({
      id: `${Date.now()}-${Math.random()}-${g.resource}`,
      resource: g.resource,
      amount: g.amount,
      playerName: g.playerName,
      isHumanPlayer: true,
    }));

    setPopups(prev => [...prev, ...newPopups]);

    // Remove after animation
    setTimeout(() => {
      setPopups(prev => prev.filter(p => !newPopups.some(np => np.id === p.id)));
    }, 2500);
  }, [showResourceGains, resourceGains, humanPlayer]);

  if (popups.length === 0) return null;

  return (
    <div className="fixed bottom-32 left-0 right-0 z-50 pointer-events-none flex flex-col items-center gap-2">
      <AnimatePresence>
        {popups.map((popup, index) => {
          const info = RESOURCE_INFO[popup.resource];
          return (
            <motion.div
              key={popup.id}
              initial={{ y: 40, opacity: 0, scale: 0.5 }}
              animate={{ y: -20 * index, opacity: 1, scale: 1 }}
              exit={{ y: -60, opacity: 0, scale: 0.8 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl shadow-2xl border-2"
              style={{
                background: `linear-gradient(135deg, ${info.color}22, ${info.color}44)`,
                borderColor: info.color,
                backdropFilter: 'blur(8px)',
                boxShadow: `0 4px 20px ${info.color}40, 0 0 30px ${info.color}20`,
              }}
            >
              <motion.span
                initial={{ rotate: -30, scale: 0 }}
                animate={{ rotate: 0, scale: [0, 1.4, 1] }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="text-3xl"
              >
                {info.icon}
              </motion.span>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-xs" style={{ color: info.color }}>
                  {info.name}ゲット！
                </span>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.5, 1] }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="font-score text-3xl font-black leading-tight"
                  style={{ color: info.color }}
                >
                  +{popup.amount}
                </motion.span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
