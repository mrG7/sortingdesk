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
      mtimers = require('sdk/timers'),
      prefs = mprefs.prefs;

  /* Own modules */
  var mmain = require('./main.js');

  /* Attributes */
  var dossierUrls_ = { },
      activeUrl_ = null,
      timerSet_ = null,
      timerUpdate_ = null;


  /* Interface */
  var get = function () {
    return {
      dossierUrl: activeUrl_,
      active: prefs.active
    }
  };

  var getDossierUrl = function () {
    return activeUrl_;
  };

  var set = function (name, value) {
    if(!(name in prefs))
      throw "Invalid preference name: " + name;

    prefs[name] = value;
  };

  var updateDossierUrls_ = function ()
  {
    var cin = prefs.dossierUrls.split(','),
        urls;

    dossierUrls_ = { };

    cin.forEach(function (i) {
      var j = i.split('@').map(function (k) { return k.trim(); } );

      if(j.length !== 2 || j.some(function (k) { return k.length === 0; } ) )
        console.error("Invalid URL entry: ", i);
      else
        dossierUrls_[j[0]] = j[1];
    } );

    urls = getDossierUrlsAsString_();
    if(urls !== prefs.dossierUrls)
      prefs.dossierUrls = urls;
  };

  var getDossierUrlsAsString_ = function ()
  {
    var urls = [ ];

    for(var k in dossierUrls_)
      urls.push([ k, '@', dossierUrls_[k] ].join(''));

    return urls.join(', ');
  };

  var timedSetDossierUrl_ = function (name, delay)
  {
    if(timerSet_ !== null)
      mtimers.clearTimeout(timerSet_);

    timerSet_ = mtimers.setTimeout(function () {
      activeUrl_ = dossierUrls_[name];
      mmain.onUrlUpdated(activeUrl_);
      timerSet_ = null;
    }, delay === undefined ? 1500 : delay);
  };

  var timedUpdate_ = function ()
  {
    if(timerUpdate_ !== null)
      mtimers.clearTimeout(timerUpdate_);

    timerUpdate_ = mtimers.setTimeout(function () {
      updateDossierUrls_();
      timerUpdate_ = null;
    }, 2500);
  };

  /* Initialisation sequence */
  mprefs.on('active',      function () { mmain.toggle(prefs.active); } );
  mprefs.on('dossierUrls', function () { timedUpdate_(); } );

  mprefs.on('urlName', function () {
    timedSetDossierUrl_(prefs.urlName);
  } );

  updateDossierUrls_();
  activeUrl_ = dossierUrls_[prefs.urlName];

  /* Public interface */
  exports.get = get;
  exports.getDossierUrl = getDossierUrl;
  exports.set = set;

} )();