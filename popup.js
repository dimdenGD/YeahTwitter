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
    chrome.storage.local.remove('yeahToken', () => {
        document.getElementById('clear-token').innerText = 'Token cleared!';
        setTimeout(() => {
            document.getElementById('clear-token').innerText = 'Clear account token';
        }, 1000);
    });
});