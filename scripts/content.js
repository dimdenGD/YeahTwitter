const API_URL = `https://yeah.dimden.dev/api`;

Promise.all([
    fetch(chrome.runtime.getURL('styles/style.css')).then(res => res.text()),
    fetch(chrome.runtime.getURL('styles/tweet.css')).then(res => res.text())
]).then(styles => {
    setTimeout(() => {
        for(let css of styles) {
            let style = document.createElement('style');
            let head = document.head || document.getElementsByTagName('head')[0];
            let isFirefox = navigator.userAgent.indexOf('Firefox') > -1;
            if(isFirefox) css = css.replaceAll('chrome-extension://', 'moz-extension://');
            style.innerHTML = css.replaceAll('__MSG_@@extension_id__', chrome.runtime.id);
            head.appendChild(style);
        }
    }, 750);
});

setTimeout(async () => {
    let yeahToken = await getYeahToken();
    let ignorePopup = await new Promise(resolve => chrome.storage.local.get('ignorePopup', result => resolve(result.ignorePopup)));
    let userId = await getUserId();
    if(!yeahToken && ignorePopup && ignorePopup[userId]) {
        return;
    }
    if(!yeahToken) {
            let modalOpenTime = Date.now();
            let modal = createModal(/*html*/`
                <h2 style="margin-top:0">
                    <img src="${chrome.runtime.getURL('images/yeah_on32.png')}" alt="Yeah!" style="width: 24px; height: 24px;margin-bottom: -4px;">
                    Welcome to Yeah! for Twitter extension!
                </h2>
                <p>This extension adds a <b>Yeah!</b> button to all tweets, which is essentially same thing as a Like but public to everyone. Everyone can see who Yeahed a tweet, and everyone can see all your Yeahs on your profile.</p>
                <p>It doesn't send a spammy reply with an image, instead it saves your Yeahs into a shared database.</p>
                <p>
                    In order to get started, you need to authenticate your Twitter account.
                    Click button below, and we'll automatically post a tweet on your behalf that will look like 'yeah-xxxxxxxx'.
                    Then our server will check for that tweet existence, confirm that it's you, and extension will automatically remove the tweet and save your token.
                    This tweet should be only up for about a second, so don't worry about posting nonsensical tweet.
                </p>
                <p>
                    <b>Important: your account must not be private so server can actually see the tweet. You'll need to make your account public for this auth, afterwards you can make it private again.</b>
                </p>
                <div class="error-message"></div>
                <div>
                    <button class="auth-button nice-yeah-button">Authenticate</button>
                </div>
                <div style="margin-top: 10px">
                    <span class="subtle dontshow" role="button">Never show this popup for this account</span>
                </div>
            `, 'welcome-modal', () => {}, () => Date.now() - modalOpenTime > 1250);
        
            let button = modal.querySelector('.auth-button');
            button.addEventListener('click', async () => {
                button.disabled = true;
                button.textContent = 'Authenticating...';
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
                        chrome.storage.local.get('yeahTokens', result => {
                            if(!result.yeahTokens) result.yeahTokens = {};
                            result.yeahTokens[userId] = tokens.private_token;
                            chrome.storage.local.set(result);
                        });
                        modal.removeModal();
        
                        modalOpenTime = Date.now();
                        let modal2 = createModal(/*html*/`
                            <h2 style="margin-top:0">
                                <img src="${chrome.runtime.getURL('images/yeah_on32.png')}" alt="Yeah!" style="width: 24px; height: 24px;margin-bottom: -4px;">
                                Authentification successful!
                            </h2>
                            <p>You can now Yeah! on any tweet. Yeah!!!!!</p>
                            <div>
                                btw I (<a href="/dimden" target="_blank" style="text-decoration:none;color:#1d9bf0">@dimden</a>) make a lot of cool extensions for Twitter like this, maybe u wanna follow me?
                            </div>
                            <div style="margin-top: 10px;"><button class="follow-button nice-yeah-button">Yeah! (Follow)</button></div>
                        `, 'authentification-successful', () => {}, () => Date.now() - modalOpenTime > 1500);
        
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
                                location.href = '/dimden';
                            });
                        });
                    } else {
                        throw new Error(res);
                    }
                } catch(e) {
                    console.error(e);
                    modal.querySelector('.error-message').innerHTML = `Failed to authenticate. Please try again later. (${e.message})`;
                } finally {
                    button.disabled = false;
                    button.textContent = 'Authenticate';
                    if(tweetId) {
                        callTwitterApi('POST', `/graphql/VaenaVgh5q5ih7kvyVjgtg/DeleteTweet`, {}, {
                            variables: {tweet_id: tweetId, dark_request: false},
                            queryId: "VaenaVgh5q5ih7kvyVjgtg"
                        });
                    }
                }
            });

            let dontshow  = modal.querySelector('.dontshow');
            dontshow.addEventListener('click', () => {
                chrome.storage.local.get('ignorePopup', result => {
                    if(!result.ignorePopup) result.ignorePopup = {};
                    result.ignorePopup[userId] = true;
                    chrome.storage.local.set(result);
                    modal.removeModal();
                    alert('Popup will not show again for this account. If you want to show it again, press on extension icon and press "Reset popup settings".');
                });
            });
        };
}, 1000);

