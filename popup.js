class Hub {
    constructor(is_partial, or_tags, minus_tags) {
        this.is_partial = is_partial;
        this.or_tags = or_tags;
        this.minus_tags = minus_tags;
    }
}

const state = {
    selectedChip: null,
};

const qs = (selector, root = document) => root.querySelector(selector);
const isAutoSaveEnabled = () => {
    const autosave = qs("#autosave");
    return autosave ? autosave.checked : false;
};

const DEBOUNCE_MS = 500;
const debounce = (fn, wait) => {
    let timer = null;
    const debounced = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            fn();
        }, wait);
    };
    debounced.flush = () => {
        if (!timer) return;
        clearTimeout(timer);
        timer = null;
        fn();
    };
    return debounced;
};

const syncAutoSave = (checked) => {
    const autosave1 = qs("#autosave");
    const autosave2 = qs("#autosave2");
    if (autosave1) autosave1.checked = checked;
    if (autosave2) autosave2.checked = checked;
    chrome.storage.local.set({ autosave: checked });
};

const makeHub = (line) => {
    if (!line) return new Hub(false, [], []);
    let is_partial = false;
    let trimmed = line.trim();
    if (trimmed.startsWith("*")) {
        is_partial = true;
        trimmed = trimmed.slice(1);
    }
    const tags = trimmed.split(" ").filter((tag) => tag.length > 0);
    const or_tags = [];
    const minus_tags = [];
    tags.forEach((tag) => {
        if (tag.startsWith("-")) minus_tags.push(tag.slice(1));
        else or_tags.push(tag);
    });
    return new Hub(is_partial, or_tags, minus_tags);
};

const makeGroup = (base_text) => {
    if (!base_text) return [];
    const lines = base_text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    return lines.map((line) => makeHub(line));
};

const createChip = (value) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.dataset.value = value;

    const label = document.createElement("span");
    label.textContent = value;

    const remove = document.createElement("span");
    remove.className = "chip-x";
    remove.textContent = "×";

    chip.appendChild(label);
    chip.appendChild(remove);

    chip.addEventListener("click", (e) => {
        if (e.target === remove) {
            if (state.selectedChip === chip) state.selectedChip = null;
            chip.remove();
            requestAutoSaveHubs();
            return;
        }
        if (state.selectedChip && state.selectedChip !== chip) {
            state.selectedChip.classList.remove("selected");
        }
        state.selectedChip = chip;
        chip.classList.add("selected");
    });

    return chip;
};

const addChipsFromInput = (input, chips) => {
    const raw = input.value.trim();
    if (!raw) return;
    const parts = raw
        .split(" ")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    parts.forEach((part) => {
        chips.appendChild(createChip(part));
    });
    input.value = "";
    requestAutoSaveHubs();
};

const createSection = (title, role, tags) => {
    const section = document.createElement("div");
    section.className = "section";
    section.dataset.role = role;

    const titleEl = document.createElement("div");
    titleEl.className = "section-title";
    titleEl.textContent = title;

    const chips = document.createElement("div");
    chips.className = "chips";

    tags.forEach((tag) => chips.appendChild(createChip(tag)));

    const inputWrap = document.createElement("div");
    inputWrap.className = "chip-input";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "キーワードを追加";

    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "plus";
    plus.textContent = "+";

    plus.addEventListener("click", () => addChipsFromInput(input, chips));
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addChipsFromInput(input, chips);
        }
    });

    inputWrap.appendChild(input);
    inputWrap.appendChild(plus);

    section.appendChild(titleEl);
    section.appendChild(chips);
    section.appendChild(inputWrap);

    return section;
};

const makeHubCard = (hub, index) => {
    const card = document.createElement("div");
    card.className = "hub-card";
    card.dataset.index = index;

    const head = document.createElement("div");
    head.className = "hub-head";

    const title = document.createElement("div");
    title.className = "hub-title";
    title.textContent = `HUB ${index + 1}`;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "hub-toggle";
    toggle.textContent = "折り畳む";
    toggle.addEventListener("click", () => {
        card.classList.toggle("collapsed");
        toggle.textContent = card.classList.contains("collapsed") ? "開く" : "折り畳む";
    });

    const actions = document.createElement("div");
    actions.className = "hub-actions";

    const partialLabel = document.createElement("label");
    const partial = document.createElement("input");
    partial.type = "checkbox";
    partial.id = `partial_${index}`;
    partial.checked = hub.is_partial;
    partial.addEventListener("change", () => {
        requestAutoSaveHubs();
    });
    partialLabel.appendChild(partial);
    partialLabel.appendChild(document.createTextNode("部分一致"));

    const del = document.createElement("button");
    del.type = "button";
    del.className = "delete";
    del.textContent = "削除";
    del.addEventListener("click", () => {
        const ok = window.confirm("このカードを削除しますか？");
        if (!ok) return;
        if (state.selectedChip && card.contains(state.selectedChip)) {
            state.selectedChip = null;
        }
        card.remove();
        renumberHubTitles();
        requestAutoSaveHubs();
    });

    actions.appendChild(partialLabel);
    actions.appendChild(del);

    head.appendChild(title);
    head.appendChild(toggle);
    head.appendChild(actions);

    const body = document.createElement("div");
    body.className = "hub-body";

    const orSection = createSection("まとめて検索", "or", hub.or_tags);
    const minusSection = createSection("除外", "minus", hub.minus_tags);
    body.appendChild(orSection);
    body.appendChild(minusSection);

    card.appendChild(head);
    card.appendChild(body);

    return card;
};

