const MAX_TAG_SEARCH = 50;
const MAX_TAG_LENGTH = 40;
const BASE_PATH = "https://www.nicovideo.jp/tag/";

// タグのURLを作成
const makeURL = (basepath, tag) => {
    let new_tag = encodeURIComponent(tag);
    return basepath + new_tag;
};

// 全角を2文字としてカウント (タグ文字数オーバー対策)
const count = (str) => {
    let len = 0;
    for (let i = 0; i < str.length; i++) {
        str[i].match(/[ -~]/) ? (len += 1) : (len += 2);
    }
    return len;
};

// 置換用タグ作成
const make_tag_for_replace = (org_tag, plus_tags) => {
    const plain_plus_tags = plus_tags.map((tag) => tag.replace("*", ""));
    const pattern = new RegExp(plain_plus_tags.join("|"), "g");
    const masked_tag = org_tag.replace(pattern, "XXX");
    // XXXを置換してORで結合
    const new_children = [];
    for (let k = 0; k < plain_plus_tags.length; k++) {
        const new_child = masked_tag.replace("XXX", plain_plus_tags[k]);
        if (count(new_child) > MAX_TAG_LENGTH) continue; // タグ文字数オーバー対策
        new_children.push(new_child);
    }
    const new_tag = new_children.join(" OR ");
    return new_tag;
};

// 除外用タグ追加
const add_minus_tag = (org_tag, minus_tags) => {
    const adding_minus_tag = minus_tags.join(" OR ");
    const new_tag = `${org_tag} ${adding_minus_tag}`;
    return new_tag;
};

// クリックイベントの変更
const modify_click_event_for_tag = (tag_link, new_tag) => {
    tag_link.addEventListener("click", (e) => {
        const org_href = tag_link.href;
        if (!org_href.includes(BASE_PATH)) return;
        e.preventDefault();
        const new_url = makeURL(BASE_PATH, new_tag);
        window.location.href = new_url;
    });
};

let tag_search_count = 0;

// 設定の読み込み
// eslint-disable-next-line no-undef
chrome.storage.local.get(["transset", "unablecheck"], function (items) {
    if (items.transset === undefined || items.transset === null) return;

    const transsetting = items.transset.toLowerCase();
    const unablesetting = items.unablecheck;
    if (unablesetting == true) {
        return 0;
    }
    const time_id = setInterval(() => {
        if (tag_search_count > MAX_TAG_SEARCH) {
            clearInterval(time_id);
            return;
        }
        const transsets = transsetting.split("\n");
        // .TagItem-name:視聴ページ、.tag:検索結果
        const tag_links = document.querySelectorAll('a[data-anchor-area="tags"], a.tag.balloon');
        // タグが見つかったらループ解除
        if (tag_links.length > 0) {
            // 検索結果画面リンク作成
            const tag_links_in_search = document.querySelectorAll(".tagCaption h1 span");
            if (tag_links_in_search.length > 0) {
                let contents = tag_links_in_search[0].innerHTML.split(" ");
                let new_contents = contents.map(function (tag) {
                    if (tag == "OR" || tag[0] == "-") return tag;
                    else return `<a href="${makeURL(BASE_PATH, tag)}">${tag}</a>`;
                });
                tag_links_in_search[0].innerHTML = new_contents.join(" ");
            }
            clearInterval(time_id);
        }

        let minus_tags = [];
        let plus_tags = [];

        for (let i = 0; i < tag_links.length; i++) {
            const tag_link = tag_links[i];
            const org_tag = tag_link.textContent.toLowerCase();
            let new_tag = org_tag;

            for (let j = 0; j < transsets.length; j++) {
                const tmp_sets = transsets[j].split(" ");
                minus_tags = [];
                plus_tags = [];
                for (let k = 0; k < tmp_sets.length; k++) {
                    // -で始まる項目はマイナス検索用リストへ、それ以外はプラス検索用リストへ送る
                    if (tmp_sets[k][0] == "-") minus_tags.push(tmp_sets[k]);
                    else plus_tags.push(tmp_sets[k]);
                }
                if (plus_tags.length > 0 && plus_tags[0][0] == "*") {
                    // 置換 (部分一致)
                    const found = plus_tags.some((tag) => org_tag.includes(tag.replace("*", "")));
                    // タグにある文字列が含まれていればそこをXXXに置き換える
                    if (found) {
                        new_tag = make_tag_for_replace(org_tag, plus_tags);
                        break;
                    }
                } else {
                    // 転送
                    // 転送リストのどれかに引っかかったらORで結合
                    const found = plus_tags.some((tag) => org_tag === tag);
                    if (found) {
                        new_tag = plus_tags.join(" OR ");
                        break;
                    }
                }
            }

            if (new_tag === org_tag) continue; // 何も変更がなければ次へ
            new_tag = add_minus_tag(new_tag, minus_tags);
            modify_click_event_for_tag(tag_link, new_tag);
        }
        tag_search_count++;
    }, 500);
});
