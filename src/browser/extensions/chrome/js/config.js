/**
 * @file Module responsible for the extension's configuration state.
 * @copyright 2014 Diffeo
 *
 * @author Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 */


/*global chrome, $ */


Config = (function () {
  var defaults_ = {
    active: true
  };

  var state_ = null;

  
  var load = function (callback) {
    chrome.storage.local.get('config', function (options) {
      console.log("Configuration loaded");

      /* If a configuration state has not been found, save an initial default
       * one. */
      if(!options.hasOwnProperty("active")) {
        state_ = $.extend(true, { }, defaults_);
        save(state_);
      } else
        state_ = options;

      if(callback)
        callback(state_);
    });
  };

  var save = function (options, callback) {
    chrome.storage.local.set( { "config": options }, function () {
      console.log("Configuration saved");
      
      state_ = $.extend(true, { }, options);

      if(callback)
        callback();
    });
  };

  var get = function () {
    return state_;
  };


  /* Return public interface. */
  return {
    load: load,
    save: save,
    get: get
  };
})();

