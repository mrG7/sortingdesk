/**
 * @file Google Chrome extension employing the Sorting Desk component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */


/*global chrome, Config */
/*jshint laxbreak:true */


(function (window, chrome, $, std, undefined)
{
  /* Constants */
  var TIMEOUT_SAVE = 1000,
      DEFAULT_EXTENSION_WIDTH = 350;

  /* Attributes */
  var window_ = {
        main: null,
        extension: null
      },
      content = {
        scripts: [ "lib/jquery-2.1.1.min.js",
                   "lib/sorting-common/sorting_common.js",
                   "src/js/embed.js" ]
      };


  var initialize = function ()
  {
    console.log("Initialising background script");

    Config.load(function (options) {
      /* Spawn the extension window if active in config. */
/*       if(!options.active) */
/*         console.log("Sorting Desk not active"); */
/*       else */
/*         spawn(options); */
      console.log("NOT spawning Sorting Desk");

      /* Process removal of extension window. */
      chrome.windows.onRemoved.addListener(function (id) {
        if(window_.extension === null) return;

        if(window_.extension.id === id) {
          var m = window_.main;

          console.info("Extension window removed");
          chrome.windows.update(
            m.id,
            { state: m.state,
              top: m.top, left: m.left, height: m.height,
              width: m.width } );

          window_.main = window_.extension = null;
          return;
        }

        chrome.windows.getAll(function (wins) {
          var count = 0;

          wins.forEach(function (w) {
            if(w.type === 'normal')
              ++ count;
          } );

          if(count === 0)
            close();
        } );
      } );

      console.log("Initialised background script");
    } );

    /* Toggle extension window between open/close state on browser action
     * click. */
    chrome.browserAction.onClicked.addListener(function (tab) {
      Config.load(function (options) {
        options.active = window_.extension === null;
        Config.save(options);
      } );
    } );
  };

  var close = function ()
  {
    if(window_.extension !== null) {
      chrome.windows.remove(window_.extension.id);
      window_.extension = null;
    }
  };

  var injectEmbeddableContentMaybe = function (tab)
  {
    if(/^https?:\/\/.+/.test(tab.url)) {
      console.log("Injecting content: %s", tab.url);
      injectEmbeddableContent(tab.id);
    } else
      console.log("Ignoring: %s", tab.url);
  };

  var injectEmbeddableContent = function (id)
  {
    var load_script = function (i) {
      if(i >= content.scripts.length)
        return;

      chrome.tabs.executeScript( id, { file: content.scripts[i] },
        function () {
          load_script(++i);
        } );
    };

    load_script(0);
  };

  var spawn = function (options)
  {
    if(window_.extension !== null)
      throw "Extension window already exists";

    if(options === undefined) {
      Config.load(function (options) {
        /* Prevent potentially entering an endless loop. */
        if(options === undefined)
          throw "Failed to load config";

        spawn(options);
      } );

      return;
    } else if(!std.is_obj(options))
      throw "Options container not an object";

    if(!Config.isValidUrl(options)) {
      console.error("Active URL not selected or invalid");
      return;
    }

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
        url: chrome.runtime.getURL("/src/html/sidebar.html"),
        focused: false,
        type: "popup"
      }, ext.toObject() ), function (nw) {
        window_.extension = nw;
        chrome.windows.update(nw.id, ext.toObject());
      } );
    } );

    /* Inject embeddable content in all existing tabs. */
    forAllTabs(function (tab) {
      injectEmbeddableContentMaybe(tab);
    } );
  };

  var forAllWindows = function (filter, cb)
  {
    var result = null;

    chrome.windows.getAll(function (windows) {
      /* All windows: */
      windows.some(function (window) {
        if(filter(window) === true) {
          cb(window);
          return true;
        }

        return false;
      } );
    } );
  };

  var forAllTabs = function (filter, cb)
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
              if(std.is_fn(cb))
                cb(tab);

              return true;
            }

            return false;
          } ) === true;
        } );
      } );
    } );

    if(result !== true && std.is_fn(cb))
      cb(null);
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

  var findSuitableWindow = function (cb)
  {
    forAllWindows(function (window) {
      return window.type === 'normal';
    }, cb);
  };


  /**
   * @class
   * */
  var receiver = (function () {

    /* Attributes */
    var methods = { };


    /* Message handlers */
    methods.readFile = function (req, sen, cb)
    {
      $.ajax( {
        url: chrome.extension.getURL(req.identifier),
        dataType: "html",
        success: function () {
          console.log("Successfully read file: " + req.identifier);
          cb.apply(null, arguments);
        }
      } );

      return true;
    };

    methods.getMeta = function (req, sen, cb)
    {
      if(!std.is_fn(cb)) return;

      Config.load(function (options) {
        options.activeUrl = Config.getUrlByIdFromString(
          options.activeUrl, options.dossierUrls
        );

        cb( {
          config: options,
          tab: sen.tab
        } );
      } );

      return true;
    };

    methods.getExtensionWindow = function (req, sen, cb)
    {
      if(!std.is_fn(cb)) return;
      cb(window_.extension);
    };

    methods.embeddableActive = function (req, sen)
    {
      if(!sen.tab || !sen.tab.hasOwnProperty('id')) return;

      chrome.browserAction.setIcon( {
        path: chrome.extension.getURL("shared/media/icons/icon_active_38.png"),
        tabId: sen.tab.id } );

      chrome.browserAction.setTitle( {
        title: "Sorting Desk is active on this page",
        tabId: sen.tab.id } );
    };

    methods.configSaved = function ()
    {
      Config.load(function (options) {
        if(!options.active)                 close();
        else if(window_.extension === null) spawn();
      } );
    };


    /* Message handling logic. */
    chrome.runtime.onMessage.addListener(function (req, sen, cb) {
      var method = req.operation
            .split('-')
            .map(function (m, i) {
              if(i === 0) return m;
              return m.charAt(0).toUpperCase() + m.slice(1);
            } )
            .join('');

      if(!methods.hasOwnProperty(method)) {
        console.error("Unknown request received:", req);
        return false;
      }

      console.log("Invoking message handler [" + req.operation + "]");
      return methods[method](req, sen, cb) === true;
    } );

  })();


  /**
   * @class
   * */
  var tabs = (function () {
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

} ) (
  this,
  this.chrome,
  this.$,
  this.SortingCommon
);
