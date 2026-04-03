/*
 * JoinRoom - ルーム参加画面
 * Design: 羊皮紙フォーム
 * Note: Static版なのでAI対戦のみ。参加画面は「ゲームを作る」へリダイレクト
 */
import { useGameStore } from '@/lib/gameStore';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const WOOD_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663286960690/RthryRhRZNJvzXLKUFJiBd/wood-texture-3bU4G8nuC3Js3NFmH6shph.webp';

export default function JoinRoom() {
  const setScreen = useGameStore(s => s.setScreen);

  const handleJoin = () => {
    toast.info('現在はAI対戦モードのみです。「ゲームをつくる」から始めてね！', {
      duration: 3000,
    });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{
        backgroundImage: `url(${WOOD_BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="parchment rounded-2xl p-6 w-full max-w-md"
      >
        <button
          onClick={() => setScreen('title')}
          className="flex items-center gap-1 text-amber-800 font-heading font-bold mb-4 hover:text-amber-600 transition-colors"
        >
          <ArrowLeft size={20} />
          もどる
        </button>

        <h2 className="font-heading text-2xl font-bold text-amber-900 text-center mb-6">
          🚀 ゲームにさんかする
        </h2>

        <div className="mb-5">
          <label className="block font-heading font-bold text-amber-800 mb-2 text-lg">
            なまえ
          </label>
          <input
            type="text"
            placeholder="なまえを入れてね"
            maxLength={10}
            className="w-full px-4 py-3 rounded-xl border-3 border-amber-400 bg-white text-lg font-heading focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <div className="mb-6">
          <label className="block font-heading font-bold text-amber-800 mb-2 text-lg">
            しょうたいコード
          </label>
          <input
            type="text"
            placeholder="コードを入れてね"
            maxLength={6}
            className="w-full px-4 py-3 rounded-xl border-3 border-amber-400 bg-white text-lg font-heading tracking-widest text-center focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <button
          onClick={handleJoin}
          className="game-btn-blue w-full text-xl py-4 rounded-2xl"
        >
          さんかする！
        </button>

        <p className="text-center text-amber-700 text-sm mt-4 font-heading">
          ※ 現在はAI対戦モードのみ対応しています
        </p>
      </motion.div>
    </div>
  );
}
