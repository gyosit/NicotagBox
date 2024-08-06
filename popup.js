class Hub {
    constructor(is_partial, or_tags, minus_tags) {
        this.is_partial = is_partial;
        this.or_tags = or_tags;
        this.minus_tags = minus_tags;
    }
}

chrome.storage.local.get(['transset', 'unablecheck'], function(items) {
    let transtag = document.getElementById("trans");
    let unablesetting = document.getElementById("unable");
    let unablesetting2 = document.getElementById("unable2");
    const transset = items.transset;
    if(typeof transset === "undefined") return;
    transtag.value = transset;
    const group = makeGroup(transset);
    makeTagsHTML(group);
    if(items.unablecheck == true){
        unablesetting.checked = true;
        unablesetting2.checked = true;
    }
});

function textChange(){
    let transtag = document.getElementById("trans");
    let transsetting = {'transset': transtag.value};
    chrome.storage.local.set(transsetting);
}

function checkChange(){
    let unablecheck = document.getElementById("unable");
    let unablesetting = {'unablecheck': unablecheck.checked};
    chrome.storage.local.set(unablesetting);
}

function checkChange2(){
    let unablecheck = document.getElementById("unable2");
    let unablesetting = {'unablecheck': unablecheck.checked};
    chrome.storage.local.set(unablesetting);
}

const makeHub = (line) => {
    const is_partial = line.charAt(0) == "*" ? true : false;
    if(is_partial) line = line.replace("*", "");
    const tags = line.split(" ");
    const or_tags = [];
    const minus_tags = [];
    tags.forEach(tag => {
        if(tag.charAt(0) == "-") minus_tags.push(tag.replace("-", ""));
        else or_tags.push(tag);
    })

    return new Hub(is_partial, or_tags, minus_tags);
}

const makeDetailInner = (hub, index) => {
    const partial_box = `<input type="checkbox" id="partial_${index}" ${hub.is_partial ? "checked" : ""}>`;
    const delete_btn = `<input type="button" id="delete_${index}" value="削除">`
    const or_tags_box = `<textarea id="or_${index}"></textarea>`;
    const minus_tags_box = `<textarea id="minus_${index}"></textarea>`;
    return `<summary>HUB ${index}</summary>${partial_box}部分一致検索　${delete_btn}<br><hr>■ まとめて検索(半角区切り)<br>${or_tags_box}<br><hr>■ 除外(半角区切り)<br>${minus_tags_box}`;
}

const makeDetailHTML = (hub, index) => {
    const detail = document.createElement("details");
    detail.id = `detail_${index}`;
    detail.classList.add("detail");
    detail.innerHTML = makeDetailInner(hub, index);

    return detail;
}

const makeTagsHTML = (group) => {
    const boxes_area = document.getElementById("boxes_area");
    let i = 0;
    group.forEach(hub => {
        const detail = makeDetailHTML(hub, i);
        boxes_area.appendChild(detail);
        document.getElementById(`or_${i}`).value = hub.or_tags.join(" ");
        document.getElementById(`minus_${i}`).value = hub.minus_tags.join(" ");
        document.getElementById(`delete_${i}`).addEventListener('click', {index: i, handleEvent: deleteHub});
        i++;
    })
}

const makeGroup = (base_text) => {
    const lines = base_text.split("\n");
    return lines.map(line => makeHub(line));
}

function addHub(e) {
    const empty_hub = new Hub(false, [], [])
    let max_index = 0;
    for(let i = 0;; i++) {
        const hub = document.getElementById(`detail_${i}`);
        max_index = i;
        if(hub === null) break;
    }
    const detail = makeDetailHTML(empty_hub, max_index);
    boxes_area.appendChild(detail);
    document.getElementById(`delete_${max_index}`).addEventListener('click', {index: max_index, handleEvent: deleteHub});
}

const saveHubs = () => {
    let transtag = "";
    for(let i = 0;; i++) {
        const hub = document.getElementById(`detail_${i}`);
        if(hub === null) break;
        const is_partial = document.getElementById(`partial_${i}`).checked ? "*" : "";
        const or_tags = document.getElementById(`or_${i}`).value;
        const minus_tags = document.getElementById(`minus_${i}`).value.replace(" ", " -");
        const is_minus = minus_tags.length > 0 ? " -" : "";
        const line = `${is_partial}${or_tags}${is_minus}${minus_tags}`;
        transtag += `${line}\n`;
    }
    const transsetting = {'transset': transtag.replace(/\s+$/g, "")};
    chrome.storage.local.set(transsetting);
}

function deleteHub(e){
    console.log(this);
    const index = this.index;
    const targ_detail = document.getElementById(`detail_${index}`);
    targ_detail.remove();
}

// document.getElementById('trans').addEventListener('change', textChange);
document.getElementById('unable').addEventListener('change', checkChange);
document.getElementById('unable2').addEventListener('change', checkChange2);
document.getElementById('add_btn').addEventListener('click', addHub);
document.getElementById('save_btn').addEventListener('click', saveHubs);
document.getElementById('save_btn_plane').addEventListener('click', textChange);