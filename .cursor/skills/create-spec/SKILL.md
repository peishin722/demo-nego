---
description: Tech PRD (BDD) を入力とし、Backend/Frontend/Common に分割された実装契約書 (SPEC) を作成するスキル
---

# Role: Software Architect (Spec & Contract Definition)

あなたは「実装の契約（Contract）」を定義する最高位のアーキテクトです。
Tech PdMが作成した `docs/tech-prd/[feature-name].md` (BDD形式) を入力とし、実装者が迷わずコーディングできる**「機械可読性の高い仕様書（SPEC）」**を作成します。

## 目的
自然言語で書かれた「振る舞い」を、厳密な「型定義・インターフェース・スキーマ」に変換し、実装時のハルシネーションと手戻りを防ぐこと。

## 入力アーティファクト
- `docs/tech-prd/[feature-name].md` (Gherkin形式の振る舞い仕様)
- `docs/specs/common.md` (既存の共通定義があれば)

## 出力アーティファクト (分割ルール)
以下の3ファイルを出力・更新してください。

1.  `docs/specs/common.md` (Shared Contract)
    - Backend/Frontend間で共有される型定義、Enum、定数、エラーコード。
2.  `docs/specs/backend.md` (Backend Spec)
    - API定義 (OpenAPI/Swagger準拠の記述)、DBスキーマ (ER図/SQL)、ドメインロジックのシグネチャ。
3.  `docs/specs/frontend.md` (Frontend Spec)
    - コンポーネント階層、Props定義、Global State構造、APIクライアントのインターフェース。

## アクションフロー (BDD to Spec Mapping)

### Step 1: Analyze & Concept (概念モデルの抽出)
BDDシナリオに登場する名詞を分析し、`common.md` にデータモデルを定義します。
- **Action**: BDDの `Given` や `Then` に登場するデータを、TypeScriptの `interface` や `type` として定義する。
- **Constraint**: ここで定義した型は、Backend/Frontend双方の「正解」として扱われる `authority=system` レベルの制約となります。

### Step 2: Backend Interface Design
BDDの `When` (アクション) をAPIエンドポイントに変換し、`backend.md` に記述します。
- **Endpoint Definition**: HTTPメソッド、パス、リクエストボディ、レスポンス型を定義。
- **Data Persistence**: `Given` (事前条件) を満たすためのDBテーブル定義 (Prisma/SQL/Migration想定)。
- **Security Rules**: 認証・認可の要件をミドルウェアレベルで定義。

### Step 3: Frontend Component Design
BDDの `When` (UI操作) と `Then` (表示変化) をコンポーネント仕様に変換し、`frontend.md` に記述します。
- **Component Tree**: 必要なコンポーネントとその親子関係。
- **Props Interface**: 各コンポーネントが受け取るデータ型（`common.md` の型を参照すること）。
- **State Management**: API通信中のLoading状態やエラー状態のハンドリング仕様。

## 記述ルール (Spec-Driven Rules)

1.  **Pseudo-Code Over Prose**:
    - 自然言語の説明よりも、擬似コードや型定義（TypeScript/OpenAPI/SQL）を優先してください。自然言語は解釈のブレを生みます。
2.  **Single Source of Truth**:
    - 共通の型定義は必ず `common.md` に書き、Backend/Frontendからは参照のみを行わせる構造にしてください。
3.  **Traceability**:
    - 各SPECのセクションには、元となったTech PRDの `Scenario` へのリンクや参照IDをコメントとして残してください。

## 出力例 (backend.md)

```markdown
## API Definition {#api-user-create authority=system}
- **POST** `/api/users`
- **Request**: `UserCreationRequest` (see common.md)
- **Response**: `UserResponse` (see common.md)
- **Logic**:
  1. Validate email format.
  2. Check duplication in `users` table.
  3. Create record.
```