let fetchQueue = [];
function hookIntoTweets() {
    let tweets = document.getElementsByTagName('article');

    for (let i = 0; i < tweets.length; i++) {
        let tweet = tweets[i];
        if(tweet.dataset.yeahed) continue;
        tweet.dataset.yeahed = true;

        let linkToTweet = Array.from(tweet.querySelectorAll('a[role="link"]')).find(a => a.href.includes('/status/') && !a.href.includes('/photo') && !a.href.includes('/video'));
        let oldTwitter = false;
        if(!linkToTweet) {
            let tweetDiv = tweet.closest('.tweet, .yeah-tweet');
            if(tweetDiv) {
                oldTwitter = true;
                linkToTweet = tweetDiv.querySelector('.tweet-time');
            } else {
                continue;
            }
        };
        let id = linkToTweet.href.match(/\/status\/(\d+)/)[1];
        if(!id) continue;

        fetchQueue.push(id);

        let div = document.createElement('div');
        let button = document.createElement('button');
        button.dataset.count = tweetCache[id] ? tweetCache[id].count : 0;
        button.addEventListener('click', async () => {
            if(!await getYeahToken()) {
                return alert('You need to authenticate first (refresh page for auth popup to appear)');
            }
            if(!button.classList.contains('yeahed')) {
                callYeahApi('/yeah', {
                    post_id: id
                });
                button.querySelector('.yeah-image').src = chrome.runtime.getURL('images/yeah_on32.png');
                let yeahCounter = button.querySelector('.yeah-counter');
                let count = parseInt(button.dataset.count);
                yeahCounter.innerText = formatLargeNumber(count + 1);
                button.dataset.count = count + 1;
                button.classList.add('yeahed');
                if(tweetCache[id]) {
                    tweetCache[id].yeahed = true;
                    tweetCache[id].count++;
                }
                let likeButton = tweet.querySelector('button[data-testid="like"], .tweet-interact-favorite:not(.tweet-interact-favorited)');
                if(likeButton) {
                    let settings = await getYeahSettings();
                    if(!settings.dontLike) likeButton.click();
                }
            } else {
                callYeahApi('/unyeah', {
                    post_id: id
                });
                button.classList.remove('yeahed');
                let yeahCounter = button.querySelector('.yeah-counter');
                let count = parseInt(button.dataset.count);
                yeahCounter.innerText = formatLargeNumber(count - 1);
                button.dataset.count = count - 1;
                if(count - 1 <= 0) yeahCounter.innerText = '';
                if(tweetCache[id]) {
                    tweetCache[id].yeahed = false;
                    tweetCache[id].count--;
                    if(tweetCache[id].count < 0) tweetCache[id].count = 0;
                }
                let likeButton = tweet.querySelector('button[data-testid="unlike"], .tweet-interact-favorite.tweet-interact-favorited');
                if(likeButton) {
                    let settings = await getYeahSettings();
                    if(!settings.dontLike) likeButton.click();
                }
            }
        });
        tweet.addEventListener("keydown", (e) => {
            if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if(e.key === "y") button.click();
        });
        button.addEventListener('mouseover', () => {
            button.querySelector('.yeah-image').src = chrome.runtime.getURL('images/yeah_on32.png');
        });
        button.addEventListener('mouseout', () => {
            if(!button.classList.contains('yeahed')) button.querySelector('.yeah-image').src = chrome.runtime.getURL('images/yeah_off32.png');
        });
        button.className = `yeah-button yeah-button-${id}`;
        div.className = 'yeah-button-container';

        let img = document.createElement('img');
        img.src = tweetCache[id] && tweetCache[id].yeahed ? chrome.runtime.getURL('images/yeah_on32.png') : chrome.runtime.getURL('images/yeah_off32.png');
        if(tweetCache[id] && tweetCache[id].yeahed) button.classList.add('yeahed');
        img.className = 'yeah-image';
        img.draggable = false;
        button.appendChild(img);

        let counter = document.createElement('span');
        counter.className = 'yeah-counter';
        counter.innerText = tweetCache[id] && typeof tweetCache[id].count === 'number' ? formatLargeNumber(tweetCache[id].count) : '';
        if(oldTwitter) {
            counter.classList.add('yeah-counter-oldtwitter');
        }
        
        button.appendChild(counter);
        div.appendChild(button);

        let group = tweet.querySelector('div[role="group"]');
        if(group && group.children && group.children[3]) group.children[3].after(div);
        else {
            let interactButton = tweet.querySelector('.tweet-interact-favorite, .tweet-yeah-interact-favorite');
            if(interactButton) {
                div.classList.add('yeah-button-container-oldtwitter');
                interactButton.after(div);
            }
        }
    }
}

