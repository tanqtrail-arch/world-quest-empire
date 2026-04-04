/*
 * RankingScreen - 累積ランキング表示
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/gameStore';
import { fetchRanking, getTitle, isSupabaseEnabled, type RankingEntry } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';

const HERO_BG = '/hero-bg.webp';

export default function RankingScreen() {
  const setScreen = useGameStore(s => s.setScreen);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseEnabled) {
      setLoading(false);
      return;
    }
    fetchRanking().then(data => {
      setRanking(data);
      setLoading(false);
    });
  }, []);

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
          className="flex items-center gap-1 text-white font-heading font-bold mb-4 hover:text-amber-200 transition-colors"
        >
          <ArrowLeft size={20} />
          もどる
        </motion.button>

        {/* Title */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-6"
        >
          <div className="text-5xl mb-2">🏆</div>
          <h1 className="font-heading text-3xl font-bold text-white drop-shadow-lg">
            ランキング
          </h1>
          <p className="text-amber-200/80 text-sm mt-1">累積ポイントで順位が決まるよ！</p>
        </motion.div>

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
        ) : ranking.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="parchment rounded-xl p-6 text-center"
          >
            <div className="text-4xl mb-3">📭</div>
            <p className="text-amber-800 font-heading font-bold">まだ記録がありません</p>
            <p className="text-amber-700 text-sm mt-2">ゲームをプレイして最初のランキングに載ろう！</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="parchment rounded-xl p-4"
          >
            {/* Title legend */}
            <div className="flex flex-wrap gap-1.5 justify-center mb-3 text-xs text-amber-700">
              <span>🔰初心者探検家</span>
              <span>🏪貿易商人</span>
              <span>👑植民地総督</span>
              <span>⚔️帝国の覇者</span>
              <span>🌍世界征服者</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {ranking.map((entry, i) => {
                const { title, emoji } = getTitle(entry.total_points);
                return (
                  <motion.div
                    key={entry.player_name}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-2 p-2 rounded-lg"
                    style={{
                      background: i === 0 ? 'linear-gradient(90deg, #FFD70030, transparent)' : i < 3 ? 'rgba(255,255,255,0.5)' : undefined,
                      border: i === 0 ? '2px solid #FFD700' : i < 3 ? '1px solid #D4AC6E' : '1px solid transparent',
                    }}
                  >
                    <div className="font-score text-lg font-bold text-amber-800 w-7 text-center shrink-0">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-heading font-bold text-amber-900 truncate">
                        {entry.player_name}
                      </div>
                      <div className="text-xs text-amber-700">
                        {emoji} {title} ・ {entry.wins}勝/{entry.games}戦 ・ 最高VP{entry.max_vp}
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
          </motion.div>
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
