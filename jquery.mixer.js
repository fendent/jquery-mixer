// jquery.plc.js - Sean Murphy (2011)

(function($, sm) {

  /*
    Class: PlaylistCollection
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

      var playlist = new PCPlaylist(options);

      plc.playlists[playlist.id] = playlist;

      // Start playing if automatic playlist
      if (playlist.auto === true) {
        playlist.play();
      }

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
    Class: PCPlaylist
  */


  var PCPlaylist = function(plConfig) {
    var plist = this;

    this.id = plConfig.name || Math.floor(Math.random()*100000);

    // Replace default options with user-supplied options.
    $.extend(true, this, {
      'id'   : this.id,
      'name' : 'default',

      'auto' : false,

      'prefetchTime' : 30000, // in milliseconds (default: 30s)

      'currentTrack' : null,
      'trackBuffer'  : [],

      'currentPosition' : 0,

      'tracks'    : [],

      'getNextTrack' : this.getNextTrack,
    }, plConfig);

    /*************************************/

    /***** Callbacks *****/

    this.onTrackChange = function() { };

    this.onSongLoad = function() { };

    this.onDestruct = function() { };

    this.onPlay = function() { };

    this.onPause = function() { };

    this.onFinish = function() {
      plist.onTrackChange();
      plist.next(); 
    };

    this.getNextTrack = function() {
      return null;
    };

    /***** Audio Manipulation *****/

    // Creates an SMSound object
    this.createSound = function(options) {
      return sm.createSound(options);
    };

    // Add a song to a playlist from the provided URL.
    this.addSong = function(url) {
      var sound = this.createSound({
        'id'  : url,
        'url' : url,

        'autoLoad' : false,

        'onplay'   : plist.onPlay,
        'onpause'  : plist.onPause,
        'onload'   : plist.onSongLoad,
        'onfinish' : plist.onFinish,
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
      if (plist.auto === true) {
        plist.addAutoSong();
      }
      else {
        sm.getSoundById(plist.tracks[plist.currentPosition + 1]).load();
      }
    };

    this.addAutoSong = function() {
      var url = this.getNextTrack();

      if (url === null) {
        return null;
      }

      var sound = this.createSound({
        'id'  : url,
        'url' : url,

        'autoLoad' : true,

        'onpause' : plist.onPause,

        'onplay' : function() {
          plist.currentTrack = this.sID;

          var prefetch = this.duration - plist.prefetchTime;
          this.onposition(prefetch = prefetch < 0 ? 0 : prefetch, plist.fetchNextTrack);
        },

        'onload' : function() {
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

      if (sound.readyState === 3) {
        return plist.addAutoSong();
      }

      return sound;
    };

    this.play = function(index) {
      if (plist.auto === true) {
        plist.addAutoSong();
      }
      else {
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
      if (plist.auto === true) {
        plist.fetchNextTrack();
        plist.addAutoSong();
      }
      else {
        this.play(plist.currentPosition + 1);
      }

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

    /***** Helper Methods *****/

  };

  /*******************************/

  // Place the class into soundManager
  sm.PlaylistCollection = function(options) {
    return new PlaylistCollection(options);
  };

})(jQuery, soundManager);
