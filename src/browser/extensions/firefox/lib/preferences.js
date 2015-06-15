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
      timerUpdate_ = null,
      ignore_ = false;


  /* Interface */
  var get = function () {
    return {
      dossierUrl: activeUrl_,
      active: prefs.active,
      translation: {
        api: prefs.translationApi,
        key: prefs.translationKey
      }
    };
  };

  var getDossierUrl = function () { return activeUrl_; };

  var set = function (name, value)
  {
    if(!(name in prefs)) throw "Invalid preference name: " + name;

    ignore_ = prefs[name] !== value;
    if(ignore_) prefs[name] = value;
  };

  var updateDossierUrls_ = function ()
  {
    var cin = prefs.dossierUrls.split(',');

    dossierUrls_ = { };

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
        dossierUrls_[j[0]] = j[1];
    } );

    set("dossierUrls", getDossierUrlsAsString_());
    activeUrl_ = dossierUrls_[prefs.urlName];
  };

  var getDossierUrlsAsString_ = function ()
  {
    var urls = [ ];

    for(var k in dossierUrls_)
      urls.push([ k, '@', dossierUrls_[k] ].join(''));

    return urls.join(', ');
  };

  var timedSetDossierUrl_ = function ()
  {
    if(ignoring_()) return;
    if(timerSet_ !== null) mtimers.clearTimeout(timerSet_);
    timerSet_ = mtimers.setTimeout(function () {
      activeUrl_ = dossierUrls_[prefs.urlName];
      mmain.onPreferencesChanged();
      timerSet_ = null;
    }, 1500);
  };

  var timedUpdate_ = function (delay)
  {
    if(ignoring_()) return;
    if(timerUpdate_ !== null) mtimers.clearTimeout(timerUpdate_);
    timerUpdate_ = mtimers.setTimeout(function () {
      updateDossierUrls_();
      mmain.onPreferencesChanged();
      timerUpdate_ = null;
    }, delay || 1500);
  };

  var ignoring_ = function ()
  {
    if(ignore_) {
      ignore_ = false;
      return true;
    }

    return false;
  };


  /* Initialisation sequence */
  mprefs.on('active', function () {
    if(!ignoring_()) mmain.onSetActive(prefs.active);
  });

  mprefs.on('dossierUrls',    function () { timedUpdate_(2000); } );
  mprefs.on('urlName',        timedSetDossierUrl_);
  mprefs.on('translationApi', function () { timedUpdate_(); } );
  mprefs.on('translationKey', function () { timedUpdate_(); } );

  updateDossierUrls_();
  activeUrl_ = dossierUrls_[prefs.urlName];

  /* Public interface */
  exports.get = get;
  exports.getDossierUrl = getDossierUrl;
  exports.set = set;

} )();