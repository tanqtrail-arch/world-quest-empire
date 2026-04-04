/*
 * GameScreen - メインゲーム画面
 * Design: ポップ冒険RPGスタイル
 * Layout: 100dvh flex column with proper spacing
 * - 上部: 対戦相手情報バー
 * - 中央: ヘックスマップ + サイコロ（flex-1で残りスペースを使用）
 * - 下部: ゲームログ + プレイヤー情報 + アクションメニュー
 */
import HexMap from '@/components/game/HexMap';
import OpponentBar from '@/components/game/OpponentBar';
import PlayerPanel from '@/components/game/PlayerPanel';
import DiceRoller from '@/components/game/DiceRoller';
import ActionMenu from '@/components/game/ActionMenu';
import EventPopup from '@/components/game/EventPopup';
import GameLog from '@/components/game/GameLog';
import { useGameStore } from '@/lib/gameStore';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';

const BOARD_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663286960690/RthryRhRZNJvzXLKUFJiBd/game-board-bg-8s6c49wGQN8mc2Rzb2agwx.webp';

function TileHelpTooltip({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-12 right-2 z-40 parchment rounded-xl p-4 max-w-xs shadow-2xl"
    >
      <button onClick={onClose} className="absolute top-2 right-2 text-amber-700">
        <X size={16} />
      </button>
      <h3 className="font-heading font-bold text-amber-900 mb-2">🗺️ タイルの使い方</h3>
      <div className="text-amber-800 text-xs space-y-2 leading-relaxed">
        <p>
          <strong>🎲 サイコロの出目</strong>でタイルから資源がもらえるよ！
          各タイルには数字が書いてあって、サイコロの合計がその数字と同じなら、
          そのタイルに拠点がある人が資源をゲット！
        </p>
        <p>
          <strong>🏠 拠点を建てるには</strong>「建設する」→「拠点」を選んで、
          光っているタイルをタップしよう！
        </p>
        <p>
          <strong>🏰 都市にすると</strong>資源が2倍もらえるよ！
        </p>
        <div className="flex gap-1 flex-wrap mt-1">
          <span className="inline-block bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full">🌿ゴム</span>
          <span className="inline-block bg-slate-700 text-white text-[10px] px-2 py-0.5 rounded-full">🛢️石油</span>
          <span className="inline-block bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full">💰金</span>
          <span className="inline-block bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">🌾食料</span>
          <span className="inline-block bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full">🌊海</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function GameScreen() {
  const { phase } = useGameStore();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div
      className="relative overflow-hidden select-none"
      style={{
        height: '100dvh',
        backgroundImage: `url(${BOARD_BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />

      {/* Main Content Column */}
      <div className="relative z-10 flex flex-col" style={{ height: '100dvh' }}>
        {/* Top: Opponent Bar + Help Button */}
        <div className="shrink-0 relative">
          <OpponentBar />
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm rounded-full p-1.5 text-white hover:bg-white/30 transition-colors"
          >
            <HelpCircle size={18} />
          </button>
          <AnimatePresence>
            {showHelp && <TileHelpTooltip onClose={() => setShowHelp(false)} />}
          </AnimatePresence>
        </div>

        {/* Middle: Map + Dice (takes remaining space) */}
        <div className="flex-1 flex flex-col items-center justify-center gap-1 px-2 overflow-hidden">
          <HexMap />
          <DiceRoller />
        </div>

        {/* Bottom Section: Log + Player + Actions */}
        <div className="shrink-0 flex flex-col gap-1 pb-1">
          {/* Game Log */}
          <GameLog />

          {/* Player Panel */}
          <PlayerPanel />

          {/* Action Menu */}
          <ActionMenu />
        </div>
      </div>

      {/* Event Popup Overlay */}
      <EventPopup />
    </div>
  );
}
