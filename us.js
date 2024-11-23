// ==UserScript==
// @name         Yeah! for Twitter
// @namespace    http://tampermonkey.net/
// @version      ${manifest.version}
// @description  Adds Yeah! button to Twitter, essentially a public Like
// @author       dimden.dev
// @match        https://x.com/*
// @match        https://twitter.com/*
// @icon         https://dimden.dev/images/yeah_logo.png
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// ==/UserScript==

// fetch polyfill
function GM_fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const method = options.method || 'GET';
        const headers = options.headers || {};
        const body = options.body || null;

        GM_xmlhttpRequest({
            method,
            url,
            headers,
            data: body,
            onload(response) {
                const responseBody = response.responseText;
                const status = response.status;
                const statusText = response.statusText;
                const responseHeaders = parseHeaders(response.responseHeaders);

                resolve(new Response(responseBody, {
                    status,
                    statusText,
                    headers: responseHeaders
                }));
            },
            onerror(error) {
                reject(new Error('Network request failed'));
            },
            ontimeout() {
                reject(new Error('Network request timed out'));
            }
        });
    });
}

function parseHeaders(headersString) {
    const headers = new Headers();
    const lines = headersString.trim().split(/[\r\n]+/);
    lines.forEach(line => {
        const parts = line.split(': ');
        const header = parts.shift();
        const value = parts.join(': ');
        headers.append(header, value);
    });
    return headers;
}

class Response {
    constructor(body, options) {
        this.body = body;
        this.status = options.status;
        this.statusText = options.statusText;
        this.headers = options.headers;
    }

    text() {
        return Promise.resolve(this.body);
    }

    json() {
        return Promise.resolve(JSON.parse(this.body));
    }
}

// chrome.storage.local polyfill
window.chrome = window.chrome || {};
chrome.runtime = chrome.runtime || {id: 'userscript'};
chrome.storage = chrome.storage || {};
chrome.storage.local = {
    storageKey: 'chromeStorage',

    _getStorageObject: function () {
        const storage = localStorage.getItem(this.storageKey);
        return storage ? JSON.parse(storage) : {};
    },

    _setStorageObject: function (obj) {
        localStorage.setItem(this.storageKey, JSON.stringify(obj));
    },

    get: function (keys, callback) {
        const storageObj = this._getStorageObject();
        const result = {};

        if (typeof keys === 'string') {
            result[keys] = storageObj[keys];
        } else if (Array.isArray(keys)) {
            keys.forEach(key => {
                result[key] = storageObj[key];
            });
        } else if (typeof keys === 'object') {
            Object.keys(keys).forEach(key => {
                result[key] = storageObj[key] !== undefined ? storageObj[key] : keys[key];
            });
        } else {
            Object.assign(result, storageObj);
        }

        callback(result);
    },

    set: function (items, callback) {
        const storageObj = this._getStorageObject();

        Object.keys(items).forEach(key => {
            storageObj[key] = items[key];
        });

        this._setStorageObject(storageObj);

        if (callback) callback();
    },

    remove: function (keys, callback) {
        const storageObj = this._getStorageObject();

        if (typeof keys === 'string') {
            delete storageObj[keys];
        } else if (Array.isArray(keys)) {
            keys.forEach(key => {
                delete storageObj[key];
            });
        }

        this._setStorageObject(storageObj);

        if (callback) callback();
    },

    clear: function (callback) {
        localStorage.removeItem(this.storageKey);
        if (callback) callback();
    }
};

if(this.GM_registerMenuCommand) {
    GM_registerMenuCommand("Don't like tweet on Yeah", function () {
        chrome.storage.local.set({
            settings: {
                dontLike: true
            }
        });
    });
    
    GM_registerMenuCommand("Like tweet on Yeah", function () {
        chrome.storage.local.set({
            settings: {
                dontLike: false
            }
        });
    });
    
    GM_registerMenuCommand("Clear account tokens", function () {
        chrome.storage.local.remove(['yeahToken', 'yeahTokens']);
    });
    
    GM_registerMenuCommand("Reset popup settings", function () {
        chrome.storage.local.remove(['ignorePopup']);
    });
}

let fontstyle = document.createElement('style');
fontstyle.innerHTML = `
@font-face {
    font-family: 'RosettaIcons2';
    src: url(data:application/x-font-woff;charset=utf-8;base64,{{font_url}});
}
`;
document.head.appendChild(fontstyle);

let YEAH_images = {};