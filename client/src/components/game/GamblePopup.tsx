/*
 * GamblePopup - 2 or 12 出目時のギャンブルカード演出
 * 流れ: 裏面表示 → タップでフリップ → needsDice なら🎲ボタン → 結果表示 → タップで閉じる
 * CSSアニメのみ（framer-motion未使用）
 */
import { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/gameStore';

export default function GamblePopup() {
  const phase = useGameStore(s => s.phase);
  const card = useGameStore(s => s.gambleCard);
  const stage = useGameStore(s => s.gambleStage);
  const diceRoll = useGameStore(s => s.gambleDiceRoll);
  const result = useGameStore(s => s.gambleResult);
  const resolveGamble = useGameStore(s => s.resolveGamble);
  const dismissGamble = useGameStore(s => s.dismissGamble);

  const [flipped, setFlipped] = useState(false);
  const [diceFace, setDiceFace] = useState<number>(1);
  const [rolling, setRolling] = useState(false);

  // Reset on new card
  useEffect(() => {
    if (!card) return;
    setFlipped(false);
    setRolling(false);
    setDiceFace(1);
  }, [card?.id]);

  // Auto-dismiss after result shown
  useEffect(() => {
    if (stage === 'result') {
      const t = setTimeout(() => {
        dismissGamble();
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [stage, dismissGamble]);

  if (phase !== 'gamble' || !card) return null;

  const handleFlip = () => setFlipped(true);

  const handleRollDice = () => {
    if (rolling) return;
    setRolling(true);
    // Quick dice roll animation (~1s)
    let count = 0;
    const interval = setInterval(() => {
      setDiceFace(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count >= 10) {
        clearInterval(interval);
        const finalRoll = Math.floor(Math.random() * 6) + 1;
        setDiceFace(finalRoll);
        setRolling(false);
        // Apply result
        setTimeout(() => resolveGamble(finalRoll), 300);
      }
    }, 100);
  };

  // Auto-resolve no-dice cards
  useEffect(() => {
    if (flipped && stage === 'reveal' && card && !card.needsDice) {
      const t = setTimeout(() => resolveGamble(0), 800);
      return () => clearTimeout(t);
    }
  }, [flipped, stage, card, resolveGamble]);

  const showCardFront = flipped;
  const showRollButton = flipped && card.needsDice && stage === 'reveal' && !rolling;
  const showDice = card.needsDice && (rolling || stage === 'result');
  const showResult = stage === 'result' && result !== null;

  const outcomeColor = result?.outcome === 'positive'
    ? '#27AE60'
    : result?.outcome === 'negative'
    ? '#E74C3C'
    : '#7F8C8D';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.75)',
        animation: 'gambleFadeIn 0.3s ease-out',
      }}
      onClick={showResult ? dismissGamble : undefined}
    >
      <style>{`
        @keyframes gambleFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gambleFlipIn { from { transform: rotateY(180deg) scale(0.8); opacity: 0; } to { transform: rotateY(0deg) scale(1); opacity: 1; } }
        @keyframes gambleScaleIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes diceRollAnim { 0% { transform: rotate(0deg); } 50% { transform: rotate(180deg); } 100% { transform: rotate(360deg); } }
        @keyframes gambleGlow {
          0%, 100% { box-shadow: 0 0 30px var(--glow-color, #FFD700), 0 0 60px var(--glow-color, #FFD700); }
          50% { box-shadow: 0 0 50px var(--glow-color, #FFD700), 0 0 100px var(--glow-color, #FFD700); }
        }
        @keyframes resourceFloatUp {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-60px); opacity: 0; }
        }
        .gamble-card-back {
          background: linear-gradient(135deg, #4A148C 0%, #6A1B9A 50%, #4A148C 100%);
          border: 4px solid #FFD700;
        }
        .gamble-card-front {
          background: linear-gradient(135deg, #1a1a3e 0%, #16213e 50%, #1a1a3e 100%);
          border: 4px solid var(--card-border, #FFD700);
        }
      `}</style>

      <div
        className="relative w-80 max-w-full"
        style={{ animation: 'gambleScaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* CARD BACK (initial) */}
        {!showCardFront && (
          <button
            onClick={handleFlip}
            className="gamble-card-back w-full rounded-2xl p-8 shadow-2xl text-center cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            style={{ minHeight: '380px', '--glow-color': '#FFD700' } as React.CSSProperties}
          >
            <div className="text-6xl mb-4 animate-pulse">🎴</div>
            <div className="text-amber-300 font-bold text-lg mb-2 tracking-widest">
              ギャンブル
            </div>
            <div className="text-amber-200/80 text-sm mb-6">
              GAMBLE CARD
            </div>
            <div className="text-yellow-300 text-7xl mb-6 animate-bounce">?</div>
            <div className="text-white font-bold text-base bg-amber-500/20 rounded-xl py-2 px-4 inline-block border border-amber-300/40">
              タップでめくる
            </div>
          </button>
        )}

        {/* CARD FRONT */}
        {showCardFront && (
          <div
            className="gamble-card-front w-full rounded-2xl p-6 shadow-2xl text-center"
            style={{
              minHeight: '380px',
              '--card-border': showResult ? outcomeColor : '#FFD700',
              animation: 'gambleFlipIn 0.5s ease-out',
            } as React.CSSProperties}
          >
            <div className="text-7xl mb-3" style={{ filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.6))' }}>
              {card.icon}
            </div>
            <h2 className="text-white font-black text-2xl mb-2 drop-shadow">
              {card.title}
            </h2>
            <p className="text-white/80 text-sm mb-5 leading-relaxed px-2">
              {card.description}
            </p>

            {/* Roll dice button */}
            {showRollButton && (
              <button
                onClick={handleRollDice}
                className="w-full bg-gradient-to-b from-red-500 to-red-700 text-white font-black text-lg py-3 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform border-2 border-red-300"
                style={{ animation: 'gambleScaleIn 0.4s ease-out' }}
              >
                🎲 運命のサイコロを振れ！
              </button>
            )}

            {/* Dice display */}
            {showDice && (
              <div className="flex items-center justify-center gap-3 my-4">
                <div
                  className="w-20 h-20 bg-white rounded-xl shadow-2xl border-4 border-red-500 flex items-center justify-center text-4xl font-black text-red-600"
                  style={{ animation: rolling ? 'diceRollAnim 0.3s linear infinite' : 'gambleScaleIn 0.3s ease-out' }}
                >
                  {diceFace}
                </div>
                {!rolling && diceRoll != null && (
                  <div className="text-white text-xl font-black">
                    → {diceRoll}
                  </div>
                )}
              </div>
            )}

            {/* Result */}
            {showResult && result && (
              <div
                className="rounded-xl p-4 mt-3"
                style={{
                  background: result.outcome === 'positive'
                    ? 'linear-gradient(135deg, rgba(39,174,96,0.3), rgba(39,174,96,0.1))'
                    : result.outcome === 'negative'
                    ? 'linear-gradient(135deg, rgba(231,76,60,0.3), rgba(231,76,60,0.1))'
                    : 'rgba(127,140,141,0.2)',
                  border: `2px solid ${outcomeColor}`,
                  animation: 'gambleScaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <div className="text-3xl mb-2">
                  {result.outcome === 'positive' ? '🎉' : result.outcome === 'negative' ? '💥' : '😐'}
                </div>
                <div
                  className="text-white font-black text-lg leading-snug"
                  style={{ color: outcomeColor === '#7F8C8D' ? '#fff' : outcomeColor, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
                >
                  {result.message}
                </div>
                <div className="text-white/50 text-xs mt-2">タップで閉じる</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
