# Spec: Document Versioning (文書管理)

## 1. Context
契約書の「実体（ファイル）」とその「履歴（バージョン）」を管理する機能群。
PDF/Wordファイルのアップロード、保存、プレビュー、ダウンロードを担当する。

## 2. Backend Spec

### API Endpoints

#### `POST /api/contracts/:id/versions`
新しい版（リビジョン）をアップロードする。
*※新規契約作成時も、内部的には「契約作成」+「v1.0アップロード」のセットとして処理される。*

- **Request**: `Multipart/form-data` (`file`)
- **Logic**:
  1. **Validation**: `.pdf`, `.docx` のみ。Max 20MB。
  2. **Lock Check**: 契約ステータスが `AGREED` なら拒否 (`400`)。
  3. **Versioning**: 現在の最新バージョン番号を取得し、インクリメント (v1 -> v2)。
  4. **Storage**: S3等へ保存。
  5. **Post-Process**: AI解析ジョブ (`ai-analysis` feature) をキックする。

#### `GET /api/contracts/:id/versions`
バージョン履歴リストを取得。

- **Response**: `ContractVersion[]` (降順)

#### `GET /api/contracts/:id/versions/:versionId/file`
ファイル実体を取得（ダウンロード/プレビュー用）。

- **Query**: `disposition=inline|attachment`
- **Response**: Binary Stream

### Data Model Extension
`ContractVersion` エンティティには以下が含まれる：
- `file_path`: ストレージ上のパス
- `version_number`: 表示用バージョン文字列
- `created_by`: アップロード者

---

## 3. Frontend Spec

### Components

#### `UploadDropzone` (Smart)
- **Features**:
  - ドラッグ＆ドロップ検知。
  - クライアントサイドバリデーション（サイズ・拡張子）。
  - アップロード進捗表示 (`axios.onUploadProgress`)。

#### `DocumentViewer` (Smart)
- **Features**:
  - PDFレンダリング (PDF.js)。WordファイルはPDF変換プレビューURLを使用するか、簡易レンダラを使用。
  - ページネーション、ズーム操作。
  - *Communication機能* のための座標レイヤーを提供（Propsとして `onTextSelect` 等を受け取る）。

#### `VersionHistoryPanel`
- **Features**:
  - バージョンリスト表示。
  - 「現在の表示中バージョン」と「最新バージョン」の比較UI。
  - 過去バージョン閲覧時の「Read-only」アラート表示。
