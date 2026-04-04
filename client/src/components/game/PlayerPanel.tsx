/*
 * PlayerPanel - プレイヤー情報パネル
 * Design: 画面下部に国旗・国名・VP・資源を表示
 * 国旗を大きく表示して、どの国のプレイヤーか一目で分かるように
 */
import { useGameStore } from '@/lib/gameStore';
import { RESOURCE_INFO, type ResourceType } from '@/lib/gameTypes';
import { motion } from 'framer-motion';

const resourceOrder: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];

export default function PlayerPanel() {
  const { players, currentPlayerIndex, currentTurn, maxTurns } = useGameStore();
  const player = players[currentPlayerIndex];
  if (!player) return null;

  return (
    <div
      className="rounded-t-2xl px-3 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
      style={{
        background: 'linear-gradient(180deg, #8B6914 0%, #6B4E12 50%, #5A3E0E 100%)',
        borderTop: '3px solid #D4AC6E',
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
            <div className="text-white font-heading font-bold text-lg leading-tight">
              {player.countryName}
            </div>
            <div className="text-amber-200/80 text-xs font-heading">
              {player.name}
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
      <div className="grid grid-cols-4 gap-1.5">
        {resourceOrder.map(res => {
          const info = RESOURCE_INFO[res];
          const count = player.resources[res];
          return (
            <motion.div
              key={res}
              animate={count > 0 ? {} : { opacity: 0.5 }}
              className={`${info.bgClass} rounded-xl py-1.5 px-1 text-center shadow-md`}
              style={{
                border: `2px solid ${info.color}`,
                boxShadow: count > 0 ? `0 0 8px ${info.color}40` : 'none',
              }}
            >
              <div className="text-white text-xs font-heading flex items-center justify-center gap-0.5">
                <span>{info.icon}</span>
                <span>{info.name}</span>
              </div>
              <div className="font-score text-2xl font-bold text-white drop-shadow-md">
                {count}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
