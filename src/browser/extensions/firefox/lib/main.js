/**
 * @file Main module.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */


var Main = (function (undefined) {

  console.log(new Array(70).join('='));
  console.log("Initialising Sorting Desk addon");

  /* Firefox modules */
  var {Cu, Cc, Ci} = require("chrome"),
      mbuttons = require('sdk/ui/button/action'),
      mtabs = require("sdk/tabs"),
      msidebar = require("sdk/ui/sidebar"),
      mtimers = require("sdk/timers"),
      data = require("sdk/self").data;

  Cu.import('resource://gre/modules/Services.jsm');

  /* Own modules */
  var minjector = require('./injector.js'),
      mblacklist = require('./blacklist.js'),
      mpreferences = require('./preferences.js');

  /* Module attributes */
  var sidebar = null,
      visible = false;


  /* Interface */
  var construct_ = function (force)
  {
    if(!mpreferences.getDossierUrl()) {
      Services.prompt.alert(null, 'Dossier stack URL',
                            'Please select a valid dossier stack URL in '
                            + 'Sorting Desk\'s preferences page.');
      destroy_();
      return;
    }

    if(sidebar) sidebar.dispose();
    sidebar = msidebar.Sidebar( {
      id: "sidebar-sorting-desk",
      title: "Sorting Desk",
      url: data.url("src/html/sidebar.html"),
      onAttach: onAttachSidebar_
    } );

    if(visible || force === true) show_(true);
    mpreferences.set("active", true);
  };

  var destroy_ = function ()
  {
    if(sidebar) {
      sidebar.dispose();
      sidebar = null;
    }

    mpreferences.set("active", false);
  };

  var show_ = function (force)
  {
    if(sidebar === null) throw "Sidebar not yet instantiated";
    if(!visible || force === true) {
      sidebar.show();
      visible = true;
    }
  };

  var hide_ = function ()
  {
    if(sidebar === null) throw "Sidebar not yet instantiated";
    if(visible) {
      sidebar.hide();
      visible = false;
    }
  };

  var toggle = function (state)
  {
    if(state === undefined) state = !visible;
    if(state === true)      show_();
    else                    hide_();
  };

  var onSetActive = function (state)
  {
    if(state === true)  construct_();
    else                destroy_();
  };

  var onPreferencesChanged = function ()
  {
    if(mpreferences.get().active) construct_();
  };

  var getBlob_ = function(url, callback)
  {
    let xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
          .createInstance(Ci.nsIXMLHttpRequest);

    let handler = ev => {
      evfn(m => xhr.removeEventListener(m, handler, !1));
      switch (ev.type) {
      case 'load':
        if (xhr.status == 200) {
          callback(xhr.response);
          break;
        }
      default:
        console.error('Error fetching image: '
                      + xhr.statusText
                      + ' [' + ev.type + ':' + xhr.status + ']');

        break;
      }
    };

    let evfn = fn => ['load', 'error', 'abort'].forEach(fn);
    evfn(m => xhr.addEventListener(m, handler, false));

    xhr.mozBackgroundRequest = true;
    xhr.open('GET', url, true);
    xhr.channel.loadFlags |= Ci.nsIRequest.LOAD_FROM_CACHE
      | Ci.nsIRequest.VALIDATE_NEVER;
    /* The following load flag disabled because it *might* prevent the image
     * from being loaded if the server is employing some sort of hotlinking
     * countermeasure. */
    /*| Ci.nsIRequest.LOAD_ANONYMOUS; */

    xhr.responseType = "blob";
    xhr.send(null);
  };

  var getImageData_ = function (url, callback)
  {
    getBlob_(url, data => {
      /* Don't attempt to convert blob to base64 if one wasn't retrieved. */
      if(!data) {
        callback(null);
        return;
      }

      var reader = Cc["@mozilla.org/files/filereader;1"]
            .createInstance(Ci.nsIDOMFileReader);

      reader.onload = function() {
/*         console.log('Base64 image data:', reader.result); */
        callback(reader.result);
      };

      reader.onerror = function () {
        console.error('Failed to convert blob to image data: ', url);
        callback(null);
      };

      /* Convert bloc to base64 now. */
      reader.readAsDataURL(data);
    } );
  };

  var getActiveTabWorker_ = function (worker)
  {
    var tab = mtabs.activeTab,
        cs;

    if(tab && mblacklist.valid(tab.url)) {
      cs = minjector.get(tab.id);

      if(cs) return cs;
      else   console.error("No content script attached to tab");
    } else
      console.info("No active tab or invalid URL");

    worker.port.emit('get-selection', null);
  };

  var onAttachSidebar_ = function (worker)
  {
    var setup_handler_ = function (id, description, cb) {
      worker.port.on(id, function () {
        console.log(id + ": " + description);
        var cs = getActiveTabWorker_(worker);
        if(!cs) worker.port.emit(id, null);

        cs.port.emit(id);
        cs.port.once(id, function (result) {
          if(typeof cb === 'function') {
            result = cb(result);
            if(result === false) return;
          }

          worker.port.emit(id, result);
        } );
      } );
    };

    worker.port.on('get-preferences', function () {
      console.log("get-preferences: returning preferences");
      worker.port.emit('get-preferences', mpreferences.get());
    } );

    setup_handler_(
      'get-selection', "returning active tab's selection",
      function (result) {
        if(result && result.type === 'image') {
          if(/^data:/.test(result.content)) {
            console.info("Image already in base64");
            result.data = result.content;
          } else {
            getImageData_(result.content, function (data) {
              result.data = data;
              worker.port.emit('get-selection', result);
            } );

            /* DO NOT emit response: we'll take care of that. */
            return false;
          }
        }

        return result;
      }
    );

    setup_handler_('check-selection', 'testing selected content');
    setup_handler_('get-page-meta', 'returning page meta');
    setup_handler_('capture-page', 'capturing page as image');

    console.log("Attached sidebar");
  };

  /* Initialisation sequence
   * --
   * Sorting desk related */
  minjector.initialise();
  if(mpreferences.get().active) construct_(false);

  mbuttons.ActionButton({
    id: "button-diffeo",
    label: "Toggle visibility of Sorting Desk extension sidebar",
    icon: {
      "16": data.url("shared/media/icons/icon_16.png"),
      "32": data.url("shared/media/icons/icon_32.png"),
      "64": data.url("shared/media/icons/icon_64.png")
    },
    onClick: function (state) {
      if(!mpreferences.get().active && !sidebar) {
        Services.prompt.alert(null, 'Sorting Desk inactive',
                              'Sorting Desk is currently inactive.  Please'
                              + ' activate it in the preferences page by'
                              + ' checking the "active" setting.');
        return;
      }

      toggle();
    }
  });

  /* Public interface */
  exports.onSetActive = onSetActive;
  exports.onPrePreferencesChanged = hide_;
  exports.onPreferencesChanged = onPreferencesChanged;

} )();