# AGENTS

## Custom / Command の使い分け（AI向けルール）

- init-docs.md: repo の実態把握と設計ドキュメント生成。最初に使う。
- init-test.md: テスト基盤初期化。commands.test を確定。
- init-git.md: git 基盤初期化。ワーキングディレクトリをクリーンに保つ。
- fix.md: バグ修正専用。init-docs / init-test 完了が前提。
- change.md: 既存仕様・挙動の変更。
- feature.md: 新規機能実装。

※ custom / command は、単一のコードブロックで定義されたテキストのみを指す。
※ コードブロック外の文章は、実行・登録対象ではない。
※ AI は custom / command を自動実行しない。
  指示内容に応じて、使用すべき /command を提案・要求するために本表を用いる。
