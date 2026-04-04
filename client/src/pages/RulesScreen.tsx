/*
 * RulesScreen - ルール説明画面
 * Design: 羊皮紙風カードにルールを表示
 * - タイルの使い方を詳しく説明
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
    title: '🗺️ タイルの見方',
    content: 'マップは六角形のタイルでできているよ。各タイルには「資源の種類」と「数字」が書いてある。\n\n🌿ゴム（緑）・🛢️石油（黒）・💰金（黄色）・🌾食料（オレンジ）・🌊海（青）の5種類があるよ。',
  },
  {
    title: '🎲 サイコロと資源の関係',
    content: 'サイコロを振ると、出た合計の数字と同じ数字のタイルが光るよ！\n\nそのタイルに自分の拠点🏠があれば、タイルの種類の資源が1つもらえる。都市🏰なら2つもらえるよ！\n\n例：サイコロの合計が「8」→ 数字「8」のゴムタイルに拠点がある → ゴムを1つゲット！',
  },
  {
    title: '🎲 ターンの流れ',
    content: '① サイコロを振る → 出目に合うタイルから資源をもらう\n② 建設・交換・進出する（何回でもOK）\n③ ターン終了を押す',
  },
  {
    title: '🏠 建設のしかた',
    content: '「建設する」ボタンを押して、建てたいものを選ぼう。すると建設できるタイルが光るので、タップして場所を選ぶよ！\n\n拠点（ゴム1・食料1・金1・石油1）→ 1点\n都市（石油2・金2・食料1）→ 拠点を2点に強化\n船（ゴム1・石油1）→ 海外進出に必要',
  },
  {
    title: '🌍 海外進出',
    content: '船を使って新しい土地に広がろう！でも広がりすぎるとトラブルが起きるかも…',
  },
  {
    title: '🔄 交換',
    content: '同じ資源3つで、好きな資源1つと交換できるよ！\n\n例：ゴム3つ → 金1つ',
  },
  {
    title: '⚡ イベント',
    content: 'サイコロで7が出たり、拠点が多いとイベントが発生！\n\n良いイベント：資源ラッシュ、外交成功、支援物資など\n悪いイベント：反乱、独立運動、物流トラブルなど',
  },
  {
    title: '💡 攻略のコツ',
    content: '・出やすい数字（6,7,8）のタイルに拠点を建てよう！\n・いろんな種類の資源が取れるように拠点を散らそう\n・都市にアップグレードすると資源が2倍！\n・交換は3:1なので、余っている資源を活用しよう',
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
              transition={{ delay: i * 0.08 }}
              className="parchment rounded-xl p-4"
            >
              <h3 className="font-heading text-lg font-bold text-amber-900 mb-2">
                {rule.title}
              </h3>
              <p className="text-amber-800 whitespace-pre-line leading-relaxed text-sm">
                {rule.content}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
