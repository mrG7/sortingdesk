/**
 * @file Module responsible for validating tabs' URLs
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */


/*global */


var Blacklist = (function () {
  var blacklist = [ "^about:", "^chrome:", "^http://localhost:?" ];

  /* Interface */
  var blacklisted = function (url) {
    if(typeof url !== 'string')
      throw "Invalid or no URL specified";

    return blacklist.some(function (i) {
      return (new RegExp(i)).test(url) !== false;
    } );
  };

  var valid = function (url) {
    return !blacklisted(url) && /^https?:\/\//.test(url);
  };

  /* Public interface */
  exports.blacklisted = blacklisted;
  exports.valid = valid;

} )();