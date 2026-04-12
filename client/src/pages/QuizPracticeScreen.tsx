/*
 * QuizPracticeScreen - クイズ練習モード
 * ゲーム外で自由にクイズを練習できる画面。
 * - 難易度タブ / カテゴリフィルター
 * - 30秒タイマー / 4択 / 解説
 * - スコア・ストリーク・リザルト
 * - localStorage に成績保存
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/gameStore';
import {
  QUIZ_QUESTIONS, QUIZ_DIFFICULTY_INFO, QUIZ_TIMER_SECONDS,
  type QuizQuestion, type QuizDifficulty,
} from '@/lib/gameTypes';
import { ArrowLeft } from 'lucide-react';

const BOARD_BG = '/game-board-bg.webp';
const STORAGE_KEY = 'wqe_quiz_practice_stats_v1';

type Category = 'all' | 'ww1' | 'ww2' | 'imperialism';

const CATEGORY_INFO: Record<Category, { label: string; icon: string }> = {
  all:         { label: '全て',         icon: '🌐' },
  imperialism: { label: '帝国主義',     icon: '🏛️' },
  ww1:         { label: '第一次世界大戦', icon: '⚔️' },
  ww2:         { label: '第二次世界大戦', icon: '💣' },
};

interface PracticeStats {
  bestRate: Record<QuizDifficulty, number>;
  totalAnswered: number;
  totalCorrect: number;
  byCategory: Record<'ww1' | 'ww2' | 'imperialism', { answered: number; correct: number }>;
}

const defaultStats: PracticeStats = {
  bestRate: { elementary_low: 0, elementary_high: 0, junior_high: 0 },
  totalAnswered: 0,
  totalCorrect: 0,
  byCategory: {
    ww1: { answered: 0, correct: 0 },
    ww2: { answered: 0, correct: 0 },
    imperialism: { answered: 0, correct: 0 },
  },
};

function loadStats(): PracticeStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats;
    const parsed = JSON.parse(raw);
    return { ...defaultStats, ...parsed, byCategory: { ...defaultStats.byCategory, ...(parsed.byCategory || {}) } };
  } catch {
    return defaultStats;
  }
}

function saveStats(stats: PracticeStats) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch {}
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SESSION_SIZE = 10;

/* ---- Circular Timer ---- */
function CircularTimer({ timeRemaining, total }: { timeRemaining: number; total: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const progress = timeRemaining / total;
  const dashOffset = circumference * (1 - progress);
  const isWarning = timeRemaining <= 10;

  return (
    <div className="relative w-14 h-14">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={radius} fill="none" stroke="#E5E7EB" strokeWidth={4} />
        <circle
          cx="30" cy="30" r={radius} fill="none"
          stroke={isWarning ? '#EF4444' : '#F59E0B'}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          animate={isWarning ? { scale: [1, 1.2, 1] } : {}}
          transition={isWarning ? { duration: 0.5, repeat: Infinity } : {}}
          className={`font-score font-bold text-base ${isWarning ? 'text-red-500' : 'text-amber-700'}`}
        >
          {timeRemaining}
        </motion.span>
      </div>
    </div>
  );
}

/* ---- Confetti ---- */
function Confetti() {
  const pieces = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.3,
    duration: 1.5 + Math.random() * 1.2,
    color: ['#FFD700', '#FFA500', '#27AE60', '#3498DB', '#9B59B6', '#E74C3C'][i % 6],
    size: 5 + Math.random() * 10,
    rotate: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: '100%', x: `${p.x}%`, opacity: 1, rotate: 0 }}
          animate={{ y: '-20%', opacity: 0, rotate: p.rotate + 720 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
          className="absolute"
          style={{
            width: p.size, height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

/* ---- Title for the result ---- */
function getTitle(rate: number): { emoji: string; title: string; subtitle: string } {
  if (rate === 100) return { emoji: '👑', title: '歴史マスター', subtitle: '完璧！歴史の覇者だ！' };
  if (rate >= 90)   return { emoji: '🏆', title: '歴史博士',     subtitle: 'すごい知識量！' };
  if (rate >= 70)   return { emoji: '🥇', title: '歴史学者',     subtitle: 'よく知っている！' };
  if (rate >= 50)   return { emoji: '🥈', title: '歴史探検家',   subtitle: 'いい調子！' };
  if (rate >= 30)   return { emoji: '🥉', title: '見習い学者',   subtitle: 'この調子で！' };
  return { emoji: '📚', title: '歴史の卵',   subtitle: 'まだまだこれから！' };
}

export default function QuizPracticeScreen() {
  const setScreen = useGameStore(s => s.setScreen);

  const [difficulty, setDifficulty] = useState<QuizDifficulty>('elementary_high');
  const [category, setCategory] = useState<Category>('all');
  const [stats, setStats] = useState<PracticeStats>(() => loadStats());

  // Session state
  const [queue, setQueue] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<'correct' | 'incorrect' | 'timeout' | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(QUIZ_TIMER_SECONDS);
  const [sessionEnded, setSessionEnded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = queue[currentIdx];

  // Build a fresh queue whenever difficulty/category changes
  const startSession = useCallback(() => {
    const pool = QUIZ_QUESTIONS.filter(q =>
      q.difficulty === difficulty && (category === 'all' || q.category === category)
    );
    const shuffled = shuffle(pool).slice(0, Math.min(SESSION_SIZE, pool.length));
    setQueue(shuffled);
    setCurrentIdx(0);
    setCorrectCount(0);
    setStreak(0);
    setBestStreak(0);
    setSelectedIndex(null);
    setResult(null);
    setTimeRemaining(QUIZ_TIMER_SECONDS);
    setSessionEnded(false);
  }, [difficulty, category]);

  useEffect(() => { startSession(); }, [startSession]);

  // Timer
  useEffect(() => {
    if (sessionEnded || !current || result) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeRemaining(QUIZ_TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [currentIdx, sessionEnded, current, result]);

  // Timeout handler
  useEffect(() => {
    if (timeRemaining === 0 && !result && current) {
      handleResult('timeout', -1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining]);

  const handleResult = (r: 'correct' | 'incorrect' | 'timeout', picked: number) => {
    if (!current) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setSelectedIndex(picked);
    setResult(r);

    const isCorrect = r === 'correct';
    if (isCorrect) {
      setCorrectCount(c => c + 1);
      setStreak(s => {
        const ns = s + 1;
        setBestStreak(b => Math.max(b, ns));
        return ns;
      });
    } else {
      setStreak(0);
    }

    // Update stats (persistent)
    setStats(prev => {
      const next: PracticeStats = {
        ...prev,
        totalAnswered: prev.totalAnswered + 1,
        totalCorrect: prev.totalCorrect + (isCorrect ? 1 : 0),
        byCategory: {
          ...prev.byCategory,
          [current.category]: {
            answered: prev.byCategory[current.category].answered + 1,
            correct: prev.byCategory[current.category].correct + (isCorrect ? 1 : 0),
          },
        },
        bestRate: { ...prev.bestRate },
      };
      saveStats(next);
      return next;
    });
  };

  const handleAnswer = (i: number) => {
    if (result || !current) return;
    const isCorrect = i === current.correctIndex;
    handleResult(isCorrect ? 'correct' : 'incorrect', i);
  };

  const handleNext = () => {
    if (currentIdx + 1 >= queue.length) {
      // End of session — update best rate
      const rate = queue.length > 0 ? Math.round((correctCount / queue.length) * 100) : 0;
      setStats(prev => {
        const cur = prev.bestRate[difficulty] || 0;
        if (rate > cur) {
          const next = { ...prev, bestRate: { ...prev.bestRate, [difficulty]: rate } };
          saveStats(next);
          return next;
        }
        return prev;
      });
      setSessionEnded(true);
      return;
    }
    setCurrentIdx(i => i + 1);
    setSelectedIndex(null);
    setResult(null);
    setTimeRemaining(QUIZ_TIMER_SECONDS);
  };

  const answeredInSession = sessionEnded ? queue.length : (result ? currentIdx + 1 : currentIdx);
  const progressPct = queue.length > 0 ? (answeredInSession / queue.length) * 100 : 0;
  const finalRate = queue.length > 0 ? Math.round((correctCount / queue.length) * 100) : 0;
  const resultTitle = useMemo(() => getTitle(finalRate), [finalRate]);

  return (
    <div
      className="relative min-h-screen select-none"
      style={{
        backgroundImage: `url(${BOARD_BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-amber-900/30 via-amber-800/20 to-amber-900/50 pointer-events-none" />

      <div className="relative z-10 flex flex-col max-w-2xl mx-auto w-full min-h-screen px-3 py-3 md:py-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setScreen('title')}
            className="bg-white/20 backdrop-blur-sm rounded-full p-2 text-white hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-heading font-bold text-xl md:text-2xl text-white drop-shadow-lg">
            📝 歴史マスターへの道
          </h1>
        </div>

        {/* Score tracker */}
        <div className="parchment rounded-2xl p-3 mb-2 shadow-lg">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-[10px] text-amber-700 font-heading">正解</div>
                <div className="font-score font-bold text-2xl text-amber-900">
                  {correctCount}<span className="text-base text-amber-600">/{queue.length}</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-amber-700 font-heading">ストリーク</div>
                <div className="font-score font-bold text-2xl text-orange-600 flex items-center gap-1">
                  {streak}<span className="text-sm">{streak >= 3 ? '🔥' : ''}</span>
                </div>
              </div>
              <div className="hidden sm:block">
                <div className="text-[10px] text-amber-700 font-heading">最高記録</div>
                <div className="font-score font-bold text-lg text-amber-900">
                  {stats.bestRate[difficulty]}%
                </div>
              </div>
            </div>
            <div className="text-[10px] text-amber-700 text-right">
              <div>通算 {stats.totalAnswered}問</div>
              <div>正答率 {stats.totalAnswered > 0 ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0}%</div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-2 bg-amber-100 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600"
            />
          </div>
        </div>

        {/* Difficulty tabs */}
        <div className="flex gap-1.5 mb-2">
          {(Object.keys(QUIZ_DIFFICULTY_INFO) as QuizDifficulty[]).map(d => {
            const info = QUIZ_DIFFICULTY_INFO[d];
            const active = d === difficulty;
            return (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 px-2 rounded-xl font-heading font-bold text-xs md:text-sm transition-all ${
                  active
                    ? 'text-white shadow-lg scale-[1.02]'
                    : 'bg-white/60 text-amber-800 hover:bg-white/80'
                }`}
                style={active ? {
                  background: `linear-gradient(180deg, ${info.color}, ${info.color}cc)`,
                  border: `2px solid ${info.color}`,
                } : { border: '2px solid transparent' }}
              >
                <div className="text-lg leading-none">{info.icon}</div>
                <div>{info.label}</div>
              </button>
            );
          })}
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto">
          {(Object.keys(CATEGORY_INFO) as Category[]).map(c => {
            const info = CATEGORY_INFO[c];
            const active = c === category;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 px-3 py-1.5 rounded-full font-heading font-bold text-xs transition-all ${
                  active
                    ? 'bg-amber-500 text-white shadow-md border-2 border-amber-600'
                    : 'bg-white/60 text-amber-800 border-2 border-amber-200 hover:bg-white/80'
                }`}
              >
                {info.icon} {info.label}
              </button>
            );
          })}
        </div>

        {/* Main card area */}
        <div className="flex-1 flex items-start justify-center">
          <AnimatePresence mode="sync">
            {sessionEnded ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative parchment rounded-2xl shadow-2xl w-full max-w-md p-5 text-center overflow-hidden"
              >
                {finalRate >= 70 && <Confetti />}
                <div className="relative z-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.4, 1] }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="text-7xl mb-2"
                  >
                    {resultTitle.emoji}
                  </motion.div>
                  <h2 className="font-heading font-bold text-2xl text-amber-900 mb-1">
                    {resultTitle.title}
                  </h2>
                  <p className="text-amber-700 text-sm mb-4">{resultTitle.subtitle}</p>

                  <div className="bg-white/70 rounded-xl p-3 mb-3 border-2 border-amber-300">
                    <div className="text-xs text-amber-700">正答率</div>
                    <div className="font-score font-bold text-4xl text-amber-900">{finalRate}%</div>
                    <div className="text-xs text-amber-700 mt-1">
                      {correctCount} / {queue.length} 問正解
                    </div>
                    {bestStreak >= 3 && (
                      <div className="text-xs text-orange-600 font-bold mt-1">
                        🔥 最高{bestStreak}連続正解！
                      </div>
                    )}
                    {finalRate >= stats.bestRate[difficulty] && finalRate > 0 && (
                      <div className="text-xs text-amber-600 font-bold mt-1">✨ 自己ベスト更新！</div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={startSession}
                      className="flex-1 game-btn-primary text-base py-3 rounded-xl"
                    >
                      🔄 もう一度
                    </button>
                    <button
                      onClick={() => setScreen('title')}
                      className="flex-1 game-btn-blue text-base py-3 rounded-xl"
                    >
                      🏠 タイトルへ
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : current ? (
              <motion.div
                key={`q-${current.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
                style={{
                  background: result
                    ? result === 'correct'
                      ? 'linear-gradient(135deg, #E8F8F5, #D5F5E3)'
                      : 'linear-gradient(135deg, #FDEDEC, #F5B7B1)'
                    : 'linear-gradient(135deg, #EBF5FB, #D4E6F1)',
                  border: `4px solid ${result ? (result === 'correct' ? '#27AE60' : '#E74C3C') : '#3498DB'}`,
                  boxShadow: `0 0 30px ${result ? (result === 'correct' ? '#27AE6050' : '#E74C3C50') : '#3498DB40'}`,
                }}
              >
                {result === 'correct' && <Confetti />}

                {/* Header */}
                <div
                  className="relative py-2 px-4 flex items-center justify-between z-10"
                  style={{
                    background: result
                      ? result === 'correct'
                        ? 'linear-gradient(180deg, #27AE60, #1E8449)'
                        : 'linear-gradient(180deg, #E74C3C, #C0392B)'
                      : 'linear-gradient(180deg, #3498DB, #2471A3)',
                  }}
                >
                  <div className="text-white font-heading font-bold text-sm">
                    {result
                      ? result === 'correct' ? '🎉 正解！'
                        : result === 'timeout' ? '⏰ 時間切れ'
                        : '💥 不正解'
                      : `問題 ${currentIdx + 1}/${queue.length}`}
                  </div>
                  {!result && <CircularTimer timeRemaining={timeRemaining} total={QUIZ_TIMER_SECONDS} />}
                </div>

                {/* Body */}
                <div className="relative z-10 p-4">
                  {/* Category tag */}
                  <div className="mb-2 text-center">
                    <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                      {CATEGORY_INFO[current.category as Category].icon} {CATEGORY_INFO[current.category as Category].label}
                    </span>
                  </div>

                  {/* Question */}
                  <p className="text-base font-heading font-bold text-center mb-4 leading-relaxed"
                    style={{ color: result ? (result === 'correct' ? '#1E8449' : '#922B21') : '#1B4F72' }}
                  >
                    {current.question}
                  </p>

                  {/* Options */}
                  <div className="space-y-1.5 mb-3">
                    {current.options.map((opt, i) => {
                      const isCorrectOpt = i === current.correctIndex;
                      const isSelected = selectedIndex === i;
                      let btnStyle = 'bg-white border-2 border-blue-300 text-blue-900 hover:bg-blue-50 active:scale-[0.98]';
                      if (result) {
                        if (isCorrectOpt) {
                          btnStyle = 'bg-emerald-100 border-2 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300';
                        } else if (isSelected && !isCorrectOpt) {
                          btnStyle = 'bg-red-100 border-2 border-red-400 text-red-900';
                        } else {
                          btnStyle = 'bg-gray-100 border-2 border-gray-300 text-gray-400';
                        }
                      }
                      return (
                        <motion.button
                          key={i}
                          whileTap={!result ? { scale: 0.96 } : {}}
                          onClick={() => handleAnswer(i)}
                          disabled={!!result}
                          className={`w-full py-2.5 px-3 rounded-xl font-heading font-bold text-sm text-left transition-all ${btnStyle}`}
                          style={{ minHeight: 44 }}
                        >
                          <span className="inline-block w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs font-bold text-center leading-5 mr-1.5">
                            {String.fromCharCode(65 + i)}
                          </span>
                          {opt}
                          {result && isCorrectOpt && <span className="ml-1 text-emerald-500"> ✓</span>}
                          {result && isSelected && !isCorrectOpt && <span className="ml-1 text-red-500"> ✗</span>}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-amber-50 border border-amber-300 rounded-xl p-3 mb-3"
                    >
                      <p className="text-amber-800 text-xs leading-relaxed">
                        <span className="font-bold">📖 解説: </span>
                        {current.explanation}
                      </p>
                    </motion.div>
                  )}

                  {/* Next button */}
                  {result && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleNext}
                      className="w-full text-base py-3 rounded-xl font-heading font-bold text-white game-btn-primary"
                    >
                      {currentIdx + 1 >= queue.length ? '🏁 結果を見る' : '➡️ 次の問題'}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="parchment rounded-2xl p-6 text-center text-amber-800">
                この条件の問題がありません。
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Category stats footer */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(['imperialism', 'ww1', 'ww2'] as const).map(cat => {
            const s = stats.byCategory[cat];
            const rate = s.answered > 0 ? Math.round((s.correct / s.answered) * 100) : 0;
            return (
              <div key={cat} className="bg-white/70 backdrop-blur-sm rounded-xl p-2 text-center border border-amber-300">
                <div className="text-xs">{CATEGORY_INFO[cat].icon}</div>
                <div className="font-heading font-bold text-[10px] text-amber-800">{CATEGORY_INFO[cat].label}</div>
                <div className="font-score font-bold text-sm text-amber-900">{rate}%</div>
                <div className="text-[9px] text-amber-600">{s.answered}問</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
