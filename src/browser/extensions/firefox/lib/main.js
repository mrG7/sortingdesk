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
      data = require("sdk/self").data;

  /* Own modules */
  var minjector = require('./injector.js'),
      mblacklist = require('./blacklist.js'),
      mpreferences = require('./preferences.js');

  /* Module attributes */
  var sidebar = null,
      active = false;


  /* Interface */
  var show = function ()
  {
    if(sidebar === null)
      throw "Sidebar not yet instantiated";

    if(!active) {
      sidebar.show();
      mpreferences.set('active', active = true);
    }
  };

  var hide = function ()
  {
    if(sidebar === null)
      throw "Sidebar not yet instantiated";

    if(active) {
      sidebar.hide();
      mpreferences.set('active', active = false);
    }
  };

  var toggle = function (state)
  {
    if(state === undefined) state = !active;
    if(state === true)      show();
    else                    hide();
  };

  var getBlob = function(url, callback)
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

  var getImageData = function (url, callback)
  {
    getBlob(url, data => {
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


  /* Initialisation sequence
   * -- */
  /* Firefox */
  Cu.import('resource://gre/modules/Services.jsm');

  /* Sorting desk related */
  minjector.initialise();

  sidebar = msidebar.Sidebar( {
    id: "sidebar-sorting-desk",
    title: "Sorting Desk",
    url: data.url("src/html/sidebar.html"),
    onAttach: function (w) {
      w.port.on('get-preferences', function () {
        console.log("get-preferences: returning preferences");
        w.port.emit('get-preferences', mpreferences.get());
      } );

      w.port.on('get-selection', function () {
        console.log("get-selection: returning active tab's selection");
        var active = mtabs.activeTab;

        if(active && mblacklist.valid(active.url)) {
          var cs = minjector.get(active.id);

          if(cs) {
            cs.port.emit('get-selection');
            cs.port.once('get-selection', function (result) {
              console.log("received selection result: ", result);

              if(result.type === 'image') {
                if(/^data:/.test(result.content)) {
                  console.info("Image already in base64");
                  result.data = result.content;
                } else {
                  getImageData(result.content, function (data) {
                    result.data = data;
                    w.port.emit('get-selection', result);
                  } );

                  return;
                }
              }

              w.port.emit('get-selection', result);
            } );
          } else
            console.error("No content script attached to tab");
        } else
          console.info("No active tab or invalid URL");
      } );

      console.log("Attached sidebar");
    }
  } );

  if(mpreferences.get().active)
    show();

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

} )();