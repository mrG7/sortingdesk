/**
 * @file Google Chrome extension employing the Sorting Desk component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */


/*global chrome, Config */
/*jshint laxbreak:true */


var Background = function (window, chrome, $, std, undefined)
{
  /* Constants */
  var TIMEOUT_SAVE = 1000,
      DEFAULT_EXTENSION_WIDTH = 350;

  /* Attributes */
  var handlerTabs_ = null,
      window_ = {
        main: null,
        extension: null
      };


  var initialize_ = function ()
  {
    handlerTabs_ = MessageHandlerTabs;
    spawn_();

    chrome.windows.onRemoved.addListener(function (id) {
      if(window_.extension !== null && window_.extension.id === id) {
        var m = window_.main;

        console.info("Extension window removed");
        chrome.windows.update(
          m.id,
          { state: m.state,
            top: m.top, left: m.left, height: m.height,
            width: m.width } );

        window_.main = window_.extension = null;
      }
    } );

    chrome.browserAction.onClicked.addListener(function () {
      if(window_.extension === null)
        spawn_();
    } );
  };

  var spawn_ = function ()
  {
    if(window_.extension !== null)
      throw "Extension window already exists";

    console.log("Spawning extension window");

    chrome.windows.getCurrent(function (current) {
      chrome.windows.getLastFocused(function (win) {
        var size, ext;

        window_.main = $.extend(true, { }, win);
        size = new std.PositionSize(win);

        if(size.width > DEFAULT_EXTENSION_WIDTH * 2) {
          size.width -= DEFAULT_EXTENSION_WIDTH;

          win.focused = true;
          chrome.windows.update(win.id, $.extend( {state: "normal" },
                                                  size.toObject()));
        }

        ext = new std.PositionSize(size.right, size.top,
                                   DEFAULT_EXTENSION_WIDTH, size.height - 30);

        console.info("Creating Sorting Desk's window:", ext.toObject());
        chrome.windows.create( $.extend( {
          url: chrome.runtime.getURL("/html/main.html"),
          focused: false,
          type: "popup"
        }, ext.toObject() ), function (nw) {
          window_.extension = nw;
          chrome.windows.update(nw.id, ext.toObject());
        } );
      } );
    } );
  };


  /**
   * @class
   * */
  var MessageHandler = (function () {

    var onReadFile_ = function (request, sender, callback)
    {
      $.ajax( {
        url: chrome.extension.getURL(request.identifier),
        dataType: "html",
        success: function () {
          console.log("Successfully read file: " + request.identifier);
          callback.apply(null, arguments);
        }
      } );
    };

    var onGetMeta_ = function (request, sender, callback)
    {
      if(!std.is_fn(callback)) return;

      Config.load(function (options) {
        callback( {
          config: options,
          tab: sender.tab
        } );
      } );
    };

    var onGetImageBase64_ = function (request, sender, callback)
    {
      if(!request.hasOwnProperty('entity'))
        throw "`entity´ attribute missing in request";
      else if(std.is_fn(callback)) {
        std.Html.imageToBase64(request.entity)
          .done(function (data) { callback(data); } )
          .fail(function ()     { callback(false); } );
      }
    };

    var onGetExtensionWindow_ = function (request, sender, callback)
    {
      if(!std.is_fn(callback)) return;
      callback(window_.extension);
    };


    var self = this,
        methods = {
          "read-file": onReadFile_,
          "get-meta": onGetMeta_,
          "get-image-base64": onGetImageBase64_,
          "get-extension-window": onGetExtensionWindow_
        };

    /* Handler of messages originating in content scripts. */
    chrome.runtime.onMessage.addListener(
      function (request, sender, callback) {
        if(methods.hasOwnProperty(request.operation)) {
          console.log("Invoking message handler [type="
                      + request.operation + "]");

          methods[request.operation].call(self, request, sender, callback);
        } else
          console.error("Invalid request received:", request);

        return true;
      }
    );


    /* Public interface */
    return { };
  })();


  /**
   * @class
   * */
  var MessageHandlerTabs = (function () {
    return {
      broadcast: function (data, excludeTabId)
      {
        /* Send `data´ to every tab in every window. */
        chrome.windows.getAll(function (windows) {
          /* All windows: */
          windows.forEach(function (window) {
            /* All tabs: */
            chrome.tabs.getAllInWindow(window.id, function (tabs) {
              tabs.forEach(function (tab) {
                /* This particular tab iteration: */
                if(!excludeTabId || tab.id !== excludeTabId)
                  chrome.tabs.sendMessage(tab.id, data);
              } );
            } );
          } );
        } );
      }
    };
  }) ();


  /* Initialise instance. */
  initialize_();

}(window, chrome, $, SortingCommon);