function updateButton(data) {
    if(!data) return;
    let buttons = Array.from(document.getElementsByClassName(`yeah-button-${data.post_id}`));
    for(let button of buttons) {
        if(data.yeahed) {
            button.classList.add('yeahed');
            button.querySelector('.yeah-image').src = chrome.runtime.getURL('images/yeah_on32.png');
        } else {
            button.classList.remove('yeahed');
            button.querySelector('.yeah-image').src = chrome.runtime.getURL('images/yeah_off32.png');
        }
        button.dataset.count = data.count;

        let counter = button.querySelector('.yeah-counter');
        counter.innerText = data.count === 0 ? '' : formatLargeNumber(data.count);
    }
}

let tweetCache = {};
setInterval(() => tweetCache = {}, 1000 * 60 * 5);
setInterval(async () => {
    if(fetchQueue.length > 0 && await getYeahToken()) {
        let first100 = fetchQueue.splice(0, 100);
        let cachedData = first100.map(id => tweetCache[id]).filter(Boolean);
        for(let cache of cachedData) {
            updateButton(cache);
        }
        first100 = first100.filter((id) => !tweetCache[id]);
        if(!first100.length) return;
        for(let id of first100) {
            tweetCache[id] = {
                post_id: id,
                yeahed: false,
                count: 0
            };
        }
        let data = JSON.parse(await callYeahApi('/get', {
            post_ids: first100.join(',')
        }));
        for(let i in data) {
            tweetCache[data[i].post_id] = data[i];
            updateButton(data[i]);
        }
    }
}, 1500);

