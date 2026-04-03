/*
 * OpponentBar - 対戦相手情報バー
 * Design: 画面上部に他プレイヤーの簡易情報を表示
 */
import { useGameStore } from '@/lib/gameStore';

export default function OpponentBar() {
  const { players, currentPlayerIndex } = useGameStore();
  const currentPlayer = players[currentPlayerIndex];
  
  // Show opponents (not current player)
  const opponents = players.filter(p => p.id !== currentPlayer?.id);

  return (
    <div className="flex gap-1.5 px-2 py-1.5 overflow-x-auto">
      {opponents.map(opp => (
        <div
          key={opp.id}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 shrink-0"
          style={{
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            border: `2px solid ${opp.color}`,
          }}
        >
          <span className="text-base">{opp.flagEmoji}</span>
          <div className="text-white text-xs font-heading leading-tight">
            <div className="font-bold">{opp.countryName}</div>
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">★</span>
              <span className="font-score font-bold">{opp.victoryPoints}</span>
              <span className="text-white/60 ml-1">
                🌿{opp.resources.rubber} 🛢️{opp.resources.oil} 💰{opp.resources.gold} 🌾{opp.resources.food}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
