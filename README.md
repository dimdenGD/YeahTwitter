# Yeah! for Twitter
Extension that adds a "Yeah!" button to Twitter. Essentially, it's a public Like button. It doesn't send spammy images into replies, instead it saves your Yeahs into a shared database. Everyone can see who Yeahed a tweet, and what tweets person Yeahed.  
This extension supports both new Twitter and OldTwitter!  
![Screenshot](https://lune.dimden.dev/a602b6e6a2af.gif)  

## Installation
Chrome, Edge, Opera, Brave, Vivaldi, etc:  
<a href="https://chromewebstore.google.com/detail/yeah-for-twitter/haebjcgjcobeedihnmhcapfblbjdaimb" target="_blank"><img src="https://storage.googleapis.com/web-dev-uploads/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/HRs9MPufa1J1h5glNhut.png" alt="Chrome Web Store" width="200"/></a>

Firefox, Waterfox, LibreWolf, Floorp, etc:  
<a href="https://addons.mozilla.org/addon/yeah-for-twitter/" target="_blank"><img src="https://blog.mozilla.org/addons/files/2020/04/get-the-addon-fx-apr-2020.svg" alt="Firefox Add-ons" width="200"/></a>

Userscript (Tampermonkey, Greasemonkey, Violentmonkey, etc):  
### <a href="https://greasyfork.org/en/scripts/498118-yeah-for-twitter" target="_blank"><img src="https://greasyfork.org/vite/assets/blacklogo96-CxYTSM_T.png" alt="Userscript" width="50"/>Userscript</a>
## Manual Installation
1. Go to [Releases](https://github.com/dimdenGD/YeahTwitter/releases) page.
2. Download `chrome.zip` if you're on Chromium based browsers (Chrome, Edge, Opera, Brave, etc.) or `firefox.zip` if you're on Firefox.

### Chromium
- Unpack file anywhere
- Go to `chrome://extensions`
- Turn on Developer mode
- Press "Load unpacked" and select folder with extension

### Firefox
- Go to `about:debugging#/runtime/this-firefox`
- Press "Load Temporary Add-on" and select zip file you downloaded
- Installing it this way will remove extension after browser restart, see below for permanent installation

### Firefox Developer Edition / Nightly
- Go to `about:config`
- Set `xpinstall.signatures.required` to `false`
- Go to `about:addons`
- Press "Install Add-on From File" and select zip file you downloaded

## API
If you wish to implement Yeah! button in your Twitter mod, you can use this API.  
**Base URL:** `https://yeah.dimden.dev`  
All requests use POST method.  
All requests require Content-Type: `application/json`.  
  
### Request Token - `/api/request_token`
Returns `{ public_token: String, private_token: String }`.  
You need to make user tweet `yeah-xxxxxxxx` where `xxxxxxxx` is public token.

### Verify Token - `/api/verify_token`
Requires body: `{ public_token: String, private_token: String, tweet: Tweet }`.  
`Tweet` is object of [this format](https://developer.x.com/en/docs/twitter-api/v1/data-dictionary/object-model/tweet). Must also include `user` object inside with `id_str`.  
Will reply with `success` if everything went correctly. After that you can save `private_token` somewhere to use in other requests.

### Get Yeah data for tweets - `/api/get`
Requires body: `{ post_ids: String, key: private_token }`.  
`post_ids` is string of tweet IDs separated by comma. Max 100 tweets per request.  
Will return `[ { post_id: String, count: Number, yeahed: Boolean }, ... ]`.  

### Yeah a tweet - `/api/yeah`
Requires body: `{ post_id: String, key: private_token }`.  
Will reply with `done` if everything went fine.  

### Unyeah a tweet - `/api/unyeah`
Requires body: `{ post_id: String, key: private_token }`.  
Will reply with `done` if everything went fine.

### Get users that Yeahed a tweet - `/api/get_users`
Requires body: `{ post_id: String, key: private_token, page: Number }`.  
`page` starts with 1.  
Will return an array with user ids.  

### Get tweets that user Yeahed - `/api/get_yeahs`
Requires body: `{ user_id: String, key: private_token, page: Number }`.  
`page` starts with 1.  
Will return an array with tweet ids.  

### Get how many tweets user Yeahed - `/api/get_user_yeah_count`
Requires body: `{ user_id: String, key: private_token }`.  
Will return `{ count: Number }`.  
