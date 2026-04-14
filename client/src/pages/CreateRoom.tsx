/*
 * CreateRoom - ルーム作成画面
 * Design: 木目パネル上にフォーム
 * - 各スロットでAI/人間を切り替え
 * - 国旗選択
 * - 難易度選択
 */
import { useState } from 'react';
import { useGameStore, AI_SPEED_INFO, type AISpeed } from '@/lib/gameStore';
import { PLAYER_COLORS, type Difficulty, type PlayerSlot } from '@/lib/gameTypes';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bot, User, Plus, Minus } from 'lucide-react';

const WOOD_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663286960690/RthryRhRZNJvzXLKUFJiBd/wood-texture-3bU4G8nuC3Js3NFmH6shph.webp';

const DEFAULT_SLOTS: PlayerSlot[] = [
  { type: 'human', name: '', countryIndex: 0 },
  { type: 'ai', name: '', countryIndex: 1 },
  { type: 'ai', name: '', countryIndex: 2 },
];

export default function CreateRoom() {
  const { setScreen, initGame } = useGameStore();
  const aiSpeed = useGameStore(s => s.aiSpeed);
  const setAiSpeed = useGameStore(s => s.setAiSpeed);
  const [slots, setSlots] = useState<PlayerSlot[]>(DEFAULT_SLOTS);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  const handleStart = () => {
    // Fill in default names
    const finalSlots = slots.map((slot, i) => ({
      ...slot,
      name: slot.name.trim() || (slot.type === 'ai' ? `AI ${PLAYER_COLORS[slot.countryIndex].countryName}` : `プレイヤー${i + 1}`),
    }));
    initGame(finalSlots, difficulty);
  };

  const toggleSlotType = (index: number) => {
    if (index === 0) return; // First slot is always human
    setSlots(prev => prev.map((s, i) =>
      i === index ? { ...s, type: s.type === 'ai' ? 'human' : 'ai' } : s
    ));
  };

  const updateSlotName = (index: number, name: string) => {
    setSlots(prev => prev.map((s, i) =>
      i === index ? { ...s, name } : s
    ));
  };

  const updateSlotCountry = (index: number, countryIndex: number) => {
    // Check if this country is already taken
    const taken = slots.some((s, i) => i !== index && s.countryIndex === countryIndex);
    if (taken) return;
    setSlots(prev => prev.map((s, i) =>
      i === index ? { ...s, countryIndex } : s
    ));
  };

  const addSlot = () => {
    if (slots.length >= 6) return;
    // Find first available country
    const usedIndices = new Set(slots.map(s => s.countryIndex));
    const nextCountry = PLAYER_COLORS.findIndex((_, i) => !usedIndices.has(i));
    if (nextCountry === -1) return;
    setSlots(prev => [...prev, { type: 'ai', name: '', countryIndex: nextCountry }]);
  };

  const removeSlot = () => {
    if (slots.length <= 2) return;
    setSlots(prev => prev.slice(0, -1));
  };

  const difficultyOptions: { value: Difficulty; label: string; desc: string; color: string }[] = [
    { value: 'easy', label: 'かんたん', desc: 'イベント少なめ', color: '#2ECC71' },
    { value: 'normal', label: 'ふつう', desc: '標準ルール', color: '#3498DB' },
    { value: 'hard', label: 'むずかしい', desc: 'イベント多め', color: '#E74C3C' },
  ];

  const usedCountries = new Set(slots.map(s => s.countryIndex));

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start p-4 pt-8 overflow-auto"
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

        {/* Player Slots */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="font-heading font-bold text-amber-800 text-base">
              🏴 プレイヤー ({slots.length}人)
            </label>
            <div className="flex gap-1">
              <button
                onClick={removeSlot}
                disabled={slots.length <= 2}
                className="w-8 h-8 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center disabled:opacity-30 hover:bg-amber-300 transition-colors"
              >
                <Minus size={16} />
              </button>
              <button
                onClick={addSlot}
                disabled={slots.length >= 6}
                className="w-8 h-8 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center disabled:opacity-30 hover:bg-amber-300 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <AnimatePresence>
              {slots.map((slot, i) => {
                const country = PLAYER_COLORS[slot.countryIndex];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-xl border-2 border-amber-300 bg-white/80 p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {/* Player number */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ backgroundColor: country.color }}
                      >
                        {i + 1}
                      </div>

                      {/* Name input */}
                      <input
                        type="text"
                        value={slot.name}
                        onChange={(e) => updateSlotName(i, e.target.value)}
                        placeholder={slot.type === 'ai' ? `AI ${country.countryName}` : 'なまえ'}
                        maxLength={10}
                        className="flex-1 px-3 py-1.5 rounded-lg border-2 border-amber-200 bg-white text-sm font-heading focus:outline-none focus:border-amber-500"
                      />

                      {/* AI/Human toggle */}
                      <button
                        onClick={() => toggleSlotType(i)}
                        disabled={i === 0}
                        className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg font-heading font-bold text-xs transition-all ${
                          slot.type === 'human'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                        } ${i === 0 ? 'opacity-70' : 'hover:scale-105'}`}
                      >
                        {slot.type === 'human' ? (
                          <><User size={14} /> 人間</>
                        ) : (
                          <><Bot size={14} /> AI</>
                        )}
                      </button>
                    </div>

                    {/* Country selection */}
                    <div className="flex gap-1.5 flex-wrap">
                      {PLAYER_COLORS.map((c, ci) => {
                        const isTaken = usedCountries.has(ci) && slot.countryIndex !== ci;
                        return (
                          <button
                            key={ci}
                            onClick={() => updateSlotCountry(i, ci)}
                            disabled={isTaken}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                              slot.countryIndex === ci
                                ? 'text-white shadow-md scale-105 ring-2 ring-offset-1'
                                : isTaken
                                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                  : 'bg-white text-amber-800 border border-amber-200 hover:border-amber-400'
                            }`}
                            style={
                              slot.countryIndex === ci
                                ? { backgroundColor: c.color, borderColor: c.color }
                                : undefined
                            }
                          >
                            <span className="text-base">{c.flagEmoji}</span>
                            <span className="hidden sm:inline">{c.countryName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
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

        {/* AI Speed */}
        <div className="mb-5">
          <label className="block font-heading font-bold text-amber-800 mb-1.5 text-base">
            🤖 AIの速さ
          </label>
          <div className="flex gap-2">
            {(['slow', 'normal', 'fast'] as AISpeed[]).map(sp => {
              const info = AI_SPEED_INFO[sp];
              const active = aiSpeed === sp;
              return (
                <button
                  key={sp}
                  onClick={() => setAiSpeed(sp)}
                  className={`flex-1 py-2.5 px-2 rounded-xl font-heading font-bold transition-all ${
                    active
                      ? 'bg-amber-500 text-white shadow-lg scale-105 border-3 border-amber-500'
                      : 'bg-white text-amber-800 border-3 border-amber-300 hover:border-amber-500'
                  }`}
                >
                  <div className="text-xl leading-none">{info.icon}</div>
                  <div className="text-xs mt-1">{info.label}</div>
                </button>
              );
            })}
          </div>
          <p className="text-amber-700/70 text-xs mt-1.5">プレイ中も画面右上から変更できます</p>
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
