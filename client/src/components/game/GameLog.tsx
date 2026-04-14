/*
 * GameLog - ゲームログ表示
 * Design: コンパクトなスクロール可能ログエリア
 * 新しいログエントリーにはフェードインアニメーション付き
 */
import { useGameStore } from '@/lib/gameStore';
import { useRef, useEffect, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function GameLog() {
  const gameLog = useGameStore(s => s.gameLog);
  const players = useGameStore(s => s.players);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [prevLength, setPrevLength] = useState(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    setPrevLength(gameLog.length);
  }, [gameLog.length]);

  // Show last 30 entries
  const recentLogs = gameLog.slice(-30);

  const typeColors: Record<string, string> = {
    info: 'text-blue-200',
    resource: 'text-green-300',
    build: 'text-yellow-300',
    event: 'text-red-300',
    trade: 'text-orange-300',
    system: 'text-white font-bold',
  };

  const typeIcons: Record<string, string> = {
    info: '📋',
    resource: '📦',
    build: '🔨',
    event: '⚡',
    trade: '🔄',
    system: '📢',
  };

  // Find player color by playerId
  const getPlayerColor = (playerId?: string) => {
    if (!playerId) return undefined;
    const player = players.find(p => p.id === playerId);
    return player?.color;
  };

  return (
    <div
      ref={scrollRef}
      className="h-20 md:h-full overflow-y-auto px-3 py-1.5 rounded-lg mx-2 md:mx-0"
      style={{
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {recentLogs.map((log, idx) => {
        const isNew = gameLog.length - recentLogs.length + idx >= prevLength;
        const playerColor = getPlayerColor(log.playerId);

        return (
          <motion.div
            key={log.id}
            initial={isNew ? { opacity: 0, x: -10 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className={`text-[11px] leading-snug flex items-start gap-1 ${typeColors[log.type] || 'text-white/80'}`}
          >
            <span className="shrink-0 text-[10px]">{typeIcons[log.type] || '•'}</span>
            {playerColor && (
              <span
                className="shrink-0 w-2 h-2 rounded-full mt-0.5"
                style={{ backgroundColor: playerColor }}
              />
            )}
            <span>{log.message}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

export default memo(GameLog);