function hookIntoInteractions() {
    let path = window.location.pathname;
    let addedTab;
    if(path.includes('/status/') && (path.endsWith('/quotes') || path.endsWith('/retweets') || path.endsWith('/likes'))) {
        let tablist = document.querySelector('div[role="tablist"]');
        if(!tablist) return;
        if(tablist.dataset.yeahed) return;
        tablist.dataset.yeahed = true;

        let yeahTab = document.createElement('div');
        yeahTab.className = 'yeah-tab';

        let span = document.createElement('span');
        span.innerText = 'Yeahs';
        yeahTab.appendChild(span);
        tablist.appendChild(yeahTab);

        addedTab = yeahTab;
    } else {
        let tablist = document.querySelector('.tweet-footer-stats');
        if(!tablist) return;
        if(tablist.dataset.yeahed) return;
        tablist.dataset.yeahed = true;

        let yeahTab = document.createElement('a');
        yeahTab.className = 'tweet-footer-stat';
        yeahTab.style.cursor = 'pointer';

        let span = document.createElement('span');
        span.innerText = 'Yeahs';
        span.className = 'tweet-footer-stat-text';

        let b = document.createElement('b');
        let id = location.pathname.match(/\/status\/(\d+)/)[1];
        b.innerText = tweetCache[id] && typeof tweetCache[id].count === 'number' ? formatLargeNumber(tweetCache[id].count) : '?';
        b.className = 'tweet-footer-stat-count';

        yeahTab.appendChild(span);
        yeahTab.appendChild(b);
        tablist.appendChild(yeahTab);

        addedTab = yeahTab;
    }

    if(addedTab) {
        addedTab.addEventListener('click', async() => {
            if(!await getYeahToken()) {
                return alert('You need to authenticate first (refresh page for auth popup to appear)');
            }
            let modal = createModal(/*html*/`
                <h3>Yeahs</h3>
                <div class="list"></div>
                <div class="loader" style="text-align:center">
                    <img src="${chrome.runtime.getURL('images/loading.svg')}" width="64" height="64">
                </div>
            `, 'yeah-users');

            let list = modal.querySelector('.list');

            let data = JSON.parse(await callYeahApi('/get_users', {
                post_id: path.match(/\/status\/(\d+)/)[1],
                page: 1
            }));

            if(!data.length) {
                modal.querySelector('.loader').hidden = true;
                list.innerHTML = 'No Yeahs yet';
                return;
            }

            let lookup = await API.user.lookup(data);

            modal.querySelector('.loader').hidden = true;

            let addedUsers = [];
            
            for(let id of data) {
                let user = lookup.find(user => user.id_str === id);
                if(user) {
                    appendUser(user, list);
                    addedUsers.push(user.id_str);
                }
            }

            let modalContent = modal.querySelector('.yeah-modal-content');
            let over = false, loadingMore = false, page = 2;
            modalContent.addEventListener('scroll', async () => {
                if(over) return;
                if(loadingMore) return;

                let scrollPosition = modalContent.scrollTop + modalContent.offsetHeight;
                if(scrollPosition >= modalContent.scrollHeight - 200) {
                    loadingMore = true;
                    modal.querySelector('.loader').hidden = false;
                    let data = JSON.parse(await callYeahApi('/get_users', {
                        post_id: path.match(/\/status\/(\d+)/)[1],
                        page: page++
                    }));
                    if(!data.length) {
                        over = true;
                        modal.querySelector('.loader').hidden = true;
                        return;
                    }
                    let lookup = await API.user.lookup(data);
                    for(let id of data) {
                        if(addedUsers.includes(id)) continue;

                        let user = lookup.find(user => user.id_str === id);
                        if(user) {
                            appendUser(user, list);
                            addedUsers.push(user.id_str);
                        }
                    }
                    loadingMore = false;
                    modal.querySelector('.loader').hidden = true;
                }
            });
        });
    }
}

