/**
 * @file Sorting Desk extension user interface.
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingCommon´, `SortingQueue´ and `SortingDesk´ components.
 *
 */


/*global addon */
/*jshint laxbreak:true */

var Main = (function (window, $, std, sq, sqc, sd, Api, undefined) {

  /* Module-wide variables */
  var preferences,
      nodes = { },
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

    var onGetSelection_ = function ()
    {
      var deferred = $.Deferred();

      addon.port.emit('get-selection');
      addon.port.once('get-selection', function (result) {
        /* Retrieve base64 encoding of image data if result type is
         * image; otherwise resolve promise straight away with result in
         * it. */
        if(!std.is_obj(result)) {
          console.error("Invalid result type received: not object");
          deferred.reject();
        } else
          deferred.resolve(result);
      } );

      return deferred.promise();
    };

    var onCreateManualItem_ = function (text)
    {
      var deferred = $.Deferred();

      addon.port.emit('get-page-meta');
      addon.port.once('get-page-meta', function (result) {
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

      return deferred.promise();
    };

    var onCheckSelection_ = function ()
    {
      var deferred = $.Deferred();

      addon.port.emit('check-selection');
      addon.port.once('check-selection', function (result) {
        deferred.resolve(result);
      } );

      return deferred.promise();
    };

    var onCreateSuggestionContainer_ = function ()
    {
      var node,
          opts = sorter.options.suggestion,
          container = $('<div/>').attr('id', opts.id);

      node = $('<h1/>');
      node.append($('<button/>')
                  .addClass('btn btn-default btn-sm')
                  .html('<span class="glyphicon glyphicon-plus"></span>'));
      node.append('<span class="glyphicon glyphicon-info-sign"></span>');
      node.append('Soft selectors');
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

    var onExport_ = function (id)
    {
      window.open(sorter.api.makeReportUrl(id));
    };

    /* interface */
    return {
      callbacks: {
        sorter: {
          getSelection: onGetSelection_,
/*           checkSelection: onCheckSelection_, */
          createManualItem: onCreateManualItem_,
          createSuggestionContainer: onCreateSuggestionContainer_,
          renderScore: onRenderScore_,
          networkFailure: onNetworkFailure_,
          export: onExport_
        }
      }
    };

  } )();

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
    /* Initialisation sequence */
    loading = {
      sorter: new LoadingStatus($('#sd-folder-explorer .sd-loading')),
      queue:  new LoadingStatus($('#sd-queue .sd-loading'))
    };

    /* Cache jQuery references to nodes used. */
    nodes.loading = $('#sd-sorting-desk .sd-loading');

    /* Initialise tooltips. */
    $('[data-toggle="tooltip"]').tooltip();

    /* Set initial heights */
    resize_();

    /* Initialise API and instantiate `SortingDesk´ class. */
    try {
      instantiate_();
    } catch(x) {
      std.on_exception(x);
    }

    console.info("Initialised Sorting Desk extension");
    console.info("READY");

    $(window)
      .resize(function () { resize_(); } )
      .click(function (ev) {
        ev = ev.originalEvent;

        var target = ev.target;

        /* Ensure click event originated in a A tag and it contains a valid href
         * value. */
        if(target.nodeName.toLowerCase() === 'a') {
          if(target.href === window.location.href + '#')
              ev.preventDefault();
          else
            return true;
        }

        return false;
      } );
  };

  var instantiate_ = function () {
    console.log(preferences);
    if(!preferences.dossierUrl) {
      console.error("No dossier stack URL currently defined");
      return;
    } else
      console.log("Using ", preferences.dossierUrl);

    (sorter = new sd.Sorter( {
      container: $('#sd-folder-explorer'),
      dossierUrl: preferences.dossierUrl,
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

    setupSortingQueue_(sorter);
  };


  /* Startup sequence. */
  $(function () {
    addon.port.once('get-preferences', function (prefs) {
      preferences = prefs;
      initialise_();
    } );
    addon.port.emit('get-preferences');
  } );

} )(window, jQuery, SortingCommon, SortingQueue, SortingQueueCustomisations,
    SortingDesk, Api);
