/**
 * @file Module responsible for the extension's configuration state.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */


/*global chrome, $ */


var Config = (function (window, chrome, $, std, undefined) {

  var defaults_ = {
    dossierUrls: [ 'memex@https://memexproxy.com/sortingdesk',
                   'dev@http://54.174.195.250:8080',
                   'local@http://localhost:8080' ].join(', '),
    activeUrl: 'memex',
    translation: {
      api: 'google',
      key: null
    },
    active: true,
    startPosition: 0
  };

  var stringToUrls = function (str)
  {
    if(!std.is_str(str))
      throw "Invalid or no string containing URLs specified";

    var urls = { },
        cin = str.split(',');

    cin.forEach(function (i) {
      var j = i.indexOf('@');

      if(j <= 0) {
        console.error("URL identifier not specified: ", i);
        return;
      }

      j = [ i.slice(0, j), i.slice(j + 1) ]
        .map(function (i) { return i.trim(); });

      if(j.some(function (k) { return k.length === 0; } ))
        console.error("Invalid URL entry: ", i);
      else if(!/^[a-zA-Z0-9_-]+$/.test(j[0]))
        console.error("Invalid URL identifier: ", j[0]);
      else
        urls[j[0]] = j[1];
    } );

    return urls;
  };

  var urlsToString = function (obj)
  {
    if(!std.is_obj(obj))
      throw "Invalid or no URL map specified";

    var urls = [ ];

    for(var k in obj)
      urls.push([ k, '@', obj[k] ].join(''));

    return urls.join(', ');
  };

  var getUrlByIdFromString = function (id, str)
  {
    if(!std.is_str(id))
      throw "Invalid or no string URL id specified";

    return stringToUrls(str)[id] || null;
  };

  var isValidUrl = function (options)
  {
    if(!std.is_obj(options))
      throw "Invalid or no options map specified";

    return std.is_str(options.activeUrl)
      && getUrlByIdFromString(options.activeUrl, options.dossierUrls)
      || false;
  };

  var load = function (callback)
  {
    chrome.storage.local.get('config', function (state) {
      console.info("Configuration loaded");

      /* If a configuration state has not been found, save an initial default
       * one. */
      var exists = state.hasOwnProperty("config");
      state.config = $.extend(true, { },
                              $.extend(true, { }, defaults_),
                              state.config || { });

      if(!exists)  save(state.config);
      if(callback) callback(state.config);
    } );
  };

  var save = function (options, callback)
  {
    /* Ensure options have default values when none provided by user. */
    if(!options.dossierUrls)
      options.dossierUrls = defaults_.dossierUrls;

    chrome.storage.local.set( { "config": options }, function () {
      console.log("Configuration saved");

      if(std.is_fn(callback)) callback();

      /* Instruct background to reload extension window. */
      chrome.runtime.sendMessage( { operation: "config-saved" } );
    } );
  };


  /* Return public interface. */
  return {
    load: load,
    save: save,
    stringToUrls: stringToUrls,
    urlsToString: urlsToString,
    getUrlByIdFromString: getUrlByIdFromString,
    isValidUrl: isValidUrl
  };
})(window, chrome, jQuery, SortingCommon);
