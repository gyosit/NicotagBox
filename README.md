(編集中)  
**! 以下は旧バージョンの説明です。  
! 最新バージョン(v2.1.1)の内容は現在編集中です。  
! 詳細はChromeウェブストアをご覧ください。**
# NicotagBox
ニコニコ動画のタグ検索を拡張するChrome拡張機能です。
- 「AAA」タグをクリックした際に「AAA」と「BBB」を両方検索する。
- 「AAA***」タグをクリックした際に「AAA***」と「BBB***」を両方検索する。
ことができます。

# インストール方法
https://chrome.google.com/webstore/detail/nicotag-box/phkcmpbancelmdlpbdkelnhdlkigango?hl=ja

# 使い方
NicotagBoxインストール後、アイコンをクリックするとテキストボックスが現れます。  
ここのボックスにタグ転送ルールを記述することでタグの検索先を拡張できます。  
記述ルールは以下の3つです。
|書き方|トリガー|検索結果|
|:--|:--|:--|
|AAA BBB CCC|「AAA」「BBB」「CCC」タグ<br>いずれかのクリック時|「AAA」「BBB」「CCC」タグ<br>を同時検索|
|*AAA BBB CCC|「～AAA～」「～BBB～」「～CCC～」タグ<br>いずれかのクリック時|「～AAA～」「～BBB～」「～CCC～」タグ<br>を同時検索
|上記ルールの最後に-DDD|　|「-DDD」タグを検索結果から除外|

一つのルールにつき一行で記述し、複数行書くことで複数のルールを適用できます。  
Chromeウェブストアの説明もご確認ください。
