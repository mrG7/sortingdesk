/**
 * @file Module responsible for the extension's preferences
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */


/*global */


var Preferences = (function () {

  /* Firefox modules */
  var mprefs = require('sdk/simple-prefs'),
      prefs = mprefs.prefs;

  /* Own modules */
  var mmain = require('./main.js');

  /* Interface */
  var valid = function () {
    prefs.dossierUrl = prefs.dossierUrl.trim();
    return prefs.dossierUrl.length > 0;
  };

  var get = function () {
    return prefs;
  };

  var set = function (name, value) {
    if(!(name in prefs))
      throw "Invalid preference name: " + name;

    prefs[name] = value;
  }


  /* Initialisation sequence
  /* --
   * Listen for changes to the `active´ attribute. */
  mprefs.on('active', function () {
    mmain.toggle(prefs.active);
  } );

  /* Public interface */
  exports.valid = valid;
  exports.get = get;
  exports.set = set;

} )();