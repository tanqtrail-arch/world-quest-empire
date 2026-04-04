/*
 * ResultScreen - 結果画面
 * Design: 勝者発表 + 各プレイヤーのスコア + 振り返り質問
 */
import { useGameStore } from '@/lib/gameStore';
import { motion } from 'framer-motion';

const HERO_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663286960690/RthryRhRZNJvzXLKUFJiBd/hero-bg-JDykZ5tdFBU7vL2qTmUcmb.webp';

const reflectionQuestions = [
  '🤔 なぜ広がりたくなった？',
  '⚔️ どうして争いが起きた？',
  '😰 広がると困ることはあった？',
  '📚 本当の歴史でも同じことが起きたかな？',
];

export default function ResultScreen() {
  const { winner, players, currentTurn, setScreen, gameLog, settlements, roads, longestRoadPlayerId } = useGameStore();

  const sortedPlayers = [...players].sort((a, b) => b.victoryPoints - a.victoryPoints);
  const eventCount = gameLog.filter(l => l.type === 'event').length;

  return (
    <div
      className="relative min-h-screen overflow-y-auto"
      style={{
        backgroundImage: `url(${HERO_BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Fixed overlay */}
      <div className="fixed inset-0 bg-black/50 pointer-events-none" />

      <div className="relative z-10 max-w-lg mx-auto p-4">
        {/* Winner Announcement */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          className="text-center mb-6 mt-6"
        >
          <div className="text-6xl mb-3">🏆</div>
          <h1 className="font-heading text-3xl font-bold text-white drop-shadow-lg mb-1"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
          >
            {winner?.name || sortedPlayers[0]?.name}の勝利！
          </h1>
          <p className="text-amber-200 font-heading text-lg">
            {(winner || sortedPlayers[0])?.flagEmoji} {(winner || sortedPlayers[0])?.countryName} — ★{(winner || sortedPlayers[0])?.victoryPoints}点
          </p>
          <p className="text-white/70 text-sm mt-1">
            {currentTurn}ターン・イベント{eventCount}回
          </p>
        </motion.div>

        {/* Player Rankings */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="parchment rounded-xl p-4 mb-4"
        >
          <h2 className="font-heading text-xl font-bold text-amber-900 text-center mb-3">
            📊 けっか
          </h2>
          <div className="flex flex-col gap-2">
            {sortedPlayers.map((player, i) => {
              const playerSettlements = settlements.filter(s => s.playerId === player.id && s.level === 'settlement').length;
              const playerCities = settlements.filter(s => s.playerId === player.id && s.level === 'city').length;
              const playerRoads = roads.filter(r => r.playerId === player.id).length;
              const hasLongestRoad = longestRoadPlayerId === player.id;

              return (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-2 rounded-lg"
                  style={{
                    background: i === 0 ? 'linear-gradient(90deg, #F1C40F20, transparent)' : undefined,
                    border: i === 0 ? '2px solid #F1C40F' : '1px solid #D4AC6E40',
                  }}
                >
                  <div className="font-score text-2xl font-bold text-amber-800 w-8 text-center">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </div>
                  <span className="text-xl">{player.flagEmoji}</span>
                  <div className="flex-1">
                    <div className="font-heading font-bold text-amber-900">
                      {player.name}
                      <span className="text-xs text-amber-700 ml-1">({player.countryName})</span>
                      {player.isAI && <span className="text-[9px] text-amber-600 ml-1">AI</span>}
                    </div>
                    <div className="text-xs text-amber-700 flex gap-2 flex-wrap">
                      <span>🌿{player.resources.rubber}</span>
                      <span>🛢️{player.resources.oil}</span>
                      <span>💰{player.resources.gold}</span>
                      <span>🌾{player.resources.food}</span>
                      <span>🏠{playerSettlements}</span>
                      <span>🏰{playerCities}</span>
                      <span>🛤️{playerRoads}</span>
                      {hasLongestRoad && <span className="text-yellow-600">🏅最長の道</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span className="font-score text-2xl font-bold text-amber-900">
                      {player.victoryPoints}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Reflection Questions */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="parchment rounded-xl p-4 mb-4"
        >
          <h2 className="font-heading text-xl font-bold text-amber-900 text-center mb-3">
            📚 ふりかえり
          </h2>
          <p className="text-amber-800 text-sm text-center mb-3">
            このゲームで「帝国主義」について考えてみよう！
          </p>
          <div className="flex flex-col gap-2">
            {reflectionQuestions.map((q, i) => (
              <motion.div
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="bg-white/80 rounded-lg p-3 border border-amber-300"
              >
                <p className="font-heading text-amber-900 text-sm">{q}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Play Again Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col gap-3 pb-8"
        >
          <button
            onClick={() => setScreen('create')}
            className="game-btn-primary w-full text-xl py-4 rounded-2xl"
          >
            🔄 もう一回あそぶ！
          </button>
          <button
            onClick={() => setScreen('title')}
            className="game-btn-blue w-full text-lg py-3 rounded-2xl"
          >
            🏠 トップにもどる
          </button>
        </motion.div>
      </div>
    </div>
  );
}
