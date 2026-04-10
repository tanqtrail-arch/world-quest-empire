/*
 * ActionMenu - 行動メニュー
 * Design: 画面下部の大きなアクションボタン群
 * - 建設する → 拠点/道/都市を選択 → マップ上で位置を選択
 * - 交換する → 資源交換パネル
 * - ターン終了
 */
import { useGameStore } from '@/lib/gameStore';
import { BUILD_COSTS, RESOURCE_INFO, type ResourceType } from '@/lib/gameTypes';
import { canAfford, getUpgradeableVertices, getValidSettlementVertices, getValidRoadEdges, getTradeRate } from '@/lib/gameLogic';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Hammer, ArrowRightLeft, SkipForward, X, Check } from 'lucide-react';

export default function ActionMenu() {
  const {
    phase, players, currentPlayerIndex, doEndTurn,
    buildMode, startBuild, cancelBuild, confirmBuild,
    selectedVertexId, selectedEdgeId,
    vertices, edges, settlements, roads, difficulty,
  } = useGameStore();
  const [showBuild, setShowBuild] = useState(false);
  const [showTrade, setShowTrade] = useState(false);

  const player = players[currentPlayerIndex];
  if (!player || phase !== 'action') return null;

  const canBuildSettlementAfford = canAfford(player, BUILD_COSTS.settlement);
  const canBuildCityAfford = canAfford(player, BUILD_COSTS.city);
  const canBuildRoadAfford = canAfford(player, BUILD_COSTS.road);

  // Check if there are valid positions
  const hasValidSettlements = getValidSettlementVertices(player.id, vertices, settlements, roads, false, difficulty).length > 0;
  const hasValidRoads = getValidRoadEdges(player.id, edges, vertices, settlements, roads, false).length > 0;
  const hasUpgradeableSettlements = getUpgradeableVertices(player.id, settlements).length > 0;

  const handleSelectBuildType = (type: 'settlement' | 'city' | 'road') => {
    startBuild(type);
    setShowBuild(false);
  };

  const handleCancelBuild = () => {
    cancelBuild();
    setShowBuild(false);
  };

  const hasSelection = (buildMode === 'settlement' || buildMode === 'city') && selectedVertexId
    || buildMode === 'road' && selectedEdgeId;

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
                {buildMode === 'settlement' ? '🏠' : buildMode === 'city' ? '🏰' : '🛤️'}
              </span>
              <div>
                <div className="font-heading font-bold text-amber-900 text-sm">
                  {buildMode === 'settlement' ? '拠点を建てる頂点を選ぼう！' :
                   buildMode === 'city' ? 'アップグレードする拠点を選ぼう！' :
                   '道を建てる辺を選ぼう！'}
                </div>
                <div className="text-xs text-amber-700">
                  光っている場所をタップしてね
                </div>
              </div>
            </div>
            <div className="flex gap-1.5">
              {hasSelection && (
                <button
                  onClick={confirmBuild}
                  className="bg-emerald-500 text-white rounded-full p-1.5 hover:bg-emerald-600 transition-colors"
                >
                  <Check size={16} />
                </button>
              )}
              <button
                onClick={handleCancelBuild}
                className="bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
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
            <div className="flex justify-center gap-2 mb-2 text-xs font-bold text-amber-800">
              {(['rubber', 'oil', 'gold', 'food'] as ResourceType[]).map(res => (
                <span key={res} className={player.resources[res] > 0 ? '' : 'opacity-40'}>
                  {RESOURCE_INFO[res].icon}{player.resources[res]}
                </span>
              ))}
            </div>
            {!canBuildRoadAfford && !canBuildSettlementAfford && !canBuildCityAfford ? (
              <div className="text-center text-red-500 text-xs font-bold mb-2 bg-red-50 rounded-lg py-1.5 border border-red-200">
                ⚠️ 資源が足りません。交換やサイコロで集めよう！
              </div>
            ) : canBuildRoadAfford && hasValidRoads && !hasValidSettlements && (
              <div className="text-center text-blue-600 text-xs font-bold mb-2 bg-blue-50 rounded-lg py-1.5 border border-blue-200">
                💡 まず道を伸ばして、拠点を建てる場所を作ろう！
              </div>
            )}
            <div className="flex flex-col gap-2">
              <BuildOption
                label="🛤️ 道"
                cost="ゴム1・石油1"
                points="道"
                enabled={canBuildRoadAfford && hasValidRoads}
                disabledReason={!canBuildRoadAfford ? '資源が足りない' : !hasValidRoads ? '建設できる場所がない' : undefined}
                description="道をつなげて新しい場所に拠点を建てよう！"
                onClick={() => handleSelectBuildType('road')}
              />
              <BuildOption
                label="🏠 拠点"
                cost="ゴム1・食料1・金1・石油1"
                points="+1点"
                enabled={canBuildSettlementAfford && hasValidSettlements}
                disabledReason={!canBuildSettlementAfford ? '資源が足りない' : !hasValidSettlements ? '場所がない（道を伸ばそう！）' : undefined}
                description="頂点に拠点を建てると、隣のタイルから資源がもらえる！"
                onClick={() => handleSelectBuildType('settlement')}
              />
              <BuildOption
                label="🏰 都市"
                cost="石油2・金2・食料1"
                points="+1点"
                enabled={canBuildCityAfford && hasUpgradeableSettlements}
                disabledReason={!canBuildCityAfford ? '資源が足りない' : !hasUpgradeableSettlements ? 'アップグレードできる拠点がない' : undefined}
                description="拠点を都市にすると、資源が2倍もらえるよ！"
                onClick={() => handleSelectBuildType('city')}
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
              交換する（資源 → 1つ）
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

function BuildOption({ label, cost, points, enabled, disabledReason, description, onClick }: {
  label: string;
  cost: string;
  points: string;
  enabled: boolean;
  disabledReason?: string;
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
        {enabled ? (
          <div className="text-xs text-amber-600 mt-0.5">{description}</div>
        ) : disabledReason ? (
          <div className="text-xs text-red-500 mt-0.5">⚠️ {disabledReason}</div>
        ) : (
          <div className="text-xs text-amber-600 mt-0.5">{description}</div>
        )}
      </div>
      <div className="font-score font-bold text-amber-600 text-sm ml-2 shrink-0">{points}</div>
    </button>
  );
}

function TradePanel({ onClose }: { onClose: () => void }) {
  const { players, currentPlayerIndex, doTrade, settlements, ports } = useGameStore();
  const player = players[currentPlayerIndex];
  const resources: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];
  const [giveRes, setGiveRes] = useState<ResourceType | null>(null);

  if (!player) return null;

  // Calculate trade rates for each resource
  const tradeRates: Record<ResourceType, number> = {} as Record<ResourceType, number>;
  resources.forEach(res => {
    tradeRates[res] = getTradeRate(player.id, res, settlements, ports);
  });

  if (!giveRes) {
    return (
      <div>
        <p className="text-amber-800 text-sm text-center mb-2">
          どの資源を出す？
        </p>
        <div className="grid grid-cols-2 gap-2">
          {resources.map(res => {
            const info = RESOURCE_INFO[res];
            const rate = tradeRates[res];
            const hasEnough = player.resources[res] >= rate;
            const isDiscounted = rate < 4;
            return (
              <button
                key={res}
                disabled={!hasEnough}
                onClick={() => setGiveRes(res)}
                className={`p-2 rounded-lg font-heading font-bold text-sm relative ${
                  hasEnough
                    ? isDiscounted
                      ? 'bg-amber-50 border-2 border-yellow-500 text-amber-900 active:scale-95 ring-1 ring-yellow-300'
                      : 'bg-white border-2 border-amber-400 text-amber-900 active:scale-95'
                    : 'bg-gray-100 border-2 border-gray-300 text-gray-400'
                }`}
              >
                {info.icon} {info.name} ({player.resources[res]})
                <span className={`block text-xs mt-0.5 ${isDiscounted ? 'text-yellow-600 font-bold' : 'text-amber-600'}`}>
                  {isDiscounted ? `⚓${rate}:1` : `${rate}:1`}
                </span>
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

  const giveRate = tradeRates[giveRes];

  return (
    <div>
      <p className="text-amber-800 text-sm text-center mb-2">
        {RESOURCE_INFO[giveRes].icon} {RESOURCE_INFO[giveRes].name}{giveRate}つで何がほしい？
        {giveRate < 4 && <span className="text-yellow-600 font-bold"> ⚓港で割引！</span>}
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
