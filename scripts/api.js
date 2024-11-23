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
    account: {
        verifyCredentials: () => {
            return new Promise((resolve, reject) => {
                fetch(`https://api.${location.hostname}/1.1/account/verify_credentials.json`, {
                    headers: {
                        "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAAG5LOQEAAAAAbEKsIYYIhrfOQqm4H8u7xcahRkU%3Dz98HKmzbeXdKqBfUDmElcqYl0cmmKY9KdS2UoNIz3Phapgsowi",
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session"
                    },
                    credentials: "include"
                }).then(response => response.json()).then(data => {
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
    user: {
        get: (val, byId = true) => {
            return new Promise((resolve, reject) => {
                fetch(`https://api.${location.hostname}/1.1/users/show.json?${byId ? `user_id=${val}` : `screen_name=${val}`}`, {
                    headers: {
                        "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAAG5LOQEAAAAAbEKsIYYIhrfOQqm4H8u7xcahRkU%3Dz98HKmzbeXdKqBfUDmElcqYl0cmmKY9KdS2UoNIz3Phapgsowi",
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
                        "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAAG5LOQEAAAAAbEKsIYYIhrfOQqm4H8u7xcahRkU%3Dz98HKmzbeXdKqBfUDmElcqYl0cmmKY9KdS2UoNIz3Phapgsowi",
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
        lookup: ids => {
            return new Promise((resolve, reject) => {
                fetch(`https://api.${location.hostname}/1.1/statuses/lookup.json?id=${ids.join(',')}&include_entities=true&include_ext_alt_text=true&include_card_uri=true&tweet_mode=extended&include_reply_count=true&ext=views%2CmediaStats`, {
                    headers: {
                        "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAAFQODgEAAAAAVHTp76lzh3rFzcHbmHVvQxYYpTw%3DckAlMINMjmCwxUcaXbAN4XqJVdgMJaHqNOFgPMK0zN1qLqLQCF",
                        "x-csrf-token": getCsrf(),
                        "x-twitter-auth-type": "OAuth2Session",
                        "x-twitter-client-language": navigator.language ? navigator.language : "en"
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