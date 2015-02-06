/**
 * @file Module responsible for injecting the extension's content script.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */


var Injector = (function () {

  var mtabs = require('sdk/tabs'),
      data = require('sdk/self').data;

  var initialised = false,
      map = { },
      scripts = [ "lib/jquery-2.1.1.min.js",
                  "lib/sorting-common/sorting_common.js",
                  "src/js/embed.js" ];


  /* Interface */
  var get = function (id) {
    return map[id];
  };


  /* Initialisation sequence */
  var initialise = function () {
    if(initialised)
      throw "Injector module already initialised";

    scripts = scripts.map(function (s) {
      return data.url(s);
    } );

    mtabs.on('open', function (tab) {
      if(tab.id in map)
        console.error("Content script already attached: %d", tab.id);
      else
        map[tab.id] = tab.attach( { contentScriptFile: scripts } );
    } );

    mtabs.on('close', function (tab) {
      if(!(tab.id in map))
        console.error("Content script NOT attached: %d", tab.id);
      else
        delete map[tab.id];
    } );

    console.log("Injector module initialised");
  };

  /* Public interface */
  exports.initialise = initialise;
  exports.get = get;

} )();
