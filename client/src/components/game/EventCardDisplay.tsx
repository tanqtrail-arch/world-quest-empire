import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EventCard } from '@/lib/gameTypes';
import { useGameStore } from '@/lib/gameStore';

// =============================================
// EventCardDisplay - 3Dフリップ演出付きカード表示
// =============================================

interface EventCardDisplayProps {
  card: EventCard | null;
  onDismiss?: () => void;
  autoFlipDelay?: number;
}

const categoryColors = {
  negative: {
    bg: 'from-red-900 to-red-700',
    border: 'border-red-500',
    glow: 'shadow-red-500/50',
    accent: 'text-red-300',
    effectBg: 'bg-red-950/60',
    iconBg: 'bg-red-800/80',
  },
  positive: {
    bg: 'from-emerald-900 to-emerald-700',
    border: 'border-emerald-500',
    glow: 'shadow-emerald-500/50',
    accent: 'text-emerald-300',
    effectBg: 'bg-emerald-950/60',
    iconBg: 'bg-emerald-800/80',
  },
  special: {
    bg: 'from-purple-900 to-purple-700',
    border: 'border-purple-500',
    glow: 'shadow-purple-500/50',
    accent: 'text-purple-300',
    effectBg: 'bg-purple-950/60',
    iconBg: 'bg-purple-800/80',
  },
};

// Sparkle particle for positive cards
function Sparkles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 bg-yellow-300 rounded-full"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
            y: [0, -20 - Math.random() * 30],
          }}
          transition={{
            duration: 1.5 + Math.random(),
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

// Lightning effect for negative cards
function Lightning() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: 0,
            width: '2px',
            height: '100%',
            background: `linear-gradient(to bottom, transparent, rgba(239,68,68,0.8), transparent)`,
          }}
          animate={{
            opacity: [0, 0.8, 0],
            scaleY: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 0.3,
            repeat: Infinity,
            delay: 1 + Math.random() * 3,
            repeatDelay: 2 + Math.random() * 3,
          }}
        />
      ))}
    </div>
  );
}

