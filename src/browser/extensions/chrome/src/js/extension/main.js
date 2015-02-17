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
    var raw = this.content_.raw;
    var fc = this.content_.fc;
    var desc = fc.value('meta_clean_visible').trim();
    desc = desc.replace(/\s+/g, ' ');
    desc = desc.slice(0, 200);
    var title = fc.value('title') || (desc.slice(0, 50) + '...');
    var url = fc.value('meta_url');

    var ntitle = $(
      '<p style="color: #565656; font-size: 12pt; margin: 0 0 8px 0;">'
      + '<strong></strong>'
      + '</p>'
    );
    ntitle.find('strong').text(title);

    var ndesc = $('<p style="font-size: 8pt; display: block; margin: 0;" />');
    ndesc.text(desc + '...');

    var nurl = $(
      '<p style="margin: 8px 0 0 0; display: block;">'
      + '<a href="' + url + '">' + url + '</a>'
      + '</p>'
    );

    this.content_.text = $('<div style="margin: 0;" />');
    this.content_.text.append(ntitle);
    this.content_.text.append(ndesc);
    this.content_.text.append(nurl);

    if(std.is_num(raw.probability)) {
      var score = raw.probability.toFixed(4);
      this.content_.text.append($(
        '<p style="margin: 8px 0 0 0; display: block;">'
        + 'Score: ' + score
        + '</p>'
      ) );

      var info = raw.feature_cmp_info;;
      if(std.is_obj(info)) {
        for(var i in info) {
          var j = info[i],
              values = j.common_values;

          if(std.is_arr(values) && values.length > 0) {
            var container = $('<div/>').addClass('sd-dict-container'),
                hasPhi = std.is_num(j.phi) && j.phi > 0,
                el;

            el = $('<div/>').addClass("sd-dict-weight");
            if(hasPhi)
              el.append(this.create_weight_('Score:', 1 - j.phi));

           if(std.is_num(j.weight) && j.weight > 0) {
              if(hasPhi)
                el.append('<br/>');

              el.append(this.create_weight_('Weight:', j.weight));
           }

            container.append(el);
            container.append($('<h1/>').text(i));

            el = $('<div/>').addClass('sd-dict-values');

            if(i === 'image_url') {
              values.forEach(function (v) {
                el.append($('<img/>').attr('src', v));
              } );
            } else {
              values.forEach(function (v) {
                el.append($('<span/>').text(v));
              } );
            }

            container.append(el);
            this.content_.text.append(container);
            this.content_.text.append($('<div class="sd-clear"/>'));
          }
        }
      }
    }

    console.log(this.content_);

    return sq.Item.prototype.render.call(this);
  };

  Item.prototype.create_weight_ = function (caption, weight)
  {
    var el = $('<span/>').addClass('sd-dict-weight');

    el.append($('<span/>').text(caption));
    el.append($('<span/>').text(weight.toFixed(4)));

    return el;
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

    var onGetSelection_ = function ()
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
                if(!std.is_obj(result)) {
                  console.error("Invalid result type received: not object");
                  deferred.reject();
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
          }
        } );
      }

      return deferred.promise();
    };

    /* Interface */
    return {
      callbacks: {
        sorter: {
          getSelection: onGetSelection_
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

  var instantiate_ = function (meta) {
    (sorter = new sd.Sorter( {
      container: $('#sd-folder-explorer'),
      dossierUrl: meta.config.dossierUrl,
      sortingQueue: {
        options: {
          container: $('#sd-queue'),
          visibleItems: 20,
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