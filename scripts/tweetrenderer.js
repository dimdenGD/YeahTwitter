
let lastTweetErrorDate = 0;
const mediaClasses = [
    undefined,
    'tweet-media-element-one',
    'tweet-media-element-two',
    'tweet-media-element-three',
    'tweet-media-element-two',
];

function calculateSize(x, y, max_x, max_y) {
    let ratio = x / y;
    let iw = innerWidth;
    if(iw < 590) max_x = iw - 120;
    if(x > max_x) {
        x = max_x;
        y = x / ratio;
    }
    if(y > max_y) {
        y = max_y;
        x = y * ratio;
    }
    return [parseInt(x), parseInt(y)];
}

const sizeFunctions = [
    undefined,
    (w, h) => calculateSize(w, h, 450, 500),
    (w, h) => calculateSize(w, h, 225, 400),
    (w, h) => innerWidth < 590 ? calculateSize(w, h, 225, 400) : calculateSize(w, h, 150, 250),
    (w, h) => calculateSize(w, h, 225, 400),
    (w, h) => calculateSize(w, h, 225, 400),
    (w, h) => calculateSize(w, h, 225, 400),
    (w, h) => calculateSize(w, h, 225, 400),
    (w, h) => calculateSize(w, h, 225, 400)
];

const quoteSizeFunctions = [
    undefined,
    (w, h) => calculateSize(w, h, 400, 400),
    (w, h) => calculateSize(w, h, 200, 400),
    (w, h) => calculateSize(w, h, 125, 200),
    (w, h) => calculateSize(w, h, 100, 150),
    (w, h) => calculateSize(w, h, 100, 150),
    (w, h) => calculateSize(w, h, 100, 150),
    (w, h) => calculateSize(w, h, 100, 150),
    (w, h) => calculateSize(w, h, 100, 150)
];

function html(strings, ...values) {
    let str = '';
    strings.forEach((string, i) => {
        str += string + escapeHTML(values[i]);
    });
    return str;
}

