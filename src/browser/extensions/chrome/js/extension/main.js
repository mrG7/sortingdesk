/**
 * @file Sorting Desk extension user interface.
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingCommon´, `SortingQueue´ and `SortingDesk´ components.
 *
 */


/*jshint laxbreak:true */

var Main = (function (window, chrome, $, std, sq, sd, Api, undefined) {

  /* Module-wide variables */
  var nodes = { },
      active = null,
      loading,
      sorter;


  /**
   * @class
   * */
  var Item = function(owner, item)
  {
    if(!owner.owner.initialised)
      return;

    sq.Item.call(this, owner, item);
  };

  Item.prototype = Object.create(sq.Item.prototype);

  Item.prototype.render = function(text, view, less)
  {
    var fc = this.content_.fc;
    var desc = fc.value('meta_clean_visible').trim();
    desc = desc.replace(/\s+/g, ' ');
    desc = desc.slice(0, 200);
    var title = fc.value('title') || (desc.slice(0, 50) + '...');
    var url = fc.value('meta_url');

    var ntitle = $(
      '<p style="font-size: 12pt; margin: 0 0 8px 0;">'
      + '<strong></strong>'
      + '</p>'
    );
    ntitle.find('strong').text(title);

    var ndesc = $('<p style="font-size: 8pt; display: block; margin: 0;" />');
    ndesc.text(desc + '...');

    var nurl = $(
      '<p style="margin: 8px 0 0 0; display: block;">'
      + '<a style="color: #349950;" href="' + url + '">' + url + '</a>'
      + '</p>'
    );

    this.content_.text = $('<div style="margin: 0;" />');
    this.content_.text.append(ntitle);
    this.content_.text.append(ndesc);
    this.content_.text.append(nurl);

    if (!std.is_und(this.content_.raw.probability)) {
      var score = this.content_.raw.probability.toFixed(4);
      this.content_.text.append($(
        '<p style="margin: 8px 0 0 0; display: block;">'
        + 'Score: ' + score
        + '</p>'
      ));
    }
    return sq.Item.prototype.render.call(this);
  };


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

    var imageToBase64_ = function (entity)
    {
      var deferred = $.Deferred();

      chrome.runtime.sendMessage(
        { operation: 'get-image-base64', entity: entity },
        function (result) {
          if(result === false) deferred.reject();
          else deferred.resolve(result);
        } );

      return deferred.promise();
    };

    var getSelection_ = function ()
    {
      var deferred = $.Deferred();

      /* If there is an active tab, send it a message requesting detailed
       * information about current text selection. */
      if(active !== null) {
        chrome.tabs.get(active.id, function (tab) {
          if(!/^chrome[^:]*:/.test(tab.url)) {
            chrome.tabs.sendMessage(
              active.id,
              { operation: 'get-selection' },
              function (result) {
                /* Retrieve base64 encoding of image data if result type is
                 * image; otherwise resolve promise straight away with result in
                 * it. */
                if(std.is_obj(result) && result.type === 'image') {
                  imageToBase64_(result.content)
                    .done(function (data) {
                      result.data = data;
                      deferred.resolve(result);
                    } ).fail(function () {
                      console.error("Failed to retrieve image data in base64"
                                    + " encoding");
                      deferred.resolve(null);
                    } );
                } else
                  deferred.resolve(result);
              } );
          }
        } );
      }

      return deferred.promise();
    };

    /* Interface */
    return {
      callbacks: {
        sorter: {
          imageToBase64: imageToBase64_,
          getSelection: getSelection_
        }
      }
    };

  } )();


  /**
   * @class
   * */
  var BackgroundListener = (function () {

    /* Event handlers */

    /* Map message operations to handlers. */
    var methods_ = {
      /* null */
    };

    /* Handle messages whose `operation´ is defined above in `methods_´. */
    chrome.runtime.onMessage.addListener(
      function (request, sender, callback) {
        if(methods_.hasOwnProperty(request.operation)) {
          console.log("Invoking message handler [type="
                      + request.operation + "]");

          /* Invoke handler. */
          methods_[request.operation].call(window, request, sender, callback);
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
    var height = Math.floor(window.innerHeight / 2);

    /* Set up heights. */
    $("#sd-folder-explorer").height(height);
    $("#sd-queue").height(height - $("#sd-queue > .sd-footer").outerHeight());
  };


  /* Private interface */
  var initialise_ = function ()
  {
    /* Initialisation sequence */
    loading = {
      sorter: new LoadingStatus($('#sd-folder-explorer .sd-loading')),
      queue:  new LoadingStatus($('#sd-queue .sd-loading'))
    };

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
          if(!/^chrome[^:]*:/.test(tab.url))
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
  };

  var instantiate_ = function (meta) {

    (sorter = new sd.Sorter( {
      container: $('#sd-folder-explorer'),
      dossierUrl: meta.config.dossierUrl,
      sortingQueue: {
        options: {
          container: $('#sd-queue'),
          visibleItems: 10,
          itemsDraggable: false,
          constructors: {
            Item: Item
          }
        }
      }
    }, $.extend(true, Api, HandlerCallbacks.callbacks.sorter ) ) )
      .on(loading.sorter.events)
      .initialise();

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

} )(window, chrome, jQuery, SortingCommon, SortingQueue, SortingDesk, Api);