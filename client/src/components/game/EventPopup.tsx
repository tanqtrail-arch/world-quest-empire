/*
 * EventPopup - イベントカードポップアップ + 資��選択UI
 * Design:
 *  - カード裏面「運命のカード」→タップでフリップ→表面にイベント内容
 *  - ポジティブ=金キラキラ、ネガティブ=赤稲妻
 *  - 効果プレビュー（before→after）を表示
 */
import { useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { RESOURCE_INFO, type ResourceType } from '@/lib/gameTypes';
import { motion, AnimatePresence } from 'framer-motion';

const resourceOrder: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];

/* ---- Mini confetti for positive events ---- */
function MiniConfetti() {
  const pieces = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.3,
    duration: 1.2 + Math.random() * 0.8,
    color: ['#FFD700', '#FFA500', '#FFE066', '#FFFACD', '#27AE60', '#3498DB'][i % 6],
    size: 4 + Math.random() * 8,
    rotate: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {pieces.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: '50%', x: `${p.x}%`, opacity: 1, rotate: 0, scale: 0 }}
          animate={{ y: '-20%', opacity: 0, rotate: p.rotate + 360, scale: 1 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
          className="absolute"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

/* ---- Red lightning bolts for negative events ---- */
function LightningEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0, 0.6, 0] }}
          transition={{ duration: 0.6, delay: i * 0.12 }}
          className="absolute text-6xl"
          style={{
            left: `${20 + i * 25}%`,
            top: `${15 + i * 10}%`,
            filter: 'drop-shadow(0 0 8px #E74C3C)',
          }}
        >
          ⚡
        </motion.div>
      ))}
      {/* Red flash overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0, 0.15, 0] }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 bg-red-500"
      />
    </div>
  );
}

/* ---- Resource Change Row ---- */
function ResourceChangeRow({ resource, before, after }: { resource: ResourceType; before: number; after: number }) {
  const info = RESOURCE_INFO[resource];
  const diff = after - before;
  const isLoss = diff < 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-sm font-bold ${
        isLoss ? 'bg-red-100 border border-red-300' : 'bg-emerald-100 border border-emerald-300'
      }`}
    >
      <span className="text-lg">{info.icon}</span>
      <span className={isLoss ? 'text-red-800' : 'text-emerald-800'}>{info.name}</span>
      <span className="text-gray-500 font-score text-lg">{before}</span>
      <span className={isLoss ? 'text-red-500' : 'text-emerald-500'}>→</span>
      <motion.span
        initial={{ scale: 1.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
        className={`font-score text-lg ${isLoss ? 'text-red-600' : 'text-emerald-600'}`}
      >
        {after}
      </motion.span>
      <span className={`text-xs ${isLoss ? 'text-red-500' : 'text-emerald-500'}`}>
        ({diff > 0 ? '+' : ''}{diff})
      </span>
    </motion.div>
  );
}

function ResourcePicker() {
  const { resourcePickMode, pickResource } = useGameStore();
  if (!resourcePickMode) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <motion.div
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 15 }}
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #E8F8F5, #D5F5E3)',
          border: '4px solid #27AE60',
        }}
      >
        <div
          className="py-3 px-4 text-center"
          style={{ background: 'linear-gradient(180deg, #27AE60, #1E8449)' }}
        >
          <h3 className="font-heading text-xl font-bold text-white drop-shadow-md">
            🎁 好き���資源を選ぼう！
          </h3>
        </div>

        <div className="p-5 text-center">
          <p className="text-emerald-800 font-heading font-bold text-lg mb-1">
            {resourcePickMode.eventTitle}
          </p>
          <p className="text-emerald-700 text-sm mb-4">
            あと <span className="text-2xl font-bold text-emerald-900">{resourcePickMode.remaining}</span> つ選べるよ！
          </p>

          <div className="grid grid-cols-2 gap-3">
            {resourceOrder.map(res => {
              const info = RESOURCE_INFO[res];
              return (
                <motion.button
                  key={res}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => pickResource(res)}
                  className="flex flex-col items-center gap-1 p-4 rounded-xl border-3 border-amber-400 bg-white hover:bg-amber-50 active:bg-amber-100 transition-colors shadow-md"
                >
                  <span className="text-4xl">{info.icon}</span>
                  <span className="font-heading font-bold text-amber-900 text-sm">{info.name}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---- Card Back (裏面) ---- */
function CardBack({ onFlip }: { onFlip: () => void }) {
  return (
    <div
      className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl cursor-pointer"
      style={{
        background: 'linear-gradient(145deg, #4A2C0A 0%, #2C1810 40%, #3D2415 70%, #1A0E08 100%)',
        border: '4px solid #8B6914',
        boxShadow: '0 0 30px rgba(139,105,20,0.4), 0 8px 32px rgba(0,0,0,0.5)',
      }}
      onClick={onFlip}
    >
      {/* Decorative border frame */}
      <div
        className="m-3 rounded-xl p-6 text-center relative"
        style={{
          border: '2px solid #8B691466',
          background: 'linear-gradient(180deg, rgba(139,105,20,0.1), transparent, rgba(139,105,20,0.1))',
        }}
      >
        {/* Corner ornaments */}
        <div className="absolute top-1 left-2 text-amber-700/40 text-lg">��</div>
        <div className="absolute top-1 right-2 text-amber-700/40 text-lg">✦</div>
        <div className="absolute bottom-1 left-2 text-amber-700/40 text-lg">✦</div>
        <div className="absolute bottom-1 right-2 text-amber-700/40 text-lg">✦</div>

        {/* Title */}
        <motion.div
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-amber-400/80 font-heading text-sm font-bold mb-4 tracking-widest"
        >
          ── 運命のカード ──
        </motion.div>

        {/* Big question mark */}
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            rotate: [0, 2, -2, 0],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-8xl mb-4"
          style={{ filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.5))' }}
        >
          ❓
        </motion.div>

        {/* Subtitle */}
        <div className="text-amber-500/70 text-xs mb-4">
          何が起きるかな…？
        </div>

        {/* Flip button */}
        <motion.button
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => { e.stopPropagation(); onFlip(); }}
          className="px-6 py-3 rounded-xl font-heading font-bold text-lg text-amber-900 transition-all"
          style={{
            background: 'linear-gradient(180deg, #FFD700, #DAA520)',
            border: '2px solid #B8860B',
            boxShadow: '0 4px 12px rgba(218,165,32,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}
        >
          🃏 カードをめくる！
        </motion.button>

        {/* Bottom ornament */}
        <div className="mt-3 text-amber-700/30 text-xs tracking-[0.3em]">
          ♠ ♦ ♣ ♥
        </div>
      </div>
    </div>
  );
}

/* ---- Card Front (表面) ---- */
function CardFront({ isPositive, currentEvent, preview, handleEvent }: {
  isPositive: boolean;
  currentEvent: { icon: string; title: string; description: string; category: string };
  preview: ReturnType<typeof useGameStore.getState>['eventEffectPreview'];
  handleEvent: () => void;
}) {
  return (
    <div
      className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
      style={{
        background: isPositive
          ? 'linear-gradient(135deg, #E8F8F5, #D5F5E3)'
          : 'linear-gradient(135deg, #FDEDEC, #F5B7B1)',
        border: `4px solid ${isPositive ? '#27AE60' : '#E74C3C'}`,
        boxShadow: `0 0 40px ${isPositive ? '#27AE6050' : '#E74C3C50'}, 0 8px 32px rgba(0,0,0,0.3)`,
      }}
    >
      {/* Reveal effects */}
      {isPositive ? <MiniConfetti /> : <LightningEffect />}

      {/* Header */}
      <div
        className="relative py-4 px-4 text-center z-20"
        style={{
          background: isPositive
            ? 'linear-gradient(180deg, #27AE60, #1E8449)'
            : 'linear-gradient(180deg, #E74C3C, #C0392B)',
        }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
          className="text-5xl mb-1"
        >
          {currentEvent.icon}
        </motion.div>
        <h3 className="font-heading text-2xl font-bold text-white drop-shadow-md">
          {currentEvent.title}
        </h3>
        <div className="text-white/80 text-xs mt-0.5">
          {isPositive ? '✨ ボーナスイベント！' : '⚠️ トラブル発生！'}
        </div>
      </div>

      {/* Body */}
      <motion.div
        animate={!isPositive ? { x: [0, -4, 4, -3, 3, -1, 1, 0] } : {}}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative z-20 p-5 text-center"
      >
        {/* Description */}
        <p className="text-base leading-relaxed mb-3"
          style={{ color: isPositive ? '#1E8449' : '#922B21' }}
        >
          {currentEvent.description}
        </p>

        {/* Effect result preview */}
        {preview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-4 space-y-2"
          >
            {/* Result description */}
            <div className={`text-lg font-heading font-bold py-2 px-3 rounded-xl ${
              isPositive
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {preview.description}
            </div>

            {/* Resource before→after arrows */}
            {preview.resourceChanges.length > 0 && (
              <div className="space-y-1.5">
                {preview.resourceChanges.map(ch => (
                  <ResourceChangeRow
                    key={ch.resource}
                    resource={ch.resource}
                    before={ch.before}
                    after={ch.after}
                  />
                ))}
              </div>
            )}

            {/* VP change */}
            {preview.vpBefore !== undefined && preview.vpAfter !== undefined && preview.vpBefore !== preview.vpAfter && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-sm font-bold bg-red-100 border border-red-300"
              >
                <span className="text-yellow-500 text-lg">★</span>
                <span className="text-red-800">勝利ポイント</span>
                <span className="text-gray-500 font-score text-lg">{preview.vpBefore}</span>
                <span className="text-red-500">→</span>
                <span className="font-score text-lg text-red-600">{preview.vpAfter}</span>
              </motion.div>
            )}

            {/* Choice indicator */}
            {preview.isChoice && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-emerald-600 font-heading"
              >
                OKを押して資源を選ぼう！
              </motion.div>
            )}
          </motion.div>
        )}

        {/* OK Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleEvent}
          className={`w-full text-xl py-3 rounded-xl font-heading font-bold text-white transition-all ${
            isPositive ? 'game-btn-primary' : 'game-btn-danger'
          }`}
        >
          {preview?.isChoice ? '資源を選ぶ！' : 'OK'}
        </motion.button>
      </motion.div>
    </div>
  );
}

export default function EventPopup() {
  const { resourcePickMode } = useGameStore();

  // The card-flip display is now handled by <EventCardDisplay />.
  // EventPopup only remains responsible for the ResourcePicker UI.
  if (resourcePickMode) {
    return <ResourcePicker />;
  }
  return null;
}