async function handleFiles(files, mediaArray, mediaContainer, is_dm = false) {
    let images = [];
    let videos = [];
    let gifs = [];
    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        if (file.type.includes('gif')) {
            // max 15 mb
            if (file.size > 15000000) {
                return alert("Gifs max size is 15mb");
            }
            gifs.push(file);
        } else if (file.type.includes('video')) {
            // max 500 mb
            if (file.size > 500000000) {
                return alert("Videos max size is 500mb");
            }
            videos.push(file);
        } else if (file.type.includes('image')) {
            // max 5 mb
            if (
                file.size > 5000000 ||
                (window.navigator && navigator.connection && navigator.connection.type === 'cellular')
            ) {
                // convert png to jpeg
                let toBreak = false, i = 0;
                while(file.size > 5000000) {
                    await new Promise(resolve => {
                        let canvas = document.createElement('canvas');
                        let ctx = canvas.getContext('2d');
                        let img = new Image();
                        img.onload = function () {
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx.drawImage(img, 0, 0);
                            let dataURL = canvas.toDataURL('image/jpeg', (window.navigator && navigator.connection && navigator.connection.type === 'cellular') ? (0.5 - i*0.1) : (0.9 - i*0.1));
                            let blobBin = atob(dataURL.split(',')[1]);
                            let array = [];
                            for (let i = 0; i < blobBin.length; i++) {
                                array.push(blobBin.charCodeAt(i));
                            }
                            let newFile = new Blob([new Uint8Array(array)], { type: 'image/jpeg' });
                            if(newFile.size > file.size) {
                                toBreak = true;
                            } else {
                                file = newFile;
                            }
                            resolve();
                        };
                        img.src = URL.createObjectURL(file);
                    });
                    if(toBreak || i++ > 5) break;
                }
                if(file.size > 5000000) {
                    return alert("Images max size is 5mb");
                }
            }
            images.push(file);
        }
    }
    // either up to 4 images or 1 video or 1 gif
    if (images.length > 0) {
        if (images.length > 4) {
            images = images.slice(0, 4);
        }
        if (videos.length > 0 || gifs.length > 0) {
            return alert("Images and videos max count is 4");
        }
    }
    if (videos.length > 0) {
        if (images.length > 0 || gifs.length > 0 || videos.length > 1) {
            return alert("Videos max count is 1");
        }
    }
    if (gifs.length > 0) {
        if (images.length > 0 || videos.length > 0 || gifs.length > 1) {
            return alert("Gifs max count is 1");
        }
    }
    // get base64 data
    let media = [...images, ...videos, ...gifs];
    let base64Data = [];
    for (let i = 0; i < media.length; i++) {
        let file = media[i];
        let reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = () => {
            base64Data.push(reader.result);
            if (base64Data.length === media.length) {
                while (mediaArray.length >= 4) {
                    mediaArray.pop();
                    mediaContainer.lastChild.remove();
                }
                base64Data.forEach(data => {
                    let div = document.createElement('div');
                    let img = document.createElement('img');
                    div.title = file.name;
                    div.id = `new-tweet-media-img-${Date.now()}${Math.random()}`.replace('.', '-');
                    div.className = "new-tweet-media-img-div";
                    img.className = "new-tweet-media-img";
                    let progress = document.createElement('span');
                    progress.hidden = true;
                    progress.className = "new-tweet-media-img-progress";
                    let remove = document.createElement('span');
                    remove.className = "new-tweet-media-img-remove";
                    let alt;
                    if (!file.type.includes('video')) {
                        alt = document.createElement('span');
                        alt.className = "new-tweet-media-img-alt";
                        alt.innerText = "ALT";
                        alt.addEventListener('click', () => {
                            mediaObject.alt = prompt("Alt text", mediaObject.alt || '');
                        });
                    }
                    let cw = document.createElement('span');
                    cw.className = "new-tweet-media-img-cw";
                    cw.innerText = "CW";
                    cw.addEventListener('click', () => {
                        createModal(`
                            <div class="cw-modal" style="color:var(--almost-black)">
                                <h2 class="nice-header">Content warnings</h2>
                                <br>
                                <input type="checkbox" id="cw-modal-graphic_violence"${mediaObject.cw.includes('graphic_violence') ? ' checked' : ''}> <label for="cw-modal-graphic_violence">Graphic violence</label><br>
                                <input type="checkbox" id="cw-modal-adult_content"${mediaObject.cw.includes('adult_content') ? ' checked' : ''}> <label for="cw-modal-adult_content">Adult content</label><br>
                                <input type="checkbox" id="cw-modal-other"${mediaObject.cw.includes('other') ? ' checked' : ''}> <label for="cw-modal-other">Sensitive content</label><br>
                            </div>
                        `);
                        let graphic_violence = document.getElementById('cw-modal-graphic_violence');
                        let adult_content = document.getElementById('cw-modal-adult_content');
                        let sensitive_content = document.getElementById('cw-modal-other');
                        [graphic_violence, adult_content, sensitive_content].forEach(checkbox => {
                            checkbox.addEventListener('change', () => {
                                if (checkbox.checked) {
                                    mediaObject.cw.push(checkbox.id.slice(9));
                                } else {
                                    let index = mediaObject.cw.indexOf(checkbox.id.slice(9));
                                    if (index > -1) {
                                        mediaObject.cw.splice(index, 1);
                                    }
                                }
                            });
                        });
                    });

                    let mediaObject = {
                        div, img,
                        id: div.id,
                        data: data,
                        type: file.type,
                        cw: [],
                        category: file.type.includes('gif') ? (is_dm ? 'dm_gif' : 'tweet_gif') : file.type.includes('video') ? (is_dm ? 'dm_video' : 'tweet_video') : (is_dm ? 'dm_image' : 'tweet_image')
                    };
                    mediaArray.push(mediaObject);
                    if(file.type.includes('video')) {
                        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAWUSURBVHhe7Z1pqG5THMbPNV1jul1TJEOZuqYMRZEpoRARvlw+uIjwASlRFIkMHwzJ8AVfZMhYOGRKESlDkciQyJhknj3PXu9b3nP2sPba9x3Wfp5f/dpr77p1zl7Ped+11l77f5fMz8/PGV3WGByNKA6AOA6AOA6AOA6AOA6AOA6AOA6AOA6AOA6AOA6AOA6AOA6AOA6AOA6AOA6AOA6AOA6AOA6AOA6AOA6AOA6AOA6AOG3eC1gGl4ammXF+h9+HZj0xAdgC3gwPhw5AHjAAL8Kz4Re8UEVTANaCT8HDijOTGy9B9t1fxVkJTWOAneAhoWky5ADIPqykKQCbQA8U84V9xz6spKlzlwyOJl9q+9B/3eI4AOI0zQIOhs+H5iJeh3fBP4qzcjaDF8DNizPTls/gDfCH4qycDeBZcLfibDEcxL8QmotJDQA7fVf4QXFWz8nwvtA0LTkJPhCatewM34LrFGej1AYg9SvgF/hNaDby8eBo2vPp4NjEl5B90hqPAcRxAMRxAMRxAMRxAMRxAMRJDcCaA2NYe3A07Ym9d236Y4TUAGwET4VlCw//Z124MjRNAmfADUOzEnb8iZB90pouS8H/QC5A1C0FMwDcUWTS4YLbz6FZCgOwFaz6Yx7LUrDJh7EsBZue0KcA/Av/Dk0TS18CwIcm/KjbEV4Nf4Qmgr4E4ErIbdAfwUvhXvB+WLkb1gS6BICzAG5Y+KTG2EfGXVn42PRDeAo8AnLjSs5wplV2b4dy3z/7IokuATgHbtfg9vBuOA04JngOHgjPhJ/D3Lgdlt3XhV4Ek0gNAL9jH4RNg66f4J2hOTX4lgx/hj3gdbBuTj1r3At/C81KuA5zD0wa96QGgB0fO+L+c3CcNt/Bi+G+8BGYw4wh9t616Y8R+jIIbMN78AR4NHyTF5RRDADhoInvPO4Pz4NfQUlUAzCE36+3wN0h34D+FUqhHoAhX8Pz4X7wSZg8rcoNB2CUt+Ex8Hj4Li/0HQdgMRxNPwY5W+D8+lvYW1IDsD6Mfc6/zeCYG3zRgq9lcf3gDsj1hEnDRZ4YNoXsk9Z02Q/wDuRKVd3CysbwQrh1cTY+WL7m2dAcG/vAa+ChcFKvzXN2ciPkGKUK7spaBfmJVYbEhpBJBICwZA7HB1dBPnnMAW8IWY3w6SJf1twb3soLueMApMFnHJfBqFJss4wDkE4vyuc4AGlwqzafLLJ4ZtY4AO0Y7sF/A57OC7nTZRYwSyViJjEL4MDvWjjJaaBLxEQyzgBsCS+Hp8FJl8p1iZgpwpU1LmLxxnJL2TTqJLtEzBTg9/yx8DV4PayttJk7DsAo3BfwOHwYruCFvuMABDhYvQm+Co+CMvdFPQB8e/lcyH0A3Bq2HpRCNQD8vY+Er0BuBZOtZKoYgF3gQ/AJuCcvKJMaAI6UaQyzUiJmOeTyLRewjoOxP/80cYmY1QDn7yy1wvk8t3hx5SwXXCImkrKVQC7XchWMu3iqdsvkwFhLxHQZA/Dfcpl02xonVR9o4d65HSCXn5+GOXc+4X6/sns7lNvtkvuxSwBmiSsgV+/4QIQFIvi0juvo3MJlauhLAPhJ9CjkfP4SmPR9qEhfAmAScQDE6RKAWSoR02dcIkYYl4gRxyVixHGJGDNeHABxHABxHABxHABxHABxUgOgUCJmFuAiTwzyJWL6ikvEmM6MbUeQ6QEOgDhNAeB/umDyprYPmwLAKpkydXN7CPuuttJpUwDehy+HpskQDuDZh5U0zQIIN1zeBg+C0yiSYNrDsrbPQL7wyh1FlcQEYAgrYjkAecAARNUwbBMA00M8DRTHARDHARDHARDHARDHARDHARDHARDHARDHARDHARDHARDHARDHARDHARDHARDHARDHARDHARDHARDHARDHARDHAZBmbu4/x6swK3hIFr4AAAAASUVORK5CYII=';
                    } else {
                        let dataBase64 = arrayBufferToBase64(data);
                        img.src = `data:${file.type};base64,${dataBase64}`;
                    }
                    remove.addEventListener('click', () => {
                        div.remove();
                        for (let i = mediaArray.length - 1; i >= 0; i--) {
                            let m = mediaArray[i];
                            if (m.id === div.id) mediaArray.splice(i, 1);
                        }
                    });
                    div.append(img, progress, remove);
                    if (!file.type.includes('video')) {
                        img.addEventListener('click', () => {
                            new Viewer(mediaContainer, {
                                transition: false,
                                zoomRatio: 0.3
                            });
                        });
                        div.append(alt);
                    } else {
                        cw.style.marginLeft = '-53px';
                    }
                    div.append(cw);
                    mediaContainer.append(div);
                });
                
                setTimeout(() => {
                    let messageModalElement = document.getElementsByClassName('messages-container')[0];
                    let inboxModalElement = document.getElementsByClassName('inbox-modal')[0];
                    if(messageModalElement) inboxModalElement.scrollTop = inboxModalElement.scrollHeight;
                }, 10);
            }
        }
    }
}
let isURL = (str) => {
    try {
        new URL(str);
        return true;
    } catch (_) {
        return false;
    }
}
function handleDrop(event, mediaArray, mediaContainer) {
    let text = event.dataTransfer.getData("Text").trim();
    if(text.length <= 1) {
        event.stopPropagation();
        event.preventDefault();
        let files = event.dataTransfer.files;
        handleFiles(files, mediaArray, mediaContainer);
    }
}
function getMedia(mediaArray, mediaContainer, is_dm = false) {
    let input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime';
    input.addEventListener('change', () => {
        handleFiles(input.files, mediaArray, mediaContainer, is_dm);
    });
    input.click();
};
function timeElapsed(targetTimestamp) {
    let currentDate = new Date();
    let currentTimeInms = currentDate.getTime();
    let targetDate = new Date(targetTimestamp);
    let targetTimeInms = targetDate.getTime();
    let elapsed = Math.floor((currentTimeInms - targetTimeInms) / 1000);

    if (elapsed < 1) {
        return 'now';
    }
    if (elapsed < 60) { //< 60 sec
        return `${elapsed}s`;
    }
    if (elapsed < 3600) { //< 60 minutes
        return `${Math.floor(elapsed / (60))}m`;
    }
    if (elapsed < 86400) { //< 24 hours
        return `${Math.floor(elapsed / (3600))}h`;
    }
    if (elapsed < 604800) { //<7 days
        return `${Math.floor(elapsed / (86400))}d`;
    }
    if (targetDate.getFullYear() == currentDate.getFullYear()) { // same years
        return targetDate.toLocaleDateString("en-US", { month: 'long', day: 'numeric' });
    }
    //more than last years
    return targetDate.toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
}


