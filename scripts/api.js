const publicToken = "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
function getCsrf() {
    let csrf = document.cookie.match(/(?:^|;\s*)ct0=([0-9a-f]+)\s*(?:;|$)/);
    return csrf ? csrf[1] : "";
}

function debugLog(...args) {
    if(typeof vars === "object" && vars.developerMode) {
        if(args[0] === 'notifications.get' && !document.querySelector('.notifications-modal') && !location.pathname.startsWith('/notifications')) return; 
        if(vars.extensiveLogging) {
            console.trace(...args);
        } else {
            console.log(...args, new Error().stack.split("\n")[2].trim()); // genius
        }
    }
}

// extract full text and url entities from "note_tweet"
function parseNoteTweet(result) {
    let text, entities;
    if(result.note_tweet.note_tweet_results.result) {
        text = result.note_tweet.note_tweet_results.result.text;
        entities = result.note_tweet.note_tweet_results.result.entity_set;
        if(result.note_tweet.note_tweet_results.result.richtext?.richtext_tags.length) {
            entities.richtext = result.note_tweet.note_tweet_results.result.richtext.richtext_tags // logically, richtext is an entity, right?
        }
    } else {
        text = result.note_tweet.note_tweet_results.text;
        entities = result.note_tweet.note_tweet_results.entity_set;
    }
    return {text, entities};
}


// transform ugly useless twitter api reply to usable legacy tweet
function parseTweet(res) {
    if(typeof res !== "object") return;
    if(res.limitedActionResults) {
        let limitation = res.limitedActionResults.limited_actions.find(l => l.action === "Reply");
        if(limitation) {
            res.tweet.legacy.limited_actions_text = limitation.prompt ? limitation.prompt.subtext.text : LOC.limited_tweet.message;
        }
        res = res.tweet;
    }
    if(!res.legacy && res.tweet) res = res.tweet;
    let tweet = res.legacy;
    if(!res.core) return;
    tweet.user = res.core.user_results.result.legacy;
    tweet.user.id_str = tweet.user_id_str;
    if(res.core.user_results.result.is_blue_verified && !res.core.user_results.result.legacy.verified_type) {
        tweet.user.verified = true;
        tweet.user.verified_type = "Blue";
    }
    if(tweet.retweeted_status_result) {
        let result = tweet.retweeted_status_result.result;
        if(result.limitedActionResults && result.tweet && result.tweet.legacy) {
            let limitation = result.limitedActionResults.limited_actions.find(l => l.action === "Reply");
            if(limitation) {
                result.tweet.legacy.limited_actions_text = limitation.prompt ? limitation.prompt.subtext.text : LOC.limited_tweet.message;
            }
        }
        if(result.tweet) result = result.tweet;
        if(
            result.quoted_status_result && 
            result.quoted_status_result.result && 
            result.quoted_status_result.result.legacy &&
            result.quoted_status_result.result.core &&
            result.quoted_status_result.result.core.user_results.result.legacy    
        ) {
            result.legacy.quoted_status = result.quoted_status_result.result.legacy;
            if(result.legacy.quoted_status) {
                result.legacy.quoted_status.user = result.quoted_status_result.result.core.user_results.result.legacy;
                result.legacy.quoted_status.user.id_str = result.legacy.quoted_status.user_id_str;
                if(result.quoted_status_result.result.core.user_results.result.is_blue_verified && !result.quoted_status_result.result.core.user_results.result.legacy.verified_type) {
                    result.legacy.quoted_status.user.verified = true;
                    result.legacy.quoted_status.user.verified_type = "Blue";
                }
                tweetStorage[result.legacy.quoted_status.id_str] = result.legacy.quoted_status;
                tweetStorage[result.legacy.quoted_status.id_str].cacheDate = Date.now();
                userStorage[result.legacy.quoted_status.user.id_str] = result.legacy.quoted_status.user;
                userStorage[result.legacy.quoted_status.user.id_str].cacheDate = Date.now();
            } else {
                console.warn("No retweeted quoted status", result);
            }
        } else if(
            result.quoted_status_result &&
            result.quoted_status_result.result &&  
            result.quoted_status_result.result.tweet && 
            result.quoted_status_result.result.tweet.legacy &&
            result.quoted_status_result.result.tweet.core &&
            result.quoted_status_result.result.tweet.core.user_results.result.legacy    
        ) {
            result.legacy.quoted_status = result.quoted_status_result.result.tweet.legacy;
            if(result.legacy.quoted_status) {
                result.legacy.quoted_status.user = result.quoted_status_result.result.tweet.core.user_results.result.legacy;
                result.legacy.quoted_status.user.id_str = result.legacy.quoted_status.user_id_str;
                if(result.quoted_status_result.result.tweet.core.user_results.result.is_blue_verified && !result.core.user_results.result.verified_type) {
                    result.legacy.quoted_status.user.verified = true;
                    result.legacy.quoted_status.user.verified_type = "Blue";
                }
                tweetStorage[result.legacy.quoted_status.id_str] = result.legacy.quoted_status;
                tweetStorage[result.legacy.quoted_status.id_str].cacheDate = Date.now();
                userStorage[result.legacy.quoted_status.user.id_str] = result.legacy.quoted_status.user;
                userStorage[result.legacy.quoted_status.user.id_str].cacheDate = Date.now();
            } else {
                console.warn("No retweeted quoted status", result);
            }
        }
        tweet.retweeted_status = result.legacy;
        if(tweet.retweeted_status && result.core.user_results.result.legacy) {
            tweet.retweeted_status.user = result.core.user_results.result.legacy;
            tweet.retweeted_status.user.id_str = tweet.retweeted_status.user_id_str;
            if(result.core.user_results.result.is_blue_verified && !result.core.user_results.result.legacy.verified_type) {
                tweet.retweeted_status.user.verified = true;
                tweet.retweeted_status.user.verified_type = "Blue";
            }
            tweet.retweeted_status.ext = {};
            if(result.views) {
                tweet.retweeted_status.ext.views = {r: {ok: {count: +result.views.count}}};
            }
            tweet.retweeted_status.res = res;
            if(res.card && res.card.legacy && res.card.legacy.binding_values) {
                tweet.retweeted_status.card = res.card.legacy;
            }
            tweetStorage[tweet.retweeted_status.id_str] = tweet.retweeted_status;
            tweetStorage[tweet.retweeted_status.id_str].cacheDate = Date.now();
            userStorage[tweet.retweeted_status.user.id_str] = tweet.retweeted_status.user;
            userStorage[tweet.retweeted_status.user.id_str].cacheDate = Date.now();
        } else {
            console.warn("No retweeted status", result);
        }
        if(result.note_tweet && result.note_tweet.note_tweet_results) {
            let note = parseNoteTweet(result);
            tweet.retweeted_status.full_text = note.text;
            tweet.retweeted_status.entities = note.entities;
            tweet.retweeted_status.display_text_range = undefined; // no text range for long tweets
        }
    }

    if(res.quoted_status_result) {
        tweet.quoted_status_result = res.quoted_status_result;
    }
    if(res.note_tweet && res.note_tweet.note_tweet_results) {
        let note = parseNoteTweet(res);
        tweet.full_text = note.text;
        tweet.entities = note.entities;
        tweet.display_text_range = undefined; // no text range for long tweets
    }
    if(tweet.quoted_status_result && tweet.quoted_status_result.result) {
        let result = tweet.quoted_status_result.result;
        if(!result.core && result.tweet) result = result.tweet;
        if(result.limitedActionResults) {
            let limitation = result.limitedActionResults.limited_actions.find(l => l.action === "Reply");
            if(limitation) {
                result.tweet.legacy.limited_actions_text = limitation.prompt ? limitation.prompt.subtext.text : LOC.limited_tweet.message;
            }
            result = result.tweet;
        }
        tweet.quoted_status = result.legacy;
        if(tweet.quoted_status) {
            tweet.quoted_status.user = result.core.user_results.result.legacy;
            if(!tweet.quoted_status.user) {
                delete tweet.quoted_status;
            } else {
                tweet.quoted_status.user.id_str = tweet.quoted_status.user_id_str;
                if(result.core.user_results.result.is_blue_verified && !result.core.user_results.result.legacy.verified_type) {
                    tweet.quoted_status.user.verified = true;
                    tweet.quoted_status.user.verified_type = "Blue";
                }
                tweet.quoted_status.ext = {};
                if(result.views) {
                    tweet.quoted_status.ext.views = {r: {ok: {count: +result.views.count}}};
                }
                tweetStorage[tweet.quoted_status.id_str] = tweet.quoted_status;
                tweetStorage[tweet.quoted_status.id_str].cacheDate = Date.now();
                userStorage[tweet.quoted_status.user.id_str] = tweet.quoted_status.user;
                userStorage[tweet.quoted_status.user.id_str].cacheDate = Date.now();
            }
        } else {
            console.warn("No quoted status", result);
        }
    }
    if(res.card && res.card.legacy) {
        tweet.card = res.card.legacy;
        let bvo = {};
        for(let i = 0; i < tweet.card.binding_values.length; i++) {
            let bv = tweet.card.binding_values[i];
            bvo[bv.key] = bv.value;
        }
        tweet.card.binding_values = bvo;
    }
    if(res.views) {
        if(!tweet.ext) tweet.ext = {};
        tweet.ext.views = {r: {ok: {count: +res.views.count}}};
    }
    if(res.source) {
        tweet.source = res.source;
    }
    if(res.birdwatch_pivot) { // community notes
        tweet.birdwatch = res.birdwatch_pivot;
    }
    if(res.trusted_friends_info_result && res.trusted_friends_info_result.owner_results && res.trusted_friends_info_result.owner_results.result && res.trusted_friends_info_result.owner_results.result.legacy) {
        tweet.trusted_circle_owner = res.trusted_friends_info_result.owner_results.result.legacy.screen_name;
    }

    if(tweet.favorited && tweet.favorite_count === 0) {
        tweet.favorite_count = 1;
    }
    if(tweet.retweeted && tweet.retweet_count === 0) {
        tweet.retweet_count = 1;
    }

    tweet.res = res;

    tweetStorage[tweet.id_str] = tweet;
    tweetStorage[tweet.id_str].cacheDate = Date.now();
    userStorage[tweet.user.id_str] = tweet.user;
    userStorage[tweet.user.id_str].cacheDate = Date.now();
    return tweet;
}


