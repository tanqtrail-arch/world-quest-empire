/*
 * ActionMenu - 行動メニュー
 * Design: 画面下部の大きなアクションボタン群
 * - 建設する、進出する、交換する、カード確認、ターン終了
 */
import { useGameStore } from '@/lib/gameStore';
import { BUILD_COSTS, RESOURCE_INFO, type ResourceType } from '@/lib/gameTypes';
import { canAfford } from '@/lib/gameLogic';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Hammer, Ship, ArrowRightLeft, ScrollText, SkipForward } from 'lucide-react';

export default function ActionMenu() {
  const { phase, players, currentPlayerIndex, doEndTurn, doBuild, doUpgrade, doTrade, tiles } = useGameStore();
  const [showBuild, setShowBuild] = useState(false);
  const [showTrade, setShowTrade] = useState(false);
  const [buildMode, setBuildMode] = useState<'settlement' | 'city' | 'ship' | null>(null);

  const player = players[currentPlayerIndex];
  if (!player || phase !== 'action') return null;

  const canBuildSettlement = canAfford(player, BUILD_COSTS.settlement);
  const canBuildCity = canAfford(player, BUILD_COSTS.city);
  const canBuildShip = canAfford(player, BUILD_COSTS.ship);

  // Find tiles where player can build
  const buildableTiles = tiles.filter(t => 
    t.type !== 'sea' && !t.structures.some(s => s.playerId === player.id)
  );

  // Find tiles where player can upgrade
  const upgradableTiles = tiles.filter(t =>
    t.structures.some(s => s.playerId === player.id && s.type === 'settlement')
  );

  const handleBuild = (tileId: number) => {
    if (buildMode === 'city') {
      doUpgrade(tileId);
    } else if (buildMode) {
      doBuild(tileId, buildMode);
    }
    setBuildMode(null);
    setShowBuild(false);
  };

  return (
    <div className="px-2 pb-2">
      {/* Build Mode Selection */}
      <AnimatePresence>
        {showBuild && (
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
                onClick={() => {
                  setBuildMode('settlement');
                  // Auto-build on random available tile
                  if (buildableTiles.length > 0) {
                    const tile = buildableTiles[Math.floor(Math.random() * buildableTiles.length)];
                    doBuild(tile.id, 'settlement');
                    setShowBuild(false);
                  }
                }}
              />
              <BuildOption
                label="🏰 都市"
                cost="石油2・金2・食料1"
                points="+2点"
                enabled={canBuildCity && upgradableTiles.length > 0}
                onClick={() => {
                  if (upgradableTiles.length > 0) {
                    doUpgrade(upgradableTiles[0].id);
                    setShowBuild(false);
                  }
                }}
              />
              <BuildOption
                label="⛵ 船"
                cost="ゴム1・石油1"
                points="進出用"
                enabled={canBuildShip}
                onClick={() => {
                  if (buildableTiles.length > 0) {
                    const seaTiles = tiles.filter(t => t.type === 'sea' && !t.structures.some(s => s.playerId === player.id));
                    const target = seaTiles.length > 0 ? seaTiles[0] : buildableTiles[0];
                    doBuild(target.id, 'ship');
                    setShowBuild(false);
                  }
                }}
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
      <div className="flex gap-1.5">
        <ActionButton
          icon={<Hammer size={18} />}
          label="建設する"
          color="#27AE60"
          onClick={() => { setShowBuild(!showBuild); setShowTrade(false); }}
          active={showBuild}
        />
        <ActionButton
          icon={<Ship size={18} />}
          label="進出する"
          color="#3498DB"
          onClick={() => {
            // Auto-expand to random available tile
            const expandable = tiles.filter(t => 
              t.type !== 'sea' && !t.structures.some(s => s.playerId === player.id)
            );
            if (expandable.length > 0 && canAfford(player, { rubber: 1, food: 1, gold: 1, oil: 1 })) {
              const tile = expandable[Math.floor(Math.random() * expandable.length)];
              doBuild(tile.id, 'settlement');
            }
          }}
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
      className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl font-heading font-bold text-white text-xs transition-all"
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

function BuildOption({ label, cost, points, enabled, onClick }: {
  label: string;
  cost: string;
  points: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={`flex items-center justify-between p-2 rounded-lg transition-all ${
        enabled
          ? 'bg-white hover:bg-amber-50 border-2 border-amber-400'
          : 'bg-gray-100 border-2 border-gray-300 opacity-50'
      }`}
    >
      <div className="text-left">
        <div className="font-heading font-bold text-amber-900">{label}</div>
        <div className="text-xs text-amber-700">{cost}</div>
      </div>
      <div className="font-score font-bold text-amber-600 text-sm">{points}</div>
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
                    ? 'bg-white border-2 border-amber-400 text-amber-900'
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
              className="p-2 rounded-lg font-heading font-bold text-sm bg-white border-2 border-amber-400 text-amber-900 hover:bg-amber-50"
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
