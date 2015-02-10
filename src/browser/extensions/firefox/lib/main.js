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
  var mbuttons = require('sdk/ui/button/action'),
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
    if(state === true)  show();
    else                hide();
  };


  /* Initialisation sequence */
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
            cs.port.once('get-selection', function (result) {
              console.log("received selection result: ", result);
              w.port.emit('get-selection', result);
            } );

            console.log("sending message");
            cs.port.emit('get-selection');
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

  console.log("Initialised Sorting Desk addon");


  /* Public interface */
  exports.toggle = toggle;

} )();