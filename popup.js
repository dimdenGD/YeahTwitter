chrome.storage.local.get('settings', (data) => {
    if (data.settings) {
        document.getElementById('dontLike').checked = !!data.settings.dontLike;
    }
});

document.getElementById('save').addEventListener('click', async () => {
    chrome.storage.local.set({
        settings: {
            dontLike: document.getElementById('dontLike').checked
        }
    }, () => {
        document.getElementById('save').innerText = 'Saved!';
        setTimeout(() => {
            document.getElementById('save').innerText = 'Save';
        }, 1000);
    });
});

document.getElementById('clear-token').addEventListener('click', async () => {
    if(!confirm('Are you sure you want to clear all account tokens?')) return;
    chrome.storage.local.remove(['yeahToken', 'yeahTokens'], () => {
        document.getElementById('clear-token').innerText = 'Tokens cleared!';
        setTimeout(() => {
            document.getElementById('clear-token').innerText = 'Clear account tokens';
        }, 1000);
    });
});

document.getElementById('show-popup').addEventListener('click', async () => {
    chrome.storage.local.remove(['ignorePopup'], () => {
        document.getElementById('show-popup').innerText = 'Popup settings reset!';
        setTimeout(() => {
            document.getElementById('show-popup').innerText = 'Reset popup settings';
        }, 1000);
    });
});