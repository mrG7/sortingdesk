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
      },
      content = {
        scripts: [ "lib/jquery-2.1.1.min.js",
                   "lib/sorting-common/sorting_common.js",
                   "src/js/content/embed.js" ],
        styles: [ "shared/src/css/theme-default.css",
                  "shared/src/css/theme-default-images.css" ]
      };


  var initialize = function ()
  {
    console.log("Initialising background script");

    handlerTabs_ = MessageHandlerTabs;
    spawn();

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

    forAllTabs(function (tab) {
      injectEmbeddableContentMaybe(tab);
    } );

    chrome.tabs.onUpdated.addListener(function (id, details, tab) {
      if(details.status === 'loading')
        injectEmbeddableContentMaybe(tab);
    } );

    console.log("Initialised background script");
  };

  var injectEmbeddableContentMaybe = function (tab)
  {
    if(/^https?:/.test(tab.url)) {
      console.log("Injecting content: %s", tab.url);
      injectEmbeddableContent(tab.id);
    } else
      console.log("Ignoring: %s", tab.url);
  };

  var injectEmbeddableContent = function (id)
  {
    content.styles.forEach(function (style) {
      chrome.tabs.insertCSS(id, { file: style } );
    } );

    var load_script = function (i) {
      if(i >= content.scripts.length)
        return;

      chrome.tabs.executeScript(
        id,
        { file: content.scripts[i] },
        function () {
          load_script(++i);
        } );
    };

    load_script(0);
  };

  var spawn = function ()
  {
    if(window_.extension !== null)
      throw "Extension window already exists";

    closeExtensionWindows();
    findSuitableWindow(function (win) {
      var size, ext;

      console.log("Spawning extension window");

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
        url: chrome.runtime.getURL("/src/html/main.html"),
        focused: false,
        type: "popup"
      }, ext.toObject() ), function (nw) {
        window_.extension = nw;
        chrome.windows.update(nw.id, ext.toObject());
      } );
    } );
  };

  var forAllWindows = function (filter, callback)
  {
    var result = null;

    chrome.windows.getAll(function (windows) {
      /* All windows: */
      windows.some(function (window) {
        if(filter(window) === true) {
          console.log(window);
          callback(window);
          return true;
        }

        return false;
      } );
    } );
  };

  var forAllTabs = function (filter, callback)
  {
    if(!std.is_fn(filter))
      throw "Invalid or no filter function specified";

    var result = chrome.windows.getAll(function (windows) {
      /* All windows: */
      return windows.some(function (window) {
        /* All tabs: */
        chrome.tabs.getAllInWindow(window.id, function (tabs) {
          /* Call callback on every tab. */
          return tabs.some(function (tab) {
            if(filter(tab) === true) {
              if(std.is_fn(callback))
                callback(tab);

              return true;
            }

            return false;
          } ) === true;
        } );
      } );
    } );

    if(result !== true && std.is_fn(callback))
      callback(null);
  };

  var closeExtensionWindows = function ()
  {
    forAllWindows(function (window) {
      if(window.type === 'popup') {
        chrome.tabs.getAllInWindow(window.id, function (tabs) {
          if(tabs.length === 1 && tabs[0].title === 'Sorting Desk')
            chrome.windows.remove(window.id);
        } );
      }
    } );
  };

  var findSuitableWindow = function (callback)
  {
    forAllWindows(function (window) {
      return window.type === 'normal';
    }, callback);
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

    var onEmbeddableActive_ = function (request, sender)
    {
      chrome.pageAction.show(sender.tab.id);
    };


    var self = this,
        methods = {
          "read-file": onReadFile_,
          "get-meta": onGetMeta_,
          "get-image-base64": onGetImageBase64_,
          "get-extension-window": onGetExtensionWindow_,
          "embeddable-active": onEmbeddableActive_
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
  initialize();

}(window, chrome, $, SortingCommon);
