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
      active = false;


  /* Interface */
  var show_ = function (force)
  {
    if(sidebar === null)
      throw "Sidebar not yet instantiated";

    if(!active || force === true) {
      sidebar.show();
      mpreferences.set('active', active = true);
    }
  };

  var hide_ = function ()
  {
    if(sidebar === null)
      throw "Sidebar not yet instantiated";

    if(active) {
      sidebar.hide();
      mpreferences.set('active', active = false);
    }
  };

  var alertInvalidUrl_ = function ()
  {
    Services.prompt.alert(null, 'Dossier stack URL',
                          'Please select a valid dossier stack URL in Sorting '
                          + 'Desk\'s preferences page.');
  };

  var onUrlUpdated = function (url)
  {
    if(!url) {
      alertInvalidUrl_();
      if(sidebar) sidebar.hide();
    } else {
      if(mpreferences.get().active)
        constructSidebar_();
    }
  };

  var toggle = function (state)
  {
    if(state === undefined) state = !active;
    if(state === true)      show_();
    else                    hide_();
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
    var active = mtabs.activeTab,
        cs;

    if(active && mblacklist.valid(active.url)) {
      cs = minjector.get(active.id);

      if(cs) return cs;
      else   console.error("No content script attached to tab");
    } else
      console.info("No active tab or invalid URL");

    worker.port.emit('get-selection', null);
  };

  var constructSidebar_ = function (force)
  {
    if(sidebar)
      sidebar.dispose();

    sidebar = msidebar.Sidebar( {
      id: "sidebar-sorting-desk",
      title: "Sorting Desk",
      url: data.url("src/html/sidebar.html"),
      onAttach: onAttachSidebar_
    } );

    if(active || force === true)
      show_(true);
  };

  var onAttachSidebar_ = function (worker)
  {
    worker.port.on('get-preferences', function () {
      console.log("get-preferences: returning preferences");
      worker.port.emit('get-preferences', mpreferences.get());
    } );

    worker.port.on('get-selection', function () {
      console.log("get-selection: returning active tab's selection");
      var cs = getActiveTabWorker_(worker);
      if(!cs) return;

      cs.port.emit('get-selection');
      cs.port.once('get-selection', function (result) {
        if(result && result.type === 'image') {
          if(/^data:/.test(result.content)) {
            console.info("Image already in base64");
            result.data = result.content;
          } else {
            getImageData_(result.content, function (data) {
              result.data = data;
              worker.port.emit('get-selection', result);
            } );

            return;
          }
        }

        worker.port.emit('get-selection', result);
      } );
    } );

    worker.port.on('get-page-meta', function () {
      console.log("get-page-meta: returning page meta");
      var cs = getActiveTabWorker_(worker);
      if(!cs) return;

      cs.port.emit('get-page-meta');
      cs.port.once('get-page-meta', function (result) {
        worker.port.emit('get-page-meta', result);
      } );
    } );

    console.log("Attached sidebar");
  };

  /* Initialisation sequence
   * --
   * Sorting desk related */
  minjector.initialise();

  if(mpreferences.get().active) {
    if(!mpreferences.getDossierUrl())
      alertInvalidUrl_();
    else
      constructSidebar_(mpreferences.get().active);
  }

  mbuttons.ActionButton({
    id: "button-diffeo",
    label: "Activate Sorting Desk",
    icon: {
      "16": data.url("shared/media/icons/icon_16.png"),
      "32": data.url("shared/media/icons/icon_32.png"),
      "64": data.url("shared/media/icons/icon_64.png")
    },
    onClick: function (state) {
      toggle();
    }
  });

  /* Public interface */
  exports.toggle = toggle;
  exports.onUrlUpdated = onUrlUpdated;

} )();