/*
 * EventPopup - イベントカードポップアップ + 資源選択UI
 */
import { useGameStore } from '@/lib/gameStore';
import { RESOURCE_INFO, type ResourceType } from '@/lib/gameTypes';
import { motion, AnimatePresence } from 'framer-motion';

const resourceOrder: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];

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
            🎁 好きな資源を選ぼう！
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

export default function EventPopup() {
  const { currentEvent, phase, handleEvent, resourcePickMode } = useGameStore();

  // Show resource picker if active
  if (resourcePickMode) {
    return <ResourcePicker />;
  }

  if (!currentEvent || phase !== 'event') return null;

  const isPositive = currentEvent.category === 'positive';
  const bgGradient = isPositive
    ? 'linear-gradient(135deg, #E8F8F5, #D5F5E3)'
    : 'linear-gradient(135deg, #FDEDEC, #F5B7B1)';

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
            border: `4px solid ${isPositive ? '#27AE60' : '#E74C3C'}`,
            boxShadow: `0 0 30px ${isPositive ? '#27AE6040' : '#E74C3C40'}, 0 8px 32px rgba(0,0,0,0.3)`,
          }}
        >
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

          <div className="p-5 text-center">
            <div className="text-5xl mb-3">{currentEvent.icon}</div>
            <h4 className="font-heading text-2xl font-bold mb-2"
              style={{ color: isPositive ? '#1E8449' : '#922B21' }}
            >
              {currentEvent.title}
            </h4>
            <p className="text-lg leading-relaxed mb-4"
              style={{ color: isPositive ? '#27AE60' : '#C0392B' }}
            >
              {currentEvent.description}
            </p>
            <button
              onClick={handleEvent}
              className={`w-full text-xl py-3 rounded-xl font-heading font-bold text-white transition-all active:scale-95 ${
                isPositive ? 'game-btn-primary' : 'game-btn-danger'
              }`}
            >
              OK
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
