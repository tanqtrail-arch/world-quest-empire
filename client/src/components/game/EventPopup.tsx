/*
 * EventPopup - イベントカードポップアップ
 * Design: 画面中央にカードがフリップして登場
 * - カード名、アイコン、説明、効果、OKボタン
 * - 赤系=トラブル、緑系=ボーナス
 */
import { useGameStore } from '@/lib/gameStore';
import { RESOURCE_INFO, type ResourceType } from '@/lib/gameTypes';
import { motion, AnimatePresence } from 'framer-motion';

const PARCHMENT_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663286960690/RthryRhRZNJvzXLKUFJiBd/parchment-card-JgM7UV3guuMN7UhEzpwdRd.webp';

export default function EventPopup() {
  const { resourcePickMode } = useGameStore();

  // The card-flip display is now handled by <EventCardDisplay />.
  // EventPopup only remains responsible for the ResourcePicker UI.
  if (resourcePickMode) {
    return <ResourcePicker />;
  }
  return null;
}
