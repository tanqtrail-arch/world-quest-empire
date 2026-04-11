// ===== Game Types & Constants for World Quest Empire =====
// カタン方式: 頂点に拠点、辺に道を建設。隣接タイルから資源を獲得。

// --- Resource Types ---
export type ResourceType = 'rubber' | 'oil' | 'gold' | 'food';

export const RESOURCE_INFO: Record<ResourceType, { name: string; color: string; icon: string; bgClass: string }> = {
  rubber: { name: 'ゴム', color: '#27AE60', icon: '🌿', bgClass: 'bg-emerald-600' },
  oil:    { name: '石油', color: '#2C3E50', icon: '🛢️', bgClass: 'bg-slate-800' },
  gold:   { name: '金',   color: '#F1C40F', icon: '💰', bgClass: 'bg-amber-500' },
  food:   { name: '食料', color: '#E67E22', icon: '🌾', bgClass: 'bg-orange-500' },
};

export type Resources = Record<ResourceType, number>;

// --- Tile Types ---
export type TileType = ResourceType | 'desert' | 'sea';

export const TILE_INFO: Record<TileType, { name: string; color: string; bgColor: string }> = {
  rubber: { name: 'ゴム', color: '#27AE60', bgColor: '#2ECC71' },
  oil:    { name: '石油', color: '#2C3E50', bgColor: '#34495E' },
  gold:   { name: '金',   color: '#F1C40F', bgColor: '#F39C12' },
  food:   { name: '食料', color: '#E67E22', bgColor: '#E8A838' },
  desert: { name: '砂漠', color: '#D4A574', bgColor: '#DEB887' },
  sea:    { name: '海',   color: '#3498DB', bgColor: '#5DADE2' },
};

// --- Tile ---
export interface GameTile {
  id: number;
  type: TileType;
  diceNumber: number;
  q: number;
  r: number;
}

// --- Vertex (頂点) - 拠点を建てる場所 ---
export interface Vertex {
  id: string;           // "v_q1r1_q2r2_q3r3" format (sorted tile keys)
  adjacentTileIds: number[];  // 隣接するタイルのID (2-3個)
  adjacentVertexIds: string[]; // 隣接する頂点のID
  adjacentEdgeIds: string[];   // 隣接する辺のID
  x: number;            // 描画用X座標
  y: number;            // 描画用Y座標
}

// --- Edge (辺) - 道を建てる場所 ---
export interface Edge {
  id: string;           // "e_v1_v2" format (sorted vertex keys)
  vertexIds: [string, string]; // 両端の頂点ID
  adjacentTileIds: number[];   // 隣接するタイルのID (1-2個)
  x1: number; y1: number;     // 描画用始点
  x2: number; y2: number;     // 描画用終点
}

// --- Settlement (拠点) - 頂点上に建設 ---
export interface Settlement {
  vertexId: string;
  playerId: string;
  level: 'settlement' | 'city';  // 拠点 or 都市
}

// --- Road (道) - 辺上に建設 ---
export interface Road {
  edgeId: string;
  playerId: string;
}

// --- Player ---
export interface Player {
  id: string;
  name: string;
  color: string;
  colorName: string;
  flagEmoji: string;
  countryName: string;
  resources: Resources;
  victoryPoints: number;
  isAI: boolean;
  isHuman: boolean;     // ローカル対戦用: 人間プレイヤーかどうか
  longestRoadLength: number;
  eventCards: EventCard[];
}

// --- Event Card ---
export type EventCategory = 'negative' | 'positive' | 'special';

export interface EventCard {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  effectType: string;
  effectValue: number;
  icon: string;
  learningPoint: string;
  duration?: number;       // 何ターン持続するか（指定なければ即時）
  requiresChoice?: boolean; // 好きな資源を選ぶ系
}

// --- Quiz System ---
export type QuizDifficulty = 'elementary_low' | 'elementary_high' | 'junior_high';

export interface QuizQuestion {
  id: number;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  difficulty: QuizDifficulty;
  category: 'ww1' | 'ww2' | 'imperialism';
  explanation: string;
}

