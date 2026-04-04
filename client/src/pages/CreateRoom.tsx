/*
 * CreateRoom - ルーム作成画面
 * Design: 木目パネル上にフォーム
 * - プレイヤー名入力
 * - 国旗選択（🇯🇵日本がデフォルト）
 * - プレイ人数選択
 * - 難易度選択
 * - ゲーム開始ボタン
 */
import { useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { PLAYER_COLORS, type Difficulty } from '@/lib/gameTypes';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const WOOD_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663286960690/RthryRhRZNJvzXLKUFJiBd/wood-texture-3bU4G8nuC3Js3NFmH6shph.webp';

export default function CreateRoom() {
  const { setScreen, initGame } = useGameStore();
  const [playerName, setPlayerName] = useState('');
  const [selectedCountryIndex, setSelectedCountryIndex] = useState(0); // Default: Japan
  const [playerCount, setPlayerCount] = useState(3);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  const handleStart = () => {
    const name = playerName.trim() || 'プレイヤー1';
    initGame(name, playerCount, difficulty, selectedCountryIndex);
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
        className="parchment rounded-2xl p-5 w-full max-w-md"
      >
        {/* Back button */}
        <button
          onClick={() => setScreen('title')}
          className="flex items-center gap-1 text-amber-800 font-heading font-bold mb-3 hover:text-amber-600 transition-colors"
        >
          <ArrowLeft size={20} />
          もどる
        </button>

        <h2 className="font-heading text-2xl font-bold text-amber-900 text-center mb-4">
          🎮 ゲームをつくる
        </h2>

        {/* Player Name */}
        <div className="mb-4">
          <label className="block font-heading font-bold text-amber-800 mb-1.5 text-base">
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

        {/* Country Selection */}
        <div className="mb-4">
          <label className="block font-heading font-bold text-amber-800 mb-1.5 text-base">
            🏴 くに
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PLAYER_COLORS.map((country, i) => (
              <button
                key={i}
                onClick={() => setSelectedCountryIndex(i)}
                className={`flex flex-col items-center py-2.5 px-2 rounded-xl font-heading font-bold transition-all ${
                  selectedCountryIndex === i
                    ? 'text-white shadow-lg scale-105 border-3 ring-2 ring-offset-1'
                    : 'bg-white text-amber-800 border-3 border-amber-300 hover:border-amber-500'
                }`}
                style={
                  selectedCountryIndex === i
                    ? {
                        backgroundColor: country.color,
                        borderColor: country.color,
                      }
                    : undefined
                }
              >
                <span className="text-2xl mb-0.5">{country.flagEmoji}</span>
                <span className="text-xs">{country.countryName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Player Count */}
        <div className="mb-4">
          <label className="block font-heading font-bold text-amber-800 mb-1.5 text-base">
            にんずう
          </label>
          <div className="flex gap-2">
            {[3, 4, 5, 6].map(n => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className={`flex-1 py-2.5 rounded-xl font-heading font-bold text-xl transition-all ${
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
        <div className="mb-5">
          <label className="block font-heading font-bold text-amber-800 mb-1.5 text-base">
            むずかしさ
          </label>
          <div className="flex gap-2">
            {difficultyOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDifficulty(opt.value)}
                className={`flex-1 py-2.5 px-2 rounded-xl font-heading font-bold transition-all ${
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
