/*
 * jQuery Mixer - A Playlist Manager for SoundManager
 *
 * http://github.com/fendent/jquery-mixer
 *
 * Copyright (c) 2011 by Sean Murphy
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

(function($, sm) {

  /*
   * Class: PlaylistCollection
   *
   */

  PlaylistCollection = function(options) {
    var plc = this;

    $.extend(true, this, {
      'playlists' : {},
      'currentPlaylist' : null,
      'currentTrack' : null,

      'onTrackChange' : this.onTrackChange,
    }, options);

    /***********************/

    this.init = function() {
      return this;
    };

    /***********************/

    this.createPlaylist = function(options) {
      $.extend(true, options, { 'manager' : this }, options);

      if (options.auto === true) {
        var playlist = new PCAPlaylist(options).play();
      }
      else {
        var playlist = new PCPlaylist(options);
      }

      plc.playlists[playlist.id] = playlist;

      return playlist;
    };

    this.startPlaylist = function(options) {
      return this;
    };

    this.destroy = function() {
      return this;
    };

    /***** Events *****/

    // Called whenever the track changes.
    this.onTrackChange = function(playlistID, trackNumber) { };
  };


  /*
   * Class: PCPlaylist
   *
   */

  var PCPlaylist = function(plConfig) {
    var plist = this;

    this.id = (plConfig.name && plConfig.name !== null ? plConfig.name : Math.floor(Math.random()*100000));

    // Replace default options with user-supplied options.
    $.extend(true, this, {
      'id'   : this.id,
      'name' : 'default',

      'prefetchTime' : 30000, // in milliseconds (default: 30s)

      'currentPosition' : 0,
      'currentTrack' : null,

      'tracks'    : [],

      'onPlay'     : function(){},
      'onPause'    : function(){},
      'onSongLoad' : function(){},
      'onFinish'   : function(){},
      'onDestruct' : function(){}
    }, plConfig);

    /*************************************/

    /***** Callbacks *****/

    this.onTrackChange = function() {
      plist.onFinish();
      plist.next(); 
    };

    /***** Audio Manipulation *****/

    // Add a song to a playlist from the provided URL.
    this.addSong = function(url) {
      if (url === null) {
        return null;
      }

      var sound = sm.createSound({
        'id'  : url,
        'url' : url,

        'autoLoad' : false,

        'onplay'   : plist.onPlay,
        'onpause'  : plist.onPause,
        'onload'   : plist.onSongLoad,
        'onfinish' : plist.onTrackChange,
      });

      sound.onposition(sound.duration - this.prefetchTime, this.fetchNextTrack);

      this.tracks.push(sound.sID);

      return this;
    },

    this.addSongList = function(urlList) {
      if (urlList instanceof Array === true) {
        $.each(urlList, function(i, url) {
          plist.addSong(url);
        });
      }
      else {
        // TODO Error Handling
      }
    };


    /***** Playlist Controls *****/

    this.fetchNextTrack = function() {
      sm.getSoundById(plist.tracks[plist.currentPosition + 1]).load();

      return this;
    };

    this.play = function(index) {
      var index = typeof index == 'number' ? index : 0;

      if (plist.tracks[index]) {
        if (sm.getSoundById(plist.tracks[index]).readyState === 2) {
          return plist.play(index + 1);
        }

        plist.currentPosition = index;

        plist.playSong(plist.tracks[plist.currentPosition]);
      }
      else {
        // TODO Error Handling
      }

      return this;
    };

    // Plays the track in the playlist with the given index.
    this.playSong = function(id) {
      var sound = sm.getSoundById(id);

      if (sound !== null) {
        sm.stopAll(); // Stops everything.

        // Also need to maybe have a callback to set the playlist
        sound.play();
      }
      else {
        // TODO Error Handling
      }

      return this;
    };

    // Plays the next track in the playlist.
    this.next = function() {
      this.play(plist.currentPosition + 1);

      return this;
    };

    /***** Playlist Manipulation *****/

    this.remove = function(index) {
      sm.getSoundById(plist.tracks[index]).destruct();
      plist.tracks.splice(index, 1);

      return this;
    };

    // Removes all the tracks from the playlist.
    this.destruct = function() {
      if (this.onDestruct()) {
        while (plist.tracks.length > 0) {
          plist.remove(plist.tracks.length - 1);
        }
      }

      this.onDestruct();

      return this;
    };

  };

  /*
   * Class: PCAPlaylist
   *
   */

  var PCAPlaylist = function(plConfig) {
    var plist = this;

    this.id = (plConfig.name && plConfig.name !== null ? plConfig.name : Math.floor(Math.random()*100000));

    // Replace default options with user-supplied options.
    $.extend(true, this, {
      'id'   : this.id,
      'name' : 'default',

      'prefetchTime' : 30000, // in milliseconds (default: 30s)

      'currentTrack' : null,
      'trackBuffer'  : [],

      'getNextTrack' : function() { }
    }, plConfig);

    // Run the user-supplied callback to get the next track.
    this.fetchNextTrack = function() {
      plist.getNextTrack(plist.currentTrack, plist.id);

      return this;
    };

    this.next = this.fetchNextTrack;
    this.play = this.fetchNextTrack;

    this.addSong = function(url) {
      if (url === null) {
        return null;
      }

      var sound = sm.createSound({
        'id'  : url,
        'url' : url,

        'autoLoad' : true,

        'onpause' : plist.onPause,

        'onplay' : function() {
          plist.currentTrack = this.sID;

          var prefetch = this.duration - plist.prefetchTime;
          this.onposition(prefetch = prefetch < 0 ? 0 : prefetch, plist.fetchNextTrack);
        },

        'onload' : function(success) {
          if (success === false) {
            return plist.getNextTrack(plist.currentTrack, plist.id);
          }

          plist.trackBuffer.push(this.sID);

          if (plist.currentTrack === null) {
            plist.playSong(plist.trackBuffer.shift());
          }
        },

        'onfinish' : function() {
          plist.currentTrack = null;

          if (plist.trackBuffer.length > 0) {
            plist.playSong(plist.trackBuffer.shift());
          }

          this.destruct();
        }
      });

      // In case we have a consecutive duplicate and/or error, get a new URL.
      if (sound.readyState === 3 || sound.readyState === 2) {
        return plist.getNextTrack(plist.currentTrack, plist.id);
      }

      return sound;
    };

    // Plays the track in the playlist with the given index.
    this.playSong = function(id) {
      var sound = sm.getSoundById(id);

      if (sound !== null) {
        sm.stopAll(); // Stops everything.

        // Also need to maybe have a callback to set the playlist
        sound.play();
      }
      else {
        // TODO Error Handling
      }

      return this;
    };

  };

  /*******************************/

  // Place the class into soundManager
  sm.PlaylistCollection = function(options) {
    return new PlaylistCollection(options);
  };

})(jQuery, soundManager);
