/*
 * GameLog - ゲームログ表示
 * Design: コンパクトなスクロール可能ログエリア
 */
import { useGameStore } from '@/lib/gameStore';
import { useRef, useEffect } from 'react';

export default function GameLog() {
  const { gameLog } = useGameStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameLog.length]);

  // Show last 20 entries
  const recentLogs = gameLog.slice(-20);

  const typeColors: Record<string, string> = {
    info: 'text-blue-200',
    resource: 'text-green-300',
    build: 'text-yellow-300',
    event: 'text-red-300',
    trade: 'text-orange-300',
    system: 'text-white font-bold',
  };

  return (
    <div
      ref={scrollRef}
      className="h-16 overflow-y-auto px-3 py-1.5 rounded-lg mx-2"
      style={{
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {recentLogs.map(log => (
        <div
          key={log.id}
          className={`text-[11px] leading-snug ${typeColors[log.type] || 'text-white/80'}`}
        >
          {log.message}
        </div>
      ))}
    </div>
  );
}
