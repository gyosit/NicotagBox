const MAX_TAG_SEARCH = 50;
const MAX_TAG_LENGTH = 40;
const BASE_PATH = "https://www.nicovideo.jp/tag/";

console.log("[ニコタグ]Content script loaded.");

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
    const plain_plus_tags = plus_tags.map((tag) => (tag[0] === "*" ? tag.slice(1) : tag));
    const escaped_plus_tags = plain_plus_tags.map((tag) => tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = new RegExp(escaped_plus_tags.join("|"), "g");
    const placeholder = "__NICOTAG_PLACEHOLDER__";
    const masked_tag = org_tag.replace(pattern, placeholder);
    // placeholder を置換してORで結合
    const new_children = [];
    for (let k = 0; k < plain_plus_tags.length; k++) {
        const new_child = masked_tag.replaceAll(placeholder, plain_plus_tags[k]);
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

const EXPANDED_ATTR = "data-nicotag-expanded";
const SOURCE_ATTR = "data-nicotag-source";
const SOURCE_ID_ATTR = "data-nicotag-id";
const BUTTON_FOR_ATTR = "data-nicotag-for";
const EXPANDED_BUTTON_CLASS = "nicotag-expanded-button";
const EXPANDED_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 210" aria-hidden="true" focusable="false">
  <g>
    <path style="fill:none;stroke:#ffffff;stroke-width:20;stroke-dasharray:none" d="M 27.944511,51.948129 H 71.652592 L 88.49095,68.78649 v 81.32569 L 73.981301,164.62183 H 29.735827 L 14.430822,150.4531 V 71.294328 Z" id="path1" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" sodipodi:nodetypes="ccccccccc"/>
    <path style="fill:none;stroke:#ffffff;stroke-width:20;stroke-dasharray:none" d="M 126.82509,175.54885 V 48.723763 h 45.4994 l 17.01749,17.017491 V 94.22316 l -15.38108,8.88027 h -49.64365" id="path2" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" sodipodi:nodetypes="ccccccc"/>
    <path style="fill:none;stroke:#ffffff;stroke-width:20;stroke-dasharray:none" d="m 174.1158,103.17973 15.91917,69.80076" id="path3" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" sodipodi:nodetypes="cc"/>
  </g>
</svg>`;

const ensureExpandedStyle = () => {
    if (document.getElementById("nicotag-expanded-style")) return;
    const style = document.createElement("style");
    style.id = "nicotag-expanded-style";
    style.textContent = `
        .${EXPANDED_BUTTON_CLASS} {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 30px;
            height: 30px;
            margin-left: 0px;
            margin-right: 10px;
            border-radius: 9999px;
            background-color: #0a4e05ff !important;
            border: 1px solid #6fcf7b !important;
            color: #145a23 !important;
        }
        .${EXPANDED_BUTTON_CLASS}:hover {
            background-color: #8ddf86 !important;
        }
        .${EXPANDED_BUTTON_CLASS} svg {
            width: 20px;
            height: 20px;
            display: block;
        }
    `;
    document.head.appendChild(style);
};

let next_tag_id = 1;
const getTagId = (tag_link) => {
    if (!tag_link.dataset.nicotagId) {
        tag_link.dataset.nicotagId = `t${next_tag_id++}`;
    }
    return tag_link.dataset.nicotagId;
};

const cleanupOrphanButtons = () => {
    const buttons = document.querySelectorAll(`a[${EXPANDED_ATTR}="1"][${BUTTON_FOR_ATTR}]`);
    for (let i = 0; i < buttons.length; i++) {
        const id = buttons[i].getAttribute(BUTTON_FOR_ATTR);
        if (!id) continue;
        if (!document.querySelector(`[${SOURCE_ID_ATTR}="${id}"]`)) {
            buttons[i].remove();
        }
    }
};

// 拡張リンクの追加/更新
const add_expanded_tag_link = (tag_link, new_tag, tag_id) => {
    const parent = tag_link.parentElement;
    if (!parent) return;

    const org_tag = tag_link.textContent.toLowerCase();
    const existing = parent.querySelector(`a[${EXPANDED_ATTR}="1"][${BUTTON_FOR_ATTR}="${tag_id}"]`);

    const new_url = makeURL(BASE_PATH, new_tag);
    if (existing) {
        existing.href = new_url;
        existing.setAttribute(SOURCE_ATTR, org_tag);
        return;
    }
    const button = document.createElement("a");
    button.setAttribute(EXPANDED_ATTR, "1");
    button.setAttribute(SOURCE_ATTR, org_tag);
    button.setAttribute(BUTTON_FOR_ATTR, tag_id);
    button.classList.add(EXPANDED_BUTTON_CLASS);
    button.href = new_url;
    button.setAttribute("aria-label", "拡張タグ検索を開く");
    button.innerHTML = EXPANDED_ICON;

    ensureExpandedStyle();
    tag_link.insertAdjacentElement("afterend", button);
};

// 設定の読み込み
// eslint-disable-next-line no-undef
chrome.storage.local.get(["transset", "unablecheck"], function (items) {
    if (items.transset === undefined || items.transset === null) return;

    const transsetting = items.transset.toLowerCase();
    const unablesetting = items.unablecheck;
    if (unablesetting == true) {
        return 0;
    }
    const transsets = transsetting.split("\n");

    const processSearchHeader = () => {
        const tag_links_in_search = document.querySelectorAll(".tagCaption h1 span");
        if (tag_links_in_search.length === 0) return;
        const container = tag_links_in_search[0];
        const raw_text = container.textContent || "";
        const contents = raw_text.trim().split(/\s+/).filter(Boolean);
        if (contents.length === 0) return;

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < contents.length; i++) {
            const tag = contents[i];
            if (i > 0) fragment.appendChild(document.createTextNode(" "));
            if (tag === "OR" || tag[0] === "-") {
                fragment.appendChild(document.createTextNode(tag));
                continue;
            }
            const link = document.createElement("a");
            link.href = makeURL(BASE_PATH, tag);
            link.textContent = tag;
            fragment.appendChild(link);
        }
        container.textContent = "";
        container.appendChild(fragment);
    };

    const processTagLinks = () => {
        // .TagItem-name:視聴ページ、.tag:検索結果、hover-card:*:trigger
        console.log("[ニコタグ]Processing tag links...");
        const tag_links = document.querySelectorAll('a[id^="hover-card:"][id$=":trigger"], a[data-anchor-area="tags"], a.tag.balloon');
        if (tag_links.length === 0) return;

        cleanupOrphanButtons();

        let minus_tags = [];
        let plus_tags = [];

        for (let i = 0; i < tag_links.length; i++) {
            const tag_link = tag_links[i];
            const org_tag = tag_link.textContent.toLowerCase();
            let new_tag = org_tag;
            const tag_id = getTagId(tag_link);

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
                    const found = plus_tags.some((tag) => org_tag.includes(tag[0] === "*" ? tag.slice(1) : tag));
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

            if (new_tag === org_tag) {
                const existing = tag_link.parentElement ? tag_link.parentElement.querySelector(`a[${EXPANDED_ATTR}="1"][${BUTTON_FOR_ATTR}="${tag_id}"]`) : null;
                if (existing) existing.remove();
                continue; // 何も変更がなければ次へ
            }
            new_tag = add_minus_tag(new_tag, minus_tags);
            add_expanded_tag_link(tag_link, new_tag, tag_id);
        }
    };

    const processAll = () => {
        processSearchHeader();
        processTagLinks();
    };

    let scheduled = false;
    let debounce_timer = null;
    const DEBOUNCE_MS = 500;
    const scheduleProcess = () => {
        if (debounce_timer) return;
        debounce_timer = setTimeout(() => {
            debounce_timer = null;
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                processAll();
            });
        }, DEBOUNCE_MS);
    };

    // 初回処理
    processAll();

    // 動的更新対応
    const observer = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
            if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
                scheduleProcess();
                break;
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
});
