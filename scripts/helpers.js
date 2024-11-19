function createModal(html, className, onclose, canclose) {
    let modal = document.createElement('div');
    modal.classList.add('yeah-modal');
    let modal_content = document.createElement('div');
    modal_content.classList.add('yeah-modal-content');
    if(className) modal_content.classList.add(className);
    modal_content.innerHTML = html;
    modal.appendChild(modal_content);
    let close = document.createElement('span');
    close.classList.add('yeah-modal-close');
    close.title = "ESC";
    close.innerHTML = '&times;';
    document.body.style.overflowY = 'hidden';
    function removeModal() {
        modal.remove();
        let event = new Event('findActiveTweet');
        document.dispatchEvent(event);
        document.removeEventListener('keydown', escapeEvent);
        if(onclose) onclose();
        let modals = document.getElementsByClassName('modal');
        if(modals.length === 0) {
            document.body.style.overflowY = '';
        }
    }
    modal.removeModal = removeModal;
    function escapeEvent(e) {
        if(document.querySelector('.viewer-in')) return;
        if(e.key === 'Escape' || (e.altKey && e.keyCode === 78)) {
            if(!canclose || canclose()) removeModal();
        }
    }
    close.addEventListener('click', removeModal);
    let isHoldingMouseFromContent = false;
    modal_content.addEventListener('mousedown', () => {
        isHoldingMouseFromContent = true;
    });
    document.addEventListener('mouseup', () => {
        setTimeout(() => isHoldingMouseFromContent = false, 10);
    });
    modal.addEventListener('click', e => {
        if(e.target === modal && !isHoldingMouseFromContent) {
            if(!canclose || canclose()) removeModal();
        }
    });
    document.addEventListener('keydown', escapeEvent);
    modal_content.appendChild(close);
    document.body.appendChild(modal);
    return modal;
}

async function callTwitterApi(method = 'GET', path, headers = {}, body) {
    if(typeof body === 'object' && !headers['Content-Type']) {
        body = JSON.stringify(body);
        headers['Content-Type'] = 'application/json';
    }
    if(headers['Content-Type'] === 'application/x-www-form-urlencoded') {
        body = new URLSearchParams(body).toString();
    }
    if(!headers['Authorization']) {
        headers['Authorization'] = `Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA`;
    }
    if(!headers['x-csrf-token']) {
        let csrf = document.cookie.match(/(?:^|;\s*)ct0=([0-9a-f]+)\s*(?:;|$)/);
        headers['x-csrf-token'] = csrf ? csrf[1] : "";
    }
    headers['x-twitter-auth-type'] = 'OAuth2Session';
    headers['x-twitter-active-user'] = 'yes';
    headers['x-twitter-client-language'] = 'en';

    let res = await fetch(`https://${location.hostname}/i/api${path}`, {
        method,
        headers,
        body
    }).then(res => res.json());

    if(res.errors) {
        throw new Error(res.errors[0].message);
    }

    return res;
};

async function callYeahApi(path, body = {}) {
    let token = await getYeahToken();
    if(token) body.key = token;

    const res = await fetch(API_URL + path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    let result = await res.text();

    if(result === 'Invalid key') {
        chrome.storage.local.remove('yeahToken');
        chrome.storage.local.get('yeahTokens', async result => {
            if(result.yeahTokens) {
                let userId = await getUserId();
                delete result.yeahTokens[userId];
                chrome.storage.local.set(result);
            }
        });
        throw new Error('Invalid key');
    }

    return result;
}

let _userId;
async function getUserId() {
    if(!_userId) {
        let user = await API.account.verifyCredentials();
        _userId = user.id_str;
    }
    return _userId;
}

function getYeahToken() {
    return new Promise(async (resolve, reject) => {
        chrome.storage.local.get(['yeahToken', 'yeahTokens'], async result => {
            if(result) {
                let userId = await getUserId();
                if(result.yeahTokens && result.yeahTokens[userId]) {
                    resolve(result.yeahTokens[userId]);
                } else {
                    resolve(result.yeahToken);
                }
            } else {
                resolve(null);
            } 
        });
    });
}

function getYeahSettings() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get('settings', result => {
            if(result && result.settings) {
                resolve(result.settings);
            } else {
                resolve({});
            } 
        });
    });
}

function formatLargeNumber(n) {
    let option = {notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1, minimumFractionDigits: 1};
    if (n >= 1e3) {
        return Number(n).toLocaleString('en-US', option);
    }
    else return Number(n).toLocaleString();
}

function escapeHTML(unsafe) {
    if(typeof unsafe === 'undefined' || unsafe === null) {
        return '';
    }
    return DOMPurify.sanitize(String(unsafe));
}

async function appendUser(u, container, label) {
    let userElement = document.createElement('div');
    userElement.classList.add('user-item');

    userElement.innerHTML = /*html*/`
        <div>
            <a href="/${u.screen_name}" class="user-item-link" target="_blank">
                <img src="${u.profile_image_url_https}" alt="${u.screen_name}" class="user-item-avatar tweet-avatar" width="48" height="48">
                <div class="user-item-text">
                    <span class="yeah-name user-item-name${u.protected ? ' user-protected' : ''}${u.muting ? ' user-muted' : ''}${u.verified || u.verified_type ? ' user-verified' : u.id_str === '1708130407663759360' ? ' user-verified user-verified-dimden' : ''} ${u.verified_type === 'Government' ? 'user-verified-gray' : u.verified_type === 'Business' ? 'user-verified-yellow' : u.verified_type === 'Blue' ? 'user-verified-blue' : ''}">${escapeHTML(u.name)}</span><br>
                    <span class="yeah-handle">@${u.screen_name}</span>
                    ${u.followed_by ? `<span class="follows-you-label">Follows you</span>` : ''}
                    ${label ? `<br><span class="user-item-additional">${escapeHTML(label)}</span>` : ''}
                </div>
            </a>
        </div>
        <button class="user-yeah-item-btn nice-yeah-button ${u.following ? 'yeah-following' : 'yeah-follow'}">${u.following ? "Following" : "Follow"}</button>
    `;

    let followButton = userElement.querySelector('.user-yeah-item-btn');
    followButton.addEventListener('click', async () => {
        if (followButton.classList.contains('yeah-following')) {
            try {
                await API.user.unfollow(u.screen_name);
            } catch(e) {
                console.error(e);
                alert(e);
                return;
            }
            followButton.classList.remove('yeah-following');
            followButton.classList.add('yeah-follow');
            followButton.innerText = "Follow";
        } else {
            try {
                await API.user.follow(u.screen_name);
            } catch(e) {
                console.error(e);
                alert(e);
                return;
            }
            followButton.classList.remove('yeah-follow');
            followButton.classList.add('yeah-following');
            followButton.innerText = "Following";
        }
    });

    container.appendChild(userElement);
}
