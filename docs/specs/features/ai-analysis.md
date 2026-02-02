# Spec: AI Analysis (インテリジェンス)

## 1. Context
LLMを用いて契約書を解析し、付加価値情報（サマリー、日付、解説）を提供する機能群。
処理は時間がかかるため、基本的に非同期（Async Job）として設計される。

## 2. Backend Spec

### Async Job: `AnalyzeContractJob`
- **Trigger**: `document-versioning` 機能により新しいファイルがアップロードされた時。
- **Steps**:
  1. **Text Extraction**: PDF/Wordからテキストを抽出。
  2. **LLM Request**: プロンプト「この契約書の要点3つ、契約終了日、更新条件を抽出せよ」を送信。
  3. **Persist**: 結果を `ContractSummary` と `TimelineEvent` テーブルに保存。
  4. **Notify**: クライアントへ解析完了を通知。

### API Endpoints

#### `GET /api/contracts/:id/summary`
解析済みのサマリーを取得。解析中の場合は `status: PROCESSING` を返す。

#### `GET /api/contracts/:id/timeline`
抽出された日付イベント（契約開始日、終了日など）を取得。

#### `POST /api/contracts/:id/ai/explain` (Streaming)
部分的なテキストの解説生成。

- **Request**: `{ text: string, context: string }`
- **Response**: SSE (Server-Sent Events) Stream
- **Logic**: ステートレスにLLMを呼び出し、結果をストリーミングする。DB保存は不要（一時的な対話のため）。

---

## 3. Frontend Spec

### Components

#### `AiSummaryCard`
- **Logic**:
  - データが `PROCESSING` の場合、スケルトンローダーまたは「AIが解析中...」のアニメーションを表示。
  - データを受信次第、フェードインで表示。

#### `TimelineWidget`
- **Features**:
  - 日付イベントのリスト表示。
  - ユーザーによる日付の手動修正 UI（AIの誤りを訂正するため）。
  - 修正された日付は `isUserModified: true` としてBackendへPUTし、次回のAI解析で上書きされないように保護する。

#### `ExplanationPopover`
- **Features**:
  - テキスト解説のストリーミング表示。
  - マークダウンレンダリング対応。
