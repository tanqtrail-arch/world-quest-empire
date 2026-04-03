/*
 * RulesScreen - ルール説明画面
 * Design: 羊皮紙風カードにルールを表示
 */
import { useGameStore } from '@/lib/gameStore';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const WOOD_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663286960690/RthryRhRZNJvzXLKUFJiBd/wood-texture-3bU4G8nuC3Js3NFmH6shph.webp';

const rules = [
  {
    title: '🎯 ゲームの目的',
    content: '資源を集めて拠点を建て、勝利ポイント10点を先に集めた人が勝ち！',
  },
  {
    title: '🎲 ターンの流れ',
    content: '① サイコロを振る → ② 資源をもらう → ③ 建設・交換・進出する → ④ ターン終了',
  },
  {
    title: '🏠 建設',
    content: '拠点（ゴム1・食料1・金1・石油1）→ 1点\n都市（石油2・金2・食料1）→ 2点\n船（ゴム1・石油1）→ 海外進出に必要',
  },
  {
    title: '🌍 海外進出',
    content: '船を使って新しい土地に広がろう！でも広がりすぎるとトラブルが起きるかも…',
  },
  {
    title: '🔄 交換',
    content: '同じ資源3つで、好きな資源1つと交換できるよ！',
  },
  {
    title: '⚡ イベント',
    content: 'サイコロで7が出たり、拠点が多いとイベントが発生！良いことも悪いことも起きるよ。',
  },
  {
    title: '📚 学べること',
    content: 'このゲームでは「帝国主義」について学べるよ。なぜ国は資源を求めたのか、広がるとどんな問題が起きるのか、遊びながら考えてみよう！',
  },
];

export default function RulesScreen() {
  const setScreen = useGameStore(s => s.setScreen);

  return (
    <div
      className="min-h-screen p-4"
      style={{
        backgroundImage: `url(${WOOD_BG})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => setScreen('title')}
          className="flex items-center gap-1 text-amber-100 font-heading font-bold mb-4 hover:text-white transition-colors drop-shadow-lg"
        >
          <ArrowLeft size={20} />
          もどる
        </button>

        <motion.h2
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="font-heading text-3xl font-bold text-white text-center mb-6 drop-shadow-lg"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
        >
          📖 あそびかた
        </motion.h2>

        <div className="flex flex-col gap-4 pb-8">
          {rules.map((rule, i) => (
            <motion.div
              key={i}
              initial={{ x: i % 2 === 0 ? -30 : 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="parchment rounded-xl p-4"
            >
              <h3 className="font-heading text-lg font-bold text-amber-900 mb-2">
                {rule.title}
              </h3>
              <p className="text-amber-800 whitespace-pre-line leading-relaxed">
                {rule.content}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
