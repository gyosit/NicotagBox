chrome.storage.local.get(['transset', 'unablecheck'], function(items) {
    let transtag = document.getElementById("trans");
    let unablesetting = document.getElementById("unable");
    transtag.value = items.transset;
    if(items.unablecheck == true){
        unablesetting.checked = true;
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

document.getElementById('trans').addEventListener('change', textChange);
document.getElementById('unable').addEventListener('change', checkChange);