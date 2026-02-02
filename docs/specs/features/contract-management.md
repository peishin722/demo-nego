# Spec: Contract Management (契約管理)

## 1. Context
契約書プロジェクト自体のライフサイクル（作成、検索、閲覧）を管理する機能群。
ファイルのバージョン管理や合意プロセスは別Specに委譲し、ここでは「契約プロジェクト」というコンテナの管理に集中する。

## 2. Backend Spec

### API Endpoints

#### `GET /api/contracts`
契約書一覧を取得・検索する。

- **Query Params**:
  - `q`: 検索クエリ（タイトル、取引先名）。
  - `status`: `ContractStatus[]`（フィルタリング用）。
  - `page`, `limit`: ページネーション。
- **Logic**:
  - ユーザーが `contract_members` として参加している契約のみを対象とする。
  - `last_updated_at` の降順でソート。

#### `POST /api/contracts`
契約書プロジェクトの新規作成（コンテナ作成のみ）。
*※実際のファイルアップロードと同時に行われることが多いが、論理的にはここで契約IDが払い出される。*

- **Request**: `{ title: string, partnerName?: string }`
- **Response**: `Contract` (Status: `NEGOTIATING`)

#### `GET /api/contracts/:id`
契約書のメタデータを取得する。

- **Response**: `ContractDetail` (詳細情報 + 自分の権限 `currentUserRole`)
- **Access Control**: メンバーでない場合は `403 Forbidden`。

#### `PATCH /api/contracts/:id`
契約書情報の更新（タイトル変更など）。

- **Request**: `{ title?: string, partnerName?: string }`
- **Access Control**: `SIGNER` 権限が必要。

---

## 3. Frontend Spec

### State Management (Global Contract Store)
アプリケーション全体で共有される契約データのキャッシュと状態。

- **`useContracts(query)`**: 一覧データのフェッチとキャッシュ (React Query等)。
- **`useContract(id)`**: 特定の契約詳細のフェッチ。WebSocketイベント (`contract:updated`) を受信したら自動でキャッシュを更新する。

### Components

#### `ContractListContainer`
一覧画面のメインコンポーネント。
- 責務: データのロード、検索フィルタの適用、空状態/エラー状態のハンドリング。

#### `ContractCard`
契約書の概要表示。
- 責務: ステータスバッジの表示分け、最終更新日時のフォーマット。

#### `ContractSearchFilter`
検索バーとステータスフィルタのUI。
- 責務: 入力値のDebounce処理、クエリパラメータへの反映。
