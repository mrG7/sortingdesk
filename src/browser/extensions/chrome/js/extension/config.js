/**
 * @file Module responsible for the extension's configuration state.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */


/*global chrome, $ */


var Config = (function (window, $, std, undefined) {
  var defaults_ = {
    dossierUrl: 'http://54.174.195.250:8080',
    active: true,
    activateHttps: false
  };


  var load = function (callback) {
    chrome.storage.local.get('config', function (state) {
      console.info("Configuration loaded");

      /* If a configuration state has not been found, save an initial default
       * one. */
      if(!state.hasOwnProperty("config")) {
        state = $.extend(true, { }, defaults_);
        save(state);
      } else
        state = state.config;

      if(callback)
        callback(state);
    } );
  };

  var save = function (options, callback) {
    /* Ensure options have default values when none provided by user. */
    if(!options.dossierUrl)
      options.dossierUrl = defaults_.dossierUrl;

    chrome.storage.local.set( { "config": options }, function () {
      console.log("Configuration saved");

      if(std.if_fn(callback))
        callback();
    } );
  };


  /* Return public interface. */
  return {
    load: load,
    save: save
  };
})(window, jQuery, SortingCommon);

