const API_URL = `http://localhost:3000/api`;

fetch(chrome.runtime.getURL('style.css')).then(res => res.text()).then(css => {
    let style = document.createElement('style');
    let head = document.head || document.getElementsByTagName('head')[0];
    style.innerHTML = css;
    head.appendChild(style);
});

function createModal(html, className, onclose, canclose) {
    let modal = document.createElement('div');
    modal.classList.add('modal');
    let modal_content = document.createElement('div');
    modal_content.classList.add('modal-content');
    if(className) modal_content.classList.add(className);
    modal_content.innerHTML = html;
    modal.appendChild(modal_content);
    let close = document.createElement('span');
    close.classList.add('modal-close');
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
            document.body.style.overflowY = 'auto';
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

    let res = await fetch(`/i/api${path}`, {
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
    if(localStorage.yeahToken) body.key = localStorage.yeahToken;
    const res = await fetch(API_URL + path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    return await res.text();
}

if(!localStorage.yeahToken) {
    let modalOpenTime = Date.now();
    let modal = createModal(/*html*/`
        <h2 style="margin-top:0">
            <img src="${chrome.runtime.getURL('images/yeah_on32.png')}" alt="Yeah!" style="width: 24px; height: 24px;margin-bottom: -4px;">
            Welcome to Yeah! for Twitter extension!
        </h2>
        <p>This extension adds a <b>Yeah!</b> button to all tweets, which is essentially same thing as a Like but public to everyone.</p>
        <p>It doesn't send a reply with an image, instead it saves your Yeahs into a custom database.</p>
        <p>
            In order to get started, you need to authentificate your Twitter account.
            Click button below, and we'll automatically post a tweet on your behalf that will look like 'yeah-xxxxxxxx'.
            Then our server will check for that tweet existence, confirm that it's you, and extension will automatically remove the tweet and save your token.
            This tweet should be only up for about a second, so don't worry about posting nonsensical tweet.
        </p>
        <p>
            <b>Important: your account must not be private so server can actually see the tweet. You'll need to make your account public for this auth, afterwards you can make it private again.</b>
        </p>
        <div class="error-message"></div>
        <div>
            <button class="auth-button">Authentificate</button>
        </div>
    `, 'welcome-modal', () => {}, () => Date.now() - modalOpenTime > 2000);

    let button = modal.querySelector('.auth-button');
    button.addEventListener('click', async () => {
        button.disabled = true;
        let tweetId;
        try {
            // get tokens
            let tokens = JSON.parse(await callYeahApi('/request_token'));

            // create tweet
            let tweet = await callTwitterApi('POST', '/graphql/oB-5XsHNAbjvARJEc8CZFw/CreateTweet', {}, {
                "variables":{"tweet_text": `yeah-${tokens.public_token}`,"dark_request":false,"media":{"media_entities":[],"possibly_sensitive":false},"semantic_annotation_ids":[]},
                "features":{"communities_web_enable_tweet_community_results_fetch":true,"c9s_tweet_anatomy_moderator_badge_enabled":true,"tweetypie_unmention_optimization_enabled":true,"responsive_web_edit_tweet_api_enabled":true,"graphql_is_translatable_rweb_tweet_is_translatable_enabled":true,"view_counts_everywhere_api_enabled":true,"longform_notetweets_consumption_enabled":true,"responsive_web_twitter_article_tweet_consumption_enabled":true,"tweet_awards_web_tipping_enabled":false,"creator_subscriptions_quote_tweet_preview_enabled":false,"longform_notetweets_rich_text_read_enabled":true,"longform_notetweets_inline_media_enabled":true,"articles_preview_enabled":true,"rweb_video_timestamps_enabled":true,"rweb_tipjar_consumption_enabled":true,"responsive_web_graphql_exclude_directive_enabled":true,"verified_phone_label_enabled":false,"freedom_of_speech_not_reach_fetch_enabled":true,"standardized_nudges_misinfo":true,"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled":true,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"responsive_web_graphql_timeline_navigation_enabled":true,"responsive_web_enhance_cards_enabled":false},
                "queryId":"oB-5XsHNAbjvARJEc8CZFw"
            });

            // parse tweet
            let tweetResult = tweet.data.create_tweet.tweet_results.result;
            let tweetData = tweetResult.legacy;
            tweetData.user = tweetResult.core.user_results.result.legacy;
            tweetData.user.id_str = tweetData.user_id_str;
            tweetId = tweetData.id_str;

            // send tweet
            let res = await callYeahApi('/verify_token', {
                tweet: tweetData,
                public_token: tokens.public_token,
                private_token: tokens.private_token
            });
            if(res === 'success') {
                localStorage.yeahToken = tokens.private_token;
                modal.removeModal();

                modalOpenTime = Date.now();
                let modal2 = createModal(/*html*/`
                    <h2 style="margin-top:0">
                        <img src="${chrome.runtime.getURL('images/yeah_on32.png')}" alt="Yeah!" style="width: 24px; height: 24px;margin-bottom: -4px;">
                        Authentification successful!
                    </h2>
                    <p>You can now Yeah! on any tweet. Yeah!!!!!</p>
                    <div>
                        btw I (<a href="/d1mden" target="_blank">@d1mden</a>) make a lot of cool extensions for Twitter like this, maybe u wanna follow me?
                        <button class="follow-button">Yeah!</button>
                    </div>
                `, 'authentification-successful', () => {}, () => Date.now() - modalOpenTime > 2000);

                let followButton = modal2.querySelector('.follow-button');
                followButton.addEventListener('click', () => {
                    callTwitterApi('POST', '/1.1/friendships/create.json', {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }, {
                        include_profile_interstitial_type: 1,
                        include_blocking: 1,
                        include_blocked_by: 1,
                        include_followed_by: 1,
                        include_want_retweets: 1,
                        include_mute_edge: 1,
                        include_can_dm: 1,
                        include_can_media_tag: 1,
                        include_ext_is_blue_verified: 1,
                        include_ext_verified_type: 1,
                        include_ext_profile_image_shape: 1,
                        skip_status: 1,
                        user_id: "1708130407663759360"
                    }).then(() => {
                        modal2.removeModal();
                        alert('Thank you! Happy Yeahing!');
                    }).catch(e => {
                        console.error(e);
                        location.href = '/d1mden';
                    });
                });
            } else {
                throw new Error(res);
            }
        } catch(e) {
            console.error(e);
            modal.querySelector('.error-message').innerHTML = `Failed to authentificate. Please try again later. (${e.message})`;
        } finally {
            button.disabled = false;
            if(tweetId) {
                callTwitterApi('POST', `/graphql/VaenaVgh5q5ih7kvyVjgtg/DeleteTweet`, {}, {
                    variables: {tweet_id: tweetId, dark_request: false},
                    queryId: "VaenaVgh5q5ih7kvyVjgtg"
                });
            }
        }
    });
}

function hookIntoTweets() {
    let tweets = document.getElementsByTagName('article');

    for (let i = 0; i < tweets.length; i++) {
        let tweet = tweets[i];
        if(tweet.dataset.yeahed) continue;
        tweet.dataset.yeahed = true;

        let linkToTweet = Array.from(tweet.querySelectorAll('a[role="link"]')).find(a => a.href.includes('/status/'));
        if(!linkToTweet) continue;
        let id = linkToTweet.href.match(/\/status\/(\d+)/)[1];
        if(!id) continue;

        let div = document.createElement('div');
        let button = document.createElement('button');
        button.addEventListener('click', () => {
            console.log('Yeahed!');
        });
        button.addEventListener('mouseover', () => {
            button.querySelector('.yeah-image').src = chrome.runtime.getURL('images/yeah_on32.png');
        });
        button.addEventListener('mouseout', () => {
            button.querySelector('.yeah-image').src = chrome.runtime.getURL('images/yeah_off32.png');
        });
        button.id = `yeah-button-${id}`;
        button.className = 'yeah-button';
        div.className = 'yeah-button-container';

        let img = document.createElement('img');
        img.src = chrome.runtime.getURL('images/yeah_off32.png');
        img.className = 'yeah-image';
        button.appendChild(img);

        let counter = document.createElement('span');
        counter.className = 'yeah-counter';
        counter.innerText = '';
        
        button.appendChild(counter);
        div.appendChild(button);

        let group = tweet.querySelector('div[role="group"]');
        if(group && group.children && group.children[3]) group.children[3].after(div);
    }
}

hookIntoTweets();
setInterval(hookIntoTweets, 500);