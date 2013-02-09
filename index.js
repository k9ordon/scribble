/**/// GLOBALS
var http        = require('http')
  , crypto      = require('crypto')
  , querystring = require('querystring')
/**/// Public: Scribble
/**///
/**/// Args
/**/// api_key    - Last.fm API account key
/**/// api_secret - Last.fm API secret
/**/// username   - Last.fm account
/**/// password   - Last.fm password
/**///
/**/// Returns
/**/// return     - A scribble
var Scribble = function(api_key, api_secret, username, password) {
  this.apiKey     = api_key
  this.apiSecret  = api_secret
  this.username   = username
  this.password   = password
  this.sessionKey = null
}
/**/// Public: Love
/**///
/**/// Args
/**/// song - song object. artist, track keys
Scribble.prototype.Love = function(song, callback) {
  var self = this
  if (self.sessionKey == null) {
    self.MakeSession(function(sk) {
      postLove(self, song, sk, callback)
    })
  } else {
    postLove(self, song, self.sessionKey, callback)
  }
}
/**/// Public: Scrobble
/**///
/**/// Args
/**/// song - song object. artist, track keys
Scribble.prototype.Scrobble = function(song, callback) {
  var self = this
  if (self.sessionKey == null) {
    self.MakeSession(function(sk) {
      postScrobble(self, song, sk, callback)
    })
  } else {
    postScrobble(self, song, self.sessionKey, callback)
  }
}
/**/// Public: Now Playing
/**///
/**/// Args
/**/// song - song object. artist, track keys
Scribble.prototype.NowPlaying = function(song, callback) {
  var self = this
  if (self.sessionKey == null) {
    self.MakeSession(function(sk) {
      postNowPlaying(self, song, sk, callback)
    })
  } else {
    postNowPlaying(self, song, self.sessionKey, callback)
  }
}
/**/// Public: Make session key
/**///
/**/// Args
/**/// callback - optional callback function
/**///
/**/// Returns
/**/// return - a session key and optional callback
Scribble.prototype.MakeSession = function(callback) {
  var token   = makeHash(this.username + makeHash(this.password))
    , apiSig  = makeHash('api_key' + this.apiKey + 'authToken' + token + 'methodauth.getMobileSessionusername' + this.username + this.apiSecret)
    , path    = '/2.0/?method=auth.getMobileSession&' +
                'username=' + this.username +
                '&authToken=' + token +
                '&api_key=' + this.apiKey +
                '&api_sig=' + apiSig + '&format=json'
    , callResponse = ''
    , callValues   =  {
                        host: 'ws.audioscrobbler.com',
                        port: 80,
                        path: path
                      }
  http.get(callValues, function(response) {
    response.on('data', function(chunk) {
      callResponse += chunk
    })
    response.on('end', function() {
      var res = JSON.parse(callResponse)
      this.sessionKey = res.session.key
      if (typeof(callback) == 'function') {
        callback(res.session.key)
      }
    })
  }).on('error', function(err) {
    // TODO
  })
}
/**/// Public: does_something
/**///
/**/// Args
/**/// song     - song object. artist, track keys
/**/// callback - callback function
/**///
/**/// Returns
/**/// title - album title
Scribble.prototype.GetAlbum = function(song, callback) {
  var path = '/2.0/?method=track.getInfo&artist=' + song.artist + '&api_key=' + this.apiKey + '&track=' + song.track + '&format=json'
  sendGet(path, function(ret) {
    if (typeof(callback) == 'function')
      callback(ret.track.album.title)
  })
}
/**/// Public: GetArtistInfo
/**///
/**/// Args
/**/// artist   - artist string
/**/// callback - callback function
/**///
/**/// Returns
/**/// summary  - artist summary
Scribble.prototype.GetArtistInfo = function(artist, callback) {
  var path = '/2.0/?method=artist.getInfo&artist=' + artist + '&api_key=' + this.apiKey + '&format=json'
  sendGet(path, function(ret) {
    if (typeof(callback) == 'function')
      callback(ret.artist.bio.summary)
  })
}
/**/// Public: GetSimilarArtists
/**///
/**/// Args
/**/// artist   - artist string
/**/// callback - callback function
/**/// amt      - optional amount of returns
/**///
/**/// Returns
/**/// tracks   - array of artist strings
Scribble.prototype.GetSimilarArtists = function(artist, callback, amt) {
  var artists = []
    , amt     = amt || 3
    , path    = '/2.0/?method=artist.getSimilar&artist=' + artist + '&api_key=' + this.apiKey + '&format=json&limit=' + amt
  sendGet(path, function(ret) {
    var artist = ret.similarartists.artist
    for (var i=0;i<artist.length;i++)
      artists.push(artist[i].name)
    if (typeof(callback) == 'function')
      callback(artists)
  })
}
/**/// Public: GetSimilarSongs
/**///
/**/// Args
/**/// song     - song object. artist, track keys
/**/// callback - callback function
/**/// amt      - optional amount of returns
/**///
/**/// Returns
/**/// tracks   - array of song objects
Scribble.prototype.GetSimilarSongs = function(song, callback, amt) {
  var tracks = []
    , amt     = amt || 3
    , path    = '/2.0/?method=track.getSimilar&artist=' + song.artist + '&track=' + song.track + '&api_key=' + this.apiKey + '&format=json&limit=' + amt
  sendGet(path, function(ret) {
    var track = ret.similartracks.track
    for (var i=0;i<track.length;i++) {
      var returnedSong = {"track": track[i].name, "artist": track[i].artist.name}
      tracks.push(returnedSong)
    }
    if (typeof(callback) == 'function')
      callback(tracks)
  })
}
/**/// Private: Build and send love request
/**///
/**/// Args
/**/// self     - your Scribble object
/**/// song     - song object. artist, track keys
/**/// sk       - optional session key
/**/// callback - callback function
function postLove(self, song, sk, callback) {
  if (sk && self.sessionKey == null) {
    self.sessionKey = sk
  }
  var apiSig    = makeHash('api_key' + self.apiKey + 'artist' + song.artist + 'methodtrack.lovesk' + self.sessionKey + 'track' + song.track + self.apiSecret)
    , post_data = querystring.stringify({
        method: 'track.love',
        api_key: self.apiKey,
        sk: self.sessionKey,
        api_sig: apiSig,
        artist: song.artist,
        track: song.track
      })
  sendPost(post_data, callback)
}
/**/// Private: Build and send now playing request
/**///
/**/// Args
/**/// self     - your Scribble object
/**/// song     - song object. artist, track keys
/**/// sk       - optional session key
/**/// callback - callback function
function postNowPlaying(self, song, sk, callback) {
  if (sk && self.sessionKey == null) {
    self.sessionKey = sk
  }
  var apiSig    = makeHash('api_key' + self.apiKey + 'artist' + song.artist + 'methodtrack.updateNowPlayingsk' + self.sessionKey + 'track' + song.track + self.apiSecret)
    , post_data = querystring.stringify({
        method: 'track.updateNowPlaying',
        api_key: self.apiKey,
        sk: self.sessionKey,
        api_sig: apiSig,
        artist: song.artist,
        track: song.track
      })
  sendPost(post_data, callback)
}
/**/// Private: Build and send scrobble request
/**///
/**/// Args
/**/// self     - your Scribble object
/**/// song     - song object. artist, track keys
/**/// sk       - optional session key
/**/// callback - callback function
function postScrobble(self, song, sk, callback) {
  if (sk && self.sessionKey == null) {
    self.sessionKey = sk
  }
  var now       = new Date().getTime()
    , timestamp = Math.floor(now /1000)
    , apiSig    = makeHash('api_key' + self.apiKey + 'artist' + song.artist + 'methodtrack.scrobblesk' + self.sessionKey + 'timestamp' + timestamp + 'track' + song.track + self.apiSecret)
    , post_data = querystring.stringify({
        method: 'track.scrobble',
        api_key: self.apiKey,
        sk: self.sessionKey,
        api_sig: apiSig,
        timestamp: timestamp,
        artist: song.artist,
        track: song.track
      })
  sendPost(post_data, callback)
}
/**/// Private: Send POST requests to Last.fm
/**///
/**/// Args
/**/// data     - POST data object
/**/// callback - callback function
/**///
/**/// Returns
/**/// console  - POST response from API
function sendPost(data, callback) {
  var options = {
        host: 'ws.audioscrobbler.com',
        path: '/2.0/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': data.length
        }
      }
    , doPOST    = http.request(options, function(request) {
        var reqReturn = ''
        request.setEncoding('utf8')
        request.on('data', function(chunk) {
          reqReturn += chunk
        })
        request.on('end', function() {
          console.log('[POST RESPONSE] : ' + reqReturn)
          if (typeof(callback) == 'function')
            callback(reqReturn)
        })
      }).on('error', function(err) {
        // TODO
      })
  doPOST.write(data)
  doPOST.end()
}
/**/// Public: sendGet
/**///
/**/// Args
/**/// path     - html path for API call
/**/// callback - callback function
/**///
/**/// Returns
/**/// return - callback function with return value from API call
function sendGet(path, callback) {
  var response  = ''
    , apiCall   = {
                    host: 'ws.audioscrobbler.com',
                    port: 80,
                    path: path
                  }
  http.get(apiCall, function(res) {
    res.on('data', function(chunk) {
      try {
        response += chunk
      } catch(err) {
        // TODO
        console.log(err)
      }
    })
    res.on('end', function() {
      try {
        var ret = JSON.parse(response)
        if (typeof(callback) == 'function')
          callback(ret)
      } catch(err) {
        // TODO
        console.log(err)
      }
    })
  }).on('error', function(err) {
    console.log(err.message)
  })
}
/**/// Private: Make MD5 hashes
/**///
/**/// Args
/**/// input - string input to hash
/**///
/**/// Returns
/**/// return - md5 hash of the input string
function makeHash(input) {
  return crypto.createHash('md5').update(input, 'utf8').digest("hex")
}

module.exports = Scribble