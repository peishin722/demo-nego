# Spec: Negotiation Process (交渉プロセス)

## 1. Context
契約のライフサイクル状態（ステータス）を遷移させ、合意形成を行うビジネスロジックの中核。
「誰が合意したか」「全員合意したか」を判定し、契約をロックする。

## 2. Backend Spec

### Logic: Status Transition Machine

| Current Status | Action | Condition | Next Status | Note |
|---|---|---|---|---|
| `NEGOTIATING` | `agree` | Not all signers agreed yet | `WAITING_FOR_PARTNER` | 片方が合意 |
| `NEGOTIATING` | `agree` | All signers agreed | `AGREED` | 全員合意、即時締結 |
| `WAITING_FOR_PARTNER` | `agree` | All signers agreed | `AGREED` | 残りの人が合意 |
| `WAITING_FOR_PARTNER` | `revoke` | - | `NEGOTIATING` | 合意取り消し |
| `AGREED` | - | - | - | **Final State (Locked)** |

### API Endpoints

#### `POST /api/contracts/:id/agree`
合意を実行する。

- **Logic**:
  1. ユーザーの `has_agreed` フラグを `true` にする。
  2. ステータス遷移ロジックを評価し、契約自体のステータスを更新する。
  3. `AGREED` に遷移した場合、契約書をロック（版の追加不可）にする。
  4. 変更通知イベントを発火。

#### `POST /api/contracts/:id/revoke-agreement`
合意を取り消す。

- **Logic**:
  1. ステータスが `WAITING_FOR_PARTNER` であることを確認。
  2. ユーザーの `has_agreed` を `false` に戻す。
  3. 契約ステータスを `NEGOTIATING` に戻す。

---

## 3. Frontend Spec

### Components

#### `AgreementActionArea` (Smart)
現在のステータスと自分の合意状態に基づいて、適切なアクションボタンを表示する。

- **Props**: `contract: Contract`, `currentUser: User`
- **UI States**:
  - **Negotiating (Not Agreed)**: Primary Button "この内容で合意する"
  - **Waiting (Agreed)**: Disabled Button "相手の合意待ち" + Link "合意を取り消す"
  - **Agreed**: Success Badge "合意済み" + "ダウンロード"

#### `CelebrationEffect`
- **Trigger**: WebSocketで `status: AGREED` を受信した時。
- **UI**: 全画面の紙吹雪アニメーション (Confetti) とモーダル表示。
