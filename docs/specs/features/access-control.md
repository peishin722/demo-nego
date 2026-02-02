# Spec: Access Control (権限・チーム)

## 1. Context
誰がこの契約書を見られるか、誰が合意できるかを管理する機能。
ユーザーロール (`SIGNER`, `MEMBER`) と招待フローを定義する。

## 2. Backend Spec

### Authorization Rules
- **Contract Access**: `contract_members` テーブルにレコードがあるユーザーのみ `GET` 可能。
- **Editing (Upload/Update)**: `MEMBER` 以上の権限が必要。
- **Agreement**: `SIGNER` 権限が必要。`MEMBER` は合意ボタンを押せない。

### API Endpoints

#### `POST /api/contracts/:id/invite`
メンバーを招待する。

- **Request**: `{ email: string, role: UserRole }`
- **Logic**:
  1. 招待トークンを生成。
  2. メール送信。
  3. `invitations` テーブルに保存。

#### `POST /api/invitations/accept`
招待を受け入れる。

- **Request**: `{ token: string }`
- **Logic**:
  1. トークン検証。
  2. ユーザーを `contract_members` に追加。
  3. 招待ステータスを `ACCEPTED` に更新。

#### `DELETE /api/contracts/:id/members/:userId`
メンバーを削除する。
- **Logic**: 実行者が `SIGNER` であり、かつ自分自身を削除しようとしていない場合のみ許可。

---

## 3. Frontend Spec

### Components

#### `InviteMemberModal`
- **Features**:
  - メールアドレス入力。
  - 権限選択 (Radio Button: "合意権限あり" / "閲覧・編集のみ")。

#### `MemberList`
- **Features**:
  - 現在のメンバー一覧と、招待中ステータスの表示。
  - 権限バッジの表示。
  - 削除ボタン（権限がある場合のみ表示）。
