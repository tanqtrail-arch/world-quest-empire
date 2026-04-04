/*
 * TitleScreen - トップ画面
 * Design: ポップ冒険RPGスタイル
 * - タイトルバナー画像を大きく表示
 * - 大きなゲームボタン（ゲームを作る、ルール）
 * - 木目フレーム + 海の背景
 */
import { useGameStore } from '@/lib/gameStore';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const HERO_BG = '/hero-bg.webp';
const TITLE_BANNER = '/title-banner.webp';

export default function TitleScreen() {
  const setScreen = useGameStore(s => s.setScreen);

  return (
    <div
      className="min-h-screen flex flex-col items-center relative overflow-hidden"
      style={{
        backgroundImage: `url(${HERO_BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />

      {/* Title Banner */}
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 mt-8 sm:mt-12 md:mt-16 px-4 w-full max-w-lg md:max-w-xl"
      >
        <img
          src={TITLE_BANNER}
          alt="World Quest Empire"
          className="w-full rounded-2xl shadow-2xl"
          style={{ border: '4px solid #5C3D2E', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        />
      </motion.div>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 mt-3 text-white font-heading text-lg sm:text-xl md:text-2xl font-bold drop-shadow-lg"
        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
      >
        資源を集めて世界を広げよう！
      </motion.p>

      {/* Menu Buttons */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="relative z-10 mt-8 flex flex-col gap-4 w-full max-w-xs md:max-w-sm px-4"
      >
        <button
          onClick={() => setScreen('create')}
          className="game-btn-primary text-xl py-4 rounded-2xl"
        >
          🎮 ゲームをつくる
        </button>

        <button
          onClick={() => setScreen('ranking')}
          className="game-btn-gold text-xl py-4 rounded-2xl"
        >
          🏆 ランキング
        </button>

        <button
          onClick={() => toast('📖 ルールはゲーム中にヘルプボタン(?)から確認できます！')}
          className="game-btn-blue text-lg py-3 rounded-2xl"
        >
          📖 ルールをみる
        </button>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="relative z-10 mt-auto mb-6 text-white/70 text-sm font-heading"
        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
      >
        小学4〜6年生向け 探究型歴史学習ゲーム
      </motion.div>
    </div>
  );
}
