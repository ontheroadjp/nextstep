# 仕様書（Specification）

## 概要

本仕様書では、本プロダクトにおける主要概念と、
それぞれの役割・意味を定義する。
ここでは UI や実装技術ではなく、
**実装レベルに直結する概念設計**を中心に記述する。

---

## タスク（Task）

### 基本的な考え方

- タスクにアクティブ／非アクティブの状態は存在しない
- 完了していないタスクは、すべて「未完了タスク」である
- タスクの意味は、日付・Someday・表示視点によって決まる
- 日付は 1 つだけ持つ（今日 / 未来日 / 未設定）

---

### タスクが持つ属性（概念）

    - 日付（date）
    - Someday フラグ
    - 完了日時（completedAt）
    - ノート（note）
    - Area / Project への所属
    - チェックリスト（複数）

---

### Project

Project は複数のタスクを束ねる任意の単位である。

- タスクは Project に所属してもしなくてもよい
- Project は Area に属してもしなくてもよい
- Project に属さないタスクは、Project と同列の概念として扱う
- Project には 1 つの note を必須とする

---

### Checklist

Checklist はタスク内の下位項目である。

- 日付は持たない
- 完了 / 未完了のみを持つ
- タスク 1 件につき複数を持つ

---

### 日付と分類ルール

- 日付は 1 つだけ保持する（時刻は持たない）
- 日付境界はユーザーのローカル 0:00
- Someday を設定すると date は解除される
- date を設定すると Someday は解除される

未完了タスクの分類は以下の通り。

- Someday: Someday が true
- Anytime: date が未設定
- Today: date が今日または過去日付
- Upcoming: date が未来日付

---

### 並び順の基本ルール

- date があるタスクは日付順に並べる
- date がないタスクはドラッグ＆ドロップで順序を変更できる

---

## 最小行動フロー

### タスク追加

- 追加時は Inbox / Anytime に入る（date 未設定、Someday なし）
- 必須入力は title と note

### 日付設定

- 日付設定画面で「Today / 明日以降の日付 / Someday / 未設定」を選択できる
- Someday を選ぶと date は解除される
- date を選ぶと Someday は解除される

### 完了

- 完了すると completedAt が設定され、Logbook に移動する
- 完了タスクは Today / Upcoming / Anytime / Someday には表示しない

### 並び替え

- date 未設定のタスクはドラッグ＆ドロップで並び替えできる

---

## 画面構成と表示ルール

### Today

- date が今日または過去日付の未完了タスクを表示する
- date 昇順で並ぶ（過去日付が先）

### Upcoming

- date が未来日付の未完了タスクを表示する
- 日付ごとにグルーピングする
- 日付グループ内は date 昇順

### Anytime

- date が未設定の未完了タスクを表示する
- ドラッグ＆ドロップ順で表示する

### Someday

- Someday が true の未完了タスクを表示する
- date は常に未設定

### Inbox

- Area 未所属のタスクを表示する
- 表示内容は Today / Upcoming / Anytime / Someday と重複しうる

### Area

- Area 内はミニダッシュボードとして表示する
- Today / Upcoming / Anytime / Someday の区分で表示する
- 表示ロジックは全体ビューと同じ

### Project

- Project 内もミニダッシュボードとして表示する
- Today / Upcoming / Anytime / Someday の区分で表示する
- 表示ロジックは全体ビューと同じ

### Logbook

- completedAt が設定されたタスクを表示する
- completedAt 降順で表示する

---

## 日付選択 UI のルール

- 日付選択画面に「Today / 明日以降の日付 / Someday / 未設定」を用意する
- Someday を押すと date を解除し Someday = true
- 日付を選ぶと Someday = false
- 未設定を選ぶと date と Someday の両方を解除する

---

## チェックリストの最小フロー

- タスクには複数のチェックリスト項目を追加できる
- 各項目は「完了 / 未完了」だけを持つ
- チェックリスト項目はドラッグ＆ドロップで並び替えできる

---

## 入力・バリデーション

- Task / Project の title は必須
- Task / Project の note は必須
- 空文字や空白のみの入力は無効

---

## 並び順の詳細ルール

- Today は date 昇順、同一日付内は sortKey 昇順（未設定は createdAt 昇順）
- Upcoming は日付グループ昇順、グループ内は sortKey 昇順（未設定は createdAt 昇順）
- Anytime / Someday は sortKey 昇順（未設定は createdAt 昇順）

---

## 画面遷移の最小ルール

- 追加 / 編集はフルスクリーンで行う
- 保存後は直前のリストに戻る
- キャンセル時は変更を破棄し、直前のリストに戻る

---

## MVP 画面順（実装優先度）

0. Home（Dashboard）
1. Today
2. Upcoming
3. Anytime
4. Someday
5. Task 詳細（編集 + チェックリスト）
6. Logbook
7. Inbox
8. Project 一覧 / 詳細
9. Area 一覧 / 詳細

---

## Home（Dashboard）

### 表示

- Today / Upcoming / Anytime / Someday / Logbook / Inbox と同列に **Area** を表示
- カード内にタスク一覧は表示しない

### 件数表示

- **Today と Inbox のみ件数を表示**
- それぞれ **期限超過（過去日付）と当日/その他** を分けて表示
- 完了済みタスクは Logbook に入るため、Today/Inbox の件数に含めない

---

## Inbox

### 定義

Inbox はエンティティではなく、**状態から導かれるビュー**である。

- Area に未所属のタスクは、すべて Inbox として扱われる
- タスク追加時のデフォルトの置き場
- Inbox は「所属」で決まるため、Today / Upcoming / Anytime / Someday と重複しうる

---

## Anytime

### 定義

Anytime は「いつやるか決めていないタスク」の一覧である。

- date が未設定
- 未完了
- Someday ではない

---

## Today

### 定義

Today は「今日（および過去日付）やると決めたタスク」の一覧である。

- date が今日または過去日付
- 未完了
- Someday ではない

これらをすべて満たしたタスクのみが表示される。

---

## Upcoming

### 定義

Upcoming は「やることは決めたが、まだその日ではないタスク」の一覧である。

- date が未来の日付
- 未完了
- Someday ではない

日付ごとにグルーピングして表示される。

---

## Someday

### 定義

Someday は「いつかやりたいが、今は考えないタスク」の隔離領域である。

- 日付は設定できない（Someday を設定すると date は解除される）
- Today / Upcoming には一切表示されない

---

## Logbook

### 定義

Logbook は完了したタスクの履歴である。

- completedAt が設定されたタスクのみが表示される
- 完了日時の降順で表示される

---

## Area

### 定義

Area は人生や活動における継続的な責任範囲を表す。

- Area 自体は完了しない
- タスクは Area に属するか、Inbox に存在する
- Area はタスクの「意味的な文脈」を与える

---

## Area 内表示の考え方

Area は単なるタスクリストではなく、
**その Area に関するミニダッシュボード**として振る舞う。

- Today
- Upcoming
- Anytime（未設定）
- Someday

という区分で、同一ロジックを適用して表示される。
