/*
 * RankingScreen - 週間/歴代/殿堂/履歴 タブ付き累積ランキング表示
 */
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/gameStore';
import {
  fetchRanking, fetchWeeklyRanking, fetchHallOfFame, fetchRecentResults,
  fetchPlayerHistory, computeStreaks, streakFire, getTitle, getLevel,
  isSupabaseEnabled,
  type RankingEntry, type HallOfFameEntry, type GameResultRow, type StreakInfo,
} from '@/lib/supabase';
import {
  BADGES, BADGE_ORDER, computeBadges, getStoredBadges, mergeBadges, getStoredPlayerName,
} from '@/lib/achievements';
import { ArrowLeft } from 'lucide-react';

const HERO_BG = '/hero-bg.webp';

type TabKey = 'weekly' | 'lifetime' | 'hall' | 'history';

// Level border gradient map
const LEVEL_BORDER_STYLE: Record<string, React.CSSProperties> = {
  'level-base': { border: '1px solid #D4AC6E40' },
  'level-white': { border: '2px solid #FFF', boxShadow: '0 0 6px rgba(255,255,255,0.4)' },
  'level-blue': { border: '2px solid #3B82F6', boxShadow: '0 0 10px rgba(59,130,246,0.4)' },
  'level-purple': { border: '2px solid #9333EA', boxShadow: '0 0 12px rgba(147,51,234,0.5)' },
  'level-gold': { border: '2px solid #FFD700', boxShadow: '0 0 15px rgba(255,215,0,0.6)' },
  'level-rainbow': {
    border: '3px solid transparent',
    backgroundImage: 'linear-gradient(#fff8e7, #fff8e7), linear-gradient(135deg, #FF6B6B, #FFD700, #4ECDC4, #9B59B6, #FF69B4)',
    backgroundOrigin: 'border-box',
    backgroundClip: 'padding-box, border-box',
    boxShadow: '0 0 20px rgba(255,215,0,0.6)',
  },
};

function LevelBadge({ level, isMax }: { level: number; isMax: boolean }) {
  return (
    <div
      className="shrink-0 font-score font-black text-xs px-1.5 py-0.5 rounded-md"
      style={{
        background: isMax ? 'linear-gradient(135deg, #FFD700, #FF69B4)' :
                    level >= 5 ? 'linear-gradient(135deg, #FFD700, #FFA500)' :
                    level >= 4 ? '#9333EA' :
                    level >= 3 ? '#3B82F6' :
                    level >= 2 ? '#FFFFFF' : '#9CA3AF',
        color: level >= 4 || isMax ? '#FFFFFF' : '#1F2937',
      }}
    >
      {isMax ? 'MAX' : `Lv${level}`}
    </div>
  );
}

function BadgeRow({ badges }: { badges: string[] }) {
  if (badges.length === 0) return null;
  const visible = badges.slice(0, 3);
  return (
    <span className="inline-flex gap-0.5 ml-1">
      {visible.map(id => {
        const b = BADGES[id];
        if (!b) return null;
        return <span key={id} title={b.name} className="text-sm">{b.emoji}</span>;
      })}
    </span>
  );
}