// Purple aura for special cards
function PurpleAura() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.3) 0%, transparent 70%)',
        }}
        animate={{
          opacity: [0.3, 0.7, 0.3],
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: 'rgba(168,85,247,0.6)',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0, 0.8, 0],
            scale: [0, 2, 0],
          }}
          transition={{
            duration: 2 + Math.random(),
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}

// Card back design
function CardBack() {
  return (
    <div
      className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center"
      style={{
        backfaceVisibility: 'hidden',
        background: 'linear-gradient(135deg, #3e2723 0%, #5d4037 30%, #4e342e 60%, #3e2723 100%)',
        border: '3px solid #8d6e63',
      }}
    >
      {/* Decorative border pattern */}
      <div className="absolute inset-3 rounded-xl border-2 border-amber-800/50" />
      <div className="absolute inset-5 rounded-lg border border-amber-900/30" />

      {/* Center ornament */}
      <motion.div
        className="text-6xl mb-3"
        animate={{ rotateY: [0, 360] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      >
        ❓
      </motion.div>
      <div className="text-amber-200/80 text-lg font-bold tracking-widest">
        運命のカード
      </div>
      <div className="text-amber-300/40 text-xs mt-1 tracking-wider">
        FATE CARD
      </div>

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 text-amber-700/50 text-xl">⚜</div>
      <div className="absolute top-4 right-4 text-amber-700/50 text-xl">⚜</div>
      <div className="absolute bottom-4 left-4 text-amber-700/50 text-xl">⚜</div>
      <div className="absolute bottom-4 right-4 text-amber-700/50 text-xl">⚜</div>
    </div>
  );
}

// Card front design
function CardFront({ card }: { card: EventCard }) {
  const colors = categoryColors[card.category];

  return (
    <div
      className={`absolute inset-0 rounded-2xl flex flex-col border-2 ${colors.border} overflow-hidden`}
      style={{
        backfaceVisibility: 'hidden',
        transform: 'rotateY(180deg)',
      }}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-b ${colors.bg}`} />

      {/* Effects layer */}
      {card.category === 'positive' && <Sparkles />}
      {card.category === 'negative' && <Lightning />}
      {card.category === 'special' && <PurpleAura />}

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-4">
        {/* Category badge */}
        <div className="flex justify-between items-start mb-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${colors.effectBg} ${colors.accent} font-bold uppercase tracking-wider`}>
            {card.category === 'negative' ? 'ネガティブ' : card.category === 'positive' ? 'ポジティブ' : '特殊'}
          </span>
          {card.duration && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
              {card.duration}ターン
            </span>
          )}
        </div>

        {/* Icon */}
        <motion.div
          className={`w-16 h-16 mx-auto rounded-2xl ${colors.iconBg} flex items-center justify-center mb-3`}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-4xl">{card.icon}</span>
        </motion.div>

        {/* Title */}
        <h3 className="text-white text-lg font-bold text-center mb-2 drop-shadow-lg">
          {card.title}
        </h3>

        {/* Description */}
        <div className={`${colors.effectBg} rounded-xl p-3 mb-3`}>
          <p className="text-white/90 text-sm text-center leading-relaxed">
            {card.description}
          </p>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Learning point */}
        <div className="bg-black/30 rounded-lg p-2.5 backdrop-blur-sm">
          <div className="flex items-start gap-1.5">
            <span className="text-yellow-400 text-xs mt-0.5 shrink-0">📖</span>
            <p className="text-white/70 text-[11px] leading-relaxed">
              {card.learningPoint}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventCardDisplay({
  card,
  onDismiss,
  autoFlipDelay = 600,
}: EventCardDisplayProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (card) {
      setIsFlipped(false);
      setIsVisible(true);
      const timer = setTimeout(() => setIsFlipped(true), autoFlipDelay);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setIsFlipped(false);
    }
  }, [card, autoFlipDelay]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  }, [onDismiss]);

  if (!card) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleDismiss}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Card container */}
          <motion.div
            className="relative"
            style={{ perspective: '1200px' }}
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: 50, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            {/* Outer glow */}
            <div
              className={`absolute -inset-4 rounded-3xl blur-xl opacity-30 ${
                card.category === 'negative'
                  ? 'bg-red-500'
                  : card.category === 'positive'
                  ? 'bg-emerald-500'
                  : 'bg-purple-500'
              }`}
            />

            {/* Flip container */}
            <motion.div
              className="relative w-64 h-96"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <CardBack />
              <CardFront card={card} />
            </motion.div>

            {/* Dismiss button (shown after flip) */}
            <AnimatePresence>
              {isFlipped && (
                <motion.button
                  className="absolute -bottom-14 left-1/2 -translate-x-1/2 px-6 py-2 bg-white/20 hover:bg-white/30 text-white text-sm rounded-full backdrop-blur-sm border border-white/20 transition-colors cursor-pointer"
                  onClick={handleDismiss}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  OK
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =============================================
// CardPickerView - 5枚から1枚選ぶUI
// =============================================

const categoryColors_picker = categoryColors;

function MiniCard({ card, index, onSelect }: { card: EventCard; index: number; onSelect: (c: EventCard) => void }) {
  const colors = categoryColors_picker[card.category];
  return (
    <motion.button
      initial={{ y: 40, opacity: 0, rotateY: 180 }}
      animate={{ y: 0, opacity: 1, rotateY: 0 }}
      transition={{ delay: 0.15 * index, type: 'spring', stiffness: 250, damping: 20 }}
      whileTap={{ scale: 0.92 }}
      onClick={() => onSelect(card)}
      className={`relative flex flex-col items-center rounded-xl border-2 ${colors.border} overflow-hidden shadow-lg active:shadow-md transition-shadow`}
      style={{ width: 110, minHeight: 150 }}
    >
      <div className={`absolute inset-0 bg-gradient-to-b ${colors.bg}`} />
      <div className="relative z-10 flex flex-col items-center p-2 h-full">
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${colors.effectBg} ${colors.accent} font-bold mb-1`}>
          {card.category === 'negative' ? '⚠️' : card.category === 'positive' ? '✨' : '🔮'}
        </span>
        <span className="text-3xl mb-1">{card.icon}</span>
        <span className="text-white text-[11px] font-bold text-center leading-tight line-clamp-2">
          {card.title}
        </span>
        <div className="flex-1" />
        <span className="text-white/40 text-[9px] mt-1">タップで選択</span>
      </div>
    </motion.button>
  );
}

export function CardPickerView() {
  const cardPickerMode = useGameStore(s => s.cardPickerMode);
  const cardPickerSelect = useGameStore(s => s.cardPickerSelect);
  const cardPickerRedraw = useGameStore(s => s.cardPickerRedraw);
  const cardPickerSkip = useGameStore(s => s.cardPickerSkip);

  if (!cardPickerMode) return null;

  const { cards, canRedraw } = cardPickerMode;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto py-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-none" />

        <div
          className="relative z-10 flex flex-col items-center gap-4 px-3 max-w-lg w-full overflow-y-auto"
          style={{ maxHeight: '90vh', WebkitOverflowScrolling: 'touch' }}
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center"
          >
            <div className="text-4xl mb-1">🃏</div>
            <h2 className="text-white font-bold text-lg drop-shadow">運命のカードを選べ！</h2>
            <p className="text-white/60 text-xs">5枚の中から1枚を選ぼう</p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-2">
            {cards.map((card, i) => (
              <MiniCard key={card.id} card={card} index={i} onSelect={cardPickerSelect} />
            ))}
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex gap-3"
          >
            {canRedraw && (
              <button
                onClick={cardPickerRedraw}
                className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-bold active:scale-95 transition-transform"
              >
                🔄 引き直す（1回）
              </button>
            )}
            <button
              onClick={cardPickerSkip}
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white/60 text-sm font-bold active:scale-95 transition-transform"
            >
              スキップ
            </button>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