const renumberHubTitles = () => {
    const cards = document.querySelectorAll(".hub-card");
    cards.forEach((card, idx) => {
        const title = qs(".hub-title", card);
        title.textContent = `HUB ${idx + 1}`;
    });
};

const getChips = (card, role) => {
    const section = card.querySelector(`.section[data-role="${role}"]`);
    if (!section) return [];
    const chips = Array.from(section.querySelectorAll(".chip"));
    return chips.map((chip) => chip.dataset.value);
};

const renderHubs = (group) => {
    const hubs = qs("#hubs");
    hubs.innerHTML = "";
    group.forEach((hub, idx) => hubs.appendChild(makeHubCard(hub, idx)));
};

const saveHubs = () => {
    const cards = document.querySelectorAll(".hub-card");
    const lines = [];
    cards.forEach((card) => {
        const is_partial = qs('input[type="checkbox"]', card).checked ? "*" : "";
        const or_tags = getChips(card, "or");
        const minus_tags = getChips(card, "minus");
        let line = `${is_partial}${or_tags.join(" ")}`.trim();
        if (minus_tags.length > 0) {
            const minus = `-${minus_tags.join(" -")}`;
            line = line.length > 0 ? `${line} ${minus}` : minus;
        }
        if (line.length > 0) lines.push(line);
    });
    const transset = lines.join("\n");
    chrome.storage.local.set({ transset });
    const transtag = qs("#trans");
    if (transtag) transtag.value = transset;
};

const requestAutoSaveHubs = () => {
    if (!isAutoSaveEnabled()) return;
    saveHubs();
};

const addHub = () => {
    const hubs = qs("#hubs");
    const index = hubs.querySelectorAll(".hub-card").length;
    hubs.appendChild(makeHubCard(new Hub(true, [], []), index));
    renumberHubTitles();
};

const textChange = () => {
    const transtag = qs("#trans");
    chrome.storage.local.set({ transset: transtag.value });
};

const debouncedTextChange = debounce(textChange, DEBOUNCE_MS);
const requestAutoSaveText = () => {
    if (!isAutoSaveEnabled()) return;
    debouncedTextChange();
};
const flushAutoSaveText = () => {
    if (!isAutoSaveEnabled()) return;
    debouncedTextChange.flush();
};

const maybeAutoSaveText = () => {
    requestAutoSaveText();
};

const checkChange = () => {
    const unablecheck = qs("#unable");
    chrome.storage.local.set({ unablecheck: unablecheck.checked });
    const unable2 = qs("#unable2");
    if (unable2) unable2.checked = unablecheck.checked;
    requestAutoSaveHubs();
};

const checkChange2 = () => {
    const unablecheck = qs("#unable2");
    chrome.storage.local.set({ unablecheck: unablecheck.checked });
    const unable1 = qs("#unable");
    if (unable1) unable1.checked = unablecheck.checked;
    requestAutoSaveHubs();
};

const autoSaveChange = (e) => {
    syncAutoSave(e.target.checked);
};

chrome.storage.local.get(["transset", "unablecheck", "autosave"], function (items) {
    const transtag = qs("#trans");
    const unablesetting = qs("#unable");
    const unablesetting2 = qs("#unable2");
    const autosave1 = qs("#autosave");
    const autosave2 = qs("#autosave2");
    const transset = items.transset;
    if (typeof transset !== "undefined" && transtag) {
        transtag.value = transset;
        const group = makeGroup(transset);
        renderHubs(group);
    } else {
        renderHubs([]);
    }
    if (items.unablecheck == true) {
        if (unablesetting) unablesetting.checked = true;
        if (unablesetting2) unablesetting2.checked = true;
    }
    if (items.autosave == true) {
        if (autosave1) autosave1.checked = true;
        if (autosave2) autosave2.checked = true;
    }
});

document.addEventListener("keydown", (e) => {
    const target = e.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
    if (e.key === "Delete" && state.selectedChip) {
        state.selectedChip.remove();
        state.selectedChip = null;
        requestAutoSaveHubs();
    }
});

const addSafeListener = (id, event, handler) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(event, handler);
};

addSafeListener("unable", "change", checkChange);
addSafeListener("unable2", "change", checkChange2);
addSafeListener("autosave", "change", autoSaveChange);
addSafeListener("autosave2", "change", autoSaveChange);
addSafeListener("add_btn", "click", addHub);
addSafeListener("save_btn", "click", saveHubs);
addSafeListener("save_btn_plane", "click", textChange);
addSafeListener("trans", "input", maybeAutoSaveText);
addSafeListener("trans", "blur", flushAutoSaveText);
