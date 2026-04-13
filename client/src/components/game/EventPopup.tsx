/*
 * EventPopup - イベントカードポップアップ
 * Design: 画面中央にカードがフリップして登場
 * - カード名、アイコン、説明、効果、OKボタン
 * - 赤系=トラブル、緑系=ボーナス
 */
import { useGameStore } from '@/lib/gameStore';
import { RESOURCE_INFO, type ResourceType } from '@/lib/gameTypes';
import { motion, AnimatePresence } from 'framer-motion';

export default function EventPopup() {
  const resourcePickMode = useGameStore(s => s.resourcePickMode);

  // The card-flip display is now handled by <EventCardDisplay />.
  // EventPopup only remains responsible for the ResourcePicker UI.
  if (resourcePickMode) {
    return <ResourcePickerUI mode={resourcePickMode} />;
  }
  return null;
}

function ResourcePickerUI({ mode }: { mode: { remaining: number; eventTitle: string } }) {
  const handleEvent = useGameStore(s => s.handleEvent);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
        <h3 className="font-heading font-bold text-lg mb-2">{mode.eventTitle}</h3>
        <p className="text-sm text-gray-600 mb-4">
          好きな資源を選ぼう！（あと{mode.remaining}つ）
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(['rubber', 'oil', 'gold', 'food'] as ResourceType[]).map(res => {
            const info = RESOURCE_INFO[res];
            return (
              <button
                key={res}
                onClick={handleEvent}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-amber-400 bg-white hover:bg-amber-50 active:bg-amber-100 transition-colors shadow-md py-3"
              >
                <span className="text-2xl">{info.icon}</span>
                <span className="font-heading font-bold text-amber-900 text-sm">{info.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
