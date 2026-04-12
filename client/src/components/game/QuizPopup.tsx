/*
 * QuizPopup - 歴史クイズポップアップ（7が出た時）
 * - カードめくり演出（裏面→フリップ→問題表示）
 * - 4択ボタン
 * - 30秒カウントダウンタイマー（円形プログレスバー）
 * - 正解/不正解/時間切れ演出
 * - 正解時: 好きな資源2つ選択
 * - 解説テキスト表示
 */
import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { RESOURCE_INFO, QUIZ_TIMER_SECONDS, type ResourceType } from '@/lib/gameTypes';
import { motion, AnimatePresence } from 'framer-motion';

const resourceOrder: ResourceType[] = ['rubber', 'oil', 'gold', 'food'];

/* ---- Circular Timer ---- */
function CircularTimer({ timeRemaining, total }: { timeRemaining: number; total: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = timeRemaining / total;
  const dashOffset = circumference * (1 - progress);
  const isWarning = timeRemaining <= 10;

  return (
    <div className="relative w-16 h-16 mx-auto mb-2">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#E5E7EB" strokeWidth={4} />
        <circle
          cx="32" cy="32" r={radius} fill="none"
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
          className={`font-score font-bold text-lg ${isWarning ? 'text-red-500' : 'text-amber-700'}`}
        >
          {timeRemaining}
        </motion.span>
      </div>
    </div>
  );
}

/* ---- Card Back (裏面) ---- */
function QuizCardBack({ onFlip }: { onFlip: () => void }) {
  return (
    <div
      className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl cursor-pointer"
      style={{
        background: 'linear-gradient(145deg, #1B3A5C 0%, #0D1F33 40%, #1A3050 70%, #0A1628 100%)',
        border: '4px solid #3498DB',
        boxShadow: '0 0 30px rgba(52,152,219,0.4), 0 8px 32px rgba(0,0,0,0.5)',
      }}
      onClick={onFlip}
    >
      <div
        className="m-3 rounded-xl p-6 text-center relative"
        style={{
          border: '2px solid #3498DB44',
          background: 'linear-gradient(180deg, rgba(52,152,219,0.1), transparent, rgba(52,152,219,0.1))',
        }}
      >
        <div className="absolute top-1 left-2 text-blue-400/40 text-lg">*</div>
        <div className="absolute top-1 right-2 text-blue-400/40 text-lg">*</div>
        <div className="absolute bottom-1 left-2 text-blue-400/40 text-lg">*</div>
        <div className="absolute bottom-1 right-2 text-blue-400/40 text-lg">*</div>

        <motion.div
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-blue-300/80 font-heading text-sm font-bold mb-4 tracking-widest"
        >
          -- HISTORY QUIZ --
        </motion.div>

        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [0, 2, -2, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-8xl mb-4"
          style={{ filter: 'drop-shadow(0 0 20px rgba(52,152,219,0.5))' }}
        >
          📜
        </motion.div>

        <div className="text-blue-400/70 text-xs mb-4">
          歴史クイズに挑戦！
        </div>

        <motion.button
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => { e.stopPropagation(); onFlip(); }}
          className="px-6 py-3 rounded-xl font-heading font-bold text-lg text-white transition-all"
          style={{
            background: 'linear-gradient(180deg, #3498DB, #2471A3)',
            border: '2px solid #1A5276',
            boxShadow: '0 4px 12px rgba(52,152,219,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}
        >
          📜 クイズをめくる！
        </motion.button>
      </div>
    </div>
  );
}

/* ---- Confetti for correct answer ---- */
function CorrectConfetti() {
  const pieces = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.3,
    duration: 1.2 + Math.random() * 0.8,
    color: ['#FFD700', '#FFA500', '#27AE60', '#3498DB', '#9B59B6', '#E74C3C'][i % 6],
    size: 4 + Math.random() * 8,
    rotate: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {pieces.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: '50%', x: `${p.x}%`, opacity: 1, rotate: 0, scale: 0 }}
          animate={{ y: '-20%', opacity: 0, rotate: p.rotate + 360, scale: 1 }}
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

/* ---- Resource Reward Picker ---- */
function QuizRewardPicker() {
  const quizResourcePickRemaining = useGameStore(s => s.quizResourcePickRemaining);
  const pickQuizReward = useGameStore(s => s.pickQuizReward);

  if (quizResourcePickRemaining <= 0) return null;

  return (
    <div className="mt-3">
      <p className="text-emerald-800 font-heading font-bold text-sm mb-2 text-center">
        好きな資源を選ぼう！（あと{quizResourcePickRemaining}つ）
      </p>
      <div className="grid grid-cols-2 gap-2">
        {resourceOrder.map(res => {
          const info = RESOURCE_INFO[res];
          return (
            <motion.button
              key={res}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                try {
                  pickQuizReward(res);
                } catch (e) {
                  console.error('[QuizRewardPicker] pickQuizReward failed', e);
                  useGameStore.getState().dismissQuiz();
                }
              }}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-amber-400 bg-white hover:bg-amber-50 active:bg-amber-100 transition-colors shadow-md"
              style={{ minHeight: 48 }}
            >
              <span className="text-2xl">{info.icon}</span>
              <span className="font-heading font-bold text-amber-900 text-sm">{info.name}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ---- AI Quiz View ----
 * Rendered when an AI is taking the quiz. Driven by an internal
 * state machine: thinking (1.5s) → revealed (1.5s) → result (1.5s).
 * AITurnOverlay advances the AI queue after 4.5s regardless.
 */
type AISubPhase = 'thinking' | 'revealed' | 'result';
function AIQuizView() {
  const currentAIAction = useGameStore(s => s.currentAIAction);
  const question = currentAIAction?.quizQuestion ?? null;
  const aiChoiceIndex = currentAIAction?.quizAIChoiceIndex ?? -1;
  const aiCorrect = !!currentAIAction?.quizAICorrect;

  const [subPhase, setSubPhase] = useState<AISubPhase>('thinking');

  // Reset and schedule sub-phases whenever a new AI quiz appears
  useEffect(() => {
    if (!question) return;
    setSubPhase('thinking');
    const t1 = setTimeout(() => setSubPhase('revealed'), 1500);
    const t2 = setTimeout(() => setSubPhase('result'), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [question?.id]);

  if (!question || !currentAIAction) return null;

  const showAnswer = subPhase !== 'thinking';
  const showResult = subPhase === 'result';
  const correctIndex = question.correctIndex;

  const headerBg = showResult
    ? aiCorrect
      ? 'linear-gradient(180deg, #27AE60, #1E8449)'
      : 'linear-gradient(180deg, #E74C3C, #C0392B)'
    : 'linear-gradient(180deg, #3498DB, #2471A3)';
  const borderColor = showResult ? (aiCorrect ? '#27AE60' : '#E74C3C') : '#3498DB';
  const cardBg = showResult
    ? aiCorrect
      ? 'linear-gradient(135deg, #E8F8F5, #D5F5E3)'
      : 'linear-gradient(135deg, #FDEDEC, #F5B7B1)'
    : 'linear-gradient(135deg, #EBF5FB, #D4E6F1)';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.65)' }}
      >
        <motion.div
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 22 }}
          className="relative w-full max-w-sm rounded-2xl overflow-y-auto shadow-2xl max-h-[90vh]"
          style={{
            background: cardBg,
            border: `4px solid ${borderColor}`,
            boxShadow: `0 0 40px ${borderColor}50`,
          }}
        >
          {showResult && aiCorrect && <CorrectConfetti />}

          {/* Header */}
          <div
            className="relative py-2 px-4 text-center z-20 shrink-0"
            style={{ background: headerBg }}
          >
            {showResult && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="text-4xl mb-1"
              >
                {aiCorrect ? '🎉' : '💥'}
              </motion.div>
            )}
            <h3 className="font-heading text-base font-bold text-white drop-shadow-md">
              {showResult
                ? aiCorrect ? `${currentAIAction.playerFlag} ${currentAIAction.playerName}が正解！` : `${currentAIAction.playerFlag} ${currentAIAction.playerName}は不正解...`
                : `🤖 ${currentAIAction.playerFlag} ${currentAIAction.playerName} 考え中...`
              }
            </h3>
          </div>

          {/* Body */}
          <div className="relative z-20 p-3 pb-6">
            <p className="text-base font-heading font-bold text-center mb-4 leading-relaxed"
              style={{ color: showResult ? (aiCorrect ? '#1E8449' : '#922B21') : '#1B4F72' }}
            >
              {question.question}
            </p>

            <div className="space-y-1.5 mb-2">
              {question.options.map((option, i) => {
                const isThisCorrect = i === correctIndex;
                const isAISelected = i === aiChoiceIndex;
                let btnStyle = 'bg-white border-2 border-blue-300 text-blue-900';

                if (showResult) {
                  if (isThisCorrect) {
                    btnStyle = 'bg-emerald-100 border-2 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300';
                  } else if (isAISelected && !isThisCorrect) {
                    btnStyle = 'bg-red-100 border-2 border-red-400 text-red-900';
                  } else {
                    btnStyle = 'bg-gray-100 border-2 border-gray-300 text-gray-400';
                  }
                } else if (showAnswer && isAISelected) {
                  // "revealed" phase: AI has chosen but right/wrong not yet revealed
                  btnStyle = 'bg-blue-100 border-2 border-blue-500 text-blue-900 ring-2 ring-blue-300';
                }

                return (
                  <div
                    key={i}
                    className={`w-full py-2.5 px-3 rounded-xl font-heading font-bold text-sm text-left transition-all ${btnStyle}`}
                    style={{ minHeight: 44 }}
                  >
                    <span className="inline-block w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs font-bold text-center leading-5 mr-1.5">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {option}
                    {showAnswer && isAISelected && (
                      <span className="ml-1 text-xs">🤖</span>
                    )}
                    {showResult && isThisCorrect && (
                      <span className="ml-1 text-emerald-500"> ✓</span>
                    )}
                    {showResult && isAISelected && !isThisCorrect && (
                      <span className="ml-1 text-red-500"> ✗</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Thinking indicator */}
            {!showAnswer && (
              <div className="text-center text-blue-700 text-sm mt-2 font-heading">
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  ... 🤔 ...
                </motion.span>
              </div>
            )}

            {/* Result message */}
            {showResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`text-center font-heading font-bold text-sm py-2 px-3 rounded-xl mt-2 ${
                  aiCorrect
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {aiCorrect ? '資源を2つゲット！' : '資源を2つ失った...'}
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ---- Main Quiz Popup (inner — only mounted when visible) ---- */
function QuizPopupInner() {
  console.count('[render] QuizPopupInner');
  const phase = useGameStore(s => s.phase);
  const currentQuiz = useGameStore(s => s.currentQuiz);
  const quizResult = useGameStore(s => s.quizResult);
  const quizResourcePickRemaining = useGameStore(s => s.quizResourcePickRemaining);
  const handleQuizAnswer = useGameStore(s => s.handleQuizAnswer);
  const handleQuizTimeout = useGameStore(s => s.handleQuizTimeout);
  const dismissQuiz = useGameStore(s => s.dismissQuiz);
  const currentAIAction = useGameStore(s => s.currentAIAction);
  const isPlayingAI = useGameStore(s => s.isPlayingAI);

  // AI quiz takes precedence over the human path
  const isAIQuiz = isPlayingAI && currentAIAction?.type === 'ai_quiz' && !!currentAIAction.quizQuestion;

  const [isFlipped, setIsFlipped] = useState(false);
  const [quizTimeRemaining, setQuizTimeRemaining] = useState(QUIZ_TIMER_SECONDS);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const quizId = currentQuiz?.id ?? null;

  // Reset transient UI state whenever a new quiz appears
  useEffect(() => {
    if (quizId == null) return;
    setIsFlipped(false);
    setSelectedIndex(null);
    setQuizTimeRemaining(QUIZ_TIMER_SECONDS);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [quizId]);

  // Start ticking once the card has been flipped
  useEffect(() => {
    if (!isFlipped || quizResult) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setQuizTimeRemaining(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isFlipped, quizResult, quizId]);

  // Stop timer when quiz result is set
  useEffect(() => {
    if (quizResult && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [quizResult]);

  // Timeout handler — fires exactly once when counter hits 0
  useEffect(() => {
    if (quizTimeRemaining === 0 && !quizResult && isFlipped) {
      try {
        handleQuizTimeout();
      } catch (e) {
        console.error('[QuizPopup] handleQuizTimeout failed', e);
        dismissQuiz();
      }
    }
  }, [quizTimeRemaining, quizResult, isFlipped, handleQuizTimeout, dismissQuiz]);

  // Auto-close once all resource rewards have been picked (correct answer flow)
  useEffect(() => {
    if (quizResult !== 'correct') return;
    if (quizResourcePickRemaining > 0) return;
    const t = setTimeout(() => dismissQuiz(), 400);
    return () => clearTimeout(t);
  }, [quizResult, quizResourcePickRemaining, dismissQuiz]);

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  if (isAIQuiz) return <AIQuizView />;
  if (!currentQuiz || phase !== 'quiz') return null;

  const handleFlip = () => setIsFlipped(true);

  const handleAnswer = (index: number) => {
    if (quizResult || selectedIndex !== null) return;
    setSelectedIndex(index);
    try {
      handleQuizAnswer(index);
    } catch (e) {
      console.error('[QuizPopup] handleQuizAnswer failed', e);
      dismissQuiz();
    }
  };

  const handleForceClose = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      dismissQuiz();
    } catch (e) {
      console.error('[QuizPopup] dismissQuiz failed', e);
      useGameStore.setState({
        phase: 'action',
        currentQuiz: null,
        quizResult: null,
        quizResourcePickRemaining: 0,
        turnTimerPausedForQuiz: false,
      });
    }
  };

  const isCorrect = quizResult === 'correct';
  const isIncorrect = quizResult === 'incorrect' || quizResult === 'timeout';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.65)', perspective: '1200px' }}
      >
        {/* 3D Flip container */}
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformStyle: 'preserve-3d', width: '100%', maxWidth: '24rem' }}
        >
          {/* Back face */}
          <div style={{ backfaceVisibility: 'hidden' }}>
            {!isFlipped && <QuizCardBack onFlip={handleFlip} />}
          </div>

          {/* Front face */}
          <div style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            position: isFlipped ? 'relative' : 'absolute',
            top: 0, left: 0, width: '100%',
          }}>
            {isFlipped && (
              <div
                className="relative w-full max-w-sm rounded-2xl overflow-y-auto shadow-2xl max-h-[90vh]"
                style={{
                  background: quizResult
                    ? isCorrect
                      ? 'linear-gradient(135deg, #E8F8F5, #D5F5E3)'
                      : 'linear-gradient(135deg, #FDEDEC, #F5B7B1)'
                    : 'linear-gradient(135deg, #EBF5FB, #D4E6F1)',
                  border: `4px solid ${quizResult ? (isCorrect ? '#27AE60' : '#E74C3C') : '#3498DB'}`,
                  boxShadow: `0 0 40px ${quizResult ? (isCorrect ? '#27AE6050' : '#E74C3C50') : '#3498DB50'}`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Effects */}
                {isCorrect && <CorrectConfetti />}

                {/* Header */}
                <div
                  className="relative py-2 px-4 text-center z-20 shrink-0"
                  style={{
                    background: quizResult
                      ? isCorrect
                        ? 'linear-gradient(180deg, #27AE60, #1E8449)'
                        : 'linear-gradient(180deg, #E74C3C, #C0392B)'
                      : 'linear-gradient(180deg, #3498DB, #2471A3)',
                  }}
                >
                  {/* Always-available escape hatch */}
                  <button
                    onClick={handleForceClose}
                    aria-label="クイズを閉じる"
                    className="absolute top-1 right-1 w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 text-white text-sm font-bold flex items-center justify-center z-30"
                  >
                    ×
                  </button>
                  {!quizResult && <CircularTimer timeRemaining={quizTimeRemaining} total={QUIZ_TIMER_SECONDS} />}

                  {quizResult && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.3, 1] }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="text-4xl mb-1"
                    >
                      {isCorrect ? '🎉' : quizResult === 'timeout' ? '⏰' : '💥'}
                    </motion.div>
                  )}

                  <h3 className="font-heading text-base font-bold text-white drop-shadow-md">
                    {quizResult
                      ? isCorrect ? '歴史を変えた！' : quizResult === 'timeout' ? '時間切れ...' : '歴史は繰り返す...'
                      : '📜 歴史クイズ'
                    }
                  </h3>
                </div>

                {/* Body */}
                <div className="relative z-20 p-3 pb-6">
                  {/* Question */}
                  <p className="text-base font-heading font-bold text-center mb-4 leading-relaxed"
                    style={{ color: quizResult ? (isCorrect ? '#1E8449' : '#922B21') : '#1B4F72' }}
                  >
                    {currentQuiz.question}
                  </p>

                  {/* Options */}
                  <div className="space-y-1.5 mb-2">
                    {currentQuiz.options.map((option, i) => {
                      const isThisCorrect = i === currentQuiz.correctIndex;
                      const isThisSelected = selectedIndex === i;
                      let btnStyle = 'bg-white border-2 border-blue-300 text-blue-900 hover:bg-blue-50 active:scale-[0.98]';

                      if (quizResult) {
                        if (isThisCorrect) {
                          btnStyle = 'bg-emerald-100 border-2 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300';
                        } else if (isThisSelected && !isThisCorrect) {
                          btnStyle = 'bg-red-100 border-2 border-red-400 text-red-900';
                        } else {
                          btnStyle = 'bg-gray-100 border-2 border-gray-300 text-gray-400';
                        }
                      }

                      return (
                        <motion.button
                          key={i}
                          whileTap={!quizResult ? { scale: 0.96 } : {}}
                          onClick={() => handleAnswer(i)}
                          disabled={!!quizResult}
                          className={`w-full py-2.5 px-3 rounded-xl font-heading font-bold text-sm text-left transition-all ${btnStyle}`}
                          style={{ minHeight: 44 }}
                        >
                          <span className="inline-block w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs font-bold text-center leading-5 mr-1.5">
                            {String.fromCharCode(65 + i)}
                          </span>
                          {option}
                          {quizResult && isThisCorrect && (
                            <span className="ml-1 text-emerald-500"> ✓</span>
                          )}
                          {quizResult && isThisSelected && !isThisCorrect && (
                            <span className="ml-1 text-red-500"> ✗</span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Explanation (after answer) */}
                  {quizResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-amber-50 border border-amber-300 rounded-xl p-3 mb-3"
                    >
                      <p className="text-amber-800 text-xs leading-relaxed">
                        <span className="font-bold">📖 解説: </span>
                        {currentQuiz.explanation}
                      </p>
                    </motion.div>
                  )}

                  {/* Result message */}
                  {quizResult && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className={`text-center font-heading font-bold text-sm py-2 px-3 rounded-xl mb-2 ${
                        isCorrect
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {isCorrect
                        ? '正解！好きな資源を2つもらえるよ！'
                        : 'ランダムな資源を2つ失った...'}
                    </motion.div>
                  )}

                  {/* Resource picker for correct answer */}
                  {isCorrect && quizResourcePickRemaining > 0 && <QuizRewardPicker />}

                  {/* Dismiss button (incorrect/timeout, or after all rewards picked) */}
                  {quizResult && (isIncorrect || quizResourcePickRemaining <= 0) && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={dismissQuiz}
                      className={`w-full text-lg py-3 rounded-xl font-heading font-bold text-white mt-2 ${
                        isCorrect ? 'game-btn-primary' : 'game-btn-danger'
                      }`}
                    >
                      OK
                    </motion.button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ---- Gate wrapper: only mounts QuizPopupInner when visible ---- */
export default function QuizPopup() {
  console.count('[render] QuizPopup gate');
  const phase = useGameStore(s => s.phase);
  const aiActionType = useGameStore(s => s.currentAIAction?.type);
  const isVisible = phase === 'quiz' || aiActionType === 'ai_quiz';
  if (!isVisible) return null;
  return <QuizPopupInner />;
}
