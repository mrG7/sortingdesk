/**
 * @file Sorting Desk extension user interface.
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingCommon´, `SortingQueue´ and `SortingDesk´ components.
 *
 */

/*jshint laxbreak:true */


var Main = (function (window, chrome, $, std, sq, sqc, sd, undefined) {

  /* Module-wide variables */
  var nodes = { },
      active = null,
      windowId,
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
          if(tab && std.is_str(tab.url) && /^https?:/.test(tab.url)) {
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
              deferred.reject();
              return;
            } else if(result.type === 'image') {
              /* There is a pretty good chance that image data will have
               * already been retrieved in the content script (embed.js),
               * in which case `result.data´ will contain the image data.
               * Otherwise, an attempt is made in addon space to retrieve
               * the base64 encoding of the image data. */
              if(!std.is_str(result.data)) {
                console.info("Attempting to retrieve image data");
                std.Html.imageToBase64(result.content)
                  .done(function (data) { result.data = data; } )
                  .fail(function () {
                    console.error(
                      "Failed to retrieve image data in base64 encoding");
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

    var onCreateSuggestionContainer_ = function ()
    {
      var node,
          opts = sorter.options.renderer,
          container = $('<div/>').attr('id', opts.suggestion);

      node = $('<h3/>');
      node.append($('<button/>')
                  .addClass('btn btn-default btn-sm')
                  .html('<span class="glyphicon glyphicon-plus"></span>'));
      container.append(node);

      return container;
    };

    var onRenderScore_ = function (weight)
    {
      var elc = $('<span/>')
            .addClass('sd-score')
            .append($('<span/>').html('Score: ')),
          els = $('<span/>');


      var ns = Math.round(Math.min(weight, 1) / 0.2),
          nc = 5 - ns;

      while(ns-- > 0)
        els.append($('<span/>').addClass('glyphicon glyphicon-star'));

      while(nc-- > 0)
        els.append($('<span/>').addClass('glyphicon glyphicon-star-empty'));

      return elc.append(els.attr('title', weight.toFixed(4)));
    };

    var onCapturePage_ = function ()
    {
      return do_active_tab_(function (deferred) {
        chrome.tabs.sendMessage(
          active.id,
          { operation: 'capture-page' },
          function (data) {
            deferred.resolve(data);
          }
        );
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

    var onExport_ = function (type, id)
    {
      var url = sorter.api.makeReportUrl(type, id);
      if(url === null) return false;

      window.open(url);
      return true;
    };

    /* Interface */
    return {
      callbacks: {
        sorter: {
          getSelection: onGetSelection_,
          checkSelection: onCheckSelection_,
          createManualItem: onCreateManualItem_,
          createSuggestionContainer: onCreateSuggestionContainer_,
          renderScore: onRenderScore_,
          networkFailure: onNetworkFailure_,
          export: onExport_,
          capturePage: onCapturePage_
        }
      }
    };

  } )();


  /**
   * @class
   * */
  var receiver = (function () {

    /* Attributes */
    var methods = { };


    /* Message handlers */
    methods.configSaved = function ()
    {
      console.info("Reloading extension window");
      window.location = window.location;
    };

    methods.dragnetSelect = function (req, sen)
    {
      console.info(
        "Opening or creating subfolder corresponding to:",
        req.item
      );

      /* Process request and focus extension window. */
      sorter.dragnet.select(req.item);
      chrome.windows.update(windowId, { focused: true } );
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

      if(methods.hasOwnProperty(method)) {
        console.log("Invoking message handler [" + req.operation + "]");
        return methods[method](req, sen, cb) === true;
      }
    } );

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
  var initialise_ = function (id)
  {
    console.log("Initialising main");

    windowId = id;

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
      $('[data-toggle="tooltip"]').tooltip({ container: 'body' });

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
        if(target.nodeName.toLowerCase() === 'a') {
          if(target.href !== window.location.href + '#') {
            chrome.windows.getLastFocused(function (win) {
              chrome.tabs.create( {
                windowId: win.id,
                url: target.href,
                active: true } );
            } );
          }

          return false;
        }
      } );

    console.log("Initialised main (@%d)", windowId);
  };

  var instantiate_ = function (meta)
  {
    console.log("Active Dossier stack URL: %s", meta.config.activeUrl);

    (sorter = new sd.SortingDesk( {
      container: $('#sd-folder-explorer'),
      dossierUrl: meta.config.activeUrl,
      translation: {
        api: meta.config.translation.api,
        key: meta.config.translation.key
      },
      sortingQueue: {
        options: {
          container: $('#sd-queue'),
          items: {
            visible: 20
          },
          itemsDraggable: false,
          constructors: {
            Item: sqc.Item
          }
        }
      }
    }, HandlerCallbacks.callbacks.sorter ) )
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

    /* TODO: we need to specifically reference the element by id.  H1>A is
     * dangerously too generic.
     * -- */
    /* For whatever reason, links that contain images won't work inside
     * sidebar/extension window and must therefore be dealt with manually. */
    $('H1 > A').click(function () { window.open("http://diffeo.com"); } );

    $('[data-sd-scope="sorting-desk-toolbar-dragnet"]').click(function () {
      window.open(chrome.runtime.getURL("/src/html/dragnet.html"));
    } );
  };


  /* Startup sequence. */
  $(function () {
    chrome.runtime.sendMessage(
      { operation: 'get-extension-window' },
      function (win) {
        chrome.windows.getCurrent(function (f) {
          if(win === null || f.id === win.id)
            initialise_(win.id);
          else
            window.location.href = "about:blank";
        } );
      } );
  } );

} ) (
  this,
  this.chrome,
  this.$,
  this.SortingCommon,
  this.SortingQueue,
  this.SortingQueueCustomisations,
  this.SortingDesk
);