const API = {
    user: {
        get: (val, byId = true) => {
            return new Promise((resolve, reject) => {
                fetch(`https://api.${location.hostname}/1.1/users/show.json?${byId ? `user_id=${val}` : `screen_name=${val}`}`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "x-twitter-client-language": window.LANGUAGE ? window.LANGUAGE : navigator.language ? navigator.language : "en"
                    },
                    credentials: "include"
                }).then(i => {
                    if(i.status === 401) {
                        setTimeout(() => {
                            location.href = `/i/flow/login?newtwitter=true`;
                        }, 50);
                    }
                    return i.json();
                }).then(data => {
                    debugLog('user.get', {val, byId, data});
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        getV2: name => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/graphql/sLVLhk0bGj3MVFEKTdax1w/UserByScreenName?variables=%7B%22screen_name%22%3A%22${name}%22%2C%22withSafetyModeUserFields%22%3Atrue%2C%22withSuperFollowsUserFields%22%3Atrue%7D&features=${encodeURIComponent(JSON.stringify({"blue_business_profile_image_shape_enabled":true,"responsive_web_graphql_exclude_directive_enabled":true,"verified_phone_label_enabled":false,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"responsive_web_graphql_timeline_navigation_enabled":true}))}`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/json",
                        "x-twitter-client-language": LANGUAGE ? LANGUAGE : navigator.language ? navigator.language : "en"
                    },
                    credentials: "include"
                }).then(i => i.json()).then(data => {
                    debugLog('user.getV2', 'start', {name, data});
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    if(data.data.user.result.unavailable_message) {
                        return reject(data.data.user.result.unavailable_message.text);
                    }

                    let result = data.data.user.result;
                    result.legacy.id_str = result.rest_id;
                    if(result.legacy_extended_profile.birthdate) {
                        result.legacy.birthdate = result.legacy_extended_profile.birthdate;
                    }
                    if(result.professional) {
                        result.legacy.professional = result.professional;
                    }
                    if(result.affiliates_highlighted_label && result.affiliates_highlighted_label.label) {
                        result.legacy.affiliates_highlighted_label = result.affiliates_highlighted_label.label;
                    }
                    if(result.is_blue_verified && !result.legacy.verified_type) {
                        result.legacy.verified_type = "Blue";
                    }
        
                    debugLog('user.getV2', 'end', result.legacy);
                    resolve(result.legacy);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        follow: screen_name => {
            return new Promise((resolve, reject) => {
                fetch(`https://api.${location.hostname}/1.1/friendships/create.json`, {
                    method: 'POST',
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
                    },
                    credentials: "include",
                    body: `screen_name=${screen_name}`
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                    if(screen_name === 'd1mden') {
                        chrome.storage.local.set({'followingDeveloper': true}, () => {});
                    }
                    chrome.storage.local.get(['sortedFollowers'], async d => {
                        let sortedFollowers = d.sortedFollowers;
                        if(!sortedFollowers) return;
                        if(!sortedFollowers[user.id_str]) return;
                        if(!sortedFollowers[user.id_str].followers) return;
                        if(sortedFollowers[user.id_str].followers.length === 0) return;

                        let index = sortedFollowers[user.id_str].followers.findIndex(f => f[2] === screen_name);
                        if(index === -1) return;
                        sortedFollowers[user.id_str].followers[index][7] = 1;
                        sortedFollowers[user.id_str].followers[index][1]++;
                        chrome.storage.local.set({sortedFollowers}, () => {});
                    });
                    let cachedUser = Object.values(userStorage).find(u => u.screen_name.toLowerCase() === screen_name.toLowerCase());
                    if(cachedUser) {
                        cachedUser.following = true;
                        cachedUser.following_count++;
                    }
                }).catch(e => {
                    reject(e);
                });
            });
        },
        unfollow: screen_name => {
            return new Promise((resolve, reject) => {
                fetch(`https://api.${location.hostname}/1.1/friendships/destroy.json`, {
                    method: 'POST',
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
                    },
                    credentials: "include",
                    body: `screen_name=${screen_name}`
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                    if(screen_name === 'd1mden') {
                        chrome.storage.local.set({'followingDeveloper': false}, () => {});
                    }
                    chrome.storage.local.get(['sortedFollowers'], async d => {
                        let sortedFollowers = d.sortedFollowers;
                        if(!sortedFollowers) return;
                        if(!sortedFollowers[user.id_str]) return;
                        if(!sortedFollowers[user.id_str].followers) return;
                        if(sortedFollowers[user.id_str].followers.length === 0) return;

                        let index = sortedFollowers[user.id_str].followers.findIndex(f => f[2] === screen_name);
                        if(index === -1) return;
                        sortedFollowers[user.id_str].followers[index][7] = 1;
                        sortedFollowers[user.id_str].followers[index][1]--;
                        chrome.storage.local.set({sortedFollowers}, () => {});
                    });
                    let cachedUser = Object.values(userStorage).find(u => u.screen_name.toLowerCase() === screen_name.toLowerCase());
                    if(cachedUser) {
                        cachedUser.following = false;
                        cachedUser.following_count--;
                    }
                }).catch(e => {
                    reject(e);
                });
            });
        },
        getMediaTweets: (id, cursor) => {
            return new Promise((resolve, reject) => {
                let variables = {"userId":id,"count":20,"cursor":cursor,"includePromotedContent":false,"withClientEventToken":false,"withBirdwatchNotes":false,"withVoice":true,"withV2Timeline":true};
                let features = {"rweb_tipjar_consumption_enabled":true,"responsive_web_graphql_exclude_directive_enabled":true,"verified_phone_label_enabled":false,"creator_subscriptions_tweet_preview_api_enabled":true,"responsive_web_graphql_timeline_navigation_enabled":true,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"communities_web_enable_tweet_community_results_fetch":true,"c9s_tweet_anatomy_moderator_badge_enabled":true,"articles_preview_enabled":true,"tweetypie_unmention_optimization_enabled":true,"responsive_web_edit_tweet_api_enabled":true,"graphql_is_translatable_rweb_tweet_is_translatable_enabled":true,"view_counts_everywhere_api_enabled":true,"longform_notetweets_consumption_enabled":true,"responsive_web_twitter_article_tweet_consumption_enabled":true,"tweet_awards_web_tipping_enabled":false,"creator_subscriptions_quote_tweet_preview_enabled":false,"freedom_of_speech_not_reach_fetch_enabled":true,"standardized_nudges_misinfo":true,"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled":true,"rweb_video_timestamps_enabled":true,"longform_notetweets_rich_text_read_enabled":true,"longform_notetweets_inline_media_enabled":true,"responsive_web_enhance_cards_enabled":false};
                let fieldToggles = {"withArticlePlainText":false};
                if(cursor) {
                    variables.cursor = cursor;
                }
                fetch(`/i/api/graphql/1dmA2m-qIsGm2XfqQtcD3A/UserMedia?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}&fieldToggles=${encodeURIComponent(JSON.stringify(fieldToggles))}`, {
                    headers: {
                        "authorization": isFinite(+localStorage.hitRateLimit) && +localStorage.hitRateLimit > Date.now() ? OLDTWITTER_CONFIG.oauth_key : publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/json",
                        "x-twitter-client-language": LANGUAGE ? LANGUAGE : navigator.language ? navigator.language : "en"
                    },
                    credentials: "include"
                }).then(i => i.json()).then(data => {
                    debugLog('user.getMediaTweets', 'start', {id, cursor, data});
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    let entries = data.data.user.result.timeline_v2.timeline.instructions.find(i => i.type === 'TimelineAddEntries').entries;
                    let isGrid = !!entries.find(e => e.entryId === 'profile-grid-0') || data.data.user.result.timeline_v2.timeline.instructions.find(i => i.type === 'TimelineAddToModule');
                    let tweets;
                    if (isGrid) {
                        let items;
                        if (cursor) {
                            items = data.data.user.result.timeline_v2.timeline.instructions.find(i => i.type === 'TimelineAddToModule').moduleItems;
                        } else {
                            items = entries.find(e => e.entryId === 'profile-grid-0')?.content?.items || [];
                        }
                        tweets = items.filter(e => e.entryId.startsWith('profile-grid-0-tweet-')).map(t => {
                            let tweet = parseTweet(t.item.itemContent.tweet_results.result);
                            if(tweet) {
                                tweet.hasModeratedReplies = t.item.itemContent.hasModeratedReplies;
                            }
                            return tweet;
                        }).filter(i => i);
                    } else {
                        tweets = entries.filter(e => e.entryId.startsWith('tweet-')).map(t => {
                            let tweet = parseTweet(t.content.itemContent.tweet_results.result);
                            if(tweet) {
                                tweet.hasModeratedReplies = t.content.itemContent.hasModeratedReplies;
                            }
                            return tweet;
                        }).filter(i => i);
                    }

                    let newCursor = entries.find(e => e.entryId.startsWith('cursor-bottom-'));
                    if(newCursor) {
                        newCursor = newCursor.content.value;
                    }
        
                    let out = {
                        tweets,
                        cursor: newCursor
                    };
                    debugLog('user.getMediaTweets', 'end', out);
                    resolve(out);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        friendsFollowing: (val, by_id = true) => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/1.1/friends/following/list.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&include_ext_has_nft_avatar=1&skip_status=1&cursor=-1&${by_id ? `user_id=${val}` : `screen_name=${val}`}&count=10&with_total_count=true`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session"
                    },
                    credentials: "include"
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        getRelationship: id => {
            return new Promise((resolve, reject) => {
                fetch(`https://api.${location.hostname}/1.1/friendships/show.json?source_id=${id}&target_screen_name=JinjersTemple&cards_platform=Web-13&include_entities=1&include_user_entities=1&include_cards=1&send_error_codes=1&tweet_mode=extended&include_ext_alt_text=true&include_reply_count=true`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session"
                    },
                    credentials: "include"
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        receiveNotifications: (id, receive = false) => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/1.1/friendships/update.json`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    credentials: "include",
                    method: 'post',
                    body: `include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&include_ext_has_nft_avatar=1&skip_status=1&cursor=-1&id=${id}&device=${receive}`
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        block: id => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/1.1/blocks/create.json`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    credentials: "include",
                    method: 'post',
                    body: `user_id=${id}`
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        unblock: id => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/1.1/blocks/destroy.json`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    credentials: "include",
                    method: 'post',
                    body: `user_id=${id}`
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }

                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        mute: id => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/1.1/mutes/users/create.json`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    credentials: "include",
                    method: 'post',
                    body: `user_id=${id}`
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        unmute: id => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/1.1/mutes/users/destroy.json`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    credentials: "include",
                    method: 'post',
                    body: `user_id=${id}`
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }

                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        removeFollower: id => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/graphql/QpNfg0kpPRfjROQ_9eOLXA/RemoveFollower`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/json"
                    },
                    credentials: "include",
                    method: 'post',
                    body: JSON.stringify({"variables":{"target_user_id":id},"queryId":"QpNfg0kpPRfjROQ_9eOLXA"})
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        lookup: ids => {
            return new Promise((resolve, reject) => {
                fetch(`https://api.${location.hostname}/1.1/users/lookup.json?user_id=${ids.join(",")}`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
                    },
                    credentials: "include"
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        getFollowersYouFollow: (id, cursor) => {
            return new Promise((resolve, reject) => {
                let obj = {
                    "userId": id,
                    "count": 50,
                    "includePromotedContent": false
                };
                if(cursor) obj.cursor = cursor;
                fetch(`/i/api/graphql/m8AXvuS9H0aAI09J3ISOrw/FollowersYouKnow?variables=${encodeURIComponent(JSON.stringify(obj))}&features=${encodeURIComponent(JSON.stringify({"rweb_lists_timeline_redesign_enabled":false,"responsive_web_graphql_exclude_directive_enabled":true,"verified_phone_label_enabled":false,"creator_subscriptions_tweet_preview_api_enabled":true,"responsive_web_graphql_timeline_navigation_enabled":true,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"tweetypie_unmention_optimization_enabled":true,"responsive_web_edit_tweet_api_enabled":true,"graphql_is_translatable_rweb_tweet_is_translatable_enabled":true,"view_counts_everywhere_api_enabled":true,"longform_notetweets_consumption_enabled":true,"responsive_web_twitter_article_tweet_consumption_enabled":false,"tweet_awards_web_tipping_enabled":false,"freedom_of_speech_not_reach_fetch_enabled":true,"standardized_nudges_misinfo":true,"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled":true,"longform_notetweets_rich_text_read_enabled":true,"longform_notetweets_inline_media_enabled":true,"responsive_web_media_download_video_enabled":false,"responsive_web_enhance_cards_enabled":false}))}`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/json"
                    },
                    credentials: "include"
                }).then(i => i.json()).then(data => {
                    debugLog('user.getFollowersYouFollow', 'start', {id, cursor, data});
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    let list = data.data.user.result.timeline.timeline.instructions.find(i => i.type === 'TimelineAddEntries').entries;
                    const out = {
                        list: list.filter(e => e.entryId.startsWith('user-')).map(e => {
                            let user = e.content.itemContent.user_results.result;
                            user.legacy.id_str = user.rest_id;
                            if(user.is_blue_verified && !user.legacy.verified_type) {
                                user.legacy.verified = true;
                                user.legacy.verified_type = "Blue";
                            }
                            return user.legacy;
                        }),
                        cursor: list.find(e => e.entryId.startsWith('cursor-bottom-')).content.value
                    };
                    debugLog('user.getFollowersYouFollow', 'end', out);
                    resolve(out);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        switchRetweetsVisibility: (user_id, see) => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/1.1/friendships/update.json`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    credentials: "include",
                    method: 'post',
                    body: `id=${user_id}&retweets=${see}`
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        getFollowRequests: (cursor = -1) => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/1.1/friendships/incoming.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&include_ext_has_nft_avatar=1&skip_status=1&cursor=${cursor}&stringify_ids=true&count=100`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session"
                    },
                    credentials: "include"
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        acceptFollowRequest: user_id => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/1.1/friendships/accept.json`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    credentials: "include",
                    method: 'post',
                    body: `user_id=${user_id}`
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        declineFollowRequest: user_id => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/1.1/friendships/deny.json`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    credentials: "include",
                    method: 'post',
                    body: `user_id=${user_id}`
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
    },
    tweet: {
        post: data => { // deprecated
            return new Promise((resolve, reject) => {
                fetch(`https://api.${location.hostname}/1.1/statuses/update.json`, {
                    method: 'POST',
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
                    },
                    body: new URLSearchParams(data).toString(),
                    credentials: "include"
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        /* 
            text | tweet_text | status - tweet text
            media | media_ids - media ids
            card_uri - card uri
            sensitive - sensitive media
            in_reply_to_status_id | in_reply_to_tweet_id - reply to tweet id
            exclude_reply_user_ids - exclude mentions
            attachment_url - quote tweet url
            circle - circle id
            conversation_control - conversation control (follows | mentions)
        */
        postV2: tweet => {
            return new Promise((resolve, reject) => {
                let text;
                if(tweet.text) {
                    text = tweet.text;
                } else if(tweet.tweet_text) {
                    text = tweet.tweet_text;
                } else if(tweet.status) {
                    text = tweet.status;
                } else {
                    text = "";
                }
                let variables = {
                    "tweet_text": text,
                    "media": {
                        "media_entities": [],
                        "possibly_sensitive": false
                    },
                    "semantic_annotation_ids": [],
                    "dark_request": false
                };
                if(tweet.card_uri) {
                    variables.card_uri = tweet.card_uri;
                }
                if(tweet.media_ids) {
                    if(typeof tweet.media_ids === "string") {
                        tweet.media = tweet.media_ids.split(",");
                    } else {
                        tweet.media = tweet.media_ids;
                    }
                }
                if(tweet.media) {
                    variables.media.media_entities = tweet.media.map(i => ({media_id: i, tagged_users: []}));
                    if(tweet.sensitive) {
                        variables.media.possibly_sensitive = true;
                    }
                }
                if(tweet.conversation_control === 'follows') {
                    variables.conversation_control = { mode: 'Community' };
                } else if(tweet.conversation_control === 'mentions') {
                    variables.conversation_control = { mode: 'ByInvitation' };
                }
                if(tweet.circle) {
                    variables.trusted_friends_control_options = { "trusted_friends_list_id": tweet.circle };
                }
                if(tweet.in_reply_to_status_id) {
                    tweet.in_reply_to_tweet_id = tweet.in_reply_to_status_id;
                    delete tweet.in_reply_to_status_id;
                }
                if(tweet.in_reply_to_tweet_id) {
                    variables.reply = {
                        in_reply_to_tweet_id: tweet.in_reply_to_tweet_id,
                        exclude_reply_user_ids: []
                    }
                    if(tweet.exclude_reply_user_ids) {
                        if(typeof tweet.exclude_reply_user_ids === "string") {
                            tweet.exclude_reply_user_ids = tweet.exclude_reply_user_ids.split(",");
                        }
                        variables.reply.exclude_reply_user_ids = tweet.exclude_reply_user_ids;
                    }
                }
                if(tweet.attachment_url) {
                    variables.attachment_url = tweet.attachment_url;
                }
                debugLog('tweet.postV2', 'init', {tweet, variables});
                let parsedTweet = twttr.txt.parseTweet(text);
                fetch(`/i/api/graphql/${parsedTweet.weightedLength > 280 ? 'cuvrhmg0s4pGaLWV68NNnQ/CreateNoteTweet' : 'I_J3_LvnnihD0Gjbq5pD2g/CreateTweet'}`, {
                    method: 'POST',
                    headers: {
                        "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAAPYXBAAAAAAACLXUNDekMxqa8h%2F40K4moUkGsoc%3DTYfbDKbT3jJPCEVnMYqilB28NHfOPqkca3qaAxGfsyKCs0wRbw",
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/json; charset=utf-8",
                        "x-twitter-client-language": LANGUAGE ? LANGUAGE : navigator.language ? navigator.language : "en"
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        variables,
                        "features": {"c9s_tweet_anatomy_moderator_badge_enabled":true,"tweetypie_unmention_optimization_enabled":true,"responsive_web_edit_tweet_api_enabled":true,"graphql_is_translatable_rweb_tweet_is_translatable_enabled":true,"view_counts_everywhere_api_enabled":true,"longform_notetweets_consumption_enabled":true,"responsive_web_twitter_article_tweet_consumption_enabled":false,"tweet_awards_web_tipping_enabled":false,"responsive_web_home_pinned_timelines_enabled":true,"longform_notetweets_rich_text_read_enabled":true,"longform_notetweets_inline_media_enabled":true,"responsive_web_graphql_exclude_directive_enabled":true,"verified_phone_label_enabled":false,"freedom_of_speech_not_reach_fetch_enabled":true,"standardized_nudges_misinfo":true,"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled":true,"responsive_web_media_download_video_enabled":false,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"responsive_web_graphql_timeline_navigation_enabled":true,"responsive_web_enhance_cards_enabled":false},
                        "queryId": parsedTweet.weightedLength > 280 ? 'cuvrhmg0s4pGaLWV68NNnQ' : 'I_J3_LvnnihD0Gjbq5pD2g'
                    })
                }).then(i => i.json()).then(data => {
                    debugLog('tweet.postV2', 'start', data);
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    let ct = data.data.create_tweet ? data.data.create_tweet : data.data.notetweet_create;
                    let result = ct.tweet_results.result;
                    let tweet = parseTweet(result);
                    if(result.trusted_friends_info_result && !tweet.limited_actions) {
                        tweet.limited_actions = 'limit_trusted_friends_tweet';
                    }
                    debugLog('tweet.postV2', 'end', tweet);
                    resolve(tweet);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        postScheduled: data => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/graphql/LCVzRQGxOaGnOnYH01NQXg/CreateScheduledTweet`, {
                    method: 'POST',
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/json; charset=utf-8",
                        "x-twitter-client-language": LANGUAGE ? LANGUAGE : navigator.language ? navigator.language : "en"
                    },
                    credentials: "include",
                    body: JSON.stringify(data)
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        favorite: id => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/graphql/lI07N6Otwv1PhnEgXILM7A/FavoriteTweet`, {
                    method: 'POST',
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/json; charset=utf-8"
                    },
                    credentials: "include",
                    body: JSON.stringify({"variables":{"tweet_id":id},"queryId":"lI07N6Otwv1PhnEgXILM7A"})
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        unfavorite: id => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/graphql/ZYKSe-w7KEslx3JhSIk5LA/UnfavoriteTweet`, {
                    method: 'POST',
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/json; charset=utf-8"
                    },
                    credentials: "include",
                    body: JSON.stringify({"variables":{"tweet_id":id},"queryId":"ZYKSe-w7KEslx3JhSIk5LA"})
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        retweet: id => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/graphql/ojPdsZsimiJrUGLR1sjUtA/CreateRetweet`, {
                    method: 'POST',
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/json; charset=utf-8"
                    },
                    credentials: "include",
                    body: JSON.stringify({"variables":{"tweet_id":id,"dark_request":false},"queryId":"ojPdsZsimiJrUGLR1sjUtA"})
                }).then(i => i.json()).then(data => {
                    debugLog('tweet.retweet', id, data);
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        unretweet: id => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/graphql/iQtK4dl5hBmXewYZuEOKVw/DeleteRetweet`, {
                    method: 'POST',
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/json; charset=utf-8"
                    },
                    credentials: "include",
                    body: JSON.stringify({"variables":{"source_tweet_id":id,"dark_request":false},"queryId":"iQtK4dl5hBmXewYZuEOKVw"})
                }).then(i => i.json()).then(data => {
                    debugLog('tweet.unretweet', id, data);
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        delete: id => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/graphql/VaenaVgh5q5ih7kvyVjgtg/DeleteTweet`, {
                    method: 'POST',
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/json; charset=utf-8"
                    },
                    credentials: "include",
                    body: JSON.stringify({"variables":{"tweet_id":id,"dark_request":false},"queryId":"VaenaVgh5q5ih7kvyVjgtg"})
                }).then(i => i.json()).then(data => {
                    debugLog('tweet.delete', id, data);
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        get: id => { // deprecated
            return new Promise((resolve, reject) => {
                fetch(`https://api.${location.hostname}/1.1/statuses/show.json?id=${id}&include_my_retweet=1&cards_platform=Web13&include_entities=1&include_user_entities=1&include_cards=1&send_error_codes=1&tweet_mode=extended&include_ext_alt_text=true&include_reply_count=true&ext=views%2CmediaStats%2CverifiedType%2CisBlueVerified`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "x-twitter-client-language": LANGUAGE ? LANGUAGE : navigator.language ? navigator.language : "en"
                    },
                    credentials: "include"
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        getV2: (id, useDiffKey) => {
            return new Promise((resolve, reject) => {
                chrome.storage.local.get(['tweetDetails'], d => {
                    if(!d.tweetDetails) d.tweetDetails = {};
                    if(d.tweetDetails[id] && Date.now() - d.tweetDetails[id].date < 60000*3) {
                        debugLog('tweet.getV2', 'cache', id, d.tweetDetails[id].data);
                        return resolve(d.tweetDetails[id].data);
                    }
                    if(loadingDetails[id]) {
                        if(!useDiffKey) return loadingDetails[id].listeners.push([resolve, reject]);
                    } else {
                        loadingDetails[id] = {
                            listeners: []
                        };
                    }
                    if(typeof useDiffKey === 'undefined' && isFinite(+localStorage.hitRateLimit) && +localStorage.hitRateLimit > Date.now()) {
                        useDiffKey = true;
                    }
                    fetch(`/i/api/graphql/KwGBbJZc6DBx8EKmyQSP7g/TweetDetail?variables=${encodeURIComponent(JSON.stringify({
                        "focalTweetId":id,
                        "with_rux_injections":false,
                        "includePromotedContent":false,
                        "withCommunity":true,
                        "withQuickPromoteEligibilityTweetFields":true,
                        "withBirdwatchNotes":true,
                        "withVoice":true,
                        "withV2Timeline":true
                    }))}&features=${encodeURIComponent(JSON.stringify({"rweb_lists_timeline_redesign_enabled":false,"blue_business_profile_image_shape_enabled":true,"responsive_web_graphql_exclude_directive_enabled":true,"verified_phone_label_enabled":false,"creator_subscriptions_tweet_preview_api_enabled":false,"responsive_web_graphql_timeline_navigation_enabled":true,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"tweetypie_unmention_optimization_enabled":true,"vibe_api_enabled":true,"responsive_web_edit_tweet_api_enabled":true,"graphql_is_translatable_rweb_tweet_is_translatable_enabled":true,"view_counts_everywhere_api_enabled":true,"longform_notetweets_consumption_enabled":true,"tweet_awards_web_tipping_enabled":false,"freedom_of_speech_not_reach_fetch_enabled":true,"standardized_nudges_misinfo":true,"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled":false,"interactive_text_enabled":true,"responsive_web_text_conversations_enabled":false,"longform_notetweets_rich_text_read_enabled":true,"longform_notetweets_inline_media_enabled":false,"responsive_web_enhance_cards_enabled":false}))}`, {
                        headers: {
                            "authorization": useDiffKey ? OLDTWITTER_CONFIG.oauth_key : publicToken,
                            "x-csrf-token": getCsrf(),
                            "x-twitter-auth-type": "OAuth2Session",
                            "x-twitter-client-language": LANGUAGE ? LANGUAGE : navigator.language ? navigator.language : "en"
                        },
                        credentials: "include"
                    }).then(i => i.json()).then(data => {
                        debugLog('tweet.getV2', 'start', id, data);
                        if (data.errors && data.errors[0]) {
                            if(data.errors[0].code === 88 && !useDiffKey) {
                                localStorage.hitRateLimit = Date.now() + 600000;
                                API.tweet.getV2(id, true).then(t => {
                                    resolve(t);
                                    if(loadingDetails[id]) loadingDetails[id].listeners.forEach(l => l[0](t));
                                    delete loadingDetails[id];
                                }).catch(e => {
                                    reject(e);
                                    if(loadingDetails[id]) loadingDetails[id].listeners.forEach(l => l[1](e));
                                    delete loadingDetails[id];
                                });
                                return;
                            }
                            if(loadingDetails[id]) loadingDetails[id].listeners.forEach(l => l[1](data.errors[0].message));
                            delete loadingDetails[id];
                            return reject(data.errors[0].message);
                        }

                        let ic = data.data.threaded_conversation_with_injections_v2.instructions.find(i => i.type === "TimelineAddEntries").entries.find(e => e.entryId === `tweet-${id}`).content.itemContent;
                        let res = ic.tweet_results.result;
                        let tweet = parseTweet(res);
                        if(tweet) {
                            tweet.hasModeratedReplies = ic.hasModeratedReplies;
                        }
                        debugLog('tweet.getV2', 'end', id, tweet);
                        resolve(tweet);
                        if(loadingDetails[id]) loadingDetails[id].listeners.forEach(l => l[0](tweet));
                        delete loadingDetails[id];
        
                        chrome.storage.local.get(['tweetDetails'], d => {
                            if(!d.tweetDetails) d.tweetDetails = {};
                            d.tweetDetails[id] = {
                                date: Date.now(),
                                data: tweet
                            };
                            chrome.storage.local.set({tweetDetails: d.tweetDetails}, () => {});
                        });
                    }).catch(e => {
                        reject(e);
                    });
                });
            });
        },
        vote: (api, tweet_id, card_uri, card_name, selected_choice) => {
            return new Promise((resolve, reject) => {
                fetch(`https://caps.${location.hostname}/v2/capi/${api.split('//')[1]}`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    credentials: "include",
                    method: 'post',
                    body: `twitter%3Astring%3Acard_uri=${encodeURIComponent(card_uri)}&twitter%3Along%3Aoriginal_tweet_id=${tweet_id}&twitter%3Astring%3Aresponse_card_name=${card_name}&twitter%3Astring%3Acards_platform=Web-12&twitter%3Astring%3Aselected_choice=${selected_choice}`
                }).then(response => response.json()).then(data => {
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            })
        },
        createCard: card_data => {
            return new Promise((resolve, reject) => {
                fetch(`https://caps.${location.hostname}/v2/cards/create.json`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    credentials: "include",
                    method: 'post',
                    body: `card_data=${encodeURIComponent(JSON.stringify(card_data))}`
                }).then(response => response.json()).then(data => {
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            })
        },
        getReplies: (id, cursor) => { // deprecated
            return new Promise((resolve, reject) => {
                if(cursor) {
                    cursor = cursor.replace(/\+/g, '%2B');
                }
                chrome.storage.local.get(['tweetReplies'], async d => {
                    if(!d.tweetReplies) d.tweetReplies = {};
                    if(!cursor) {
                        if(d.tweetReplies[id] && Date.now() - d.tweetReplies[id].date < 60000) {
                            return resolve(d.tweetReplies[id].data);
                        }
                        if(loadingReplies[id]) {
                            return loadingReplies[id].listeners.push([resolve, reject]);
                        } else {
                            loadingReplies[id] = {
                                listeners: []
                            };
                        }
                    }
                    fetch(`https://api.${location.hostname}/2/timeline/conversation/${id}.json?${cursor ? `cursor=${cursor}`: ''}&count=30&include_reply_count=true&cards_platform=Web-13&include_entities=1&include_user_entities=1&include_cards=1&send_error_codes=1&tweet_mode=extended&include_ext_alt_text=true&ext=views%2CmediaStats%2CverifiedType%2CisBlueVerified%2CnoteTweet`, {
                        headers: {
                            "authorization": publicToken,
                            "x-csrf-token": getCsrf(),
                            "x-twitter-auth-type": "OAuth2Session",
                            "content-type": "application/x-www-form-urlencoded",
                            "x-twitter-client-language": LANGUAGE ? LANGUAGE : navigator.language ? navigator.language : "en"
                        },
                        credentials: "include"
                    }).then(i => i.text()).then(data => {
                        try {
                            data = JSON.parse(data);
                        } catch(e) {
                            if(String(e).includes("SyntaxError")) {
                                return reject(data);
                            } else {
                                return reject(e);
                            }
                        }
                        if (data.errors && data.errors[0].code === 32) {
                            if(!cursor) {
                                loadingReplies[id].listeners.forEach(l => l[1]('Not logged in'));
                                delete loadingReplies[id];
                            }
                            return reject("Not logged in");
                        }
                        if (data.errors && data.errors[0]) {
                            if(!cursor) {
                                loadingReplies[id].listeners.forEach(l => l[1](data.errors[0].message));
                                delete loadingReplies[id];
                            }
                            return reject(data.errors[0].message);
                        }
                        let tweetData = data.globalObjects.tweets;
                        let userData = data.globalObjects.users;
                        let ae = data.timeline.instructions.find(i => i.addEntries);
                        if(!ae) {
                            let out = {
                                list: [],
                                cursor: null,
                                users: userData
                            };
                            if(!cursor) {
                                loadingReplies[id].listeners.forEach(l => l[0](out));
                                delete loadingReplies[id];
                            }
                            return resolve(out);
                        }
                        let entries = ae.addEntries.entries;

                        let newCursor;
                        try {
                            newCursor = entries.find(e => e.entryId.startsWith('cursor-bottom-')).content.operation.cursor.value;
                        } catch(e) {}

                        let list = [];
                        for (let i = 0; i < entries.length; i++) {
                            let e = entries[i];
                            if (e.entryId.startsWith('tweet-')) {
                                let tweet = tweetData[e.content.item.content.tweet.id];
                                if(!tweet) continue;
                                let user = userData[tweet.user_id_str];
                                tweet.id_str = e.content.item.content.tweet.id;
                                tweet.user = user;
                                if(tweet.quoted_status_id_str) {
                                    tweet.quoted_status = tweetData[tweet.quoted_status_id_str];
                                    if(tweet.quoted_status) {
                                        tweet.quoted_status.user = userData[tweet.quoted_status.user_id_str];
                                        tweet.quoted_status.user.id_str = tweet.quoted_status.user_id_str;
                                        tweet.quoted_status.id_str = tweet.quoted_status_id_str;
                                    }
                                }
                                list.push({
                                    type: tweet.id_str === id ? 'mainTweet' : 'tweet',
                                    data: tweet
                                });
                            } else if (e.entryId.startsWith('tombstone-')) {
                                if(e.content.item.content.tombstone.tweet) {
                                    let tweet = tweetData[e.content.item.content.tombstone.tweet.id];
                                    let user = userData[tweet.user_id_str];
                                    tweet.id_str = e.content.item.content.tombstone.tweet.id;
                                    tweet.user = user;
                                    if(tweet.quoted_status_id_str) {
                                        tweet.quoted_status = tweetData[tweet.quoted_status_id_str];
                                        if(tweet.quoted_status) {
                                            tweet.quoted_status.user = userData[tweet.quoted_status.user_id_str];
                                            tweet.quoted_status.user.id_str = tweet.quoted_status.user_id_str;
                                            tweet.quoted_status.id_str = tweet.quoted_status_id_str;
                                        }
                                    }
                                    tweet.tombstone = e.content.item.content.tombstone.tombstoneInfo.text;
                                    list.push({
                                        type: tweet.id_str === id ? 'mainTweet' : 'tweet',
                                        data: tweet
                                    });
                                } else {
                                    list.push({
                                        type: 'tombstone',
                                        data: e.content.item.content.tombstone.tombstoneInfo.text
                                    });
                                }
                            } else if(e.entryId.startsWith('conversationThread-')) {
                                let thread = e.content.item.content.conversationThread.conversationComponents.filter(c => c.conversationTweetComponent);
                                let threadList = [];
                                for (let j = 0; j < thread.length; j++) {
                                    let t = thread[j];
                                    let tweet = tweetData[t.conversationTweetComponent.tweet.id];
                                    if(!tweet) continue;
                                    let user = userData[tweet.user_id_str];
                                    tweet.id_str = t.conversationTweetComponent.tweet.id;
                                    if(tweet.quoted_status_id_str) {
                                        tweet.quoted_status = tweetData[tweet.quoted_status_id_str];
                                        if(tweet.quoted_status) {
                                            tweet.quoted_status.user = userData[tweet.quoted_status.user_id_str];
                                            tweet.quoted_status.user.id_str = tweet.quoted_status.user_id_str;
                                            tweet.quoted_status.id_str = tweet.quoted_status_id_str;
                                        }
                                    }
                                    tweet.user = user;
                                    threadList.push(tweet);
                                }
                                if(threadList.length === 1) {
                                    list.push({
                                        type: threadList[0].id_str === id ? 'mainTweet' : 'tweet',
                                        data: threadList[0]
                                    });
                                } else {
                                    list.push({
                                        type: 'conversation',
                                        data: threadList
                                    });
                                }
                            } else if(e.entryId.startsWith('cursor-showmorethreadsprompt')) {
                                if(newCursor === e.content.itemContent.value) {
                                    continue;
                                }
                                list.push({
                                    type: 'showMore',
                                    data: {
                                        cursor: e.content.itemContent.value,
                                        labelText: e.content.itemContent.displayTreatment.labelText,
                                        actionText: e.content.itemContent.displayTreatment.actionText
                                    }
                                });
                            }
                        }
                        resolve({
                            list,
                            cursor: newCursor,
                            users: userData
                        });
                        if(!cursor) {
                            loadingReplies[id].listeners.forEach(l => l[0]({
                                list,
                                cursor: newCursor,
                                users: userData
                            }));
                            delete loadingReplies[id];
                            chrome.storage.local.get(['tweetReplies'], d => {
                                if(!d.tweetReplies) d.tweetReplies = {};
                                d.tweetReplies[id] = {
                                    date: Date.now(),
                                    data: {
                                        list,
                                        cursor: newCursor,
                                        users: userData
                                    }
                                };
                                chrome.storage.local.set({tweetReplies: d.tweetReplies}, () => {});
                            });
                        }
                    }).catch(e => {
                        if(!cursor) {
                            loadingReplies[id].listeners.forEach(l => l[1](e));
                            delete loadingReplies[id];
                        }
                        reject(e);
                    });
                });
            });
        },
        getRepliesV2: (id, cursor, useDiffKey) => {
            return new Promise((resolve, reject) => {
                chrome.storage.local.get(['tweetReplies'], d => {
                    if(!d.tweetReplies) d.tweetReplies = {};
                    if(!cursor) {
                        if(d.tweetReplies[id] && Date.now() - d.tweetReplies[id].date < 60000) {
                            debugLog('tweet.getRepliesV2', 'cache', d.tweetReplies[id].data);
                            return resolve(d.tweetReplies[id].data);
                        }
                        if(loadingReplies[id]) {
                            if(!useDiffKey) return loadingReplies[id].listeners.push([resolve, reject]);
                        } else {
                            loadingReplies[id] = {
                                listeners: []
                            };
                        }
                    }
                    if(typeof useDiffKey === 'undefined' && isFinite(+localStorage.hitRateLimit) && +localStorage.hitRateLimit > Date.now()) {
                        useDiffKey = true;
                    }
                    fetch(`/i/api/graphql/KwGBbJZc6DBx8EKmyQSP7g/TweetDetail?variables=${encodeURIComponent(JSON.stringify({
                        "focalTweetId":id,
                        "with_rux_injections":false,
                        "includePromotedContent":false,
                        "withCommunity":true,
                        "withQuickPromoteEligibilityTweetFields":true,
                        "withBirdwatchNotes":true,
                        "withVoice":true,
                        "withV2Timeline":true,
                        "cursor":cursor
                    }))}&features=${encodeURIComponent(JSON.stringify({"rweb_lists_timeline_redesign_enabled":false,"blue_business_profile_image_shape_enabled":true,"responsive_web_graphql_exclude_directive_enabled":true,"verified_phone_label_enabled":false,"creator_subscriptions_tweet_preview_api_enabled":false,"responsive_web_graphql_timeline_navigation_enabled":true,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"tweetypie_unmention_optimization_enabled":true,"vibe_api_enabled":true,"responsive_web_edit_tweet_api_enabled":true,"graphql_is_translatable_rweb_tweet_is_translatable_enabled":true,"view_counts_everywhere_api_enabled":true,"longform_notetweets_consumption_enabled":true,"tweet_awards_web_tipping_enabled":false,"freedom_of_speech_not_reach_fetch_enabled":true,"standardized_nudges_misinfo":true,"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled":false,"interactive_text_enabled":true,"responsive_web_text_conversations_enabled":false,"longform_notetweets_rich_text_read_enabled":true,"longform_notetweets_inline_media_enabled":false,"responsive_web_enhance_cards_enabled":false}))}`, {
                        headers: {
                            "authorization": useDiffKey ? OLDTWITTER_CONFIG.oauth_key : publicToken,
                            "x-csrf-token": getCsrf(),
                            "x-twitter-auth-type": "OAuth2Session",
                            "x-twitter-client-language": LANGUAGE ? LANGUAGE : navigator.language ? navigator.language : "en"
                        },
                        credentials: "include"
                    }).then(i => i.json()).then(data => {
                        debugLog('tweet.getRepliesV2', 'start', {cursor, data});
                        if (data.errors && data.errors[0]) {
                            if(data.errors[0].code === 88 && !useDiffKey) {
                                localStorage.hitRateLimit = Date.now() + 600000;
                                API.tweet.getRepliesV2(id, cursor, true).then(t => {
                                    resolve(t);
                                    if(loadingReplies[id]) loadingReplies[id].listeners.forEach(l => l[0](t));
                                    delete loadingReplies[id];
                                }).catch(e => {
                                    reject(e);
                                    if(loadingReplies[id]) loadingReplies[id].listeners.forEach(l => l[1](e));
                                    delete loadingReplies[id];
                                });
                                return;
                            }
                            if(loadingReplies[id]) loadingReplies[id].listeners.forEach(l => l[1](data.errors[0].message));
                            delete loadingReplies[id];
                            return reject(data.errors[0].message);
                        }
                        let ae = data.data.threaded_conversation_with_injections_v2.instructions.find(i => i.entries);
                        if(!ae) {
                            let out = {
                                list: [],
                                cursor: null,
                                users: {}
                            };
                            if(!cursor) {
                                if(loadingReplies[id]) loadingReplies[id].listeners.forEach(l => l[0](out));
                                delete loadingReplies[id];
                            }
                            debugLog('tweet.getRepliesV2', 'end', {cursor, out, data});
                            return resolve(out);
                        }
                        let entries = ae.entries;

                        let list = [];
                        let users = {};

                        let newCursor;
                        try {
                            newCursor = entries.find(e => e.entryId.startsWith('cursor-bottom-')).content.itemContent.value;
                        } catch(e) {};

                        for (let i = 0; i < entries.length; i++) {
                            let e = entries[i];
                            if (e.entryId.startsWith('tweet-')) {
                                if(e.content && e.content.itemContent && e.content.itemContent.promotedMetadata) continue;
                                let tweetData = e.content.itemContent.tweet_results.result;
                                if(!tweetData) continue;
                                if(tweetData.tombstone) {
                                    let text = tweetData.tombstone.text.text;
                                    if(tweetData.tombstone.text.entities && tweetData.tombstone.text.entities.length > 0) {
                                        let en = tweetData.tombstone.text.entities[0];
                                        text = text.slice(0, en.fromIndex) + `<a href="${en.ref.url}" target="_blank">` + text.slice(en.fromIndex, en.toIndex) + "</a>" + text.slice(en.toIndex);
                                    }
                                    let tombstoneTweetId = e.entryId.slice(6);
                                    let replyTweet = entries.find(i => 
                                        i && i.content && i.content.itemContent &&
                                        i.content.itemContent.tweet_results && 
                                        i.content.itemContent.tweet_results.result && 
                                        i.content.itemContent.tweet_results.result.legacy &&
                                        i.content.itemContent.tweet_results.result.legacy.in_reply_to_status_id_str == tombstoneTweetId
                                    );
                                    list.push({
                                        type: 'tombstone',
                                        data: text,
                                        replyTweet
                                    });
                                    continue;
                                }
                                let tweet = parseTweet(tweetData);
        
                                if(tweet) {
                                    if(!tweet.id_str === id && (tweet.user.blocking || tweet.user.muting)) continue;
                                    tweet.hasModeratedReplies = e.content.itemContent.hasModeratedReplies;
                                    list.push({
                                        type: tweet.id_str === id ? 'mainTweet' : 'tweet',
                                        data: tweet
                                    });
                                }
                            } else if (e.entryId.startsWith('tombstone-')) {
                                if(e.content.item && e.content.item.content.tombstone.tweet) {
                                    let tweet = tweetData[e.content.item.content.tombstone.tweet.id];
                                    let user = userData[tweet.user_id_str];
                                    if(user.blocking || user.muting) continue;
                                    tweet.id_str = e.content.item.content.tombstone.tweet.id;
                                    tweet.user = user;
                                    if(tweet.quoted_status_id_str) {
                                        tweet.quoted_status = tweetData[tweet.quoted_status_id_str];
                                        if(tweet.quoted_status) {
                                            tweet.quoted_status.user = userData[tweet.quoted_status.user_id_str];
                                            tweet.quoted_status.user.id_str = tweet.quoted_status.user_id_str;
                                            tweet.quoted_status.id_str = tweet.quoted_status_id_str;
                                        }
                                    }
                                    tweet.tombstone = e.content.item.content.tombstone.tombstoneInfo.text;
                                    list.push({
                                        type: tweet.id_str === id ? 'mainTweet' : 'tweet',
                                        data: tweet
                                    });
                                } else if(e.content.itemContent && e.content.itemContent.tombstoneInfo) {
                                    let richText = e.content.itemContent.tombstoneInfo.richText;
                                    let text = richText.text;
                                    if(richText.entities && richText.entities.length > 0) {
                                        let en = richText.entities[0];
                                        text = text.slice(0, en.fromIndex) + `<a href="${en.ref.url}" target="_blank">` + text.slice(en.fromIndex, en.toIndex) + "</a>" + text.slice(en.toIndex);
                                    }
                                    list.push({
                                        type: 'tombstone',
                                        data: text
                                    });
                                } else {
                                    list.push({
                                        type: 'tombstone',
                                        data: 'This Tweet is unavailable.'
                                    });
                                }
                            } else if(e.entryId.startsWith('conversationthread-')) {
                                let thread = e.content.items;
                                let threadList = [];
                                for (let j = 0; j < thread.length; j++) {
                                    if(thread[j].entryId.includes("-tweetcomposer-")) {
                                        continue;
                                    }
                                    if(thread[j].entryId.includes("cursor-showmore")) {
                                        list.push({
                                            type: 'showMoreMiddle',
                                            data: {
                                                cursor: thread[j].item.itemContent.value,
                                                labelText: thread[j].item.itemContent.displayTreatment.labelText,
                                                actionText: thread[j].item.itemContent.displayTreatment.actionText
                                            }
                                        });
                                        continue;
                                    }
                                    let ic = thread[j].item.itemContent;
                                    if(ic.promotedMetadata) continue;
                                    if(ic.tombstoneInfo) {
                                        let richText = ic.tombstoneInfo.richText;
                                        let text = richText.text;
                                        if(richText.entities && richText.entities.length > 0) {
                                            let en = richText.entities[0];
                                            text = text.slice(0, en.fromIndex) + `<a href="${en.ref.url}" target="_blank">` + text.slice(en.fromIndex, en.toIndex) + "</a>" + text.slice(en.toIndex);
                                        }
                                        list.push({
                                            type: 'tombstone',
                                            data: text
                                        });
                                        continue;
                                    }
                                    let tweetData = ic.tweet_results.result;
                                    if(!tweetData) continue;
                                    if(tweetData.tombstone) {
                                        let text = tweetData.tombstone.text.text;
                                        if(tweetData.tombstone.text.entities && tweetData.tombstone.text.entities.length > 0) {
                                            let en = tweetData.tombstone.text.entities[0];
                                            text = text.slice(0, en.fromIndex) + `<a href="${en.ref.url}" target="_blank">` + text.slice(en.fromIndex, en.toIndex) + "</a>" + text.slice(en.toIndex);
                                        }
                                        list.push({
                                            type: 'tombstone',
                                            data: text
                                        });
                                        continue;
                                    }
                                    let tweet = parseTweet(tweetData);
                                    
                                    if(tweet) {
                                        if(tweet.id_str !== id && (tweet.user.blocking || tweet.user.muting)) continue;
                                        tweet.hasModeratedReplies = ic.hasModeratedReplies;
                                        threadList.push(tweet);
                                    }
                                }
                                if(threadList.length === 1) {
                                    list.push({
                                        type: threadList[0].id_str === id ? 'mainTweet' : 'tweet',
                                        data: threadList[0]
                                    });
                                } else {
                                    list.push({
                                        type: 'conversation',
                                        data: threadList
                                    });
                                }
                            } else if(e.entryId.startsWith('cursor-showmorethreadsprompt') || e.entryId.startsWith('cursor-showmorethreads-')) {
                                if(newCursor === e.content.itemContent.value) {
                                    continue;
                                }
                                list.push({
                                    type: 'showMore',
                                    data: {
                                        cursor: e.content.itemContent.value,
                                        labelText: e.content.itemContent.displayTreatment.labelText,
                                        actionText: e.content.itemContent.displayTreatment.actionText
                                    }
                                });
                            }
                        }
        
                        const out = {
                            list,
                            cursor: newCursor,
                            users
                        };
                        debugLog('tweet.getRepliesV2', 'end', out);
        
                        resolve(out);
        
                        if(!cursor) {
                            loadingReplies[id].listeners.forEach(l => l[0]({
                                list,
                                cursor: newCursor,
                                users
                            }));
                            delete loadingReplies[id];
                            chrome.storage.local.get(['tweetReplies'], d => {
                                if(!d.tweetReplies) d.tweetReplies = {};
                                d.tweetReplies[id] = {
                                    date: Date.now(),
                                    data: {
                                        list,
                                        cursor: newCursor,
                                        users
                                    }
                                };
                                chrome.storage.local.set({tweetReplies: d.tweetReplies}, () => {});
                            });
                        }
                    }).catch(e => {
                        if(loadingReplies[id]) loadingReplies[id].listeners.forEach(l => l[1](e));
                        delete loadingReplies[id];
                        reject(e);
                    });
                });
            });
        },
        getLikers: (id, cursor, count = 10) => {
            return new Promise(async (resolve, reject) => {
                let activity = await fetch(`https://api.x.com/1.1/statuses/${id}/activity/summary.json?stringify_ids=1&cards_platform=Web-13&include_entities=1&include_user_entities=1&include_cards=1&send_error_codes=1&tweet_mode=extended&include_ext_alt_text=true&include_reply_count=true`, {
                    headers: {
                         "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/json"
                    },
                    credentials: "include"
                }).then(i => i.json());
                if(activity.errors && activity.errors[0]) {
                    return resolve({ list: [], cursor: undefined });
                }
                if(activity.favoriters.length === 0) {
                    return resolve({ list: [], cursor: undefined });
                }
                let list = activity.favoriters.slice(0, count === 10 ? 10 : 100);
                let lookup = await fetch(`https://api.x.com/1.1/users/lookup.json?user_id=${list.join(',')}&include_entities=1&include_cards=1&send_error_codes=1&tweet_mode=extended&include_ext_alt_text=true&include_reply_count=true`, {
                    headers: {
                        "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/json"
                    },
                    credentials: "include"
                }).then(i => i.json());
                if(lookup.errors && lookup.errors[0]) {
                    return resolve({ list: [], cursor: undefined });
                }
                resolve({ list: lookup, cursor: undefined });
            });
        },
        getRetweeters: (id, cursor) => {
            return new Promise((resolve, reject) => {
                let obj = {
                    "tweetId": id,
                    "count": 50,
                    "includePromotedContent": false,
                    "withSuperFollowsUserFields": true,
                    "withDownvotePerspective": false,
                    "withReactionsMetadata": false,
                    "withReactionsPerspective": false,
                    "withSuperFollowsTweetFields": true,
                    "withClientEventToken": false,
                    "withBirdwatchNotes": false,
                    "withVoice": true,
                    "withV2Timeline": true
                };
                if(cursor) obj.cursor = cursor;
                fetch(`/i/api/graphql/qVWT1Tn1FiklyVDqYiOhLg/Retweeters?variables=${encodeURIComponent(JSON.stringify(obj))}&features=${encodeURIComponent(JSON.stringify({
                    "dont_mention_me_view_api_enabled": true,
                    "interactive_text_enabled": true,
                    "responsive_web_uc_gql_enabled": false,
                    "vibe_tweet_context_enabled": false,
                    "responsive_web_edit_tweet_api_enabled": false,
                    "standardized_nudges_misinfo": false,
                    "responsive_web_enhance_cards_enabled": false
                }))}`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/json"
                    },
                    credentials: "include"
                }).then(i => i.json()).then(data => {
                    debugLog('tweet.getRetweeters', 'start', { id, cursor, data });
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    let list = data.data.retweeters_timeline.timeline.instructions.find(i => i.type === 'TimelineAddEntries');
                    if(!list) return resolve({ list: [], cursor: undefined });
                    list = list.entries;
                    let out = {
                        list: list.filter(e => e.entryId.startsWith('user-')).map(e => {
                            if(
                                !e.content.itemContent.user_results.result ||
                                e.content.itemContent.user_results.result.__typename === "UserUnavailable"
                            ) return;
                            let user = e.content.itemContent.user_results.result;
                            user.legacy.id_str = user.rest_id;
                            return user.legacy;
                        }).filter(u => u),
                        cursor: list.find(e => e.entryId.startsWith('cursor-bottom-')).content.value
                    };
                    debugLog('tweet.getRetweeters', 'end', id, out);
                    resolve(out);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        getQuotes: (id, cursor) => {
            return new Promise((resolve, reject) => {
                let variables = {"rawQuery":`quoted_tweet_id:${id}`,"count":20,"querySource":"tdqt","product":"Top"};
                if(cursor) variables.cursor = cursor;
                fetch(`/i/api/graphql/flaR-PUMshxFWZWPNpq4zA/SearchTimeline?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify({"responsive_web_graphql_exclude_directive_enabled":true,"verified_phone_label_enabled":false,"creator_subscriptions_tweet_preview_api_enabled":true,"responsive_web_graphql_timeline_navigation_enabled":true,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"c9s_tweet_anatomy_moderator_badge_enabled":true,"tweetypie_unmention_optimization_enabled":true,"responsive_web_edit_tweet_api_enabled":true,"graphql_is_translatable_rweb_tweet_is_translatable_enabled":true,"view_counts_everywhere_api_enabled":true,"longform_notetweets_consumption_enabled":true,"responsive_web_twitter_article_tweet_consumption_enabled":true,"tweet_awards_web_tipping_enabled":false,"freedom_of_speech_not_reach_fetch_enabled":true,"standardized_nudges_misinfo":true,"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled":true,"rweb_video_timestamps_enabled":true,"longform_notetweets_rich_text_read_enabled":true,"longform_notetweets_inline_media_enabled":true,"responsive_web_enhance_cards_enabled":false}))}`, {
                    headers: {
                        "authorization": isFinite(+localStorage.hitRateLimit) && +localStorage.hitRateLimit > Date.now() ? OLDTWITTER_CONFIG.oauth_key : publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/json",
                        "x-twitter-client-language": LANGUAGE ? LANGUAGE : navigator.language ? navigator.language : "en"
                    },
                    credentials: "include",
                }).then(i => i.json()).then(data => {
                    debugLog('tweet.getQuotes', 'start', { id, cursor, data });
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    let entries = data.data.search_by_raw_query.search_timeline.timeline.instructions.find(i => i.type === 'TimelineAddEntries');
                    if(!entries) return resolve({ list: [], cursor: undefined });
                    entries = entries.entries;

                    let list = entries.filter(e => e.entryId.startsWith('tweet-')).map(e => {
                        let tweetData = e.content.itemContent.tweet_results.result;
                        if(!tweetData) return;
                        
                        return parseTweet(tweetData);
                    }).filter(t => t);
                    let newCursor = entries.find(e => e.entryId.startsWith('cursor-bottom-'));
                    if(!newCursor) {
                        let replacerEntry = data.data.search_by_raw_query.search_timeline.timeline.instructions.find(i => i.entry_id_to_replace && i.entry_id_to_replace.startsWith('cursor-bottom-'));
                        if(replacerEntry) {
                            newCursor = replacerEntry.entry.content.value;
                        }
                    } else {
                        newCursor = newCursor.content.value;
                    }
                    let out = {
                        list,
                        cursor: newCursor
                    };
                    debugLog('tweet.getQuotes', 'end', id, out);
                    resolve(out);
                    return resolve(out);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        mute: id => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/1.1/mutes/conversations/create.json`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    credentials: "include",
                    method: 'post',
                    body: `tweet_id=${id}`
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        unmute: id => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/1.1/mutes/conversations/destroy.json`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    credentials: "include",
                    method: 'post',
                    body: `tweet_id=${id}`
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        lookup: ids => { // deprecated
            return new Promise((resolve, reject) => {
                fetch(`https://api.${location.hostname}/1.1/statuses/lookup.json?id=${ids.join(',')}&include_entities=true&include_ext_alt_text=true&include_card_uri=true&tweet_mode=extended&include_reply_count=true&ext=views%2CmediaStats%2CverifiedType%2CisBlueVerified`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "x-twitter-client-language": LANGUAGE ? LANGUAGE : navigator.language ? navigator.language : "en"
                    },
                    credentials: "include"
                }).then(i => i.json()).then(data => {
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        translate: id => {
            return new Promise((resolve, reject) => {
                chrome.storage.local.get([`translations`],async  d => {
                    if(!d.translations) d.translations = {};
                    if(d.translations[id] && Date.now() - d.translations[id].date < 60000*60*4) {
                        // debugLog('tweet.translate', 'cache', d.translations[id].data);
                        return resolve(d.translations[id].data);
                    }
                    // Translate by Google
                    let res = translateLimit > Date.now() ? { ok: false } : await fetch(`/i/api/1.1/strato/column/None/tweetId=${id},destinationLanguage=None,translationSource=Some(Google),feature=None,timeout=None,onlyCached=None/translation/service/translateTweet`, {
                        headers: {
                            "authorization": publicToken,
                            "x-csrf-token": getCsrf(),
                            "x-twitter-auth-type": "OAuth2Session",
                            "x-twitter-client-language": LANGUAGE ? LANGUAGE : navigator.language ? navigator.language : "en"
                        },
                        credentials: "include"
                    });
                    if(!res.ok) {
                        console.log(res);
                        if(res.headers) {
                            let resetTime = res.headers.get('x-rate-limit-reset');
                            let limitRemaining = res.headers.get('x-rate-limit-remaining');
                            if(resetTime && limitRemaining && parseInt(limitRemaining) === 0) {
                                translateLimit = parseInt(resetTime) * 1000;
                            } else {
                                translateLimit = 0;
                            }
                        }
                        // Translate by Microsoft
                        let l = LANGUAGE;
                        if(l.includes('_')) l = l.split('_')[0];
                        res = await fetch(`https://api.${location.hostname}/1.1/translations/show.json?id=${id}&dest=${l}&use_display_text=true&cards_platform=Web-13&include_entities=1&include_user_entities=1&include_cards=1&send_error_codes=1&tweet_mode=extended&include_ext_alt_text=true&include_reply_count=true`, {
                            headers: {
                                "authorization": publicToken,
                                "x-csrf-token": getCsrf(),
                                "x-twitter-auth-type": "OAuth2Session",
                                "x-twitter-client-language": LANGUAGE ? LANGUAGE : navigator.language ? navigator.language : "en"
                            },
                            credentials: "include"
                        });
                    }
                    let data = await res.json();
                    // debugLog('tweet.translate', 'start', id, data);
                    if (data.errors && data.errors[0].code === 32) {
                        return reject("Not logged in");
                    }
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    let out = {
                        translated_lang: data.localizedSourceLanguage ? data.localizedSourceLanguage : data.translated_lang,
                        lang_code: data.sourceLanguage ? data.sourceLanguage : data.translated_lang,
                        text: data.translation ? data.translation : data.text,
                        entities: data.entities
                    };
                    // debugLog('tweet.translate', 'end', id, out);
                    resolve(out);
                    d.translations[id] = {
                        date: Date.now(),
                        data: out
                    };
                    chrome.storage.local.set({translations: d.translations}, () => {});
                });
            });
        },
        pin: id => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/1.1/account/pin_tweet.json`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
                    },
                    credentials: "include",
                    method: 'post',
                    body: `id=${id}`
                }).then(i => i.text()).then(data => {
                    resolve(true);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        unpin: id => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/1.1/account/unpin_tweet.json`, {
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
                    },
                    credentials: "include",
                    method: 'post',
                    body: `id=${id}`
                }).then(i => i.text()).then(data => {
                    resolve(true);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        moderate: id => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/graphql/pjFnHGVqCjTcZol0xcBJjw/ModerateTweet`, {
                    method: 'POST',
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/json; charset=utf-8"
                    },
                    credentials: "include",
                    body: JSON.stringify({"variables":{"tweetId":id},"queryId":"pjFnHGVqCjTcZol0xcBJjw"})
                }).then(i => i.json()).then(data => {
                    debugLog('tweet.moderate', id, data);
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        unmoderate: id => {
            return new Promise((resolve, reject) => {
                fetch(`/i/api/graphql/pVSyu6PA57TLvIE4nN2tsA/UnmoderateTweet`, {
                    method: 'POST',
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/json; charset=utf-8"
                    },
                    credentials: "include",
                    body: JSON.stringify({"variables":{"tweetId":"1683331680751308802"},"queryId":"pVSyu6PA57TLvIE4nN2tsA"})
                }).then(i => i.json()).then(data => {
                    debugLog('tweet.unmoderate', id, data);
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        },
        getModeratedReplies: (id, cursor) => {
            return new Promise((resolve, reject) => {
                let variables = {"rootTweetId":id,"count":20,"includePromotedContent":false};
                if(cursor) variables.cursor = cursor;
                fetch(`/i/api/graphql/SiKS1_3937rb72ytFnDHmA/ModeratedTimeline?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify({"rweb_lists_timeline_redesign_enabled":false,"responsive_web_graphql_exclude_directive_enabled":true,"verified_phone_label_enabled":false,"creator_subscriptions_tweet_preview_api_enabled":true,"responsive_web_graphql_timeline_navigation_enabled":true,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"tweetypie_unmention_optimization_enabled":true,"responsive_web_edit_tweet_api_enabled":true,"graphql_is_translatable_rweb_tweet_is_translatable_enabled":true,"view_counts_everywhere_api_enabled":true,"longform_notetweets_consumption_enabled":true,"responsive_web_twitter_article_tweet_consumption_enabled":false,"tweet_awards_web_tipping_enabled":false,"freedom_of_speech_not_reach_fetch_enabled":true,"standardized_nudges_misinfo":true,"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled":true,"longform_notetweets_rich_text_read_enabled":true,"longform_notetweets_inline_media_enabled":true,"responsive_web_media_download_video_enabled":false,"responsive_web_enhance_cards_enabled":false}))}`, {
                    method: 'POST',
                    headers: {
                        "authorization": publicToken,
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "content-type": "application/x-www-form-urlencoded",
                        "x-twitter-client-language": LANGUAGE ? LANGUAGE : navigator.language ? navigator.language : "en"
                    },
                    credentials: "include"
                }).then(i => i.json()).then(data => {
                    debugLog('tweet.getModeratedReplies', 'start', id, data);
                    if (data.errors && data.errors[0]) {
                        return reject(data.errors[0].message);
                    }
                    let entries = data.data.tweet.result.timeline_response.timeline.instructions.find(i => i.entries);
                    if(!entries) return resolve({
                        list: [],
                        cursor: undefined
                    });
                    entries = entries.entries;
                    let list = entries.filter(e => e.entryId.startsWith('tweet-'));
                    let cursor = entries.find(e => e.entryId.startsWith('cursor-bottom'));
                    if(!cursor) {
                        let entries = data.data.tweet.result.timeline_response.timeline.instructions.find(i => i.replaceEntry && i.replaceEntry.entryIdToReplace.includes('cursor-bottom'));
                        if(entries) {
                            cursor = entries.replaceEntry.entry.content.operation.cursor.value;
                        }
                    } else {
                        cursor = cursor.content.operation.cursor.value;
                    }
                    let out = {
                        list: list.map(e => {
                            let tweet = parseTweet(e.content.itemContent.tweet_results.result);
                            if(!tweet) return;
                            tweet.moderated = true;
                            return tweet;
                        }).filter(e => e),
                        cursor
                    };
                    debugLog('tweet.getModeratedReplies', 'end', id, out);
                    resolve(data);
                }).catch(e => {
                    reject(e);
                });
            });
        }
    },
};