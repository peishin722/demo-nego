# HubbleNego 製品仕様書（PRDインデックス）

> **Note:** このファイルはPRDドキュメント群のインデックス（目次）です。
> 各仕様の詳細は、以下のリンク先ドキュメントを参照してください。

---

## PRDドキュメント構成

HubbleNegoは2つの利用パターンがあり、PRDを分割して管理しています。

### 📄 [PRD_Common.md](./PRD_Common.md)
**共通仕様** - 両パターンで共通する仕様
- プロダクトビジョン・解決する課題
- ターゲットユーザー
- AI機能（サマリー、解説、タイムライン抽出）
- バージョン管理の基本概念
- リアルタイム交渉機能（チャット・コメント）
- 署名・締結フロー（マルチサイナー、署名手続きウィザード、署名画面、締結済みビューア）
- 通知設計
- 招待・権限管理（招待受領画面を含む）
- 交渉詳細画面の共通仕様（概要/契約書/関連書類タブ）
- 非機能要件
- 用語集

### 📄 [PRD_Nego_Standalone.md](./PRD_Nego_Standalone.md)
**パターン1: Nego単体利用** - Negoを単独で使う場合
- ユーザーフロー（アップロード→招待→交渉→署名→締結）
- 画面構成（index.html, negotiation.html, sign.html, invite.html, settings.html）
- 交渉一覧画面（ダッシュボード）
- 新規交渉ウィザード（Step1〜3）
- ファイルアップロード仕様

### 📄 [PRD_Nego_Hubble.md](./PRD_Nego_Hubble.md)
**パターン2: Hubble連携利用** - HubbleからNegoを使う場合
- ユーザーフロー（Hubble内「交渉相手に共有」→招待→交渉→署名→Hubbleに反映）
- Hubble側の画面変化（hubble-ui-first-share.html, hubble-ui.html）
- 交渉バナー（「交渉中 | Ver.Xを共有中」）
- コメントの区別（社内 vs 交渉）
- バージョンの双方向同期

---

## 2つの利用パターン早見表

| 項目 | Nego単体利用 | Hubble連携利用 |
|------|-------------|----------------|
| 対象ユーザー | Hubble未導入の企業・個人 | 既存Hubbleユーザー |
| 契約書のマスター | Nego | Hubble |
| 入口画面 | Negoダッシュボード | Hubbleの契約書画面 |
| 社内コメント | なし（全員に見える） | Hubble側で管理（社外に見えない） |
| バージョン管理 | Nego内で完結 | Hubbleと同期 |

---

**Document Version:** 4.0
**Last Updated:** 2026-02-10
