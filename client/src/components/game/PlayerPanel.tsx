/*
 * PlayerPanel - プレイヤー情報パネル
 * Design: 木目フレーム付きの情報バー
 * - 国旗、名前、勝利ポイント、資源表示
 */
import { useGameStore } from '@/lib/gameStore';
import { RESOURCE_INFO, type ResourceType } from '@/lib/gameTypes';
import { motion } from 'framer-motion';

export default function PlayerPanel() {
  const { players, currentPlayerIndex, currentTurn, maxTurns } = useGameStore();
  const player = players[currentPlayerIndex];
  if (!player) return null;

  const resources: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];

  return (
    <div className="wood-panel rounded-xl p-3 mx-2">
      {/* Top row: Player info + turn */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{player.flagEmoji}</span>
          <div>
            <div className="text-white font-heading font-bold text-sm leading-tight">
              {player.countryName}
            </div>
            <div className="text-amber-200 text-xs font-heading">
              {player.name}
            </div>
          </div>
        </div>

        {/* Victory Points */}
        <div className="flex items-center gap-1">
          <span className="text-yellow-400 text-lg">★</span>
          <span className="font-score text-2xl font-bold text-white">
            {player.victoryPoints}
          </span>
        </div>

        {/* Turn counter */}
        <div className="bg-black/30 rounded-lg px-3 py-1">
          <div className="text-amber-200 text-xs font-heading">ターン</div>
          <div className="text-white font-score font-bold text-center">
            {currentTurn}/{maxTurns}
          </div>
        </div>
      </div>

      {/* Resources */}
      <div className="flex gap-1.5">
        {resources.map(res => {
          const info = RESOURCE_INFO[res];
          return (
            <motion.div
              key={res}
              className="flex-1 rounded-lg px-1.5 py-1.5 text-center"
              style={{
                background: `linear-gradient(180deg, ${info.color}CC, ${info.color})`,
                border: `2px solid ${info.color}`,
                boxShadow: `inset 0 1px 2px rgba(255,255,255,0.3)`,
              }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="text-white text-xs font-heading font-bold truncate">
                {info.icon} {info.name}
              </div>
              <div className="text-white font-score text-xl font-bold">
                {player.resources[res]}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
