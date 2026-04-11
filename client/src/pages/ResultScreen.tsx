/*
 * ResultScreen - 勝利画面
 * 紙吹雪・星・ゴールドグロー・統計カードの派手な演出
 */
import { useGameStore } from '@/lib/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState, useEffect } from 'react';
import { calculateLongestRoad } from '@/lib/gameLogic';
import {
  isSupabaseEnabled, saveGameResult, rankToPoints, getTitle, getLevel,
  fetchPlayerHistory, fetchRanking,
} from '@/lib/supabase';
import {
  BADGES, computeBadges, mergeBadges, getLastLevel, setLastLevel, setStoredPlayerName,
} from '@/lib/achievements';

const HERO_BG = '/hero-bg.webp';

const reflectionQuestions = [
  '🤔 なぜ広がりたくなった？',
  '⚔️ どうして争いが起きた？',
  '😰 広がると困ることはあった？',
  '📚 本当の歴史でも同じことが起きたかな？',
];

// --- Confetti Particle ---
const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FF9F43', '#A855F7', '#F43F5E', '#22C55E'];
const CONFETTI_SHAPES = ['square', 'circle', 'rect'] as const;

function Confetti({ count = 40 }: { count?: number }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2.5 + Math.random() * 3,
      size: 6 + Math.random() * 10,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape: CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)],
      rotation: Math.random() * 720 - 360,
      swayX: (Math.random() - 0.5) * 120,
    })),
  [count]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: -30, x: `${p.x}vw`, opacity: 1, rotate: 0, scale: 0 }}
          animate={{
            y: '110vh',
            x: `calc(${p.x}vw + ${p.swayX}px)`,
            opacity: [0, 1, 1, 0.8, 0],
            rotate: p.rotation,
            scale: [0, 1, 1, 0.8],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'linear',
            repeat: Infinity,
            repeatDelay: Math.random() * 2,
          }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.shape === 'rect' ? p.size * 0.5 : p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'rect' ? '2px' : '2px',
          }}
        />
      ))}
    </div>
  );
}

// --- Star Burst ---
function StarBurst() {
  const stars = useMemo(() =>
    Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2;
      const dist = 120 + Math.random() * 100;
      return {
        id: i,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        size: 14 + Math.random() * 14,
        delay: 0.8 + i * 0.04,
      };
    }),
  []);

  return (
    <>
      {stars.map(s => (
        <motion.div
          key={s.id}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={{
            x: s.tx,
            y: s.ty,
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0],
            rotate: [0, 180],
          }}
          transition={{ duration: 1.2, delay: s.delay, ease: 'easeOut' }}
          className="absolute"
          style={{ fontSize: s.size }}
        >
          ✨
        </motion.div>
      ))}
    </>
  );
}

