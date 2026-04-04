# カタン方式大規模改修 TODO

## Phase 1: 型定義 (gameTypes.ts)
- [ ] Vertex型（頂点ID、隣接タイルID、隣接頂点ID、隣接辺ID）
- [ ] Edge型（辺ID、両端の頂点ID、隣接タイルID）
- [ ] Player型にisHuman/isAIフラグ追加
- [ ] Tile.structuresを廃止 → 頂点ベースのstructuresに変更
- [ ] Road型（辺ID、プレイヤーインデックス）
- [ ] Settlement型（頂点ID、プレイヤーインデックス、レベル）
- [ ] GamePhaseに'setup'（初期配置）を追加

## Phase 2: ゲームロジック (gameLogic.ts)
- [ ] generateVertices/generateEdges関数（ヘックスグリッドから頂点・辺を計算）
- [ ] distributeResources改修（頂点の隣接タイルから資源配分）
- [ ] canBuildSettlement（頂点に建設可能か判定、距離ルール含む）
- [ ] canBuildRoad（辺に道を建設可能か判定）
- [ ] buildSettlement/buildRoad関数
- [ ] longestRoad計算関数
- [ ] AI改修（頂点/辺ベースの建設判断）
- [ ] 初期配置ロジック（AI用）

## Phase 3: ストア (gameStore.ts)
- [ ] setupフェーズのフロー管理
- [ ] ローカル対戦のターン管理（人間→端末渡し画面→次の人間）
- [ ] AI/人間混在のターン処理
- [ ] 道建設アクション追加

## Phase 4: UI
- [ ] CreateRoom: プレイヤースロットのAI/人間切り替え
- [ ] HexMap: 頂点に旗を描画、辺に道を描画
- [ ] HexMap: タップで頂点/辺を選択して建設
- [ ] OpponentBar: 資源獲得ポップアップ表示
- [ ] ActionMenu: 道建設ボタン追加
- [ ] ローカル対戦の端末渡し画面
- [ ] 初期配置フェーズのUI