export const QUIZ_DIFFICULTY_INFO: Record<QuizDifficulty, { label: string; icon: string; desc: string; color: string }> = {
  elementary_low:  { label: 'かんたん', icon: '🔰', desc: '小3-4向け', color: '#2ECC71' },
  elementary_high: { label: 'ふつう',   icon: '📚', desc: '小5-6向け', color: '#3498DB' },
  junior_high:     { label: 'むずかしい', icon: '🎓', desc: '中1-2向け', color: '#E74C3C' },
};

export const QUIZ_TIMER_SECONDS = 30;
export const TURN_TIMER_SECONDS = 60;

// --- Quiz Questions Data ---
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // =============================================
  // elementary_low（小3-4）: 基本的な事実問題 15問
  // =============================================
  { id: 1, question: '第一次世界大戦が始まったのは何年？', options: ['1914年', '1939年', '1945年', '1868年'], correctIndex: 0, difficulty: 'elementary_low', category: 'ww1', explanation: '第一次世界大戦は1914年に始まり、1918年に終わりました。' },
  { id: 2, question: '第二次世界大戦で日本が降伏した年は？', options: ['1945年', '1918年', '1939年', '1950年'], correctIndex: 0, difficulty: 'elementary_low', category: 'ww2', explanation: '1945年8月15日、日本はポツダム宣言を受け入れて降伏しました。' },
  { id: 3, question: '第一次世界大戦のきっかけとなった事件が起きた都市は？', options: ['サラエボ', 'パリ', 'ロンドン', 'ベルリン'], correctIndex: 0, difficulty: 'elementary_low', category: 'ww1', explanation: 'サラエボ事件（1914年）でオーストリア皇太子が暗殺され、これが大戦の引き金となりました。' },
  { id: 4, question: '第二次世界大戦を始めたドイツの指導者は？', options: ['ヒトラー', 'ビスマルク', 'ナポレオン', 'スターリン'], correctIndex: 0, difficulty: 'elementary_low', category: 'ww2', explanation: 'アドルフ・ヒトラーがドイツの独裁者となり、1939年にポーランドに侵攻して大戦が始まりました。' },
  { id: 5, question: '第二次世界大戦で日本と戦った主な国は？', options: ['アメリカ', 'ブラジル', 'スイス', 'スウェーデン'], correctIndex: 0, difficulty: 'elementary_low', category: 'ww2', explanation: 'アメリカは1941年の真珠湾攻撃をきっかけに日本と戦いました。' },
  { id: 6, question: '第一次世界大戦が終わったのは何年？', options: ['1918年', '1914年', '1945年', '1920年'], correctIndex: 0, difficulty: 'elementary_low', category: 'ww1', explanation: '第一次世界大戦は1918年11月11日に休戦協定が結ばれ終結しました。' },
  { id: 7, question: '第二次世界大戦が始まったのは何年？', options: ['1939年', '1914年', '1945年', '1929年'], correctIndex: 0, difficulty: 'elementary_low', category: 'ww2', explanation: '1939年9月、ドイツがポーランドに侵攻し、第二次世界大戦が始まりました。' },
  { id: 8, question: '日本が真珠湾を攻撃したのは何年？', options: ['1941年', '1939年', '1945年', '1937年'], correctIndex: 0, difficulty: 'elementary_low', category: 'ww2', explanation: '1941年12月8日（日本時間）、日本軍がハワイの真珠湾を攻撃しました。' },
  { id: 9, question: '第一次世界大戦でドイツと同盟を組んだ国は？', options: ['オーストリア', 'フランス', 'ロシア', 'イギリス'], correctIndex: 0, difficulty: 'elementary_low', category: 'ww1', explanation: 'ドイツ・オーストリア・オスマン帝国が「同盟国」として戦いました。' },
  { id: 10, question: 'アフリカ大陸を多くの国が植民地にしたのは何世紀ごろ？', options: ['19世紀', '15世紀', '21世紀', '12世紀'], correctIndex: 0, difficulty: 'elementary_low', category: 'imperialism', explanation: '19世紀後半、ヨーロッパ諸国がアフリカの大部分を植民地にしました。' },
  { id: 11, question: '第二次世界大戦で原子爆弾が落とされた日本の都市は？', options: ['広島', '東京', '大阪', '京都'], correctIndex: 0, difficulty: 'elementary_low', category: 'ww2', explanation: '1945年8月6日に広島、8月9日に長崎に原子爆弾が投下されました。' },
  { id: 12, question: 'イギリスがインドを植民地にしていた時代に有名な独立運動家は？', options: ['ガンジー', 'ナポレオン', 'リンカーン', 'チャーチル'], correctIndex: 0, difficulty: 'elementary_low', category: 'imperialism', explanation: 'マハトマ・ガンジーは非暴力でインドの独立運動を指導しました。' },
  { id: 13, question: '第一次世界大戦で「連合国」側でなかった国は？', options: ['オスマン帝国', 'フランス', 'イギリス', 'ロシア'], correctIndex: 0, difficulty: 'elementary_low', category: 'ww1', explanation: 'オスマン帝国はドイツ側の「同盟国」として参戦しました。' },
  { id: 14, question: '第二次世界大戦でドイツが最初に侵攻した国は？', options: ['ポーランド', 'フランス', 'イギリス', 'ソ連'], correctIndex: 0, difficulty: 'elementary_low', category: 'ww2', explanation: '1939年9月1日、ドイツはポーランドに侵攻し大戦が始まりました。' },
  { id: 15, question: '植民地とはどういう意味？', options: ['他の国に支配された土地', '自分の国の首都', '戦争のない場所', '王様が住む城'], correctIndex: 0, difficulty: 'elementary_low', category: 'imperialism', explanation: '植民地とは、強い国が他の地域を力で支配し、資源や労働力を奪った土地のことです。' },
  { id: 16, question: '第一次世界大戦で初めて大量に使われた乗り物は？', options: ['戦車', '宇宙船', '自転車', '蒸気機関車'], correctIndex: 0, difficulty: 'elementary_low', category: 'ww1', explanation: '第一次世界大戦では、戦車・飛行機・潜水艦が初めて本格的に使われました。' },

  // =============================================
  // elementary_high（小5-6）: 因果関係や背景を問う問題 15問
  // =============================================
  { id: 17, question: '第一次世界大戦で使われた新兵器でないものは？', options: ['核兵器', '戦車', '毒ガス', '飛行機'], correctIndex: 0, difficulty: 'elementary_high', category: 'ww1', explanation: '核兵器が初めて使われたのは第二次世界大戦（1945年）です。' },
  { id: 18, question: '国際連盟を提唱したアメリカの大統領は？', options: ['ウィルソン', 'ルーズベルト', 'トルーマン', 'リンカーン'], correctIndex: 0, difficulty: 'elementary_high', category: 'ww1', explanation: 'ウッドロウ・ウィルソン大統領が「十四か条の平和原則」で国際連盟を提唱しました。' },
  { id: 19, question: 'ヨーロッパの国々がアフリカを分割したのを決めた会議は？', options: ['ベルリン会議', '東京会議', 'パリ会議', 'ウィーン会議'], correctIndex: 0, difficulty: 'elementary_high', category: 'imperialism', explanation: '1884-85年のベルリン会議で、ヨーロッパ諸国がアフリカの分割ルールを決めました。' },
  { id: 20, question: '第一次世界大戦後にドイツが結ばされた条約は？', options: ['ヴェルサイユ条約', 'ポーツマス条約', '南京条約', 'ウェストファリア条約'], correctIndex: 0, difficulty: 'elementary_high', category: 'ww1', explanation: 'ヴェルサイユ条約（1919年）でドイツは領土縮小・軍備制限・多額の賠償金を課されました。' },
  { id: 21, question: '帝国主義の時代、イギリスが支配していた地域として正しいのは？', options: ['インド', '中国全土', '南アメリカ大陸', '北極'], correctIndex: 0, difficulty: 'elementary_high', category: 'imperialism', explanation: 'イギリスは「太陽の沈まない国」と呼ばれ、インドはその最大の植民地でした。' },
  { id: 22, question: '第二次世界大戦中、ユダヤ人が大量に殺害されたことを何という？', options: ['ホロコースト', 'ルネサンス', '産業革命', '宗教改革'], correctIndex: 0, difficulty: 'elementary_high', category: 'ww2', explanation: 'ナチス・ドイツによる約600万人のユダヤ人虐殺をホロコーストと呼びます。' },
  { id: 23, question: '第一次世界大戦で塹壕戦（ざんごうせん）が多かった戦場は？', options: ['西部戦線', '太平洋', 'アフリカ', '南アメリカ'], correctIndex: 0, difficulty: 'elementary_high', category: 'ww1', explanation: 'フランスとベルギーの西部戦線で、両軍が塹壕を掘って長期間にらみ合いました。' },
  { id: 24, question: 'なぜヨーロッパの国々は植民地を欲しがったの？', options: ['資源と市場がほしかったから', '旅行が好きだったから', '植民地の文化を学ぶため', '植民地で休暇をすごすため'], correctIndex: 0, difficulty: 'elementary_high', category: 'imperialism', explanation: '産業革命で工場が増え、原料の調達先と製品の売り先（市場）が必要になりました。' },
  { id: 25, question: '第二次世界大戦の「連合国」に含まれない国は？', options: ['日本', 'アメリカ', 'イギリス', 'ソ連'], correctIndex: 0, difficulty: 'elementary_high', category: 'ww2', explanation: '日本はドイツ・イタリアと「枢軸国」側でした。連合国はアメリカ・イギリス・ソ連・中国などです。' },
  { id: 26, question: '第二次世界大戦後にできた、日本の新しい法律は？', options: ['日本国憲法', '大日本帝国憲法', '十七条の憲法', '御成敗式目'], correctIndex: 0, difficulty: 'elementary_high', category: 'ww2', explanation: '1947年に施行された日本国憲法は、戦争放棄と国民主権を定めました。' },
  { id: 27, question: '「アヘン戦争」でイギリスが戦った相手の国は？', options: ['中国（清）', 'インド', 'エジプト', 'トルコ'], correctIndex: 0, difficulty: 'elementary_high', category: 'imperialism', explanation: 'イギリスはアヘン貿易をめぐって中国の清と戦争し、香港を手に入れました。' },
  { id: 28, question: '第一次世界大戦の同盟関係で、三国協商に含まれない国は？', options: ['ドイツ', 'フランス', 'ロシア', 'イギリス'], correctIndex: 0, difficulty: 'elementary_high', category: 'ww1', explanation: '三国協商はイギリス・フランス・ロシアの同盟。ドイツは三国同盟（独・墺・伊）側でした。' },
  { id: 29, question: '第二次世界大戦中に日本が占領した地域は？', options: ['東南アジア', '南アメリカ', 'ヨーロッパ', 'オーストラリア全土'], correctIndex: 0, difficulty: 'elementary_high', category: 'ww2', explanation: '日本は「大東亜共栄圏」を掲げ、東南アジアの広い地域を占領しました。' },
  { id: 30, question: '帝国主義の時代に日本が植民地にした地域は？', options: ['朝鮮半島', 'インド', 'エジプト', 'ブラジル'], correctIndex: 0, difficulty: 'elementary_high', category: 'imperialism', explanation: '日本は1910年に朝鮮半島を併合し、植民地支配を行いました。' },
  { id: 31, question: '第一次世界大戦で沈められた客船の名前は？', options: ['ルシタニア号', 'タイタニック号', 'メイフラワー号', 'ビクトリア号'], correctIndex: 0, difficulty: 'elementary_high', category: 'ww1', explanation: 'ルシタニア号はドイツの潜水艦に沈められ、アメリカの参戦のきっかけの一つになりました。' },

  // =============================================
  // junior_high（中1-2）: 多角的な視点、複数の事象の関連 15問
  // =============================================
  { id: 32, question: 'ヴェルサイユ条約でドイツに課された賠償金が引き起こした問題は？', options: ['ハイパーインフレ', '植民地拡大', '軍備増強', '人口減少'], correctIndex: 0, difficulty: 'junior_high', category: 'ww1', explanation: '巨額の賠償金でドイツ経済は崩壊し、紙幣の価値が暴落するハイパーインフレが起きました。' },
  { id: 33, question: '第二次世界大戦後に設立された国際機関は？', options: ['国際連合', '国際連盟', 'NATO', 'EU'], correctIndex: 0, difficulty: 'junior_high', category: 'ww2', explanation: '国際連合（国連）は1945年に設立。国際連盟の反省を活かし、安全保障理事会を持ちます。' },
  { id: 34, question: '帝国主義の背景にある「社会ダーウィニズム」とは？', options: ['強い国が弱い国を支配するのは自然だという考え', '全ての国は平等だという考え', '戦争をなくそうという思想', '宗教を広めるための理論'], correctIndex: 0, difficulty: 'junior_high', category: 'imperialism', explanation: 'ダーウィンの進化論を社会に当てはめ、「優れた民族が劣った民族を支配するのは当然」とする差別的な思想です。' },
  { id: 35, question: 'ヒトラーが政権を握れた背景として最も大きいのは？', options: ['世界恐慌による大量失業', '王様の命令', '国民投票で圧勝', '他国からの支援'], correctIndex: 0, difficulty: 'junior_high', category: 'ww2', explanation: '1929年の世界恐慌でドイツ経済が壊滅し、不満を持つ国民がナチ党を支持しました。' },
  { id: 36, question: '「冷戦」とは何か？', options: ['アメリカとソ連の直接戦わない対立', 'とても寒い場所での戦争', '北極をめぐる争い', '第三次世界大戦の別名'], correctIndex: 0, difficulty: 'junior_high', category: 'ww2', explanation: '第二次世界大戦後、アメリカ（資本主義）とソ連（社会主義）が直接戦争せず対立した状態です。' },
  { id: 37, question: 'マンデラが戦った南アフリカの人種差別政策は？', options: ['アパルトヘイト', 'ホロコースト', 'ジェノサイド', 'ファシズム'], correctIndex: 0, difficulty: 'junior_high', category: 'imperialism', explanation: 'アパルトヘイトは南アフリカで白人が黒人を法律で差別した政策で、1991年に廃止されました。' },
  { id: 38, question: '第一次世界大戦が「総力戦」と呼ばれる理由は？', options: ['軍だけでなく国全体の経済・国民が動員されたから', '全ての国が参加したから', '全ての武器が使われたから', '戦争が全大陸で行われたから'], correctIndex: 0, difficulty: 'junior_high', category: 'ww1', explanation: '工場も女性も含め国家の全資源を投入する「総力戦」は、近代戦争の特徴です。' },
  { id: 39, question: '国際連盟が戦争を防げなかった最大の理由は？', options: ['軍事力による制裁手段がなかったから', '加盟国が少なすぎたから', '資金がなかったから', '本部がスイスにあったから'], correctIndex: 0, difficulty: 'junior_high', category: 'ww1', explanation: '国際連盟には軍事制裁の仕組みがなく、アメリカも不参加で実効性に欠けました。' },
  { id: 40, question: '日本の満州事変（1931年）が国際社会に与えた影響は？', options: ['国際連盟からの脱退につながった', 'アメリカとの同盟が強化された', '中国と和平が成立した', 'ヨーロッパで歓迎された'], correctIndex: 0, difficulty: 'junior_high', category: 'ww2', explanation: '満州事変後、国際連盟がリットン調査団を派遣。日本は勧告を拒否し1933年に脱退しました。' },
  { id: 41, question: '帝国主義時代の「分割統治」とは？', options: ['植民地の人々を対立させて支配する方法', '植民地を平等に分ける方法', '植民地に自治を認める方法', '植民地で選挙を行う方法'], correctIndex: 0, difficulty: 'junior_high', category: 'imperialism', explanation: '支配者が被支配者の民族・宗教間の対立をあおり、団結を防いで統治する手法です。' },
  { id: 42, question: '第二次世界大戦後のニュルンベルク裁判の意義は？', options: ['戦争犯罪を国際法で裁いた初の裁判', 'ドイツの賠償金を決めた裁判', '植民地の独立を決めた裁判', '国際連合を設立するための裁判'], correctIndex: 0, difficulty: 'junior_high', category: 'ww2', explanation: 'ナチスの戦争犯罪を裁くニュルンベルク裁判は、国際刑事法の基礎を築きました。' },
  { id: 43, question: '第一次世界大戦でオスマン帝国が崩壊した結果、中東で起きたことは？', options: ['イギリスとフランスが中東を分割統治した', '中東諸国がすぐに独立した', 'アメリカが中東を支配した', '中東に平和が訪れた'], correctIndex: 0, difficulty: 'junior_high', category: 'ww1', explanation: 'サイクス・ピコ協定により英仏が中東を分割。現在の中東問題の遠因となっています。' },
  { id: 44, question: '植民地支配が現代のアフリカに残した問題は？', options: ['民族を無視した国境線による紛争', '豊かすぎる資源の管理', '人口が減りすぎた問題', '鉄道が多すぎる問題'], correctIndex: 0, difficulty: 'junior_high', category: 'imperialism', explanation: 'ヨーロッパが民族分布を無視して引いた直線的な国境が、独立後の民族紛争の原因になりました。' },
  { id: 45, question: '第二次世界大戦中の「大西洋憲章」が掲げた原則は？', options: ['民族自決と自由貿易', '植民地の維持', '軍事力による平和', '一つの国による世界支配'], correctIndex: 0, difficulty: 'junior_high', category: 'ww2', explanation: '1941年にルーズベルトとチャーチルが発表。民族自決の原則は戦後の植民地独立を後押ししました。' },
  { id: 46, question: 'なぜ第一次世界大戦は「ヨーロッパの自殺」と呼ばれた？', options: ['ヨーロッパの国力と影響力が大きく衰えたから', 'ヨーロッパ人が全員亡くなったから', 'ヨーロッパ大陸が沈んだから', 'ヨーロッパの文化がなくなったから'], correctIndex: 0, difficulty: 'junior_high', category: 'ww1', explanation: '大戦でヨーロッパは何百万もの命と経済力を失い、世界の中心はアメリカに移りました。' },
];