// --- Stat Card ---
function StatCard({ icon, label, value, delay }: { icon: string; label: string; value: string | number; delay: number }) {
  return (
    <motion.div
      initial={{ y: 30, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', damping: 15 }}
      className="bg-white/90 rounded-xl p-3 border-2 border-amber-300 shadow-lg text-center"
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="font-score text-2xl font-bold text-amber-900">{value}</div>
      <div className="text-xs text-amber-700 font-heading font-bold">{label}</div>
    </motion.div>
  );
}

export default function ResultScreen() {
  const {
    winner, players, currentTurn, setScreen, gameLog, settlements, roads, edges, vertices,
    longestRoadPlayerId, difficulty, quizCorrectCount, quizTotalCount,
    sevensRolledCount, wasLastPlaceOnce,
  } = useGameStore();
  const [showStats, setShowStats] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [levelUp, setLevelUp] = useState<{ from: number; to: number } | null>(null);

  const sortedPlayers = [...players].sort((a, b) => b.victoryPoints - a.victoryPoints);
  const champ = winner || sortedPlayers[0];
  const eventCount = gameLog.filter(l => l.type === 'event').length;

  // Winner stats
  const champSettlements = settlements.filter(s => s.playerId === champ?.id && s.level === 'settlement').length;
  const champCities = settlements.filter(s => s.playerId === champ?.id && s.level === 'city').length;
  const champRoads = roads.filter(r => r.playerId === champ?.id).length;
  const champLongestRoad = champ ? calculateLongestRoad(champ.id, roads, edges, vertices, settlements) : 0;

  useEffect(() => {
    const t1 = setTimeout(() => setShowStats(true), 2000);
    const t2 = setTimeout(() => {
      setShowButtons(true);
      if (isSupabaseEnabled) setShowNameInput(true);
    }, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const sortedPlayersForSave = [...players].sort((a, b) => b.victoryPoints - a.victoryPoints);

  const handleSaveResult = async () => {
    if (!playerName.trim() || saving) return;
    setSaving(true);
    const trimmed = playerName.trim();
    setStoredPlayerName(trimmed);

    // Save results for all human players
    const humanPlayers = sortedPlayersForSave.filter(p => p.isHuman);
    const savedNames: string[] = [];
    for (const p of humanPlayers) {
      const rank = sortedPlayersForSave.findIndex(pp => pp.id === p.id) + 1;
      const pSettlements = settlements.filter(s => s.playerId === p.id && s.level === 'settlement').length;
      const pCities = settlements.filter(s => s.playerId === p.id && s.level === 'city').length;
      const pRoads = roads.filter(r => r.playerId === p.id).length;
      const hadLongestRoad = longestRoadPlayerId === p.id;
      const cameFromBehind = wasLastPlaceOnce && rank === 1;
      const fullName = humanPlayers.length === 1 ? trimmed : `${trimmed} (${p.name})`;
      await saveGameResult({
        player_name: fullName,
        victory_points: p.victoryPoints,
        rank,
        turns_used: currentTurn,
        settlements_count: pSettlements,
        cities_count: pCities,
        roads_count: pRoads,
        difficulty: difficulty,
        player_count: players.length,
        quiz_correct: quizCorrectCount,
        quiz_total: quizTotalCount,
        sevens_rolled: sevensRolledCount,
        had_longest_road: hadLongestRoad,
        came_from_behind: cameFromBehind,
      });
      savedNames.push(fullName);
    }
    setSaved(true);
    setSaving(false);
    setShowNameInput(false);

    // Recompute badges + level for the primary player (first human)
    try {
      const primary = savedNames[0];
      if (primary) {
        const history = await fetchPlayerHistory(primary, 200);
        const computed = computeBadges(history);
        const newly = mergeBadges(primary, computed);
        if (newly.size > 0) setNewBadges(Array.from(newly));

        // Level-up check
        const ranking = await fetchRanking();
        const myEntry = ranking.find(r => r.player_name === primary);
        if (myEntry) {
          const newLevel = getLevel(myEntry.total_points).level;
          const prevLevel = getLastLevel(primary);
          if (newLevel > prevLevel) setLevelUp({ from: prevLevel, to: newLevel });
          setLastLevel(primary, newLevel);
        }
      }
    } catch (e) {
      console.error('[ResultScreen] badge/level recompute failed', e);
    }
  };

  return (
    <div className="relative min-h-screen overflow-y-auto overflow-x-hidden">
      {/* Animated gradient background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <motion.div
        initial={{ opacity: 0.8 }}
        animate={{ opacity: [0.8, 0.4, 0.3] }}
        transition={{ duration: 3, ease: 'easeOut' }}
        className="fixed inset-0 bg-black"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0.5] }}
        transition={{ duration: 3, delay: 0.5 }}
        className="fixed inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.35) 0%, transparent 70%)',
        }}
      />

      {/* Confetti! */}
      <Confetti count={45} />

      <div className="relative z-10 max-w-lg mx-auto p-4">
        {/* Winner Announcement */}
        <div className="text-center mt-8 mb-6 relative">
          {/* Star Burst behind trophy */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <StarBurst />
          </div>

          {/* Spinning flag */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 10, delay: 0.2 }}
            className="relative inline-block"
          >
            <motion.div
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="text-8xl mb-2"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {champ?.flagEmoji}
            </motion.div>
          </motion.div>

          {/* Trophy + Title */}
          <motion.div
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ type: 'spring', damping: 8, delay: 0.5 }}
          >
            <motion.div
              animate={{
                textShadow: [
                  '0 0 10px rgba(255,215,0,0.5)',
                  '0 0 40px rgba(255,215,0,0.8)',
                  '0 0 10px rgba(255,215,0,0.5)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl mb-2"
            >
              🏆
            </motion.div>
            <motion.h1
              animate={{
                textShadow: [
                  '0 0 10px rgba(255,215,0,0.3)',
                  '0 0 30px rgba(255,215,0,0.6)',
                  '0 0 10px rgba(255,215,0,0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              className="font-heading text-4xl font-black text-white mb-2"
            >
              征服者！
            </motion.h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
          >
            <p className="font-heading text-2xl font-bold text-amber-200 drop-shadow-lg">
              {champ?.name}
            </p>
            <p className="text-amber-300/80 font-heading text-lg mt-1">
              {champ?.countryName}
            </p>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.3, type: 'spring' }}
              className="inline-flex items-center gap-2 mt-2 bg-amber-500/30 backdrop-blur-sm rounded-full px-5 py-2 border border-amber-400/50"
            >
              <span className="text-yellow-400 text-xl">★</span>
              <span className="font-score text-3xl font-black text-white">{champ?.victoryPoints}</span>
              <span className="text-amber-200 text-sm font-heading">ポイント</span>
            </motion.div>
          </motion.div>
        </div>

        {/* Stats Cards */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-5"
            >
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0 }}
                className="font-heading text-lg font-bold text-amber-200 text-center mb-3"
              >
                📊 {champ?.name}の記録
              </motion.h2>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <StatCard icon="🏠" label="拠点" value={champSettlements} delay={0.1} />
                <StatCard icon="🏰" label="都市" value={champCities} delay={0.2} />
                <StatCard icon="🛤️" label="道" value={champRoads} delay={0.3} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <StatCard icon="🏅" label="最長道路" value={champLongestRoad} delay={0.4} />
                <StatCard icon="📅" label="ターン数" value={currentTurn} delay={0.5} />
                <StatCard icon="⚡" label="イベント" value={eventCount} delay={0.6} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player Rankings */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="parchment rounded-xl p-4 mb-4"
            >
              <h2 className="font-heading text-xl font-bold text-amber-900 text-center mb-3">
                🏅 ランキング
              </h2>
              <div className="flex flex-col gap-2">
                {sortedPlayers.map((player, i) => {
                  const pSettlements = settlements.filter(s => s.playerId === player.id && s.level === 'settlement').length;
                  const pCities = settlements.filter(s => s.playerId === player.id && s.level === 'city').length;
                  const pRoads = roads.filter(r => r.playerId === player.id).length;
                  const hasLongestRoad = longestRoadPlayerId === player.id;

                  return (
                    <motion.div
                      key={player.id}
                      initial={{ x: -30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.9 + i * 0.1 }}
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
                          <span>🏠{pSettlements}</span>
                          <span>🏰{pCities}</span>
                          <span>🛤️{pRoads}</span>
                          {hasLongestRoad && <span className="text-yellow-600">🏅最長の道</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span className="font-score text-2xl font-bold text-amber-900">
                          {player.victoryPoints}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reflection Questions */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.5 }}
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
                    transition={{ delay: 1.6 + i * 0.1 }}
                    className="bg-white/80 rounded-lg p-3 border border-amber-300"
                  >
                    <p className="font-heading text-amber-900 text-sm">{q}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Name Input for Ranking */}
        <AnimatePresence>
          {showNameInput && !saved && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              className="parchment rounded-xl p-4 mb-4"
            >
              <h2 className="font-heading text-lg font-bold text-amber-900 text-center mb-2">
                🏆 ランキングに登録！
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="なまえを入力"
                  maxLength={12}
                  className="flex-1 px-3 py-2 rounded-lg border-2 border-amber-300 bg-white text-base font-heading focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleSaveResult}
                  disabled={!playerName.trim() || saving}
                  className="game-btn-primary px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                >
                  {saving ? '...' : '登録'}
                </button>
              </div>
              <button
                onClick={() => setShowNameInput(false)}
                className="w-full text-amber-700 text-sm mt-2 font-heading"
              >
                スキップ
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {saved && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center text-emerald-300 font-heading font-bold mb-4"
          >
            ✅ ランキングに登録しました！
          </motion.div>
        )}

        {/* Level up animation */}
        <AnimatePresence>
          {levelUp && (
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', damping: 10 }}
              className="relative mb-4 mx-auto max-w-xs text-center p-4 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #FFD700, #FFA500, #FF69B4, #9B59B6)',
                boxShadow: '0 0 40px rgba(255,215,0,0.8)',
                border: '3px solid #FFF',
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1], rotate: [0, 4, -4, 0] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-5xl mb-1"
              >
                ✨
              </motion.div>
              <div className="font-heading font-black text-white text-2xl drop-shadow-lg tracking-wider">
                LEVEL UP!
              </div>
              <div className="font-score text-white text-lg mt-1">
                Lv.{levelUp.from} → Lv.{levelUp.to}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Newly unlocked badges */}
        <AnimatePresence>
          {newBadges.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="parchment rounded-xl p-4 mb-4"
            >
              <h2 className="font-heading text-lg font-bold text-amber-900 text-center mb-2">
                🎖️ 新しいバッジをゲット！
              </h2>
              <div className="flex flex-wrap gap-2 justify-center">
                {newBadges.map(id => {
                  const b = BADGES[id];
                  if (!b) return null;
                  return (
                    <motion.div
                      key={id}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', damping: 10 }}
                      className="bg-gradient-to-br from-amber-200 to-amber-400 border-2 border-amber-600 rounded-xl px-3 py-2 text-center"
                    >
                      <div className="text-3xl">{b.emoji}</div>
                      <div className="text-xs font-heading font-bold text-amber-900">{b.name}</div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play Again Buttons */}
        <AnimatePresence>
          {showButtons && (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="flex flex-col gap-3 pb-8"
            >
              <button
                onClick={() => setScreen('create')}
                className="game-btn-primary w-full text-xl py-4 rounded-2xl"
              >
                🔄 もう一回あそぶ！
              </button>
              <button
                onClick={() => setScreen('ranking')}
                className="game-btn-gold w-full text-lg py-3 rounded-2xl"
              >
                🏆 ランキングを見る
              </button>
              <button
                onClick={() => setScreen('title')}
                className="game-btn-blue w-full text-lg py-3 rounded-2xl"
              >
                🏠 トップにもどる
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
