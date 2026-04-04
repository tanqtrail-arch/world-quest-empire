/*
 * OpponentBar - 対戦相手情報バー
 * Design: 画面上部に他プレイヤーの国旗・VP・資源を表示
 * AIターン中は行動中のプレイヤーをハイライト表示
 */
import { useGameStore } from '@/lib/gameStore';
import { motion } from 'framer-motion';

export default function OpponentBar() {
  const { players, currentPlayerIndex, isPlayingAI, currentAIAction } = useGameStore();
  const currentPlayer = players[currentPlayerIndex];
  
  // Show opponents (not current player)
  const opponents = players.filter(p => p.id !== currentPlayer?.id);

  return (
    <div className="flex gap-1.5 px-2 py-1.5 overflow-x-auto">
      {opponents.map(opp => {
        const isActive = isPlayingAI && currentAIAction?.playerId === opp.id;
        
        return (
          <motion.div
            key={opp.id}
            animate={isActive ? {
              scale: [1, 1.05, 1],
              boxShadow: [`0 0 0px ${opp.color}`, `0 0 16px ${opp.color}`, `0 0 0px ${opp.color}`],
            } : { scale: 1 }}
            transition={isActive ? { duration: 1.5, repeat: Infinity } : {}}
            className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 shrink-0 transition-all duration-300"
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
                  🌿{opp.resources.rubber} 🛢️{opp.resources.oil} 💰{opp.resources.gold} 🌾{opp.resources.food}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
