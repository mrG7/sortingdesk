/**
 * @file Sorting Desk main component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the SortingCommon and SortingQueue components.
 *
 */

this.SortingDesk = (function (window, $, std, sq, sd, Api, undefined) {

  /* TODO: finish modularizing this. */

  /**
   * @namespace
   * */
  sd = sd || { };


  /**
   * @class
   *
   * @param   {Object}    opts  Initialisation options (please refer to
   *                            `defaults_' at the end of this source file)
   * @param   {Object}    cbs   Map of all callbacks in a key to function
   *                            manner.
   * */
  sd.SortingDesk = function (opts, cbs)
  {
    if(!std.is_obj(opts))
      throw "Invalid or no options map specified";
    else if(!std.$.any(opts.container))
      throw "Invalid or no container specified";
    else if(!std.is_obj(opts.sortingQueue) || std.$.is(opts.sortingQueue)) {
      throw "Sorting Queue's options map must be supplied in the form of an"
        + " object map";
    }

    console.log("Initialising Sorting Desk UI");
    var self = this;

    /* TODO: must pass in Dossier API URL. */
    this.api_ = new Api(opts.dossierUrl);
    this.options_ = $.extend(true, {}, defaults_, opts);
    delete this.options_.sortingQueue; /* don't keep SQ options */
    this.callbacks_ = new std.Callbacks(cbs);
    this.events_ = new std.Events(
      this,
      [ 'request-begin', 'request-end', 'active' ]);

    this.constructor_ = new std.Constructor(this.options_.constructors);

    /* We need to instantiate `SortingQueue´ *now* because it is a dependency;
     * after all, `SortingDesk´ is built on top of `SortingQueue´, and as such
     * it a logical requirement to instantiate `SortingQueue´ at the same time
     * as `SortingDesk´. In addition, it may be the case that clients of
     * `SortingDesk´ expect `SortingQueue´ to be available after instantiation
     * or need to carry out some sort of processing before invoking the instance
     * initialisor method, such as set up events.
     *
     * Sorting Desk requires Sorting Queue's options and callbacks to be
     * specified inside a map assigned to key `sortingQueue´, as given by:
     * opts = {
     *   // Sorting Desk's options
     *   sortingQueue: {
     *     options: {
     *       // Sorting Queue's options
     *     },
     *     callbacks: {
     *       // Sorting Queue's callbacks
     *     }
     *   }
     * } */
    cbs = opts.sortingQueue.callbacks || { };
    opts = opts.sortingQueue.options;
    if(!std.is_obj(opts.constructors)) opts.constructors = { };

    /* Pass reference to API instance. */
    if(opts.instances !== undefined)
      throw 'Expected undefined `opts.instances´';

    opts.instances = {
      api: this.api_
    };

    /* Specify text dismissal handler if client hasn't supplying its own. */
    if(!std.Constructor.exists(opts.constructors, 'ItemDismissal')) {
      opts.constructors.createItemDismissal
        = this.createItemDismissal_.bind(this);
    }

    this.sortingQueue_ = new sq.Sorter(
      $.extend(true, opts, {
        loadItemsAtStartup: false /* IMPORTANT: Explicitly deny loading of
                                   * items at startup as this would potentially
                                   * break request-(start|stop) event handlers
                                   * set up only *AFTER* this constructor
                                   * exits. */
      }),
      $.extend(this.api_.qitems.getCallbacks(), cbs));
  };

  sd.SortingDesk.prototype = {
    initialised_: false,
    callbacks_: null,
    events_: null,
    constructor_: null,
    networkFailure_: null,
    options_: null,
    nodes_: null,

    /* Instances */
    api_: null,
    sortingQueue_: null,
    explorer_: null,
    facets_: null,
    openquery_: null,

    /* Getters */
    get sortingQueue ()  { return this.sortingQueue_; },
    get initialised ()   { return this.initialised_; },
    get constructor ()   { return this.constructor_; },
    get callbacks ()     { return this.callbacks_; },
    get networkFailure() { return this.networkFailure_; },
    get translator()     { return this.translator_; },
    get events ()        { return this.events_; },
    get api ()           { return this.api_; },
    get resetting ()     { return this.sortingQueue_.resetting(); },
    get options ()       { return this.options_; },
    get nodes ()         { return this.nodes_; },
    get explorer ()      { return this.explorer_; },
    get facets ()        { return this.facets_; },
    get openquery ()     { return this.openquery_; },

    /* Interface */
    initialise: function ()
    {
      if(this.initialised_)
        throw "Sorting Desk component already initialised";

      var els,
          self = this,
          finder = new std.NodeFinder('data-sd-scope',
                                      'sorting-desk',
                                      $('body'));

      /* Find nodes. */
      els = this.nodes_ = {
        container: this.options.container,
        explorer: finder.find('explorer'),
        facets: finder.withroot(finder.find('facets'), function () {
          return {
            container: this.root,
            all: this.find('facets-all'),
            none: this.find('facets-none'),
            empty: this.find('facets-empty')
          };
        } ),
        empty: {
          explorer: finder.find('explorer-empty')
        },
        toolbar: {
          add: finder.find('toolbar-add'),
          report: {
            excel: finder.find('toolbar-report-excel'),
            simple: finder.find('toolbar-report-simple'),
            rich: finder.find('toolbar-report-rich')
          },
          openquery: finder.find('toolbar-openquery'),
          addContextual: finder.find('toolbar-add-contextual'),
          remove: finder.find('toolbar-remove'),
          rename: finder.find('toolbar-rename'),
          jump: finder.find('toolbar-jump'),
          translate: finder.find('toolbar-translate'),
          refresh: {
            explorer: finder.find('toolbar-refresh-explorer'),
            search: finder.find('toolbar-refresh-search')
          },
          filter: finder.find('toolbar-filter')
        }
      };

      finder = new std.TemplateFinder('text/sd-template',
                                      'data-sd-scope');
      var templates = {
        empty: {
          items: finder.find('items-empty'),
          filtered: finder.find('items-empty-filtered')
        }
      };

      new EmptyNotificator(this.sortingQueue_, templates.empty, {
        fadeIn: this.options.delays.fadeIn
      } );

      /* Begin instantiating and initialising controllers.
       *
       * Start by explicitly initialising SortingQueue's instance and proceed
       * to initialising our own instance. */
      this.sortingQueue_.initialise();
      (this.explorer_ = new sd.explorer.Controller(this))
        .on( {
          "refresh-begin": function () {
            self.events_.trigger("request-begin", "refresh");
          },
          "refresh-end": function () {
            self.events_.trigger("request-end", "refresh");
          }
        } )
        .initialise();

      this.networkFailure_ = new sd.ui.NetworkFailure(this);

      (this.facets_ = new sd.facets.Controller(this))
        .initialise();

      new sd.queue.Renderer(this.sortingQueue_,
                            this.explorer_,
                            this.facets_,
                            this.callbacks_,
                            this.options.renderer);

      (this.translator_ = new sd.translation.Controller(
        this.explorer_,
        this.callbacks_,
        {
          button: els.toolbar.translate,
          service: this.options.translation
        } )
      ).initialise();

      this.openquery_ = new sd.openquery.Controller(
        this.explorer_,
        this.api_, {
          button: els.toolbar.openquery
      } ).initialise();

      this.initialised_ = true;
      console.info("Sorting Desk UI initialised");
    },

    /**
     * Resets the component to a virgin state.
     *
     * @returns {Promise}   Returns promise that is fulfilled upon successful
     *                      instance reset. */
    reset: function ()
    {
      if(!this.initialised_ || this.sortingQueue_.resetting())
        return this.sortingQueue_.reset();

      var self = this;

      this.explorer_.reset();
      this.translator_.reset();

      return this.sortingQueue_.reset()
        .done(function () {
          self.explorer_ = self.options_ = self.sortingQueue_ = null;
          self.translator_ = null;
          self.initialised_ = false;

          console.info("Sorting Desk UI reset");
        } );
    },

    /* Private interface */
    createItemDismissal_: function (item) {
      var self = this;

      return (new sq.ItemDismissalReplaceTight(
        item, {
          tooltipClose: "Click again to ignore this result without asserting"
            + " that it is either wrong or redundant; will automatically"
            + " select this choice for you in a few seconds.",
          choices: [
            { id: 'redundant',
              title: 'Redundant?',
              tooltip: 'Result is correct and either redundant, a duplicate,'
              + ' or simply not something you want to see any more in the'
              + ' results.'},
            { id: 'wrong',
              title: 'Wrong?',
              tooltip: 'Result is not correct, not relevant, and not what'
              + ' you want the system to learn as your objective of this'
              + ' query; will be removed from future results.' } ]
        } ))
        .on('dismissed', function (id) {
          var cid = item.content.content_id,
              label = new (self.api.getClass('Label'))(
                self.api.qitems.getQueryContentId(),
                cid,
                'unknown',
                0, // coref value is filled in below
                self.api.qitems.getQuerySubtopicId());
          if (id === null)
            label.coref_value = self.api.consts.coref.UNKNOWN;
          else if (id === 'redundant')
            label.coref_value = self.api.consts.coref.POSITIVE;
          else if (id === 'wrong')
            label.coref_value = self.api.consts.coref.NEGATIVE;
          else {
            console.error("Unrecognized dismissal identifier: " + id);
            return;
          }

          this.setResetHtml("Processing...");

          self.api.label.add(label)
            .done(function () { item.owner.remove(item); })
            .fail(function () {
              self.networkFailure.incident(
                sd.ui.NetworkFailure.types.dismissal, item
              );
            } );
        } );
    }
  };


  /**
   * @class
   * */
  var EmptyNotificator = function (sq, tpl, opt)
  {
    var node = null;

    sq.on( {
      'loading-begin': function () {
        if(node === null) return;
        node.fadeOut(function () { clear(); } );
      },
      'empty': function (empty, filtered) {
        clear();
        if(!empty) return;

        var t = filtered ? tpl.filtered : tpl.items;
        if(t === null) return;

        node = t.clone().get()
          .fadeIn(opt.fadeIn);
        sq.nodes.items.append(node);
      }
    } );

    var clear = function () {
      if(node === null) return;
      node.remove();
      node = null;
    };
  };


  /* Default options */
  var defaults_ = {
    delays: {                   /* In milliseconds.     */
      emptyFadeIn: 250,
      emptyFadeOut: 100,
      emptyHide: 50,
      facets: 500
    },
    constructors: { },
    container: null,
    folderNewCaption: "Enter folder name",
    renderer: {
      hint: 'sd-sr-hint',
      suggestion: 'sd-suggestion',
      recommendation: 'sd-recommendation'
    }
  };


  return sd;

})(this,
   this.$,
   this.SortingCommon,
   this.SortingQueue,
   this.SortingDesk,
   this.Api);
