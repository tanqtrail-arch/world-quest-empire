/*
 * EventPopup - イベントカードポップアップ
 * Design: 画面中央にカードがフリップして登場
 * - カード名、アイコン、説明、効果、OKボタン
 * - 赤系=トラブル、緑系=ボーナス
 */
import { useGameStore } from '@/lib/gameStore';
import { RESOURCE_INFO, type ResourceType } from '@/lib/gameTypes';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const PARCHMENT_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663286960690/RthryRhRZNJvzXLKUFJiBd/parchment-card-JgM7UV3guuMN7UhEzpwdRd.webp';

export default function EventPopup() {
  const { currentEvent, phase, resolveEvent, selectResourceForEvent } = useGameStore();
  const [selectingResource, setSelectingResource] = useState(false);

  if (!currentEvent || phase !== 'event') return null;

  const isPositive = currentEvent.category === 'positive';
  const borderColor = isPositive ? '#27AE60' : '#E74C3C';
  const bgGradient = isPositive
    ? 'linear-gradient(135deg, #E8F8F5, #D5F5E3)'
    : 'linear-gradient(135deg, #FDEDEC, #F5B7B1)';

  const handleOK = () => {
    if (currentEvent.effectType === 'gain_resources' && currentEvent.effectValue > 0) {
      setSelectingResource(true);
    } else {
      resolveEvent();
    }
  };

  const handleSelectResource = (res: ResourceType) => {
    selectResourceForEvent(res);
    // Check if more selections needed
    if (currentEvent.effectValue <= 1) {
      setSelectingResource(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ background: 'rgba(0,0,0,0.6)' }}
      >
        <motion.div
          initial={{ scale: 0, rotateY: 180 }}
          animate={{ scale: 1, rotateY: 0 }}
          exit={{ scale: 0, rotateY: -180 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: bgGradient,
            border: `4px solid ${borderColor}`,
            boxShadow: `0 0 30px ${borderColor}40, 0 8px 32px rgba(0,0,0,0.3)`,
          }}
        >
          {/* Header */}
          <div
            className="py-3 px-4 text-center"
            style={{
              background: isPositive
                ? 'linear-gradient(180deg, #27AE60, #1E8449)'
                : 'linear-gradient(180deg, #E74C3C, #C0392B)',
            }}
          >
            <h3 className="font-heading text-xl font-bold text-white drop-shadow-md">
              {isPositive ? '✨ ボーナス！' : '⚠️ トラブル発生！'}
            </h3>
          </div>

          {/* Card Content */}
          <div className="p-5 text-center">
            {/* Icon */}
            <div className="text-5xl mb-3 bounce-in">{currentEvent.icon}</div>

            {/* Title */}
            <h4 className="font-heading text-2xl font-bold mb-2"
              style={{ color: isPositive ? '#1E8449' : '#922B21' }}
            >
              {currentEvent.title}
            </h4>

            {/* Description */}
            <p className="text-lg leading-relaxed mb-4"
              style={{ color: isPositive ? '#27AE60' : '#C0392B' }}
            >
              {currentEvent.description}
            </p>

            {/* Resource Selection */}
            {selectingResource && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-4"
              >
                <p className="font-heading font-bold text-amber-900 mb-2">
                  好きな資源を選ぼう！（あと{currentEvent.effectValue}つ）
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(['rubber', 'oil', 'gold', 'food'] as ResourceType[]).map(res => {
                    const info = RESOURCE_INFO[res];
                    return (
                      <button
                        key={res}
                        onClick={() => handleSelectResource(res)}
                        className="p-3 rounded-xl font-heading font-bold text-white text-lg transition-all hover:scale-105 active:scale-95"
                        style={{
                          background: `linear-gradient(180deg, ${info.color}CC, ${info.color})`,
                          border: `2px solid ${info.color}`,
                          boxShadow: `0 3px 0 ${info.color}AA`,
                        }}
                      >
                        {info.icon} {info.name}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* OK Button */}
            {!selectingResource && (
              <button
                onClick={handleOK}
                className={`w-full text-xl py-3 rounded-xl font-heading font-bold text-white transition-all active:scale-95 ${
                  isPositive ? 'game-btn-primary' : 'game-btn-danger'
                }`}
              >
                OK
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
