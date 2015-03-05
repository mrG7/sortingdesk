/**
 * @file Sorting Desk extension user interface.
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingCommon´, `SortingQueue´ and `SortingDesk´ components.
 *
 */


/*jshint laxbreak:true */

var Main = (function (window, chrome, $, std, sq, sqc, sd, Api, undefined) {

  /* Module-wide variables */
  var nodes = { },
      active = null,
      loading,
      sorter;


  /**
   * @class
   * */
  var LoadingStatus = function (node)
  {
    this.node_ = node;
    this.count_ = 0;
  };

  LoadingStatus.prototype = {
    get events ()
    {
      return {
        'request-begin': this.onRequestBegin_.bind(this),
        'request-end':  this.onRequestEnd_.bind(this)
      };
    },

    onRequestBegin_: function (id)
    {
      if(this.count_++ === 0)
        this.node_.stop().fadeIn();
    },

    onRequestEnd_: function (id)
    {
      if(this.count_ === 0)
        console.warn("Internal count clear on request stop: %s", id);
      else if(--this.count_ === 0)
        this.node_.stop().fadeOut(100);
    }
  };


  /**
   * @class
   * */
  var HandlerCallbacks = (function () {

    var reject_ = function (deferred) {
      window.setTimeout(function () {
        deferred.reject();
      } );
    };

    var do_active_tab_ = function (callback) {
      var deferred = $.Deferred();

      /* If there is an active tab, send it a message requesting detailed
       * information about current text selection. */
      if(active !== null) {
        chrome.tabs.get(active.id, function (tab) {
          if(/^https?:/.test(tab.url)) {
            callback(deferred);
          } else {
            console.error("Active tab's URL not valid");
            reject_(deferred);
          }
        } );
      } else {
        console.error("There is no active tab presently");
        reject_(deferred);
      }

      return deferred.promise();
    };

    var onGetSelection_ = function ()
    {
      return do_active_tab_(function (deferred) {
        chrome.tabs.sendMessage(
          active.id,
          { operation: 'get-selection' },
          function (result) {
            if(!std.is_obj(result)) {
              console.error("Invalid result type received: not object");
              deferred.reject_();
              return;
            } else if(result.type === 'image') {
              /* There is a pretty good chance that image data will have
               * already been retrieved in the content script (embed.js),
               * in which case `result.data´ will contain the image data.
               * Otherwise, an attempt is made in addon space to retrieve
               * the base64 encoding of the image data. */
              if(!std.is_str(result.data)) {
                console.info("Attempting to retrieve image data from"
                             + " background script");
                std.Html.imageToBase64(result.content)
                  .done(function (data) { result.data = data; } )
                  .fail(function () {
                    console.error("Failed to retrieve image data in"
                                  + " base64 encoding");
                    result.data = null; /* force null */
                  } )
                  .always(function () {
                    /* Always resolve, even when we don't retrieve image
                     * data in base64 encoding.  */
                    deferred.resolve(result);
                  } );

                return;
              }
            }

            deferred.resolve(result);
          } );
      } );
    };

    var onCheckSelection_ = function ()
    {
      return do_active_tab_(function (deferred) {
        chrome.tabs.sendMessage(active.id, { operation: 'check-selection' },
          function (result) {
            deferred.resolve(result);
          } );
      } );
    };

    var onCreateManualItem_ = function (text)
    {
      return do_active_tab_(function (deferred) {
        chrome.tabs.sendMessage(
          active.id,
          { operation: 'get-page-meta' },
          function (result) {
            if(!std.is_obj(result)) {
              console.error("Invalid result type received: not object");
              deferred.reject();
            } else {
              result.id = [ text, Date.now() ].join('|');
              result.content = text;
              result.type = "manual";

              deferred.resolve(result);
            }
          } );
      } );
    };

    var netfails_ = {
      'folder-list': "retrieving the list of folders",
      'folder-add': "adding a new folder",
      'folder-load': "loading the folder's subfolders",
      'subfolder-load': "loading the subfolder's items",
      'subfolder-add': "adding an item to the subfolder",
      'item-dismissal': "processing the item's dismissal",
      'fc-create': "saving the item's data",
      'fc-save': "saving the item's data",
      'label': "saving state data"
    };

    var onNetworkFailure_ = function (type, data)
    {
      var action = netfails_[type] || "contacting the server";

      alert([ "Unfortunately we have encountered a problem whilst ",
              action, ".\n\n",
              "Please try again. If the problem persists, contact the support",
              " team.",
            ].join(''));
    };

    /* Interface */
    return {
      callbacks: {
        sorter: {
          getSelection: onGetSelection_,
          checkSelection: onCheckSelection_,
          createManualItem: onCreateManualItem_,
          networkFailure: onNetworkFailure_
        }
      }
    };

  } )();


  /**
   * @class
   * */
  var BackgroundListener = (function () {

    /* Event handlers */
    var onConfigSaved_ = function (request, sender)
    {
      console.log("RELOAD");
      console.info("Reloading extension window");
      window.location = window.location;
    };


    /* Map message operations to handlers. */
    var methods_ = {
      "config-saved": onConfigSaved_
    };

    /* Handle messages whose `operation´ is defined above in `methods_´. */
    chrome.runtime.onMessage.addListener(
      function (req, sen, cb) {
        if(methods_.hasOwnProperty(req.operation)) {
          console.log("Invoking message handler [type=" + req.operation + "]");

          /* Invoke handler. */
          if(methods_[req.operation].call(window, req, sen, cb) === true)
            return true;
        }
      }
    );

  } )();


  /* Module interface */
  var getTabSelectedInWindow = function (windowId, callback)
  {
    if(!std.is_fn(callback))
      throw "Invalid or no callback provided";
    else if(windowId < 0) {
      callback(null);
      return;
    }

    /* TODO: Invoking `query´ produces strange errors. */
/*     chrome.tabs.query({ windowId: windowId, active: true }, function (tab) { */
    chrome.tabs.getSelected(windowId, function (tab) {
      if(tab) {
        chrome.tabs.get(tab.id, function (tab) {
          callback(/^chrome[^:]*:/.test(tab.url) ? null : tab);
        } );
      } else
        callback(null);
    } );
  };

  var setActive = function (tab)
  {
    active = tab;

    if(!active) {
      active = null;
      console.log("No active tab currently");
    } else
      console.log("Currently active tab: #%d", active.id);
  };

  var setupSortingQueue_ = function (sorter)
  {
    var refresh = $('#sd-queue [data-sd-scope="sorting-desk-toolbar-refresh"]'),
        queue = sorter.sortingQueue;

    queue.on(loading.queue.events)
      .on( {
        "loading-begin": function () { refresh.addClass('disabled'); },
        "loading-end": function () { refresh.removeClass('disabled'); }
      } );

    refresh.click(function () {
      sorter.api.getDossierJs().stop('API.search');
      queue.items.redraw();
    } );
  };

  var resize_ = function ()
  {
    var height = Math.floor(window.innerHeight / 2),
        q = $("#sd-queue");

    /* Set up heights of master containers. */
    $("#sd-folder-explorer").height(height);
    q.height(height -= $("#sd-queue > .sd-footer").outerHeight());

    /* Sorting Queue requires special care. In particular, the element that
     * will contain items *must* be set the maximum allowed height. */
    q = q.find('.sd-container-view-outer');
    $("#sd-queue .sd-container-view").height(
      height - (q.outerHeight(true) - q.innerHeight()));
  };


  /* Private interface */
  var initialise_ = function ()
  {
    console.log("Initialising main");

    /* Initialisation sequence */
    loading = {
      sorter: new LoadingStatus($('#sd-folder-explorer .sd-loading')),
      queue:  new LoadingStatus($('#sd-queue .sd-loading'))
    };

    /* Prevent drag and drop events on extension window's document. */
    $(document).on( {
      dragover: function ()   { return false; },
      dragleave: function ()  { return false; },
      drop: function ()       { return false; }
    } );

    chrome.runtime.sendMessage({ operation: "get-meta" }, function (meta) {
      /* Cache jQuery references to nodes used. */
      nodes.loading = $('#sd-sorting-desk .sd-loading');

      /* Initialise tooltips. */
      $('[data-toggle="tooltip"]').tooltip();

      /* Set initial heights */
      resize_();

      /* Initialise API and instantiate `SortingDesk´ class.
       * --
       * Note: for whatever reason, Chrome is not notifying of any exceptions
       * thrown, which is why instantiation is wrapped inside a try-catch block.
       * */
      try {
        instantiate_(meta);
      } catch(x) {
        std.on_exception(x);
      }

      /* Get currently active tab and listen for changes on which tab becomes
       * active. */
      chrome.windows.getLastFocused(function (win) {
        getTabSelectedInWindow(win.id, function (tab) {
          if(tab)
            setActive(tab);
          else
            console.info("No initial active tab");
        } );
      } );

      chrome.windows.onFocusChanged.addListener(function (id) {
        getTabSelectedInWindow(id, function (tab) {
          if(tab !== null)
            setActive(tab);
        } );
      } );

      chrome.tabs.onActivated.addListener(function (info) {
        chrome.tabs.get(info.tabId, function (tab) {
          if(tab && tab.url && !/^chrome[^:]*:/.test(tab.url))
            setActive(tab);
        } );
      } );

      console.info("Initialised Sorting Desk extension");
      console.info("READY");
    } );

    $(window)
      .resize(function () { resize_(); } )
      .click(function (ev) {
        ev = ev.originalEvent;

        var target = ev.target;

        /* Ensure click event originated in a A tag and it contains a valid href
         * value. */
        if(target.nodeName.toLowerCase() === 'a'
           && target.href !== window.location.href + '#')
        {
          chrome.windows.getLastFocused(function (win) {
            chrome.tabs.create( {
              windowId: win.id,
              url: target.href,
              active: true } );
          } );

          ev.preventDefault();
        }

        return false;
      } );

    console.log("Initialised main");
  };

  var instantiate_ = function (meta)
  {
    console.log("Active Dossier stack URL: %s", meta.config.activeUrl);

    (sorter = new sd.Sorter( {
      container: $('#sd-folder-explorer'),
      dossierUrl: meta.config.activeUrl,
      sortingQueue: {
        options: {
          container: $('#sd-queue'),
          visibleItems: 20,
          itemsDraggable: false,
          constructors: {
            Item: sqc.Item
          }
        }
      }
    }, $.extend(true, Api, HandlerCallbacks.callbacks.sorter ) ) )
      .on(loading.sorter.events)
      .initialise();

    sorter.explorer.on( {
      "selected-folder": function () {
        var str = 'Create a subfolder';
        $('[data-sd-scope="sorting-desk-toolbar-add-contextual"]')
          .attr( { 'title': str, 'data-original-title': str } );
      },
      "selected-subfolder": function () {
        var str = 'Create a manual item';
        $('[data-sd-scope="sorting-desk-toolbar-add-contextual"]')
          .attr( { 'title': str, 'data-original-title': str } );
      }
    } );

    setupSortingQueue_(sorter);
  };


  /* Startup sequence. */
  $(function () {
    chrome.runtime.sendMessage(
      { operation: 'get-extension-window' },
      function (win) {
        chrome.windows.getCurrent(function (f) {
          if(win === null || f.id === win.id)
            initialise_();
          else
            window.location.href = "about:blank";
        } );
      } );
  } );

} )(window, chrome, jQuery, SortingCommon, SortingQueue,
    SortingQueueCustomisations, SortingDesk, Api);