/*
 * CreateRoom - ルーム作成画面
 * Design: 木目パネル上にフォーム
 * - プレイヤー名入力
 * - プレイ人数選択
 * - 難易度選択
 * - ゲーム開始ボタン
 */
import { useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import type { Difficulty } from '@/lib/gameTypes';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const WOOD_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663286960690/RthryRhRZNJvzXLKUFJiBd/wood-texture-3bU4G8nuC3Js3NFmH6shph.webp';

export default function CreateRoom() {
  const { setScreen, initGame } = useGameStore();
  const [playerName, setPlayerName] = useState('');
  const [playerCount, setPlayerCount] = useState(3);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  const handleStart = () => {
    const name = playerName.trim() || 'プレイヤー1';
    initGame(name, playerCount, difficulty);
  };

  const difficultyOptions: { value: Difficulty; label: string; desc: string; color: string }[] = [
    { value: 'easy', label: 'かんたん', desc: 'イベント少なめ', color: '#2ECC71' },
    { value: 'normal', label: 'ふつう', desc: '標準ルール', color: '#3498DB' },
    { value: 'hard', label: 'むずかしい', desc: 'イベント多め', color: '#E74C3C' },
  ];

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
        transition={{ duration: 0.4 }}
        className="parchment rounded-2xl p-6 w-full max-w-md"
      >
        {/* Back button */}
        <button
          onClick={() => setScreen('title')}
          className="flex items-center gap-1 text-amber-800 font-heading font-bold mb-4 hover:text-amber-600 transition-colors"
        >
          <ArrowLeft size={20} />
          もどる
        </button>

        <h2 className="font-heading text-2xl font-bold text-amber-900 text-center mb-6">
          🎮 ゲームをつくる
        </h2>

        {/* Player Name */}
        <div className="mb-5">
          <label className="block font-heading font-bold text-amber-800 mb-2 text-lg">
            なまえ
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="なまえを入れてね"
            maxLength={10}
            className="w-full px-4 py-3 rounded-xl border-3 border-amber-400 bg-white text-lg font-heading focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-300"
          />
        </div>

        {/* Player Count */}
        <div className="mb-5">
          <label className="block font-heading font-bold text-amber-800 mb-2 text-lg">
            にんずう
          </label>
          <div className="flex gap-2">
            {[3, 4, 5, 6].map(n => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className={`flex-1 py-3 rounded-xl font-heading font-bold text-xl transition-all ${
                  playerCount === n
                    ? 'bg-amber-500 text-white shadow-lg scale-105 border-3 border-amber-700'
                    : 'bg-white text-amber-800 border-3 border-amber-300 hover:border-amber-500'
                }`}
              >
                {n}人
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="mb-6">
          <label className="block font-heading font-bold text-amber-800 mb-2 text-lg">
            むずかしさ
          </label>
          <div className="flex gap-2">
            {difficultyOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDifficulty(opt.value)}
                className={`flex-1 py-3 px-2 rounded-xl font-heading font-bold transition-all ${
                  difficulty === opt.value
                    ? 'text-white shadow-lg scale-105 border-3'
                    : 'bg-white text-amber-800 border-3 border-amber-300 hover:border-amber-500'
                }`}
                style={
                  difficulty === opt.value
                    ? { backgroundColor: opt.color, borderColor: opt.color }
                    : undefined
                }
              >
                <div className="text-sm sm:text-base">{opt.label}</div>
                <div className="text-xs mt-0.5 opacity-80">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="game-btn-primary w-full text-xl py-4 rounded-2xl"
        >
          ⚓ ぼうけんに出発！
        </button>
      </motion.div>
    </div>
  );
}
