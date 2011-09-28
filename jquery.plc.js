// jquery.plc - Sean Murphy (2011)

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

      'onTrackChange' : function(){},
    }, options);

    /***********************/

    this.init = function() {
      return this;
    };

    /***********************/

    this.createPlaylist = function(options) {
      $.extend(true, options, { 'manager' : this }, options);

      var playlist = new PlaylistCollection.Playlist(options);

      plc.playlists[playlist.id] = playlist;

      return playlist;
    };

    this.startPlaylist = function(options) {
      return this;
    };

    this.destroy = function() {
      return this;
    };

    /***** Helper Methods *****/

    // Returns a track URL from provided arguments.
    this.getNextTrack = function(playlistID, trackNumber) {
      var playlist = plc.playlists[playlistID];
      return (playlist.trackData[playlist.tracks[trackNumber + 1]].url || undefined);
    };

    /***** Events *****/

    // Called whenever the track changes.
    this.onTrackChange = function(playlistID, trackNumber) {
    };
  };


  /*
    Class: PlaylistCollection.Playlist
  */


  PlaylistCollection.Playlist = function(plConfig) {
    var plist = this;

    this.id = plConfig.name || Math.floor(Math.random()*100000);

    // Replace default options with user-supplied options.
    $.extend(true, this, {
      'id'   : this.id,
      'name' : 'default',

      'prefetchTime' : 2000, // msecs

      'currentTrack' : null,
      'currentPos' : 0,

      'tracks' : [],
      'trackData' : {}

    }, plConfig);

    /*************************************/

    // init() function with options and callback.
    this.init = function(options, callback) {
      // TODO Not sure if this is what you meant for an init callback for the playlist.
      if (arguments.length > 0) {
        if (typeof options === 'function') {
          var callback = options;
        }
        else if (options instanceof Object == true) {
          $.extend(true, plist, options);
        }

        if (callback !== undefined && typeof callback === 'function') {
          callback.call(plist);
        }
      }

      return plist.id;
    };

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

    /***** Audio Manipulation *****/

    // Creates an SMSound object
    this.createSound = function(options) {
      return sm.createSound(options);
    };

    // Add a song to the playlist from provided URL.
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

      sound.onposition(sound.duration - this.prefetchTime, function() {
        plist.trackData[plist.tracks[plist.currentPos + 1]].load();
      });

      this.tracks.push(sound.sID);
      this.trackData[sound.sID] = sound;

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

    this.play = function(index) {
      var index = typeof index == 'number' ? index : 0;

      if (plist.trackData[plist.tracks[index]].readyState === 2) {
        return plist.play(index + 1);
      }

      if (plist.tracks[index]) {
        plist.currentPos = index;

        plist.playSong(plist.tracks[plist.currentPos]);
      }
      else {
        // TODO Error Handling
      }

      return this;
    };

    // Plays the track in the playlist with the given index.
    this.playSong = function(id) {
      if (plist.trackData[id]) { // index >= 0 && index < plist.tracks.length) {
        sm.stopAll(); // Stops everything.

        // Set the new current track and play it.
        this.currentTrack = id;

        // Also need to maybe have a callback to set the playlist
        this.trackData[id].play();
      }
      else {
        // TODO Error Handling
      }

      return this;
    };

    // Plays the next track in the playlist.
    this.next = function() {
      this.play(plist.currentPos + 1);

      return this;
    };

    /***** Playlist Manipulation *****/

    this.remove = function(index) {
      plist.trackData[plist.tracks[index]].destruct();
      plist.tracks.splice(index, 1);
      delete plist.trackData[plist.tracks[index]];

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