// --- Game Phase ---
export type GamePhase =
  | 'setup'       // 初期配置フェーズ
  | 'rolling'
  | 'action'
  | 'building'
  | 'trading'
  | 'event'
  | 'quiz'        // クイズ出題中（7が出た時）
  | 'ai_turn'
  | 'handoff'     // ローカル対戦: 端末渡し画面
  | 'finished';

// --- Setup Sub-Phase ---
export type SetupStep = 'place_settlement' | 'place_road';

// --- Difficulty ---
export type Difficulty = 'easy' | 'normal' | 'hard';

// --- Player Slot (ゲーム作成画面用) ---
export interface PlayerSlot {
  type: 'human' | 'ai';
  name: string;
  countryIndex: number;
}

// --- Game State ---
export interface GameState {
  roomId: string;
  players: Player[];
  tiles: GameTile[];
  vertices: Vertex[];
  edges: Edge[];
  settlements: Settlement[];
  roads: Road[];
  ports: Port[];
  currentPlayerIndex: number;
  currentTurn: number;
  maxTurns: number;
  phase: GamePhase;
  diceResult: [number, number] | null;
  difficulty: Difficulty;
  gameLog: GameLogEntry[];
  currentEvent: EventCard | null;
  winner: Player | null;
  // Setup phase state
  setupPhase: {
    currentPlayerIndex: number;
    round: number;       // 1 or 2 (each player places 2 settlements)
    step: SetupStep;
    lastPlacedVertexId: string | null;
  } | null;
  // Longest road tracking
  longestRoadPlayerId: string | null;
}