export default function RankingScreen() {
  const setScreen = useGameStore(s => s.setScreen);
  const [tab, setTab] = useState<TabKey>('weekly');
  const [loading, setLoading] = useState(true);

  const [weekly, setWeekly] = useState<RankingEntry[]>([]);
  const [lifetime, setLifetime] = useState<RankingEntry[]>([]);
  const [hall, setHall] = useState<HallOfFameEntry[]>([]);
  const [recentResults, setRecentResults] = useState<GameResultRow[]>([]);
  const [myHistory, setMyHistory] = useState<GameResultRow[]>([]);

  const storedName = getStoredPlayerName();

  useEffect(() => {
    if (!isSupabaseEnabled) {
      setLoading(false);
      return;
    }
    (async () => {
      const [w, l, h, recent, history] = await Promise.all([
        fetchWeeklyRanking(),
        fetchRanking(),
        fetchHallOfFame(),
        fetchRecentResults(500),
        storedName ? fetchPlayerHistory(storedName, 20) : Promise.resolve([]),
      ]);
      setWeekly(w);
      setLifetime(l);
      setHall(h);
      setRecentResults(recent);
      setMyHistory(history);
      setLoading(false);
    })();
  }, [storedName]);

  // Streak map from recent results
  const streaks = useMemo(() => computeStreaks(recentResults), [recentResults]);

  // Per-player badges (computed from the raw results bucket we already fetched)
  const badgesByPlayer = useMemo(() => {
    const map = new Map<string, string[]>();
    const byPlayer = new Map<string, GameResultRow[]>();
    for (const r of recentResults) {
      if (!byPlayer.has(r.player_name)) byPlayer.set(r.player_name, []);
      byPlayer.get(r.player_name)!.push(r);
    }
    byPlayer.forEach((rows, name) => {
      const computed = computeBadges(rows);
      // For the local player, also merge with stored (so badges persist
      // across weeks even if the server trims history).
      if (name === storedName) {
        const stored = getStoredBadges(name);
        stored.forEach(id => computed.add(id));
        mergeBadges(name, computed);
      }
      const ordered = BADGE_ORDER.filter(id => computed.has(id));
      map.set(name, ordered);
    });
    return map;
  }, [recentResults, storedName]);

  const maxStreakEver = useMemo(() => {
    let max = 0;
    let owner = '';
    streaks.forEach((info, name) => {
      if (info.max > max) { max = info.max; owner = name; }
    });
    return { max, owner };
  }, [streaks]);

  const activeList: RankingEntry[] = tab === 'weekly' ? weekly : tab === 'lifetime' ? lifetime : [];

  return (
    <div
      className="min-h-screen flex flex-col items-center relative overflow-auto"
      style={{
        backgroundImage: `url(${HERO_BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-lg mx-auto p-4">
        {/* Back button */}
        <motion.button
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          onClick={() => setScreen('title')}
          className="flex items-center gap-1 text-white font-heading font-bold mb-3 hover:text-amber-200 transition-colors"
        >
          <ArrowLeft size={20} />
          もどる
        </motion.button>

        {/* Title */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-3"
        >
          <div className="text-5xl mb-1">🏆</div>
          <h1 className="font-heading text-3xl font-bold text-white drop-shadow-lg">
            ランキング
          </h1>
        </motion.div>

        {/* Tab bar */}
        {isSupabaseEnabled && (
          <div className="flex gap-1 mb-3 bg-black/30 rounded-xl p-1">
            {([
              ['weekly', '📅', '今週'],
              ['lifetime', '🏆', '歴代'],
              ['hall', '👑', '殿堂'],
              ['history', '📜', '履歴'],
            ] as [TabKey, string, string][]).map(([k, icon, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`flex-1 py-2 rounded-lg font-heading text-xs font-bold transition-all ${
                  tab === k
                    ? 'bg-amber-400 text-amber-900 shadow-md'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <div className="text-base leading-none">{icon}</div>
                <div>{label}</div>
              </button>
            ))}
          </div>
        )}

        {/* Max streak banner */}
        {isSupabaseEnabled && maxStreakEver.max >= 3 && tab !== 'hall' && tab !== 'history' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-3 text-center text-sm text-amber-200 bg-black/30 rounded-lg py-2 px-3 border border-amber-400/30"
          >
            🔥 歴代最高連勝: <span className="font-score font-bold text-amber-300">{maxStreakEver.max}連勝</span>
            {maxStreakEver.owner && <span className="text-amber-300/80"> ({maxStreakEver.owner})</span>}
          </motion.div>
        )}

        {/* Content */}
        {!isSupabaseEnabled ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="parchment rounded-xl p-6 text-center"
          >
            <div className="text-4xl mb-3">📡</div>
            <p className="text-amber-800 font-heading font-bold">ランキングは未設定です</p>
            <p className="text-amber-700 text-sm mt-2">
              サーバー管理者がSupabaseを設定するとオンラインランキングが使えます
            </p>
          </motion.div>
        ) : loading ? (
          <div className="text-center text-white py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="text-4xl inline-block"
            >
              🎲
            </motion.div>
            <p className="mt-3 font-heading">読み込み中...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ---- Weekly / Lifetime ranking ---- */}
            {(tab === 'weekly' || tab === 'lifetime') && (
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="parchment rounded-xl p-4"
              >
                {activeList.length === 0 ? (
                  <div className="text-center py-6 text-amber-800">
                    <div className="text-3xl mb-2">📭</div>
                    <p className="font-heading font-bold">まだ記録がありません</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {activeList.map((entry, i) => {
                      const { title, emoji } = getTitle(entry.total_points);
                      const levelInfo = getLevel(entry.total_points);
                      const st: StreakInfo = streaks.get(entry.player_name) ?? { current: 0, max: 0 };
                      const fire = streakFire(st.current);
                      const playerBadges = badgesByPlayer.get(entry.player_name) ?? [];
                      const levelStyle = LEVEL_BORDER_STYLE[levelInfo.borderClass] ?? LEVEL_BORDER_STYLE['level-base'];
                      const baseBg = i === 0 ? 'linear-gradient(90deg, #FFD70030, transparent)' : i < 3 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)';
                      return (
                        <motion.div
                          key={entry.player_name}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-center gap-2 p-2 rounded-lg"
                          style={{ background: baseBg, ...levelStyle }}
                        >
                          <div className="font-score text-lg font-bold text-amber-800 w-7 text-center shrink-0">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                          </div>
                          <LevelBadge level={levelInfo.level} isMax={levelInfo.isMax} />
                          <div className="flex-1 min-w-0">
                            <div className="font-heading font-bold text-amber-900 truncate">
                              {entry.player_name}
                              {fire && <span className="ml-1">{fire}</span>}
                              <BadgeRow badges={playerBadges} />
                            </div>
                            <div className="text-xs text-amber-700 truncate">
                              {emoji} {title} ・ {entry.wins}勝/{entry.games}戦
                              {entry.avg_quiz_rate > 0 && <> ・ 📝{entry.avg_quiz_rate}%</>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-score text-xl font-bold text-amber-900">{entry.total_points}</div>
                            <div className="text-[10px] text-amber-600">pt</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ---- Hall of fame ---- */}
            {tab === 'hall' && (
              <motion.div
                key="hall"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="parchment rounded-xl p-4"
              >
                <h2 className="font-heading text-base font-bold text-amber-900 text-center mb-3">
                  👑 歴代の今週の覇者
                </h2>
                {hall.length === 0 ? (
                  <div className="text-center py-6 text-amber-800">
                    <div className="text-3xl mb-2">🏛️</div>
                    <p className="font-heading font-bold text-sm">まだ殿堂入りはいません</p>
                    <p className="text-xs text-amber-700 mt-1">週が終わると1位が殿堂入り！</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {hall.map((entry, i) => {
                      const dt = new Date(entry.week_start);
                      const label = `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}週`;
                      return (
                        <motion.div
                          key={`${entry.week_start}-${entry.player_name}`}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-center gap-2 p-3 rounded-lg"
                          style={{
                            background: 'linear-gradient(90deg, #FFD70030, transparent)',
                            border: '2px solid #FFD700',
                          }}
                        >
                          <div className="text-2xl">👑</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-heading font-bold text-amber-900 truncate">
                              {entry.player_name}
                            </div>
                            <div className="text-xs text-amber-700">
                              {label} ・ {entry.wins}勝/{entry.games}戦
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-score text-lg font-bold text-amber-900">{entry.week_points}</div>
                            <div className="text-[10px] text-amber-600">pt</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ---- Match history (my recent games) ---- */}
            {tab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {!storedName ? (
                  <div className="parchment rounded-xl p-6 text-center">
                    <div className="text-3xl mb-2">👤</div>
                    <p className="font-heading font-bold text-amber-900">プレイヤー名が未登録です</p>
                    <p className="text-amber-700 text-xs mt-1">ゲームを完了してランキングに登録すると履歴が表示されます</p>
                  </div>
                ) : myHistory.length === 0 ? (
                  <div className="parchment rounded-xl p-6 text-center">
                    <div className="text-3xl mb-2">📜</div>
                    <p className="font-heading font-bold text-amber-900">履歴がありません</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-center text-amber-200 text-xs font-heading">
                      {storedName} さんの直近{myHistory.length}ゲーム
                    </p>
                    {myHistory.map((g, i) => {
                      const isWin = g.rank === 1;
                      const dt = new Date(g.played_at);
                      const dateStr = `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
                      const quizRate = g.quiz_total > 0 ? Math.round((g.quiz_correct / g.quiz_total) * 100) : null;
                      return (
                        <motion.div
                          key={g.id}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="p-3 rounded-lg"
                          style={{
                            background: isWin ? 'linear-gradient(90deg, #FFD70040, #FFFFFF80)' : 'rgba(180,180,180,0.5)',
                            border: isWin ? '2px solid #FFD700' : '1px solid #9CA3AF',
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="text-2xl">{isWin ? '🏆' : `#${g.rank}`}</div>
                            <div className="flex-1 min-w-0">
                              <div className="font-heading font-bold text-amber-900 text-sm">
                                {isWin ? '勝利！' : `${g.rank}位`}
                                <span className="ml-2 text-xs text-amber-700">{dateStr}</span>
                              </div>
                              <div className="text-xs text-amber-700 flex flex-wrap gap-x-2">
                                <span>難易度: {g.difficulty}</span>
                                <span>★{g.victory_points}</span>
                                {quizRate !== null && <span>📝{quizRate}%</span>}
                                {g.had_longest_road && <span>🏅最長道</span>}
                                {g.came_from_behind && <span>💪逆転</span>}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Play button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 pb-6"
        >
          <button
            onClick={() => setScreen('create')}
            className="game-btn-primary w-full text-xl py-4 rounded-2xl"
          >
            🎮 ゲームをつくる
          </button>
        </motion.div>
      </div>
    </div>
  );
}
