/*
 * ActionMenu - 行動メニュー
 * Design: 画面下部の大きなアクションボタン群
 * - 建設する → タイルをタップして場所を選ぶ
 * - 交換する → 資源交換パネル
 * - ターン終了
 */
import { useGameStore } from '@/lib/gameStore';
import { BUILD_COSTS, RESOURCE_INFO, type ResourceType } from '@/lib/gameTypes';
import { canAfford } from '@/lib/gameLogic';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Hammer, Ship, ArrowRightLeft, SkipForward, X } from 'lucide-react';

export default function ActionMenu() {
  const { phase, players, currentPlayerIndex, doEndTurn, tiles, buildMode, setBuildMode, clearSelection } = useGameStore();
  const [showBuild, setShowBuild] = useState(false);
  const [showTrade, setShowTrade] = useState(false);

  const player = players[currentPlayerIndex];
  if (!player || phase !== 'action') return null;

  const canBuildSettlement = canAfford(player, BUILD_COSTS.settlement);
  const canBuildCity = canAfford(player, BUILD_COSTS.city);
  const canBuildShip = canAfford(player, BUILD_COSTS.ship);

  // Check if there are tiles to upgrade
  const hasUpgradableTiles = tiles.some(t =>
    t.structures.some(s => s.playerId === player.id && s.type === 'settlement')
  );

  const handleSelectBuildType = (type: 'settlement' | 'city' | 'ship') => {
    setBuildMode(type);
    setShowBuild(false);
  };

  const handleCancelBuild = () => {
    clearSelection();
    setShowBuild(false);
  };

  return (
    <div className="px-2 pb-2">
      {/* Build Mode Active Indicator */}
      <AnimatePresence>
        {buildMode && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="parchment rounded-xl p-3 mb-2 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {buildMode === 'settlement' ? '🏠' : buildMode === 'city' ? '🏰' : '⛵'}
              </span>
              <div>
                <div className="font-heading font-bold text-amber-900 text-sm">
                  {buildMode === 'settlement' ? '拠点を建てる場所を選ぼう！' :
                   buildMode === 'city' ? 'アップグレードする拠点を選ぼう！' :
                   '船を置く場所を選ぼう！'}
                </div>
                <div className="text-xs text-amber-700">
                  光っているタイルをタップしてね
                </div>
              </div>
            </div>
            <button
              onClick={handleCancelBuild}
              className="bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Build Type Selection */}
      <AnimatePresence>
        {showBuild && !buildMode && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="parchment rounded-xl p-3 mb-2"
          >
            <h3 className="font-heading font-bold text-amber-900 text-center mb-2">
              なにを建てる？
            </h3>
            <div className="flex flex-col gap-2">
              <BuildOption
                label="🏠 拠点"
                cost="ゴム1・食料1・金1・石油1"
                points="+1点"
                enabled={canBuildSettlement}
                description="タイルに拠点を建てると、サイコロの出目が合うとき資源がもらえるよ！"
                onClick={() => handleSelectBuildType('settlement')}
              />
              <BuildOption
                label="🏰 都市"
                cost="石油2・金2・食料1"
                points="+2点"
                enabled={canBuildCity && hasUpgradableTiles}
                description="拠点を都市にすると、資源が2倍もらえるよ！"
                onClick={() => handleSelectBuildType('city')}
              />
              <BuildOption
                label="⛵ 船"
                cost="ゴム1・石油1"
                points="進出用"
                enabled={canBuildShip}
                description="海に船を出して、新しい土地に進出しよう！"
                onClick={() => handleSelectBuildType('ship')}
              />
              <button
                onClick={() => setShowBuild(false)}
                className="text-amber-700 font-heading font-bold text-sm py-1"
              >
                やめる
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trade Panel */}
      <AnimatePresence>
        {showTrade && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="parchment rounded-xl p-3 mb-2"
          >
            <h3 className="font-heading font-bold text-amber-900 text-center mb-2">
              交換する（3つ → 1つ）
            </h3>
            <TradePanel onClose={() => setShowTrade(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      {!buildMode && (
        <div className="flex gap-1.5">
          <ActionButton
            icon={<Hammer size={18} />}
            label="建設する"
            color="#27AE60"
            onClick={() => { setShowBuild(!showBuild); setShowTrade(false); }}
            active={showBuild}
          />
          <ActionButton
            icon={<ArrowRightLeft size={18} />}
            label="交換する"
            color="#F39C12"
            onClick={() => { setShowTrade(!showTrade); setShowBuild(false); }}
            active={showTrade}
          />
          <ActionButton
            icon={<SkipForward size={18} />}
            label="ターン終了"
            color="#E74C3C"
            onClick={doEndTurn}
          />
        </div>
      )}
    </div>
  );
}

function ActionButton({ icon, label, color, onClick, active }: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl font-heading font-bold text-white text-xs transition-all"
      style={{
        background: active
          ? `linear-gradient(180deg, ${color}, ${color}DD)`
          : `linear-gradient(180deg, ${color}CC, ${color})`,
        border: `2px solid ${color}`,
        boxShadow: active
          ? `0 0 12px ${color}80, inset 0 2px 4px rgba(255,255,255,0.2)`
          : `0 2px 0 ${color}AA, 0 3px 6px rgba(0,0,0,0.2)`,
      }}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  );
}

function BuildOption({ label, cost, points, enabled, description, onClick }: {
  label: string;
  cost: string;
  points: string;
  enabled: boolean;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={`flex items-center justify-between p-2.5 rounded-lg transition-all text-left ${
        enabled
          ? 'bg-white hover:bg-amber-50 border-2 border-amber-400 active:scale-[0.98]'
          : 'bg-gray-100 border-2 border-gray-300 opacity-50'
      }`}
    >
      <div className="flex-1">
        <div className="font-heading font-bold text-amber-900">{label}</div>
        <div className="text-xs text-amber-700">{cost}</div>
        <div className="text-xs text-amber-600 mt-0.5">{description}</div>
      </div>
      <div className="font-score font-bold text-amber-600 text-sm ml-2 shrink-0">{points}</div>
    </button>
  );
}

function TradePanel({ onClose }: { onClose: () => void }) {
  const { players, currentPlayerIndex, doTrade } = useGameStore();
  const player = players[currentPlayerIndex];
  const resources: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
  const [giveRes, setGiveRes] = useState<ResourceType | null>(null);

  if (!player) return null;

  if (!giveRes) {
    return (
      <div>
        <p className="text-amber-800 text-sm text-center mb-2">
          どの資源を3つ出す？
        </p>
        <div className="grid grid-cols-2 gap-2">
          {resources.map(res => {
            const info = RESOURCE_INFO[res];
            const hasEnough = player.resources[res] >= 3;
            return (
              <button
                key={res}
                disabled={!hasEnough}
                onClick={() => setGiveRes(res)}
                className={`p-2 rounded-lg font-heading font-bold text-sm ${
                  hasEnough
                    ? 'bg-white border-2 border-amber-400 text-amber-900 active:scale-95'
                    : 'bg-gray-100 border-2 border-gray-300 text-gray-400'
                }`}
              >
                {info.icon} {info.name} ({player.resources[res]})
              </button>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="w-full text-amber-700 font-heading font-bold text-sm py-1 mt-2"
        >
          やめる
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-amber-800 text-sm text-center mb-2">
        {RESOURCE_INFO[giveRes].icon} {RESOURCE_INFO[giveRes].name}3つで何がほしい？
      </p>
      <div className="grid grid-cols-2 gap-2">
        {resources.filter(r => r !== giveRes).map(res => {
          const info = RESOURCE_INFO[res];
          return (
            <button
              key={res}
              onClick={() => {
                doTrade(giveRes, res);
                setGiveRes(null);
                onClose();
              }}
              className="p-2 rounded-lg font-heading font-bold text-sm bg-white border-2 border-amber-400 text-amber-900 hover:bg-amber-50 active:scale-95"
            >
              {info.icon} {info.name}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => setGiveRes(null)}
        className="w-full text-amber-700 font-heading font-bold text-sm py-1 mt-2"
      >
        もどる
      </button>
    </div>
  );
}
