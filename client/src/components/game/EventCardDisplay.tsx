/*
 * EventCardDisplay - イベントカード描画コンポーネント
 * ============================================================
 * Style: ゲームのウッド＆パーチメント調デザインに合わせた演出
 *
 * 機能:
 * - カードめくり演出（裏面 → 表面の3Dフリップ）
 * - 裏面: ダークブラウン背景、❓マーク、「運命のカード」テキスト
 * - 表面: カテゴリで色分け（ネガティブ=赤系、ポジティブ=緑系、特殊=紫系）
 * - アイコン大きく表示、タイトル、説明文、学べることを小さく表示
 * - ポジティブ: 金色キラキラエフェクト
 * - ネガティブ: 赤い稲妻エフェクト
 * - 特殊: 紫のオーラエフェクト
 * - framer-motionでアニメーション
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EventCard, EventCategory } from '@/lib/gameTypes';
import { CATEGORY_INFO } from '@/lib/eventCards';

// =============================================
// Props
// =============================================

interface EventCardDisplayProps {
  /** 表示するカード */
  card: EventCard;
  /** OKボタン押下時のコールバック */
  onConfirm: () => void;
  /** カードが表示されているか */
  visible: boolean;
}

// =============================================
// カテゴリ別エフェクトコンポーネント
// =============================================

/** ポジティブ: 金色キラキラエフェクト */
function GoldenSparkles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{
            x: `${20 + Math.random() * 60}%`,
            y: `${20 + Math.random() * 60}%`,
            scale: 0,
            opacity: 0,
          }}
          animate={{
            scale: [0, 1.2, 0],
            opacity: [0, 1, 0],
            y: [`${20 + Math.random() * 60}%`, `${Math.random() * 30}%`],
          }}
          transition={{
            duration: 1.5 + Math.random() * 1,
            delay: 0.8 + Math.random() * 1.5,
            repeat: Infinity,
            repeatDelay: Math.random() * 2,
          }}
          style={{
            width: 6 + Math.random() * 8,
            height: 6 + Math.random() * 8,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <path
              d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
              fill="#FFD700"
              opacity={0.8}
            />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

/** ネガティブ: 赤い稲妻エフェクト */
function RedLightning() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {/* 画面端の赤いフラッシュ */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 0.15, 0, 0.1, 0],
        }}
        transition={{
          duration: 2,
          delay: 0.6,
          repeat: Infinity,
          repeatDelay: 3,
        }}
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(231, 76, 60, 0.3) 100%)',
        }}
      />
      {/* 稲妻SVG */}
      {[0, 1].map(i => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: i === 0 ? '10%' : '75%',
            top: '5%',
          }}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{
            opacity: [0, 1, 0.8, 0],
            scaleY: [0, 1, 1, 0],
          }}
          transition={{
            duration: 0.4,
            delay: 1 + i * 0.8,
            repeat: Infinity,
            repeatDelay: 4 + i,
          }}
        >
          <svg width="28" height="60" viewBox="0 0 28 60" fill="none">
            <path
              d="M16 0L0 28H12L8 60L28 24H14L16 0Z"
              fill="#E74C3C"
              opacity={0.7}
            />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

