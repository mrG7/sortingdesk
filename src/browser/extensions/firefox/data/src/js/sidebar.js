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

    /* interface */
    return {
      callbacks: {
        sorter: {
          getSelection: onGetSelection_,
          createManualItem: onCreateManualItem_
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
    } );
    addon.port.emit('get-preferences');
  } );

} )(window, jQuery, SortingCommon, SortingQueue, SortingDesk, Api);
