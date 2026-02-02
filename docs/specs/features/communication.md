# Spec: Communication (コミュニケーション)

## 1. Context
交渉におけるユーザー間の対話を担う機能。
契約書全体に対する「チャット」と、特定の箇所に対する「コメント」の2種類を提供する。

## 2. Backend Spec

### API Endpoints

#### `POST /api/contracts/:id/chat`
チャットメッセージを送信。

- **Request**: `{ content: string }`
- **Logic**: WebSocketで `chat.message` イベントをルーム全員にブロードキャスト。

#### `GET /api/contracts/:id/chat`
チャット履歴の取得（ページネーション対応）。

#### `POST /api/contracts/:id/comments`
特定のバージョン・座標に対するコメントを作成。

- **Request**:
  - `versionId`: 紐付くバージョンID。
  - `content`: コメント本文。
  - `highlight`: `{ page: number, rects: number[], text: string }` (PDF上の座標)。
- **Logic**: コメントはバージョンに強く紐付く（バージョンが変わると座標がずれるため、新版には持ち越さないか、別途移行ロジックが必要。現状は「バージョン固有」とする）。

#### `POST /api/contracts/:id/comments/:commentId/reply`
コメントスレッドへの返信。

### Real-time Specs (WebSocket)
- **Namespace**: `/contracts`
- **Room**: `contract:{id}`
- **Events**:
  - `chat:new`: `ChatMessage`
  - `comment:new`: `Comment`
  - `comment:update`: `Comment` (Resolved status etc.)

---

## 3. Frontend Spec

### Components

#### `ChatPanel`
- **Features**:
  - メッセージリストの表示。
  - 自動スクロール制御（新着時）。
  - 送信フォーム。

#### `CommentOverlayLayer`
- **Role**: `DocumentViewer` の上に透明なレイヤーとして配置される。
- **Logic**:
  - APIから取得した `highlight` 座標に基づき、ハイライト矩形を描画。
  - ハイライトクリックで、サイドバーを `ThreadPanel` モードに切り替える。

#### `ThreadPanel`
- **Role**: 選択されたコメントスレッドの詳細表示と返信。
- **UI**:
  - 「解決にする」ボタン（スレッドをクローズ）。