/** 特殊: 紫のオーラエフェクト */
function PurpleAura() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {/* 回転するオーラリング */}
      <motion.div
        className="absolute"
        style={{
          top: '50%',
          left: '50%',
          width: '120%',
          height: '120%',
          transform: 'translate(-50%, -50%)',
          background: 'conic-gradient(from 0deg, transparent, rgba(155, 89, 182, 0.15), transparent, rgba(155, 89, 182, 0.1), transparent)',
          borderRadius: '50%',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      {/* パルスするオーラ */}
      <motion.div
        className="absolute inset-0"
        animate={{
          boxShadow: [
            'inset 0 0 30px rgba(155, 89, 182, 0.1)',
            'inset 0 0 60px rgba(155, 89, 182, 0.2)',
            'inset 0 0 30px rgba(155, 89, 182, 0.1)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ borderRadius: '1rem' }}
      />
      {/* 浮遊する紫の粒子 */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 4 + Math.random() * 6,
            height: 4 + Math.random() * 6,
            background: `rgba(155, 89, 182, ${0.3 + Math.random() * 0.4})`,
            left: `${10 + Math.random() * 80}%`,
          }}
          initial={{ y: '110%', opacity: 0 }}
          animate={{
            y: [110, -20],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            delay: 1 + Math.random() * 3,
            repeat: Infinity,
            repeatDelay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}

// =============================================
// カード裏面
// =============================================

function CardBack() {
  return (
    <div
      className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(145deg, #5C3D2E 0%, #3E2723 40%, #4E342E 100%)',
        border: '4px solid #8D6E63',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.5)',
        backfaceVisibility: 'hidden',
      }}
    >
      {/* 装飾枠 */}
      <div
        className="absolute inset-3 rounded-xl"
        style={{
          border: '2px solid rgba(212, 172, 110, 0.3)',
          background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(212, 172, 110, 0.03) 10px, rgba(212, 172, 110, 0.03) 20px)',
        }}
      />

      {/* 中央の装飾 */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          rotate: [0, 2, -2, 0],
        }}
        transition={{ duration: 3, repeat: Infinity }}
        className="relative z-10"
      >
        <div className="text-7xl mb-4 drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 12px rgba(212, 172, 110, 0.5))' }}>
          ❓
        </div>
      </motion.div>

      <div className="relative z-10 text-center">
        <h3
          className="font-heading text-2xl font-bold tracking-wider"
          style={{
            color: '#D4AC6E',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          運命のカード
        </h3>
        <p
          className="text-sm mt-1 tracking-wide"
          style={{ color: 'rgba(212, 172, 110, 0.6)' }}
        >
          タップしてめくる
        </p>
      </div>

      {/* コーナー装飾 */}
      {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
        <div
          key={i}
          className={`absolute ${pos} w-6 h-6`}
          style={{
            borderTop: i < 2 ? '2px solid rgba(212, 172, 110, 0.4)' : 'none',
            borderBottom: i >= 2 ? '2px solid rgba(212, 172, 110, 0.4)' : 'none',
            borderLeft: i % 2 === 0 ? '2px solid rgba(212, 172, 110, 0.4)' : 'none',
            borderRight: i % 2 === 1 ? '2px solid rgba(212, 172, 110, 0.4)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

// =============================================
// カード表面
// =============================================

function CardFront({ card }: { card: EventCard }) {
  const catInfo = CATEGORY_INFO[card.category];

  return (
    <div
      className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: catInfo.bgGradient,
        border: `4px solid ${catInfo.borderColor}`,
        boxShadow: `0 0 30px ${catInfo.glowColor}, 0 8px 32px rgba(0,0,0,0.3)`,
        backfaceVisibility: 'hidden',
        transform: 'rotateY(180deg)',
      }}
    >
      {/* カテゴリ別エフェクト */}
      {card.category === 'positive' && <GoldenSparkles />}
      {card.category === 'negative' && <RedLightning />}
      {card.category === 'special' && <PurpleAura />}

      {/* ヘッダー */}
      <div
        className="py-3 px-4 text-center relative z-10"
        style={{ background: catInfo.headerGradient }}
      >
        <h3 className="font-heading text-lg font-bold text-white drop-shadow-md">
          {card.category === 'positive' && '✨ '}
          {card.category === 'negative' && '⚠️ '}
          {card.category === 'special' && '🌀 '}
          {catInfo.label}
        </h3>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 p-5 text-center relative z-10 flex flex-col justify-between">
        <div>
          {/* アイコン */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.6 }}
            className="text-6xl mb-3"
            style={{ filter: `drop-shadow(0 4px 8px ${catInfo.glowColor})` }}
          >
            {card.icon}
          </motion.div>

          {/* タイトル */}
          <motion.h4
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="font-heading text-2xl font-bold mb-2"
            style={{ color: catInfo.borderColor }}
          >
            {card.title}
          </motion.h4>

          {/* 説明文 */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-base leading-relaxed mb-3"
            style={{ color: catInfo.borderColor }}
          >
            {card.description}
          </motion.p>

          {/* 持続ターン表示 */}
          {card.duration && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.1 }}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold mb-2"
              style={{
                background: `${catInfo.color}20`,
                color: catInfo.borderColor,
                border: `1px solid ${catInfo.color}40`,
              }}
            >
              ⏱️ {card.duration}ターン持続
            </motion.div>
          )}
        </div>

        {/* 学べること */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-2 p-3 rounded-xl text-left"
          style={{
            background: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0 mt-0.5">📚</span>
            <div>
              <span className="text-xs font-bold block mb-0.5" style={{ color: catInfo.borderColor }}>
                学べること
              </span>
              <p className="text-xs leading-relaxed" style={{ color: '#5D4037' }}>
                {card.learningPoint}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// =============================================
// メインコンポーネント
// =============================================

export default function EventCardDisplay({ card, onConfirm, visible }: EventCardDisplayProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showButton, setShowButton] = useState(false);

  // カードが表示されたらリセット
  useEffect(() => {
    if (visible) {
      setIsFlipped(false);
      setShowButton(false);
    }
  }, [visible, card?.id]);

  const handleFlip = useCallback(() => {
    if (!isFlipped) {
      setIsFlipped(true);
      // フリップ完了後にボタンを表示
      setTimeout(() => setShowButton(true), 800);
    }
  }, [isFlipped]);

  const handleConfirm = useCallback(() => {
    setShowButton(false);
    // フェードアウト後にコールバック
    setTimeout(() => onConfirm(), 300);
  }, [onConfirm]);

  if (!visible || !card) return null;

  const catInfo = CATEGORY_INFO[card.category];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)' }}
        >
          {/* カード本体 */}
          <motion.div
            initial={{ scale: 0.3, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: -100, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="relative cursor-pointer"
            style={{
              width: 320,
              height: 460,
              perspective: 1000,
            }}
            onClick={handleFlip}
          >
            {/* 3Dフリップコンテナ */}
            <motion.div
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.7, type: 'spring', stiffness: 100, damping: 20 }}
              style={{
                width: '100%',
                height: '100%',
                transformStyle: 'preserve-3d',
                position: 'relative',
              }}
            >
              {/* 裏面 */}
              <CardBack />

              {/* 表面 */}
              <CardFront card={card} />
            </motion.div>
          </motion.div>

          {/* OKボタン */}
          <AnimatePresence>
            {showButton && (
              <motion.button
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onClick={handleConfirm}
                className="mt-5 px-10 py-3 rounded-xl font-heading text-xl font-bold text-white transition-all active:scale-95"
                style={{
                  background: catInfo.headerGradient,
                  border: `3px solid ${catInfo.borderColor}`,
                  boxShadow: `0 4px 0 ${catInfo.borderColor}, 0 6px 16px rgba(0,0,0,0.3)`,
                }}
              >
                OK
              </motion.button>
            )}
          </AnimatePresence>

          {/* フリップ前のヒント */}
          <AnimatePresence>
            {!isFlipped && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-4 text-white/60 text-sm font-heading"
              >
                カードをタップしてめくろう！
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =============================================
// カード一覧プレビュー用コンポーネント（開発用）
// =============================================

export function EventCardPreview({ card }: { card: EventCard }) {
  const catInfo = CATEGORY_INFO[card.category];

  return (
    <div
      className="rounded-xl overflow-hidden shadow-lg"
      style={{
        width: 200,
        background: catInfo.bgGradient,
        border: `3px solid ${catInfo.borderColor}`,
      }}
    >
      {/* ヘッダー */}
      <div
        className="py-1.5 px-2 text-center"
        style={{ background: catInfo.headerGradient }}
      >
        <span className="text-xs font-bold text-white">{catInfo.label}</span>
      </div>

      {/* コンテンツ */}
      <div className="p-3 text-center">
        <div className="text-3xl mb-1">{card.icon}</div>
        <h5
          className="font-heading text-sm font-bold mb-1"
          style={{ color: catInfo.borderColor }}
        >
          {card.title}
        </h5>
        <p className="text-xs leading-snug" style={{ color: catInfo.borderColor }}>
          {card.description}
        </p>
        {card.duration && (
          <span
            className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs"
            style={{
              background: `${catInfo.color}20`,
              color: catInfo.borderColor,
            }}
          >
            {card.duration}T
          </span>
        )}
      </div>
    </div>
  );
}
