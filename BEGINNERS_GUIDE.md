# 未経験者向けガイド

このプロジェクトで未経験者（4名）が担当する作業のガイドです。

## 担当範囲

未経験者の皆さんは、**HTML/CSSの編集**を担当します。
JavaScriptは経験者が既に実装済みなので、**関数を呼び出すだけ**でOKです！

### 編集できるファイル

✅ **自由に編集できる:**
- `frontend/*.html` - HTML構造
- `frontend/css/*.css` - デザイン・スタイル

⚠️ **関数呼び出しのみ（慣れてきたら編集OK）:**
- HTMLファイル内の `<script>` タグ

❌ **触らないでください:**
- `frontend/js/api.js`
- `frontend/js/utils.js`
- `frontend/js/auth.js`
- `backend/` 内のすべてのファイル

---

## 作業の進め方

### ステップ1: プロジェクトを開く

1. VS Codeでプロジェクトフォルダを開く
2. `frontend/` ディレクトリに移動

### ステップ2: デザインを確認

1. ブラウザで `http://localhost:8080` を開く
2. 各ページを見て回る:
   - トップページ（スレッド一覧）
   - ログインページ
   - サインアップページ
   - 質問投稿ページ
   - スレッド詳細ページ

### ステップ3: HTML/CSSを編集

#### HTMLの編集例

**変更前:**
```html
<h1 class="page-title">質問一覧</h1>
```

**変更後:**
```html
<h1 class="page-title">みんなの質問</h1>
```

#### CSSの編集例

**変更前 (`css/common.css`):**
```css
.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1a73e8;
}
```

**変更後:**
```css
.logo {
  font-size: 2rem;  /* サイズを大きく */
  font-weight: bold;
  color: #ff6b6b;  /* 色を赤系に変更 */
  text-shadow: 2px 2px 4px rgba(0,0,0,0.1);  /* 影を追加 */
}
```

---

## よく使うCSSプロパティ

### 色を変更

```css
color: #333;              /* 文字色 */
background-color: #fff;   /* 背景色 */
border-color: #ddd;       /* 枠線の色 */
```

**カラーコード例:**
- `#1a73e8` - 青
- `#4caf50` - 緑
- `#f44336` - 赤
- `#ff9800` - オレンジ
- `#9c27b0` - 紫

### サイズを変更

```css
font-size: 1.5rem;     /* 文字サイズ */
padding: 1rem;         /* 内側の余白 */
margin: 2rem;          /* 外側の余白 */
width: 100%;           /* 幅 */
height: 50px;          /* 高さ */
```

### レイアウト

```css
display: flex;           /* フレックスボックス */
justify-content: center; /* 水平方向の配置 */
align-items: center;     /* 垂直方向の配置 */
gap: 1rem;              /* 要素間の間隔 */
```

### 角丸・影

```css
border-radius: 8px;                      /* 角丸 */
box-shadow: 0 2px 4px rgba(0,0,0,0.1);  /* 影 */
```

---

## JavaScriptの使い方（関数呼び出しのみ）

経験者が用意した関数を**呼び出すだけ**で機能が動きます。

### よく使う関数

#### 1. エラーメッセージを表示

```javascript
showError('エラーが発生しました');
```

#### 2. 成功メッセージを表示

```javascript
showSuccess('保存しました');
```

#### 3. ローディングを表示/非表示

```javascript
showLoading();  // 表示
hideLoading();  // 非表示
```

#### 4. ページ遷移

```javascript
navigateTo('index.html');  // トップページへ
navigateTo('login.html');  // ログインページへ
```

#### 5. 日付をフォーマット

```javascript
const date = formatDate('2024-01-01T00:00:00Z');
// → "2024/01/01 00:00"

const timeAgoText = timeAgo('2024-01-01T00:00:00Z');
// → "2時間前" など
```

#### 6. テキストをエスケープ（XSS対策）

```javascript
const safeText = escapeHtml('<script>alert("危険")</script>');
// → "&lt;script&gt;alert("危険")&lt;/script&gt;"
```

---

## タスク分担の例

未経験者4名で以下のように分担できます：

### 担当者A: トップページ（index.html）
- スレッド一覧のデザイン改善
- フィルターバーのスタイル調整

### 担当者B: 認証ページ（login.html, signup.html）
- ログインフォームのデザイン
- エラーメッセージのスタイル

### 担当者C: 質問投稿ページ（new-thread.html）
- フォームのレイアウト改善
- ボタンのデザイン

### 担当者D: スレッド詳細ページ（thread.html）
- 回答カードのデザイン
- ベストアンサーバッジのスタイル

---

## デザインのアイデア

### 1. カラーテーマを変更

現在は青系ですが、学校のイメージカラーに変更できます。

**例: 緑系に変更**

`css/common.css` を編集:

```css
.logo {
  color: #4caf50;  /* 青 → 緑 */
}

.btn-primary {
  background-color: #4caf50;  /* 青 → 緑 */
}

.btn-primary:hover {
  background-color: #45a049;
}
```

### 2. フォントを変更

```css
body {
  font-family: 'Noto Sans JP', sans-serif;
}
```

Google Fontsを使う場合、HTMLの`<head>`に追加:

```html
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
```

### 3. スレッドカードにホバーエフェクトを追加

`css/threads.css` を編集:

```css
.thread-card {
  transition: transform 0.2s;  /* アニメーション追加 */
}

.thread-card:hover {
  transform: translateY(-5px);  /* 上に浮かせる */
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}
```

### 4. ボタンのデザインを変更

`css/common.css` を編集:

```css
.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);  /* グラデーション */
  border: none;
  padding: 0.75rem 1.5rem;
  font-weight: bold;
  text-transform: uppercase;  /* 大文字に */
  letter-spacing: 1px;
}
```

---

## よくある質問

### Q1: CSSを変更しても反映されない

**A:** ブラウザのキャッシュをクリアしてください。

- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

### Q2: HTMLを変更したらレイアウトが崩れた

**A:** ブラウザの開発者ツール（F12）でエラーを確認してください。
タグの閉じ忘れがないかチェック！

### Q3: どこを編集すればいいかわからない

**A:** ブラウザの開発者ツールで要素を検査すると、どのCSSが適用されているかわかります。

1. 変更したい要素を右クリック
2. 「検証」または「要素を調査」をクリック
3. 右側にCSSが表示される

### Q4: 色の組み合わせがわからない

**A:** 以下のツールを使うと便利です：

- [Coolors](https://coolors.co/) - カラーパレット生成
- [Adobe Color](https://color.adobe.com/) - 配色ツール

---

## 困ったときは

1. まずはGoogle検索: 「CSS 角丸」「HTML テーブル 作り方」など
2. 経験者に質問
3. チームで相談

**頑張ってください！👍**
