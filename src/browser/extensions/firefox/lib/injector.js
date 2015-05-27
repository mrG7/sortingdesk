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
                  "lib/html2canvas-0.4.1.js",
                  "shared/src/js/drag_drop_monitor.js",
                  "lib/sorting-common/sorting_common.js",
                  "src/js/embed.js" ];


  /* Interface */
  var get = function (id) {
    return map[id];
  };

  var attach_ = function (tab) {
    var w = map[tab.id] = tab.attach( { contentScriptFile: scripts } );
    w.port.emit('initialise');
    console.log("embedded content script to tab: ", tab.id);
  };

  /* Initialisation sequence */
  var initialise = function () {
    if(initialised)
      throw "Injector module already initialised";

    scripts = scripts.map(function (s) {
      return data.url(s);
    } );

    mtabs.on('ready', function (tab) {
      attach_(tab);
    } );

    mtabs.on('close', function (tab) {
      console.log("closing tab: ", tab.id);
      if(!(tab.id in map))
        console.error("Content script NOT attached: ", tab.id);
      else
        delete map[tab.id];
    } );

    /* Attach content scripts to all tabs at startup. */
    for(let tab of mtabs)
      attach_(tab);

    console.log("Injector module initialised");
  };

  /* Public interface */
  exports.initialise = initialise;
  exports.get = get;

} )();