async function renderTweetBodyHTML(t, is_quoted) {
    let result = "",
        last_pos = 0,
        index_map = {}; // {start_position: [end_position, replacer_func]}
        hashflags = [];

    if(is_quoted) t = t.quoted_status;

    full_text_array = Array.from(t.full_text);

    if (t.entities.richtext) {
        t.entities.richtext.forEach(snippet => {
            //if i felt like it, id write a long-winded series of comments on how much i hate emojis. but i'll refrain
            //and this *still* doesnt work properly with flag emojis
            //im just glad it works at all

            let textBeforeSnippet = t.full_text.slice(0, snippet.from_index);
            let emojisBeforeSnippet = textBeforeSnippet.match(/\p{Extended_Pictographic}/gu);
            emojisBeforeSnippet = emojisBeforeSnippet ? emojisBeforeSnippet.length : 0;

            let fromIndex = snippet.from_index - emojisBeforeSnippet;
            let toIndex = snippet.to_index - emojisBeforeSnippet;

            index_map[fromIndex] = [
                toIndex,
                text => {
                    let snippetText = escapeHTML(full_text_array.slice(fromIndex, toIndex).join(''));
                    let startingTags = `${snippet.richtext_types.includes('Bold') ? '<b>' : ''}${snippet.richtext_types.includes('Italic') ? '<i>' : ''}`;
                    let endingTags = `${snippet.richtext_types.includes('Bold') ? '</b>' : ''}${snippet.richtext_types.includes('Italic') ? '</i>' : ''}`;

                    return `${startingTags}${snippetText}${endingTags}`;
                }
            ];
        });
    }

    if (is_quoted) { // for quoted tweet we need only hashflags and readable urls
        if (t.entities.hashtags) {
            t.entities.hashtags.forEach(hashtag => {
                let hashflag = hashflags.find(h => h.hashtag.toLowerCase() === hashtag.text.toLowerCase());
                index_map[hashtag.indices[0]] = [hashtag.indices[1], text =>
                    `#${escapeHTML(hashtag.text)}`+
                    `${hashflag ? `<img src="${hashflag.asset_url}" class="hashflag">` : ''}`];
            });
        };

        if (t.entities.urls) {
            t.entities.urls.forEach(url => {
                index_map[url.indices[0]] = [url.indices[1], text => `${escapeHTML(url.display_url)}`];
            });
        };
    } else {
        if (t.entities.hashtags) {
            t.entities.hashtags.forEach(hashtag => {
                let hashflag = hashflags.find(h => h.hashtag.toLowerCase() === hashtag.text.toLowerCase());
                index_map[hashtag.indices[0]] = [hashtag.indices[1], text => `<a href="/hashtag/${escapeHTML(hashtag.text)}">`+
                    `#${escapeHTML(hashtag.text)}`+
                    `${hashflag ? `<img src="${hashflag.asset_url}" class="hashflag">` : ''}`+
                `</a>`];
            });
        };

        if (t.entities.symbols) {
            t.entities.symbols.forEach(symbol => {
                index_map[symbol.indices[0]] = [symbol.indices[1], text => `<a href="/search?q=%24${escapeHTML(symbol.text)}">`+
                    `$${escapeHTML(symbol.text)}`+
                `</a>`];
            });
        }

        if (t.entities.urls) {
            t.entities.urls.forEach(url => {
                index_map[url.indices[0]] = [url.indices[1], text =>
                    `<a href="${escapeHTML(url.expanded_url)}" title="${escapeHTML(url.expanded_url)}" target="_blank" rel="noopener noreferrer">`+
                    `${escapeHTML(url.display_url)}</a>`];
            });
        };

        if (t.entities.user_mentions) {
            t.entities.user_mentions.forEach(user => {
                index_map[user.indices[0]] = [user.indices[1], text => `<a href="/${escapeHTML(user.screen_name)}">${escapeHTML(text)}</a>`];
            });
        };

        if(t.entities.media) {
            t.entities.media.forEach(media => {
                index_map[media.indices[0]] = [media.indices[1], text => ``];
            });
        }
    };

    let display_start = t.display_text_range !== undefined ? t.display_text_range[0] : 0;
    let display_end   = t.display_text_range !== undefined ? t.display_text_range[1] : full_text_array.length;
    for (let [current_pos, _] of full_text_array.entries()) {
        if (current_pos < display_start) { // do not render first part of message
            last_pos = current_pos + 1; // to start copy from next symbol
            continue;
        }
        if (current_pos == display_end ||                // reached the end of visible part
            current_pos == full_text_array.length - 1) { // reached the end of tweet itself
                if (display_end == full_text_array.length) current_pos++; // dirty hack to include last element of slice
                result += escapeHTML(full_text_array.slice(last_pos, current_pos).join(''));
                break;
        }
        if (current_pos > display_end) {
            break; // do not render last part of message
        }

        if (current_pos in index_map) {
            let [end, func] = index_map[current_pos];
            
            if (current_pos > last_pos) {
                result += escapeHTML(full_text_array.slice(last_pos, current_pos).join('')); // store chunk of untouched text
            }
            result += func(full_text_array.slice(current_pos, end).join('')); // run replacer func on corresponding range
            last_pos = end;
        }
    }
    return result
}
function arrayInsert(arr, index, value) {
    return [...arr.slice(0, index), value, ...arr.slice(index)];
}
function generatePoll(tweet, tweetElement, user) {
    let pollElement = tweetElement.getElementsByClassName('tweet-card')[0];
    pollElement.innerHTML = '';
    let poll = tweet.card.binding_values;
    let choices = Object.keys(poll).filter(key => key.endsWith('label')).map((key, i) => ({
        label: poll[key].string_value,
        count: poll[key.replace('label', 'count')] ? +poll[key.replace('label', 'count')].string_value : 0,
        id: parseInt(key.replace(/[^0-9]/g, ''))
    }));
    choices.sort((a, b) => a.id - b.id);
    let voteCount = choices.reduce((acc, cur) => acc + cur.count, 0);
    if(poll.selected_choice || user.id_str === tweet.user.id_str || (poll.counts_are_final && poll.counts_are_final.boolean_value)) {
        for(let i in choices) {
            let choice = choices[i];
            if(user.id_str !== tweet.user.id_str && poll.selected_choice && choice.id === +poll.selected_choice.string_value) {
                choice.selected = true;
            }
            choice.percentage = Math.round(choice.count / voteCount * 100) || 0;
            let choiceElement = document.createElement('div');
            choiceElement.classList.add('choice');
            choiceElement.innerHTML = html`
                <div class="choice-bg" style="width:${choice.percentage}%" data-percentage="${choice.percentage}"></div>
                <div class="choice-label">
                    <span>${escapeHTML(choice.label)}</span>
                    ${choice.selected ? `<span class="choice-selected"></span>` : ''}
                </div>
                ${isFinite(choice.percentage) ? `<div class="choice-count">${choice.count} (${choice.percentage}%)</div>` : '<div class="choice-count">0</div>'}
            `;
            pollElement.append(choiceElement);
        }
    } else {
        for(let i in choices) {
            let choice = choices[i];
            let choiceElement = document.createElement('div');
            choiceElement.classList.add('choice', 'choice-unselected');
            choiceElement.classList.add('tweet-button');
            choiceElement.innerHTML = html`
                <div class="choice-bg" style="width:100%"></div>
                <div class="choice-label">${escapeHTML(choice.label)}</div>
            `;
            choiceElement.addEventListener('click', async () => {
                let newCard = await API.tweet.vote(poll.api.string_value, tweet.id_str, tweet.card.url, tweet.card.name, choice.id);
                tweet.card = newCard.card;
                generateCard(tweet, tweetElement, user);
            });
            pollElement.append(choiceElement);
        }
    }
    if(tweet.card.url.startsWith('card://')) {
        let footer = document.createElement('span');
        footer.classList.add('poll-footer');
        let endsAtMessage = `Ends at: ${new Date(poll.end_datetime_utc.string_value).toLocaleString()}`;
        footer.innerHTML = html`${voteCount} ${voteCount === 1 ? 'vote' : 'votes'}${(!poll.counts_are_final || !poll.counts_are_final.boolean_value) && poll.end_datetime_utc ? ` ・ ${endsAtMessage}` : ''}`;
        pollElement.append(footer);
    }
}
function generateCard(tweet, tweetElement, user) {
    if(!tweet.card) return;
    if(tweet.card.name === 'promo_image_convo' || tweet.card.name === 'promo_video_convo') {
        let vals = tweet.card.binding_values;
        let a = document.createElement('a');
        a.title = vals.thank_you_text.string_value;
        if(tweet.card.name === 'promo_image_convo') {
            a.href = vals.thank_you_url ? vals.thank_you_url.string_value : "#";
            a.target = '_blank';
            let img = document.createElement('img');
            let imgValue = vals.promo_image;
            if(!imgValue) {
                imgValue = vals.cover_promo_image_original;
            }
            if(!imgValue) {
                imgValue = vals.cover_promo_image_large;
            }
            if(!imgValue) {
                return;
            }
            img.src = imgValue.image_value.url;
            let [w, h] = sizeFunctions[1](imgValue.image_value.width, imgValue.image_value.height);
            img.width = w;
            img.height = h;
            img.className = 'tweet-media-element';
            a.append(img);
        } else {
            let overlay = document.createElement('div');
            overlay.innerHTML = html`
                <svg viewBox="0 0 24 24" class="tweet-media-video-overlay-play">
                    <g>
                        <path class="svg-play-path" d="M8 5v14l11-7z"></path>
                        <path d="M0 0h24v24H0z" fill="none"></path>
                    </g>
                </svg>
            `;
            overlay.className = 'tweet-media-video-overlay';
            overlay.addEventListener('click', async e => {
                e.preventDefault();
                e.stopImmediatePropagation();
                try {
                    let res = await fetch(vid.currentSrc); // weird problem with vids breaking cuz twitter sometimes doesnt send content-length
                    if(!res.headers.get('content-length')) await sleep(1000);
                } catch(e) {
                    console.error(e);
                }
                vid.play();
                vid.controls = true;
                vid.classList.remove('tweet-media-element-censor');
                overlay.style.display = 'none';
            });
            let vid = document.createElement('video');
            let [w, h] = sizeFunctions[1](vals.player_image_original.image_value.width, vals.player_image_original.image_value.height);
            vid.width = w;
            vid.height = h;
            vid.preload = 'none';
            vid.poster = vals.player_image_large.image_value.url;
            vid.className = 'tweet-media-element';
            vid.addEventListener('click', async e => {
                e.preventDefault();
                e.stopImmediatePropagation();
            });
            fetch(vals.player_stream_url.string_value).then(res => res.text()).then(blob => {
                let xml = new DOMParser().parseFromString(blob, 'text/xml');
                let MediaFile = xml.getElementsByTagName('MediaFile')[0];
                vid.src = MediaFile.textContent.trim();
            });
            let tweetMedia = document.createElement('div');
            tweetMedia.className = 'tweet-media';
            tweetMedia.style.right = 'unset';
            tweetMedia.append(overlay, vid);
            a.append(tweetMedia);
        }
        let ctas = [];
        if(vals.cta_one) {
            ctas.push([vals.cta_one, vals.cta_one_tweet]);
        }
        if(vals.cta_two) {
            ctas.push([vals.cta_two, vals.cta_two_tweet]);
        }
        if(vals.cta_three) {
            ctas.push([vals.cta_three, vals.cta_three_tweet]);
        }
        if(vals.cta_four) {
            ctas.push([vals.cta_four, vals.cta_four_tweet]);
        }
    } else if(tweet.card.name === "player") {
        let iframe = document.createElement('iframe');
        iframe.src = tweet.card.binding_values.player_url.string_value.replace("youtube.com", "youtube-nocookie.com").replace("autoplay=true", "autoplay=false").replace("autoplay=1", "autoplay=0");
        iframe.classList.add('tweet-player');
        let [w, h] = sizeFunctions[1](+tweet.card.binding_values.player_width.string_value, +tweet.card.binding_values.player_height.string_value);
        iframe.width = w;
        iframe.height = h;
        iframe.loading = 'lazy';
        iframe.allowFullscreen = true;
        tweetElement.getElementsByClassName('tweet-card')[0].innerHTML = '';
        tweetElement.getElementsByClassName('tweet-card')[0].append(iframe);
    } else if(tweet.card.name === "unified_card") {
        let uc = JSON.parse(tweet.card.binding_values.unified_card.string_value);
        for(let cn of uc.components) {
            let co = uc.component_objects[cn];
            if(co.type === "media") {
                let media = uc.media_entities[co.data.id];

                if(media.type === "photo") {
                    let img = document.createElement('img');
                    img.className = 'tweet-media-element';
                    let [w, h] = sizeFunctions[1](media.original_info.width, media.original_info.height);
                    img.width = w;
                    img.height = h;
                    img.loading = 'lazy';
                    img.src = media.media_url_https;
                    img.addEventListener('click', () => {
                        new Viewer(img, {
                            transition: false,
                            zoomRatio: 0.3
                        });
                    });
                    tweetElement.getElementsByClassName('tweet-card')[0].append(img, document.createElement('br'));
                } else if(media.type === "animated_gif" || media.type === "video") {
                    let video = document.createElement('video');
                    video.className = 'tweet-media-element tweet-media-element-one';
                    let [w, h] = sizeFunctions[1](media.original_info.width, media.original_info.height);
                    video.width = w;
                    video.height = h;
                    video.crossOrigin = 'anonymous';
                    video.loading = 'lazy';
                    video.controls = true;
                    if(!media.video_info) {
                        console.log(`bug found in ${tweet.id_str}, please report this message to https://github.com/dimdenGD/OldTwitter/issues`, tweet);
                        continue;
                    };
                    let variants = media.video_info.variants.sort((a, b) => {
                        if(!b.bitrate) return -1;
                        return b.bitrate-a.bitrate;
                    });
                    for(let v in variants) {
                        let source = document.createElement('source');
                        source.src = variants[v].url;
                        source.type = variants[v].content_type;
                        video.append(source);
                    }
                    tweetElement.getElementsByClassName('tweet-card')[0].append(video, document.createElement('br'));
                }
            } else if(co.type === "app_store_details") {
                let app = uc.app_store_data[uc.destination_objects[co.data.destination].data.app_id][0];
                let appElement = document.createElement('div');
                appElement.classList.add('tweet-app-info');
                appElement.innerHTML = html`
                    <h3>${escapeHTML(app.title.content)}</h3>
                    <span>${escapeHTML(app.category.content)}</span>
                    <br>
                `;
                tweetElement.getElementsByClassName('tweet-card')[0].append(appElement);
            } else if(co.type === "button_group") {
                let buttonGroup = document.createElement('div');
                buttonGroup.classList.add('tweet-button-group');
                for(let b of co.data.buttons) {
                    let app = uc.app_store_data[uc.destination_objects[b.destination].data.app_id][0];
                    let button = document.createElement('a');
                    button.href = `http://play.google.com/store/apps/details?id=${app.id}`;
                    button.target = '_blank';
                    button.className = `nice-button tweet-app-button tweet-app-button-${b.style}`
                    button.innerText = b.action[0].toUpperCase() + b.action.slice(1);
                    buttonGroup.append(button);
                }
                tweetElement.getElementsByClassName('tweet-card')[0].append(buttonGroup);
            }
        }
    } else if(tweet.card.name === "summary" || tweet.card.name === "summary_large_image") {
        let vals = tweet.card.binding_values;
        let a = document.createElement('a');
        let url = vals.card_url.string_value;
        if(tweet.entities && tweet.entities.urls) {
            let urlEntity = tweet.entities.urls.find(u => u.url === url);
            if(urlEntity) {
                url = urlEntity.expanded_url;
            }
        }
        a.target = '_blank';
        a.href = url;
        a.className = 'tweet-card-link yeah-box';
        a.innerHTML = html`
            ${vals.thumbnail_image ? `<img src="${vals.thumbnail_image.image_value.url}" class="tweet-card-link-thumbnail">` : ''}
            <div class="tweet-card-link-text">
                ${vals.vanity_url ? `<span class="tweet-card-link-vanity">${escapeHTML(vals.vanity_url.string_value)}</span><br>` : ''}
                ${vals.title ? `<h3 class="tweet-card-link-title">${escapeHTML(vals.title.string_value)}</h3>` : ''}
                ${vals.description ? `<span class="tweet-card-link-description">${escapeHTML(vals.description.string_value)}</span>` : ''}
            </div>
        `;
        tweetElement.getElementsByClassName('tweet-card')[0].append(a);
    } else if(tweet.card.url.startsWith('card://')) {
        generatePoll(tweet, tweetElement, user);
    }
}
function createEmojiPicker(container, input, style = {}) {
    let picker = new EmojiPicker();
    for(let i in style) {
        picker.style[i] = style[i];
    }
    picker.className = isDarkModeEnabled ? 'dark' : 'light';
    picker.addEventListener('emoji-click', e => {
        let pos = input.selectionStart;
        let text = input.value;
        input.value = text.slice(0, pos) + e.detail.unicode + text.slice(pos);
        input.selectionStart = pos + e.detail.unicode.length;
    });
    container.append(picker);

    let observer;

    setTimeout(() => {
        function oc (e) {
            if (picker.contains(e.target)) return;
            if(observer) {
                observer.disconnect();
            }
            picker.remove();
            document.removeEventListener('click', oc);
            picker.database.close();
        }
        document.addEventListener('click', oc);
        picker.shadowRoot.querySelector("input.search").focus();
    }, 100);

    return picker;
}
function isEmojiOnly(str) {
    const stringToTest = str.replace(/ /g,'');
    const emojiRegex = /^(?:(?:\p{RI}\p{RI}|\p{Emoji}(?:\p{Emoji_Modifier}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?(?:\u{200D}\p{Emoji}(?:\p{Emoji_Modifier}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?)*)|[\u{1f900}-\u{1f9ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}])+$/u;
    return emojiRegex.test(stringToTest) && Number.isNaN(Number(stringToTest));
}

function renderMedia(t) {
    let _html = '';
    if(!t.extended_entities || !t.extended_entities.media) return '';

    let cws = [];

    for(let i = 0; i < t.extended_entities.media.length; i++) {
        let m = t.extended_entities.media[i];
        let toCensor = t.possibly_sensitive;
        if(m.type === 'photo') {
            let [w, h] = sizeFunctions[t.extended_entities.media.length](m.original_info.width, m.original_info.height);
            _html += html`
            <img 
                ${m.ext_alt_text ? `alt="${escapeHTML(m.ext_alt_text.replaceAll('"', "'"))}" title="${escapeHTML(m.ext_alt_text.replaceAll('"', "'"))}"` : ''}
                crossorigin="anonymous"
                width="${w}"
                height="${h}"
                loading="lazy"
                src="${m.media_url_https + (false && (m.media_url_https.endsWith('.jpg') || m.media_url_https.endsWith('.png')) ? '?name=orig' : window.navigator && navigator.connection && navigator.connection.type === 'cellular' ? '?name=small' : '')}"
                class="tweet-media-element ${mediaClasses[t.extended_entities.media.length]} ${toCensor ? 'tweet-media-element-censor' : ''}"
            >`;
        } else if(m.type === 'animated_gif') {
            let [w, h] = sizeFunctions[t.extended_entities.media.length](m.original_info.width, m.original_info.height);
            let rid = m.id_str + m.media_key;
            _html += html`
                <video
                    ${m.ext_alt_text ? `alt="${escapeHTML(m.ext_alt_text)}" title="${escapeHTML(m.ext_alt_text)}"` : ''}
                    crossorigin="anonymous"
                    width="${w}"
                    height="${h}"
                    loop
                    disableRemotePlayback
                    autoplay
                    muted
                    class="tweet-media-element tweet-media-gif ${mediaClasses[t.extended_entities.media.length]} ${toCensor ? 'tweet-media-element-censor' : ''}"
                >
                    ${m.video_info.variants.map(v => `<source src="${v.url}" type="${v.content_type}">`).join('\n')}
                    Unsupported video
                </video>
            `;
        } else if(m.type === 'video') {
            if(m.mediaStats && m.mediaStats.viewCount) {
                m.ext = {
                    mediaStats: { r: { ok: { viewCount: m.mediaStats.viewCount } } }
                }
            }
            let [w, h] = sizeFunctions[t.extended_entities.media.length](m.original_info.width, m.original_info.height);
            _html += html`
                <video
                    ${m.ext_alt_text ? `alt="${escapeHTML(m.ext_alt_text)}" title="${escapeHTML(m.ext_alt_text)}"` : ''}
                    crossorigin="anonymous"
                    width="${w}"
                    height="${h}"
                    preload="none"
                    disableRemotePlayback
                    ${t.extended_entities.media.length > 1 ? 'controls' : ''}
                    poster="${m.media_url_https}"
                    class="tweet-media-element ${mediaClasses[t.extended_entities.media.length]} ${toCensor ? 'tweet-media-element-censor' : ''}"
                >
                    ${m.video_info.variants.map(v => `<source src="${v.url}" type="${v.content_type}">`).join('\n')}
                    Unsupported video
                </video>
            `;
        }
        if(i === 1 && t.extended_entities.media.length > 3) {
            _html += '<br>';
        }
    }

    if(cws.length > 0) {
        cws = [...new Set(cws)];
        cws = "Content warnings: " + cws.join(', ');
        _html += html`<br><div class="tweet-media-cws">${cws}</div>`;
    }
    return _html;
}


function openInNewTab(href) {
    Object.assign(document.createElement('a'), {
        target: '_blank',
        rel: 'noopener noreferrer',
        href: href,
    }).click();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function appendTweet(t, timelineContainer, options = {}, user) {
    if(typeof t !== 'object') {
        console.error('Tweet is undefined', t, timelineContainer, options);
        return;
    }
    if(typeof t.user !== 'object') {
        console.error('Tweet user is undefined', t, timelineContainer, options);
        return;
    }
    try {
        // verification
        if(t.user.ext_verified_type) {
            t.user.verified_type = t.user.ext_verified_type;
            t.user.verified = true;
        }
        if(t.user.ext && t.user.ext.isBlueVerified && t.user.ext.isBlueVerified.r && t.user.ext.isBlueVerified.r.ok) {
            t.user.verified_type = "Blue";
            t.user.verified = true;
        }
        if(t.user && t.user.ext && t.user.ext.verifiedType && t.user.ext.verifiedType.r && t.user.ext.verifiedType.r.ok) {
            t.user.verified_type = t.user.ext.verifiedType.r.ok;
            t.user.verified = true;
        }
        if(t.quoted_status && t.quoted_status.user.verified_type === "Blue") {
            delete t.quoted_status.user.verified_type;
            t.quoted_status.user.verified = false;
        }

        const tweet = document.createElement('div');
        tweet.tweet = t;
        t.element = tweet;
        t.options = options;

        if(!options.mainTweet) {
            tweet.addEventListener('click', e => {
                if(!e.target.closest(".tweet-button") && !e.target.closest(".tweet-body-text-span") && !e.target.closest(".tweet-edit-section") && !e.target.closest(".dropdown-menu") && !e.target.closest(".tweet-media-element") && !e.target.closest("a") && !e.target.closest("button")) {
                    let tweetData = t;
                    if(tweetData.retweeted_status) tweetData = tweetData.retweeted_status;
                    tweet.classList.add('tweet-preload');
                    let selection = window.getSelection();
                    if(selection.toString().length > 0 && selection.focusNode && selection.focusNode.closest(`div.tweet[data-tweet-id="${tweetData.id_str}"]`)) {
                        return;
                    }
                    let a = document.createElement('a');
                    a.href = `/${tweetData.user.screen_name}/status/${tweetData.id_str}`;
                    a.target = '_blank';
                    a.click();
                }
            });
        }
        tweet.addEventListener('mousedown', e => {
            if(e.button === 1) {
                // tweet-media-element is clickable, since it should open the tweet in a new tab.
                if(!e.target.closest(".tweet-button") && !e.target.closest(".tweet-edit-section") && !e.target.closest(".dropdown-menu") && !e.target.closest("a") && !e.target.closest("button")) {
                    e.preventDefault();
                    openInNewTab(`/${t.user.screen_name}/status/${t.id_str}`);
                }
            }
        });
        tweet.tabIndex = -1;
        tweet.className = `yeah-tweet ${options.mainTweet ? 'tweet-main' : location.pathname.includes('/status/') ? 'tweet-replying' : ''}`.trim();
        tweet.dataset.tweetId = t.id_str;
        tweet.dataset.userId = t.user.id_str;
        try {
            if(!activeTweet) {
                tweet.classList.add('tweet-active');
                activeTweet = tweet;
            }
        } catch(e) {};

        if(t.nonReply) {
            tweet.classList.add('tweet-non-reply');
        }

        if(t.threadContinuation) {
            options.threadContinuation = true;
        }
        if(t.noTop) {
            options.noTop = true;
        }
        if (options.threadContinuation) tweet.classList.add('tweet-self-thread-continuation');
        if (options.selfThreadContinuation) tweet.classList.add('tweet-self-thread-continuation');

        if (options.noTop) tweet.classList.add('tweet-no-top');
        let full_text = t.full_text ? t.full_text : '';
        let tweetLanguage = t.lang; // originally i used i18n api to detect languages simply because i didn't know of t.lang existence
        if(!tweetLanguage) {
            tweetLanguage = 'und';
        }
        if(tweetLanguage.includes('-')) {
            let [lang, country] = tweetLanguage.split('-');
            tweetLanguage = `${lang}_${country.toUpperCase()}`;
        }
        let videos = t.extended_entities && t.extended_entities.media && t.extended_entities.media.filter(m => m.type === 'video');
        if(!videos || videos.length === 0) {
            videos = undefined;
        }
        if(videos) {
            for(let v of videos) {
                if(!v.video_info) continue;
                v.video_info.variants = v.video_info.variants.sort((a, b) => {
                    if(!b.bitrate) return -1;
                    return b.bitrate-a.bitrate;
                });
            }
        }
        if(full_text.includes("Learn more")) {
            console.log(t);
        }
        if(t.withheld_in_countries && (t.withheld_in_countries.includes("XX") || t.withheld_in_countries.includes("XY"))) {
            full_text = "";
        }
        if(!t.quoted_status) { //t.quoted_status is undefined if the user blocked the quoter (this also applies to deleted/private tweets too, but it just results in original behavior then)
            try {
                if(t.quoted_status_result && t.quoted_status_result.result.tweet) {
                    t.quoted_status = t.quoted_status_result.result.tweet.legacy;
                    t.quoted_status.user = t.quoted_status_result.result.tweet.core.user_results.result.legacy;
                }/* else if(t.quoted_status_id_str) {
                    t.quoted_status = await API.tweet.getV2(t.quoted_status_id_str);
                    console.log(t.quoted_status);
                }*/
            } catch {
                t.quoted_status = undefined;
            }
        }
        let mentionedUserText = ``;
        let quoteMentionedUserText = ``;
        if(t.in_reply_to_screen_name && t.display_text_range) {
            t.entities.user_mentions.forEach(user_mention => {
                if(user_mention.indices[0] < t.display_text_range[0]){
                    mentionedUserText += `<a href="/${user_mention.screen_name}">@${user_mention.screen_name}</a> `
                }
                //else this is not reply but mention
            });
        }
        if(t.quoted_status && t.quoted_status.in_reply_to_screen_name && t.display_text_range) {
            t.quoted_status.entities.user_mentions.forEach(user_mention => {
                if(user_mention.indices[0] < t.display_text_range[0]){
                    quoteMentionedUserText += `@${user_mention.screen_name} `
                }
                //else this is not reply but mention
            });
        }
        // i fucking hate this thing
        tweet.innerHTML = html`
            <div class="tweet-top" hidden></div>
            <a class="tweet-avatar-link" href="/${t.user.screen_name}">
                <img
                    src="${`${t.user.profile_image_url_https}`.replace("_normal.", "_bigger.")}"
                    alt="${t.user.name}"
                    class="tweet-avatar"
                    width="48"
                    height="48"
                >
            </a>
            <div class="tweet-header ${options.mainTweet ? 'tweet-header-main' : ''}">
                <a class="tweet-header-info ${options.mainTweet ? 'tweet-header-info-main' : ''}" href="/${t.user.screen_name}">
                    <b
                        ${t.user.id_str === '1708130407663759360' ? 'title="Old Twitter Layout extension developer" ' : ''}
                        class="tweet-header-name ${options.mainTweet ? 'tweet-header-name-main' : ''} ${t.user.verified || t.user.verified_type ? 'user-verified' : t.user.id_str === '1708130407663759360' ? 'user-verified user-verified-dimden' : ''} ${t.user.protected ? 'user-protected' : ''} ${t.user.verified_type === 'Government' ? 'user-verified-gray' : t.user.verified_type === 'Business' ? 'user-verified-yellow' : t.user.verified_type === 'Blue' ? 'user-verified-blue' : ''}"
                    >${escapeHTML(t.user.name)}</b>
                    <span class="tweet-header-handle">@${t.user.screen_name}</span>
                </a>
                <a class="tweet-time" data-timestamp="${new Date(t.created_at).getTime()}" title="${new Date(t.created_at).toLocaleString()}" href="/${t.user.screen_name}/status/${t.id_str}">${timeElapsed(new Date(t.created_at).getTime())}</a>
            </div>
            <article class="tweet-body ${options.mainTweet ? 'tweet-body-main' : ''}">
                ${mentionedUserText !== `` &&
                    !options.threadContinuation &&
                    !options.noTop &&
                    !location.pathname.includes('/status/') ? html`
                <div class="tweet-reply-to"><span>${"Replying to $SCREEN_NAME$".replace('$SCREEN_NAME$', mentionedUserText.trim().replaceAll(`> <`, `>${", "}<`).replace(`>${", "}<`, `>${" and "}<`))}</span></div>
                `: ''}
                <div lang="${t.lang}" class="tweet-body-text tweet-body-text-long">
                    <span class="tweet-body-text-span">${full_text ? await renderTweetBodyHTML(t) : ''}</span>
                </div>
                ${t.extended_entities && t.extended_entities.media ? html`
                    <div class="tweet-media">
                        ${t.extended_entities.media.length === 1 && t.extended_entities.media[0].type === 'video' ? html`
                            <div class="tweet-media-video-overlay tweet-button">
                                <svg viewBox="0 0 24 24" class="tweet-media-video-overlay-play">
                                    <g>
                                        <path class="svg-play-path" d="M8 5v14l11-7z"></path>
                                        <path d="M0 0h24v24H0z" fill="none"></path>
                                    </g>
                                </svg>
                            </div>
                        ` : ''}
                        ${renderMedia(t)}
                    </div>
                    ${t.extended_entities && t.extended_entities.media && t.extended_entities.media.some(m => m.type === 'animated_gif') ? html`<div class="tweet-media-controls">GIF</div>` : ''}
                    <span class="tweet-media-data"></span>
                ` : ``}
                ${t.card ? `<div class="tweet-card"></div>` : ''}
                ${t.quoted_status ? html`
                <a class="tweet-body-quote" target="_blank" href="/${t.quoted_status.user.screen_name}/status/${t.quoted_status.id_str}">
                    <img src="${t.quoted_status.user.profile_image_url_https}" alt="${escapeHTML(t.quoted_status.user.name)}" class="tweet-avatar-quote" width="24" height="24">
                    <div class="tweet-header-quote">
                        <span class="tweet-header-info-quote">
                        <b class="tweet-header-name-quote ${t.quoted_status.user.verified ? 'user-verified' : t.quoted_status.user.id_str === '1708130407663759360' ? 'user-verified user-verified-dimden' : ''} ${t.quoted_status.user.protected ? 'user-protected' : ''} ${t.quoted_status.user.verified_type === 'Government' ? 'user-verified-gray' : t.quoted_status.user.verified_type === 'Business' ? 'user-verified-yellow' : t.quoted_status.user.verified_type === 'Blue' ? 'user-verified-blue' : ''}">${escapeHTML(t.quoted_status.user.name)}</b>
                        <span class="tweet-header-handle-quote">@${t.quoted_status.user.screen_name}</span>
                        </span>
                    </div>
                    <span class="tweet-time-quote" data-timestamp="${new Date(t.quoted_status.created_at).getTime()}" title="${new Date(t.quoted_status.created_at).toLocaleString()}">${timeElapsed(new Date(t.quoted_status.created_at).getTime())}</span>
                    ${quoteMentionedUserText !== `` ? html`
                    <span class="tweet-reply-to tweet-quote-reply-to">${"Replying to $SCREEN_NAME$".replace('$SCREEN_NAME$', quoteMentionedUserText.trim().replaceAll(` `,", ").replace(", "," and "))}</span>
                    ` : ''}
                    <span class="tweet-body-text tweet-body-text-quote tweet-body-text-long" style="color:var(--yeah-default-text-color)!important">${t.quoted_status.full_text ? await renderTweetBodyHTML(t, true) : ''}</span>
                    ${t.quoted_status.extended_entities && t.quoted_status.extended_entities.media ? html`
                    <div class="tweet-media-quote">
                        ${t.quoted_status.extended_entities.media.map(m => `<${m.type === 'photo' ? 'img' : 'video'} ${m.ext_alt_text ? `alt="${escapeHTML(m.ext_alt_text)}" title="${escapeHTML(m.ext_alt_text)}"` : ''} crossorigin="anonymous" width="${quoteSizeFunctions[t.quoted_status.extended_entities.media.length](m.original_info.width, m.original_info.height)[0]}" height="${quoteSizeFunctions[t.quoted_status.extended_entities.media.length](m.original_info.width, m.original_info.height)[1]}" loading="lazy" ${m.type === 'video' ? 'disableRemotePlayback controls' : ''} ${m.type === 'animated_gif' ? 'disableRemotePlayback loop muted onclick="if(this.paused) this.play(); else this.pause()"' : ''}${m.type === 'animated_gif' ? ' autoplay' : ''} src="${m.type === 'photo' ? m.media_url_https + (false && (m.media_url_https.endsWith('.jpg') || m.media_url_https.endsWith('.png')) ? '?name=orig' : window.navigator && navigator.connection && navigator.connection.type === 'cellular' ? '?name=small' : '') : m.video_info.variants.find(v => v.content_type === 'video/mp4').url}" class="tweet-media-element tweet-media-element-quote ${m.type === 'animated_gif' ? 'tweet-media-element-quote-gif' : ''} ${mediaClasses[t.quoted_status.extended_entities.media.length]}">${m.type === 'photo' ? '' : '</video>'}`).join('\n')}
                    </div>
                    ` : ''}
                </a>
                ` : ``}
                ${t.limited_actions === 'limit_trusted_friends_tweet' && (options.mainTweet || !location.pathname.includes('/status/')) ? html`
                <div class="tweet-limited">
                    ${"This tweet is visible only to people who are in @$SCREEN_NAME$'s trusted friends circle."}
                    <a href="https://help.twitter.com/en/using-twitter/twitter-circle" target="_blank">${"Learn more."}</a>
                </div>
                `.replace('$SCREEN_NAME$', tweet.trusted_circle_owner ? tweet.trusted_circle_owner : tweetStorage[t.conversation_id_str] ? tweetStorage[t.conversation_id_str].user.screen_name : t.in_reply_to_screen_name ? t.in_reply_to_screen_name : t.user.screen_name) : ''}
                ${t.tombstone ? `<div class="tweet-warning">${t.tombstone}</div>` : ''}
                <a ${!options.mainTweet ? 'hidden' : ''} class="tweet-date" title="${new Date(t.created_at).toLocaleString()}" href="/${t.user.screen_name}/status/${t.id_str}"><br>${new Date(t.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: 'numeric' }).toLowerCase()} - ${new Date(t.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}  ・ ${t.source ? t.source.split('>')[1].split('<')[0] : 'Unknown'}</a>
                <div class="tweet-interact">
                    <span class="tweet-button tweet-interact-reply" title="Replies" data-val="${t.reply_count}">${options.mainTweet ? '' : formatLargeNumber(t.reply_count).replace(/\s/g, ',')}</span>
                    <span title="Retweets" class="tweet-button tweet-interact-retweet${t.retweeted ? ' tweet-interact-retweeted' : ''}${(t.user.protected || t.limited_actions === 'limit_trusted_friends_tweet') && t.user.id_str !== user.id_str ? ' tweet-interact-retweet-disabled' : ''}" data-val="${t.retweet_count}">${options.mainTweet ? '' : formatLargeNumber(t.retweet_count).replace(/\s/g, ',')}</span>
                    <span title="Likes" class="tweet-button tweet-yeah-interact-favorite ${t.favorited ? 'tweet-yeah-interact-favorited' : ''}" data-val="${t.favorite_count}">${options.mainTweet ? '' : formatLargeNumber(t.favorite_count).replace(/\s/g, ',')}</span>
                    ${t.ext && t.ext.views && t.ext.views.r && t.ext.views.r.ok && t.ext.views.r.ok.count ? html`<span title="${"Views"}" class="tweet-interact-views tweet-button" data-val="${t.ext.views.r.ok.count}">${formatLargeNumber(t.ext.views.r.ok.count).replace(/\s/g, ',')}</span>` : ''}
                </div>
            </article>
        `;
        // gifs
        let gifs = Array.from(tweet.querySelectorAll('.tweet-media-gif, .tweet-media-element-quote-gif'));
        if(gifs.length) {
            gifs.forEach(gif => {
                gif.addEventListener('click', () => {
                    if(gif.paused) gif.play();
                    else gif.pause();
                });
            });
        }
        // video
        let vidOverlay = tweet.getElementsByClassName('tweet-media-video-overlay')[0];
        if(vidOverlay) {
            vidOverlay.addEventListener('click', async () => {
                let vid = Array.from(tweet.getElementsByClassName('tweet-media')[0].children).filter(e => e.tagName === 'VIDEO')[0];
                try {
                    let res = await fetch(vid.currentSrc); // weird problem with vids breaking cuz twitter sometimes doesnt send content-length
                    if(!res.headers.get('content-length')) await sleep(1000);
                } catch(e) {
                    console.error(e);
                }
                vid.play();
                vid.controls = true;
                vid.classList.remove('tweet-media-element-censor');
                vidOverlay.style.display = 'none';
            });
        }
        if(videos) {
            let videoErrors = 0;
            let vids = Array.from(tweet.getElementsByClassName('tweet-media')[0].children).filter(e => e.tagName === 'VIDEO');
            vids[0].addEventListener('error', () => {
                if(videoErrors >= 3) return;
                videoErrors++;
                setTimeout(() => {
                    vids[0].load();
                }, 25);
            })
            for(let vid of vids) {
                vid.addEventListener('mousedown', e => {
                    if(e.button === 1) {
                        e.preventDefault();
                        window.open(vid.currentSrc, '_blank');
                    }
                });
            }
        }

        if(t.card) {
            generateCard(t, tweet, user);
        }
        if (options.top) {
            tweet.querySelector('.tweet-top').hidden = false;
            const icon = document.createElement('span');
            icon.innerText = options.top.icon;
            icon.classList.add('tweet-top-icon');
            icon.style.color = options.top.color;

            const span = document.createElement("span");
            span.classList.add("tweet-top-text");
            span.innerHTML = options.top.text;
            if(options.top.class) {
                span.classList.add(options.top.class);
                tweet.classList.add(`tweet-top-${options.top.class}`);
            }
            tweet.querySelector('.tweet-top').append(icon, span);
        }

        const tweetBodyQuote = tweet.getElementsByClassName('tweet-body-quote')[0];
        const tweetMediaQuote = tweet.getElementsByClassName('tweet-media-quote')[0];
        const tweetInteract = tweet.getElementsByClassName('tweet-interact')[0];
        const tweetFooter = tweet.getElementsByClassName('tweet-footer')[0];

        // community notes
        if(t.birdwatch) {
            if(t.birdwatch.subtitle) {
                let div = document.createElement('div');
                div.classList.add('tweet-birdwatch', 'box');
                let text = Array.from(escapeHTML(t.birdwatch.subtitle.text));
                for(let e = t.birdwatch.subtitle.entities.length - 1; e >= 0; e--) {
                    let entity = t.birdwatch.subtitle.entities[e];
                    if(!entity.ref) continue;
                    text = arrayInsert(text, entity.toIndex, '</a>');
                    text = arrayInsert(text, entity.fromIndex, `<a href="${entity.ref.url}" target="_blank">`);
                }
                text = text.join('');
                
                div.innerHTML = html`
                    <div class="tweet-birdwatch-header">
                        <span class="tweet-birdwatch-title">${escapeHTML(t.birdwatch.title)}</span>
                    </div>
                    <div class="tweet-birdwatch-body">
                        <span class="tweet-birdwatch-subtitle">${text}</span>
                    </div>
                `;
    
                if(tweetFooter) tweetFooter.before(div);
                else tweetInteract.before(div);
            }
        }

        // Quote body
        if(tweetMediaQuote) tweetMediaQuote.addEventListener('click', e => {
            if(e && e.target && e.target.tagName === "VIDEO") {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                if(e.target.paused) {
                    e.target.play();
                } else {
                    e.target.pause();
                }
            }
        });
        if(tweetBodyQuote) {
            tweetBodyQuote.addEventListener('click', e => {
                e.preventDefault();
                let a = document.createElement('a');
                a.href = `/${t.quoted_status.user.screen_name}/status/${t.quoted_status.id_str}`;
                a.target = '_blank';
                a.click();
            });
        }

        // Media
        if (t.extended_entities && t.extended_entities.media) {
            const tweetMedia = tweet.getElementsByClassName('tweet-media')[0];
            tweetMedia.addEventListener('click', e => {
                if (e.target.className && e.target.className.includes('tweet-media-element-censor')) {
                    return e.target.classList.remove('tweet-media-element-censor');
                }
                if (e.target.tagName === 'IMG') {
                    if(!e.target.src.includes('?name=') && !e.target.src.endsWith(':orig') && !e.target.src.startsWith('data:')) {
                        e.target.src += '?name=orig';
                    } else if(e.target.src.includes('?name=small')) {
                        e.target.src = e.target.src.replace('?name=small', '?name=large');
                    }
                    new Viewer(tweetMedia, {
                        transition: false,
                        zoomRatio: 0.3
                    });
                    e.target.click();
                }
            });
        }

        if(options.noInsert) {
            return tweet;
        }

        if(options.after) {
            options.after.after(tweet);
        } else if (options.before) {
            options.before.before(tweet);
        } else if (options.prepend) {
            timelineContainer.prepend(tweet);
        } else {
            timelineContainer.append(tweet);
        }
        return tweet;
    } catch(e) {
        console.error(e);
        if(Date.now() - lastTweetErrorDate > 1000) {
            lastTweetErrorDate = Date.now();
            createModal(/*html*/`
                <div style="max-width:700px">
                    <span style="font-size:14px;color:var(--default-text-color)">
                        <h2 style="margin-top: 0">Something went wrong</h2>
                        Some tweets couldn't be loaded due to errors.<br>
                        ${"Please copy text below and send it to $AT1$issue tracker$AT2$ or $AT3$my email$AT2$. Thank you!".replace('$AT1$', "<a target='_blank' href='https://github.com/dimdenGD/YeahTwitter/issues'>").replace(/\$AT2\$/g, '</a>').replace("$AT3$", "<a target='_blank' href='mailto:admin@dimden.dev'>")}
                    </span>
                    <div class="box" style="font-family:monospace;line-break: anywhere;padding:5px;margin-top:5px;background:rgba(255, 0, 0, 0.1);color:#ff4545">
                        ${escapeHTML(e.stack ? e.stack : String(e))} at ${t.id_str} (YeahTwitter v${chrome.runtime.getManifest().version})
                    </div>
                </div>
            `);
        }
        return null;
    }
}