function hookIntoProfile() {
    if(['/notifications', '/explore', '/home', '/messages', '/compose'].includes(window.location.pathname)) return;
    if(window.location.pathname.startsWith('/search')) return;
    if(window.location.pathname.startsWith('/i/')) return;
    if(window.location.pathname.startsWith('/explore/')) return;
    if(window.location.pathname.startsWith('/notifications/')) return;
    if(window.location.pathname.startsWith('/compose/')) return;
    if(window.location.pathname.startsWith('/messages/')) return;
    if(window.location.pathname.includes('/communities/')) return;
    if(window.location.pathname.includes('/status/')) return;
    if(window.location.pathname.includes('/settings/')) return;

    let addedTab;
    let profileStats = document.querySelector('#profile-stats');
    if(!profileStats) {
        let tablist = document.querySelector('div:not([data-testid="toolBar"]) > nav[role="navigation"][aria-live="polite"] div div[role="tablist"]');
        if(!tablist) return;
        if(tablist.dataset.yeahed) return;
        tablist.dataset.yeahed = true;
    
        let yeahTab = document.createElement('div');
        yeahTab.className = 'yeah-tab';
        let span = document.createElement('span');
        span.innerText = 'Yeahs';

        yeahTab.appendChild(span);   
        tablist.appendChild(yeahTab);
        
        addedTab = yeahTab;
    } else {
        if(profileStats.dataset.yeahed) return;
        profileStats.dataset.yeahed = true;

        let yeahTab = document.createElement('a');
        yeahTab.className = 'profile-stat';
        yeahTab.style.cursor = 'pointer';

        let span = document.createElement('span');
        span.innerText = 'Yeahs';
        span.className = 'profile-stat-text';

        let span2 = document.createElement('span');
        span2.className = 'profile-stat-value';
        span2.innerText = '?';

        setTimeout(() => {
            let avatar = document.getElementById('profile-avatar');
            if(!avatar || !avatar.dataset.user_id) return;
            let id = avatar.dataset.user_id;
            callYeahApi('/get_user_yeah_count', {
                user_id: id
            }).then(data => {
                data = JSON.parse(data);
                if(typeof data.count === 'number') span2.innerText = formatLargeNumber(data.count);
            });
        }, 2000);

        yeahTab.appendChild(span);
        yeahTab.appendChild(span2);

        profileStats.appendChild(yeahTab);

        addedTab = yeahTab;
    }
    if(addedTab) addedTab.addEventListener('click', async () => {
        if(!await getYeahToken()) {
            return alert('You need to authenticate first (refresh page for auth popup to appear)');
        }
        let username = window.location.pathname.split('/')[1];
        let modal = createModal(/*html*/`
            <h3>${username}'s Yeahs</h3>
            <div class="list"></div>
            <div class="loader" style="text-align:center">
                <img src="${chrome.runtime.getURL('images/loading.svg')}" width="64" height="64">
            </div>
        `, 'yeah-posts');

        let list = modal.querySelector('.list');
        let user = await API.user.get(username, false);

        let data = JSON.parse(await callYeahApi('/get_yeahs', {
            user_id: user.id_str,
            page: 1
        }));

        if(!data.length) {
            modal.querySelector('.loader').hidden = true;
            list.innerHTML = 'No Yeahs yet';
            return;
        }

        let tweets = await API.tweet.lookup(data);

        if(!tweets.length) {
            modal.querySelector('.loader').hidden = true;
            list.innerHTML = 'No Yeahs yet';
            return;
        }

        
        let addedPosts = [];
        for(let id of data) {
            let tweet = tweets.find(tweet => tweet.id_str === id);
            if(tweet) {
                await appendTweet(tweet, list, {}, user);
                addedPosts.push(tweet.id_str);
            }
        }
        modal.querySelector('.loader').hidden = true;

        let modalContent = modal.querySelector('.yeah-modal-content');
        let over = false, loadingMore = false, page = 2;
        modalContent.addEventListener('scroll', async () => {
            if(over) return;
            if(loadingMore) return;

            let scrollPosition = modalContent.scrollTop + modalContent.offsetHeight;
            if(scrollPosition >= modalContent.scrollHeight - 200) {
                loadingMore = true;
                modal.querySelector('.loader').hidden = false;
                let data = JSON.parse(await callYeahApi('/get_yeahs', {
                    user_id: user.id_str,
                    page: page++
                }));
                if(!data.length) {
                    over = true;
                    modal.querySelector('.loader').hidden = true;
                    return;
                }
                let tweets = await API.tweet.lookup(data);
                for(let id of data) {
                    if(addedPosts.includes(id)) continue;
                    let tweet = tweets.find(tweet => tweet.id_str === id);
                    if(tweet) {
                        await appendTweet(tweet, list, {}, user);
                        addedPosts.push(tweet.id_str);
                    }
                }
                loadingMore = false;
                modal.querySelector('.loader').hidden = true;
            }
        });
    });
}

setInterval(hookIntoTweets, 250);
setInterval(hookIntoInteractions, 500);
setInterval(hookIntoProfile, 500);