export interface GameLogEntry {
  id: string;
  message: string;
  type: 'info' | 'resource' | 'build' | 'event' | 'trade' | 'system' | 'road';
  timestamp: number;
  playerId?: string;
}

// --- Player Colors ---
export const PLAYER_COLORS = [
  { color: '#E74C3C', name: '赤', flagEmoji: '🇯🇵', countryName: '日本' },
  { color: '#3498DB', name: '青', flagEmoji: '🇬🇧', countryName: 'イギリス' },
  { color: '#2ECC71', name: '緑', flagEmoji: '🇫🇷', countryName: 'フランス' },
  { color: '#F39C12', name: '黄', flagEmoji: '🇩🇪', countryName: 'ドイツ' },
  { color: '#9B59B6', name: '紫', flagEmoji: '🇺🇸', countryName: 'アメリカ' },
  { color: '#1ABC9C', name: '水色', flagEmoji: '🇮🇹', countryName: 'イタリア' },
];

// --- Port (港) ---
export interface Port {
  id: string;
  vertexIds: string[];  // この港に隣接する頂点（2つ）
  type: 'general' | ResourceType;  // general=3:1、資源港=2:1
}

export const TRADE_RATE_DEFAULT = 4;
export const TRADE_RATE_GENERAL_PORT = 3;
export const TRADE_RATE_SPECIAL_PORT = 2;

