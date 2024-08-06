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

// 設定の読み込み
console.log("Start:Loading strage");
// eslint-disable-next-line no-undef
chrome.storage.local.get(["transset", "unablecheck"], function (items) {
    console.log("End:Loading strage");
    const transsetting = items.transset.toLowerCase();
    const unablesetting = items.unablecheck;
    if (unablesetting == true) {
        return 0;
    }
    console.log("Start:Replacing tags");
    const time_id = setInterval(() => {
        console.log("Start:Replacing tags");
        const transsets = transsetting.split("\n");
        const basepath = "https://www.nicovideo.jp/tag/";
        // .TagItem-name:視聴ページ、.tag:検索結果
        const tags = document.querySelectorAll('a[data-anchor-area="tags"], a.tag.balloon');
        console.log(tags);
        // タグが見つかったらループ解除
        if (tags.length > 0) {
            // 検索結果画面リンク作成
            console.log("Start:Replacing result screen");
            const tags = document.querySelectorAll(".tagCaption h1 span");
            if (tags.length > 0) {
                let contents = tags[0].innerHTML.split(" ");
                let new_contents = contents.map(function (tag) {
                    if (tag == "OR" || tag[0] == "-") return tag;
                    else return `<a href="${makeURL(basepath, tag)}">${tag}</a>`;
                });
                tags[0].innerHTML = new_contents.join(" ");
            }
            console.log("End:Replacing tags");
            console.log("End:Replacing result screen");
            clearInterval(time_id);
        }

        let minus_tags = [];
        let plus_tags = [];

        for (let i = 0; i < tags.length; i++) {
            let new_tag = "";
            const org_tag = tags[i].textContent;

            for (let j = 0; j < transsets.length; j++) {
                let tmp_sets = transsets[j].split(" ");
                minus_tags = [];
                plus_tags = [];
                for (let k = 0; k < tmp_sets.length; k++) {
                    // -で始まる項目はマイナス検索用リストへ送る
                    if (tmp_sets[k][0] == "-") minus_tags.push(tmp_sets[k]);
                    else plus_tags.push(tmp_sets[k]);
                }
                if (plus_tags[0][0] == "*") {
                    // 置換
                    console.log(plus_tags[0]);
                    let common;
                    let fi_id;
                    for (let k = 0; k < plus_tags.length; k++) {
                        fi_id = org_tag.toLowerCase().indexOf(plus_tags[k].replace("*", ""));
                        // タグにある文字列が含まれていればそこをXXXに置き換える
                        if (fi_id != -1) {
                            common = org_tag.toLowerCase().replace(plus_tags[k].replace("*", ""), "XXX");
                            break;
                        }
                    }
                    // 置換リストのどれかに引っかかったらXXXを置換してORで結合
                    if (fi_id != -1) {
                        let new_children = [];
                        for (let k = 0; k < plus_tags.length; k++) {
                            let new_child = common.replace("XXX", plus_tags[k].replace("*", ""));
                            if (count(new_child) > 40) continue;
                            new_children.push(new_child);
                        }
                        new_tag = new_children.join(" OR ");
                        break;
                    }
                } else {
                    // 転送
                    // 転送リストのどれかに引っかかったらORで結合
                    let fi_id = plus_tags.indexOf(tags[i].textContent.toLowerCase());
                    if (fi_id != -1) {
                        new_tag = plus_tags.join(" OR ");
                        break;
                    }
                }
                minus_tags = [];
                plus_tags = [];
            }
            new_tag += " " + minus_tags.join(" ");
            new_tag = encodeURIComponent(new_tag);
            tags[i].href = basepath + new_tag;
        }
    }, 100);
});
