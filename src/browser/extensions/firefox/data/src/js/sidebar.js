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

var Main = (function (window, $, std, sq, sd, Api, undefined) {

  /* Module-wide variables */
  var preferences,
      nodes = { },
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
/*       var deferred = $.Deferred(); */

/*       chrome.runtime.sendMessage( */
/*         { operation: 'get-image-base64', entity: entity }, */
/*         function (result) { */
/*           if(result === false) deferred.reject(); */
/*           else deferred.resolve(result); */
/*         } ); */

/*       return deferred.promise(); */
    };

    var getSelection_ = function ()
    {
      var deferred = $.Deferred();

      addon.port.on('get-selection', function (result) {
        if(result !== null) {
          /* Retrieve base64 encoding of image data if result type is
           * image; otherwise resolve promise straight away with result in
           * it. */
          if(!std.is_obj(result)) {
            console.error("Invalid result type received: not object");
            deferred.reject();
          } else if(result.type === 'image') {
            result.data = '';
            deferred.resolve(result);
            /*             imageToBase64_(result.content) */
            /*               .done(function (data) { */
            /*                 result.data = data; */
            /*                 deferred.resolve(result); */
            /*               } ).fail(function () { */
            /*                 console.error("Failed to retrieve image data in base64" */
            /*                               + " encoding"); */
            /*                 deferred.resolve(null); */
            /*               } ); */
          } else {
            console.info("No selection content available");
            deferred.resolve(result);
          }
        }
      } );
      addon.port.emit('get-selection');

      return deferred.promise();
    };

    /* interface */
    return {
      callbacks: {
        sorter: {
/*           imageToBase64: imageToBase64_, */
          getSelection: getSelection_
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
        if(target.nodeName.toLowerCase() === 'a'
           && target.href !== window.location.href + '#')
        {
          console.log("click event!", target);
          ev.preventDefault();
        }

        return false;
      } );
  };

  var instantiate_ = function () {
    (sorter = new sd.Sorter( {
      container: $('#sd-folder-explorer'),
      dossierUrl: preferences.dossierUrl,
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
    addon.port.once('get-preferences', function (prefs) {
      preferences = prefs;
      initialise_();
    } )
    addon.port.emit('get-preferences');
  } );

} )(window, jQuery, SortingCommon, SortingQueue, SortingDesk, Api);