// --- Build Costs ---
export const BUILD_COSTS = {
  settlement: { rubber: 1, food: 1, gold: 1, oil: 1 } as Partial<Resources>,
  city:       { oil: 2, gold: 2, food: 1 } as Partial<Resources>,
  road:       { rubber: 1, oil: 1 } as Partial<Resources>,
};

// --- Victory Points ---
export const VP_VALUES = {
  settlement: 1,
  city: 2,
  road: 0,
  longestRoad: 2,
};

// --- Winning Score ---
export const WINNING_SCORE: Record<Difficulty, number> = {
  easy: 8,
  normal: 10,
  hard: 12,
};

// --- Map Layout (3-4-5-4-3 hex grid) ---
export const HEX_LAYOUT: { q: number; r: number }[] = [
  // Row 0 (3 tiles)
  { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
  // Row 1 (4 tiles)
  { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 2, r: 1 },
  // Row 2 (5 tiles)
  { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 2, r: 2 },
  // Row 3 (4 tiles)
  { q: -2, r: 3 }, { q: -1, r: 3 }, { q: 0, r: 3 }, { q: 1, r: 3 },
  // Row 4 (3 tiles)
  { q: -2, r: 4 }, { q: -1, r: 4 }, { q: 0, r: 4 },
];

// --- Tile Distribution ---
export const TILE_DISTRIBUTION: TileType[] = [
  'rubber', 'rubber', 'rubber', 'rubber', 'rubber',
  'oil', 'oil', 'oil', 'oil',
  'gold', 'gold', 'gold', 'gold',
  'food', 'food', 'food', 'food', 'food',
  'desert',
];

// --- Dice Numbers (excluding 7, distributed across non-sea/non-desert tiles) ---
export const DICE_NUMBERS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

// =============================================
// LARGE MAP (4-5-6-5-4 layout for 5-6 players)
// =============================================
export const HEX_LAYOUT_LARGE: { q: number; r: number }[] = [
  // Row 0 (4 tiles)
  { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 },
  // Row 1 (5 tiles)
  { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 3, r: 1 },
  // Row 2 (6 tiles)
  { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 2, r: 2 }, { q: 3, r: 2 },
  // Row 3 (5 tiles)
  { q: -2, r: 3 }, { q: -1, r: 3 }, { q: 0, r: 3 }, { q: 1, r: 3 }, { q: 2, r: 3 },
  // Row 4 (4 tiles)
  { q: -2, r: 4 }, { q: -1, r: 4 }, { q: 0, r: 4 }, { q: 1, r: 4 },
];

export const TILE_DISTRIBUTION_LARGE: TileType[] = [
  'rubber', 'rubber', 'rubber', 'rubber', 'rubber', 'rubber',
  'oil', 'oil', 'oil', 'oil', 'oil',
  'gold', 'gold', 'gold', 'gold', 'gold',
  'food', 'food', 'food', 'food', 'food', 'food', 'food',
  'desert',
];

export const DICE_NUMBERS_LARGE = [2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 11, 11, 12];

export const ROWS_LARGE = [4, 5, 6, 5, 4];

// --- Event Cards Data ---
// EVENT_CARDS is now defined in './eventCards.ts'. Re-export for backwards compat.
export { EVENT_CARDS } from './eventCards';
