/**
 * @file Sorting Desk component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingCommon´ component.
 *
 */


/*global $, define */
/*jshint laxbreak:true */


(function (factory, root) {

  /* Compatibility with RequireJs. */
  if(typeof define === "function" && define.amd) {
    var deps = [ "jquery", "SortingQueue", "SortingCommon", "API" ];
    define("SortingDesk", deps, function ($, sq, std, api) {
      return factory(root, $, sq, std, api);
    } );
  } else
    root.SortingDesk = factory(root, $, SortingQueue, SortingCommon, Api);

} )(function (window, $, sq, std, Api, undefined) {

  /**
   * @class
   *
   * @param   {Object}    opts  Initialisation options (please refer to
   *                            `defaults_' at the end of this source file)
   * @param   {Object}    cbs   Map of all callbacks in a key to function
   *                            manner.
   * */
  var Sorter = function (opts, cbs)
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
    this.api_ = new Api(this, opts.dossierUrl);
    this.options_ = $.extend(true, $.extend(true, {}, defaults_), opts);
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

    /* Specify our custom `Item´ class if client hasn't provided one. */
    if(!opts.constructors) opts.constructors = { };

    if(!std.is_obj(opts.constructors))
      opts.constructors = { };

    /* Pass reference to API instance. */
    if(opts.instances !== undefined)
      throw 'Expected undefined `opts.instances´';

    opts.instances = {
      api: this.api_
    };

    /* Specify text dismissal handler if client hasn't supplying its own. */
    if(!std.Constructor.exists(opts.constructors, 'ItemDismissal')) {
      opts.constructors.createItemDismissal =
        this.createItemDismissal_.bind(this);
    }

    this.sortingQueue_ = new sq.Sorter(
      $.extend(true, opts, {
        visibleItems: 40,
        loadItemsAtStartup: false /* IMPORTANT: Explicitly deny loading of
                                   * items at startup as this would potentially
                                   * break request-(start|stop) event handlers
                                   * set up only *AFTER* this constructor
                                   * exits. */
      }),
      $.extend(this.api_.getCallbacks(), cbs));
  };

  Sorter.prototype = {
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

    /* Getters */
    get sortingQueue ()  { return this.sortingQueue_; },
    get initialised ()   { return this.initialised_; },
    get constructor ()   { return this.constructor_; },
    get callbacks ()     { return this.callbacks_; },
    get networkFailure() { return this.networkFailure_; },
    get events ()        { return this.events_; },
    get api ()           { return this.api_; },
    get resetting ()     { return this.sortingQueue_.resetting(); },
    get options ()       { return this.options_; },
    get nodes ()         { return this.nodes_; },
    get explorer ()      { return this.explorer_; },

    /* Interface */
    initialise: function ()
    {
      if(this.initialised_)
        throw "Sorting Desk component already initialised";

      var els,
          self = this,
          finder = new std.NodeFinder('data-sd-scope',
                                      'sorting-desk',
                                      this.options_.container);

      /* Find nodes. */
      els = this.nodes_ = {
        container: finder.root,
        explorer: finder.find('explorer'),
        buttons: {
          add: finder.find('button-add')
        },
        empty: finder.find('explorer-empty')
      };

      els.toolbar = finder.withroot($('body'), function () {
        return {
          actions: {
            add: this.find('toolbar-add'),
            report: this.find('toolbar-report'),
            addContextual: this.find('toolbar-add-contextual'),
            remove: this.find('toolbar-remove'),
            rename: this.find('toolbar-rename'),
            jump: this.find('toolbar-jump'),
            refresh: this.find('toolbar-refresh')
          }
        };
      } );

      /* Begin instantiating and initialising controllers.
       *
       * Start by explicitly initialising SortingQueue's instance and proceed
       * to initialising our own instance. */
      this.sortingQueue_.initialise();
      new SortingQueueRenderer(this.sortingQueue_,
                               this.explorer_,
                               this.callbacks_,
                               this.options.suggestion);

      (this.explorer_ = new ControllerExplorer(this))
        .on( {
          "refresh-begin": function () {
            self.events_.trigger("request-begin", "refresh");
          },
          "refresh-end": function () {
            self.events_.trigger("request-end", "refresh");
          }
        } )
        .initialise();

      this.networkFailure_ = new NetworkFailure(this);

      this.initialised_ = true;
      console.info("Sorting Desk UI initialised");
    },

    /**
     * Resets the component to a virgin state. Removes all nodes contained by
     * `nodes_.bins', if any, after the active `SortingQueue' instance has
     * successfully reset.
     *
     * @returns {Promise}   Returns promise that is fulfilled upon successful
     *                      instance reset. */
    reset: function ()
    {
      if(!this.initialised_ || this.sortingQueue_.resetting())
        return this.sortingQueue_.reset();

      var self = this;

      this.explorer_.reset();

      return this.sortingQueue_.reset()
        .done(function () {
          self.explorer_ = self.options_ = self.sortingQueue_ = null;
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
            + " that it is either wrong or a redundant; will automatically"
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
              djs = self.api.DossierJS,
              label = new djs.Label(
                self.api.getQueryContentId(),
                cid,
                'unknown',
                0, // coref value is filled in below
                self.api.getQuerySubtopicId());
          if (id === null)
            label.coref_value = djs.COREF_VALUE_UNKNOWN;
          else if (id === 'redundant')
            label.coref_value = djs.COREF_VALUE_POSITIVE;
          else if (id === 'wrong')
            label.coref_value = djs.COREF_VALUE_NEGATIVE;
          else {
            item.owner.remove(item);
            console.error("Unrecognized dismissal identifier: " + id);
            return;
          }

          this.setResetHtml("Processing...");

          self.api.addLabel(label)
            .done(function () { item.owner.remove(item); })
            .fail(function () {
              self.networkFailure.incident(
                NetworkFailure.types.dismissal, item
              );
            } );
        } );
    }
  };


  /**
   * @class
   * */
  var SortingQueueRenderer = function (sq, explorer, callbacks, options)
  {
    var self = this;

    this.sortingQueue = sq;
    this.explorer = explorer;
    this.callbacks = callbacks;
    this.options = options;

    this.sortingQueue.on('pre-render', this.onPreRender_.bind(this));
    this.sortingQueue.on('items-updated', function (count) {
      if(count === 0)
        $('#' + options.id).remove();
    } );
  };

  SortingQueueRenderer.prototype.onPreRender_ = function (data) {
    var node,
        self = this,
        container = $('#' + this.options.id),
        sugg = data.suggestions;

    /* If there are no suggestions or no suggestion hits in the first
     * element, self-destruct after a fade out animation and get out of
     * here. */
    if(!std.is_arr(sugg)
       || sugg.length === 0
       || !std.is_arr(sugg[0].hits)
       || sugg[0].hits.length === 0)
    {
      /* Note: it doesn't really matter if the container doesn't actually
       * exist yet. */
      container.fadeOut(function () { container.remove(); } );
      return;
    }

    /* Important that we cancel any running animations or the container may
     * be removed (see above). */
    container.stop();
    sugg = sugg[0];

    /* Always re-create the suggestion container. */
    container.remove();
    container = this.callbacks.invoke('createSuggestionContainer');
    node = this.sortingQueue.nodes.items;

    /* Insert our container before the top child node of the search results
     * list. */
    if(node.children().length > 0)
      container.insertBefore(node.children().first());
    else
      node.append(container);

    container.append($('<h2/>').html(sugg.phrase));
    container.append(this.callbacks.invoke('renderScore', sugg.score));

    container.append($('<p/>')
                     .html('This suggestion links <strong>'
                           + sugg.hits.length
                           + '</strong> '
                           + (sugg.hits.length === 1
                              ? 'page.'
                              : 'pages.')));

    container.find('BUTTON').on('click', function () {
      if(self.explorer.addSuggestions(sugg.phrase, sugg.hits)) {
        container.fadeOut(function () {
          container.remove();
        } );
      }
    } );
  };


  /**
   * @class
   * */
  var ControllerExplorer = function (owner)
  {
    var self = this,
        els = owner.nodes,
        api = owner.api;

    /* Invoke base class constructor. */
    std.Controller.call(this, owner);

    this.id_ = null;
    this.folders_ = [ ];
    this.active_ = null;
    this.refreshing_ = false;
    this.events_ = new std.Events(
      this,
      [ 'refresh-begin',
        'refresh-end',
        'selected-folder',
        'selected-subfolder' ] );

    this.creating_ = null;
    this.selected_ = null;

    /* Drag and drop handler */
    this.dnd_ = new DragDropHandler(this);
    this.dnd_.on( {
      'drop-folder': this.on_dropped_in_folder_.bind(this),
      'drop-subfolder': this.on_dropped_in_subfolder_.bind(this)
    } );

    /* Initialise jstree. */
    this.tree_ = els.explorer.jstree( {
      core: {
        check_callback: true,
        multiple: false
      },
      plugins: [ "types", "contextmenu" /* "dnd" */ ],
      dnd: {
        check_while_dragging: false,
        is_draggable: function (nodes) {
          if(nodes instanceof Array) {
            return nodes.map(function (n) {
              return self.getByNode(n) !== null;
            } );
          }
        }
      },
      types: {
        "folder":    { "icon": "sd-folder"    },
        "subfolder": { "icon": "sd-subfolder" },
        "item":      { "icon": "jstree-file"  }
      },
      contextmenu: {
        items: function (node) {
          var obj = self.getAnyById(node.id),
              items = {
              "rename": {
                label: "Rename",
                icon: "glyphicon glyphicon-pencil",
                _disabled: true
              },
              "remove": {
                label: "Remove",
                icon: "glyphicon glyphicon-remove",
                _disabled: true
              }
            };

          if(obj instanceof Folder) {
            items["report"] = {
              label: "Export data",
              icon: "glyphicon glyphicon-download-alt",
              separator_before: true,
              action: function () { self.export(); }
            };
          } else if(obj instanceof Subfolder) {
            items["create"] = {
              label: "Create manual item",
              icon: "glyphicon glyphicon-plus",
              separator_before: true,
              action: function () { self.createItem(); }
            };
          } else if(obj instanceof Item) {
            items["jump"] = {
              label: "Jump to bookmarked page",
              icon: "glyphicon glyphicon-eye-open",
              separator_before: true,
              action: self.on_jump_bookmarked_page_.bind(self),
              _disabled: !obj.loaded
            };
          }

          return items;
        }
      }
    } ).jstree(true);

    owner.nodes.explorer.on( {
      "rename_node.jstree": function (ev, data) {
        if(self.creating_ === null)
          throw "Renaming of nodes not currently implemented";

        data.text = data.text.trim();

        if(data.text !== owner.options.folderNewCaption) {
          var f;

          if(self.creating_.parent === null) {
            f = new Folder(self, api.foldering.folderFromName(data.text));
            self.folders_.push(f);
            f.loading(true);

            api.foldering.addFolder(f.data)
              .done(function () {
                console.info("Successfully added folder", f.data);
              } )
              .fail(function () {
                owner.networkFailure.incident(
                  NetworkFailure.types.folder.add, f.data
                );
              } )
              .always(function () { f.loading(false); } );

            if(self.folders_.length === 1)
              self.tree_.select_node(f.id);
          } else if(self.creating_.obj instanceof Subfolder) {
            f = new api.foldering.subfolderFromName(
              self.creating_.parent.data,
              data.text);
            f = self.creating_.parent.add(f);
            if(self.creating_.descriptor)
              f.add(self.creating_.descriptor);
          } else if(self.creating_.obj instanceof ItemBase) {
            var p = self.creating_.parent;

            self.owner_.callbacks.invoke('createManualItem', data.text)
              .done(function (descriptor) {
                descriptor.subtopic_id =
                  self.generate_subtopic_id_(descriptor);

                if(descriptor.subtopic_id !== null)
                  p.add(descriptor);
              } );
          }
        }

        self.creating_.obj.reset();
        self.creating_ = null;
        self.update_empty_state_();
      },
      "before_open.jstree": function (ev, data) {
        var i = self.getAnyById(data.node.id);
        if(i !== null)
          i.open();
      },
      "after_open.jstree": function (ev, data) {
        var i = self.getAnyById(data.node.id);
        if(i !== null)
          i.onAfterOpen();
      },
      "dblclick.jstree": function (ev, data) {
        var i = self.getAnyById($(ev.target).closest("li").attr('id'));
        if(!i.opening) {
          if(i instanceof Subfolder) {
            i.open();

            if(i.items.length > 0)
              self.setActive(i.items[0]);
          } else if(i instanceof Item)
          self.setActive(i);
        }
      },
      "select_node.jstree": function (ev, data) {
        var i = self.getAnyById(data.node.id);

        if(i === null) {
          var sel = self.selected_ === null
                ? self.folders_[0].node
                : self.selected_.node;

          self.tree_.deselect_node(data.node);
          if(sel) self.tree_.select_node(sel);

          console.error("Unknown node type selected:", data);
        } else {
          self.selected_ = i;

          if(i instanceof Folder)
            self.events_.trigger('selected-folder');
          else if(i instanceof Subfolder)
            self.events_.trigger('selected-subfolder');
        }

        self.updateToolbar();
      }
    } );

    /* Hook up to toolbar events. */
    els.toolbar.actions.refresh.click(function () { self.refresh(); } );
    els.toolbar.actions.add.click(function () { self.createFolder(); } );
    els.toolbar.actions.report.click(function () { self.export(); } );

    els.toolbar.actions.addContextual.click(function () {
      if(self.selected_ instanceof Folder)
        self.createSubfolder(self.selected_);
      else if(self.selected_ instanceof Subfolder)
        self.createItem(self.selected_);
    } );

    els.toolbar.actions.remove.click(function () {
      console.info("Not implemented yet");
    } );

    els.toolbar.actions.rename.click(function () {
      console.info("Not implemented yet");
    } );

    els.toolbar.actions.jump.click(function () {
      self.on_jump_bookmarked_page_();
    } );

    /* Handle item dismissal. */
    this.owner_.sortingQueue.on('item-dismissed', function (item) {
      var query_id = api.getQueryContentId();

      if(query_id) {
        self.do_add_label_(new (api.getClass('Label'))(
          item.content_id,
          query_id,
          api.getAnnotator(),
          api.COREF_VALUE_NEGATIVE));
      }
    } );

    /* Define getters. */
    var def = Object.defineProperty;
    def(this, "id", { get: function () { return this.id_; } } );
    def(this, "name", { get: function () { return this.name_; } } );
    def(this, "active", { get: function () { return this.active_; } } );
    def(this, "tree", { get: function () { return this.tree_; } } );
    def(this, "selected", { get: function () { return this.selected_; } } );
    def(this, "api", { get: function () { return this.owner_.api; } } );
    def(this, "node", { get: function () {return this.owner_.nodes.explorer;}});
  };

  ControllerExplorer.prototype = Object.create(std.Controller.prototype);

  ControllerExplorer.prototype.initialise = function ()
  {
    this.refresh(true);
  };

  ControllerExplorer.prototype.refresh = function (init)
  {
    var self = this;

    if(this.refreshing_) {
      console.error("Already refreshing");
      return;
    }

    /* Stop ALL AJAX requests. */
    if(init !== true)
      this.api.getDossierJs().stop();

    /* Reset state and trigger refresh event. */
    this.refreshing_ = true;
    this.reset_tree_();
    this.events_.trigger('refresh-begin');
    this.updateToolbar(true);

    /* Hide empty notification while loading. */
    this.update_empty_state_(true);

    this.api.foldering.listFolders()
      .done(function (coll) {
        coll.forEach(function (f) {
          self.folders_.push(new Folder(self, f));
        } );
      } )
      .fail(function () {
        self.owner_.networkFailure.incident(
          NetworkFailure.types.folder.list, null
        );
      } )
      .always(function () {
        self.update_empty_state_();
        self.refreshing_ = false;
        self.events_.trigger('refresh-end');

        if(self.folders_.length > 0)
          self.tree_.select_node(self.folders_[0].id);
        else
          self.updateToolbar();

        console.log("Loaded folders:", self.folders_);
      } );
  };

  ControllerExplorer.prototype.construct = function (descriptor)
  {
    var map = { 'text': 'Bin',
                'image': 'BinImage' },
        type;

    if(!descriptor)
      throw "Invalid bin descriptor";

    /* Extract bin type. */
    type = this.api.getSubtopicType(descriptor.subtopic_id);

    if(!map.hasOwnProperty(type))
      throw "Invalid bin type: " + type;

    /* Finaly instantiate correct Bin class. */
    return this.owner_.constructor.instantiate(
      map[type],
      this,
      descriptor);
  };

  ControllerExplorer.prototype.reset = function ()
  {
    this.reset_tree_();
    this.dnd_.reset();

    /* Reset state. */
    this.id_ = this.folders_ = null;
    this.refreshing_ = this.events_ = this.dropTarget_ = null;
    this.dnd_ = null;
  };

  ControllerExplorer.prototype.createFolder = function ()
  {
    this.update_empty_state_(true);
    this.creating_ = {
      parent: null,
      obj: new FolderNew(this)
    };
  };

  ControllerExplorer.prototype.createSubfolder = function (
    folder, name, descriptor)
  {
    this.creating_ = {
      parent: folder,
      obj: new SubfolderNew(folder, name),
      descriptor: descriptor
    };
  };

  ControllerExplorer.prototype.export = function ()
  {
    if(!(this.selected_ instanceof Folder))
      return;

    this.owner_.callbacks.invoke('export', this.selected_.data.id);
  };

  ControllerExplorer.prototype.addSuggestions = function (title, suggestions)
  {
    if(!std.is_str(title) || (title = title.trim()).length === 0)
      throw 'Invalid or no title specified';
    else if(!std.is_arr(suggestions) || suggestions.length === 0)
      throw 'Invalid or no array of suggestions specified';

    if(!(this.selected_ instanceof Folder)) {
      window.alert('Please select a folder to add the soft selectors to.');
      return false;
    }

    var self = this,
        index = 0,
        subfolder = this.selected_.add(
          new this.owner.api.foldering.subfolderFromName(
            this.selected_.data, title));

    var on_loaded = function () { next(); };
    var next = function () {
      if(std.is_fn(this.off))
        this.off('loaded', on_loaded);

      if(index >= suggestions.length)
        return;

      var s = suggestions[index],
          descriptor = {
            id: (window.performance.now()*100000000000).toString(),
            type: 'manual',
            content_id: s.content_id,
            content: s.title
          };

      ++index;
      descriptor.subtopic_id = self.generate_subtopic_id_(descriptor);
      subfolder.add(descriptor)
        .on('loading-end', on_loaded);
    };
    next();

    return true;
  };

  ControllerExplorer.prototype.createItem = function (subfolder, name)
  {
    if(subfolder === undefined)
      subfolder = this.selected_;
    if(!(subfolder instanceof Subfolder)) {
      console.error("Invalid or no subfolder");
      return;
    }

    this.creating_ = {
      parent: subfolder,
      obj: new ItemNew(subfolder, name)
    };
  };

  ControllerExplorer.prototype.merge = function (dropped, dragged)
  {
    var label = new (this.api.getClass('Label'))(
          dropped.id,
          dragged.id,
          this.api.getAnnotator(),
          this.api.COREF_VALUE_POSITIVE,
          dropped.data.subtopic_id,
          dragged.data.subtopic_id);

    /* NOTE: since bins are UI creations and don't exist as such in the backend,
     * we always remove the bin regardless what the result is from adding the
     * label. */
    this.removeAt(this.indexOf(dragged));
    this.owner_.save();

    return this.do_add_label_(label);
  };

  ControllerExplorer.prototype.addLabel = function (item, descriptor)
  {
    var self = this;

    return this.updateFc(descriptor)
      .then(function (fc) {
        /* Create label between snippet/image and item. */
        var label = new (self.api.getClass('Label'))(
          item.data.content_id,
          descriptor.content_id,
          self.api.getAnnotator(),
          self.api.COREF_VALUE_POSITIVE,
          item.data.subtopic_id,
          descriptor.subtopic_id);

        return self.do_add_label_(label);
      },
      function () {
        console.error("Unable to add label between '%s' and '%s': "
                      + "feature collection not found",
                      item.id,
                      descriptor.content_id);
      } );
  };

  ControllerExplorer.prototype.each = function (callback)
  {
    var result = null;

    this.folders_.some(function (f) {
      if(callback(f)) {
        result = f;
        return true;
      }
    } );

    return result;
  };

  ControllerExplorer.prototype.indexOf = function (folder)
  {
    return this.folders_.indexOf(folder);
  };

  ControllerExplorer.prototype.remove = function (bin)
  {
    return this.removeAt(this.bins_.indexOf(bin));
  };

  ControllerExplorer.prototype.removeAt = function (index)
  {
    var bin;

    if(index < 0 || index >= this.bins_.length)
      throw "Invalid bin index";

    bin = this.bins_[index];
    this.bins_.splice(index, 1);

    bin.node.remove();

    if(bin === this.active_)
      this.setActive(this.bins_.length > 0 && this.bins_[0] || null);

    this.update_empty_state_();
  };

  ControllerExplorer.prototype.getAt = function (index)
  {
    if(index < 0 || index >= this.bins_.length)
      throw "Invalid bin index";

    return this.bins_[index];
  };

  ControllerExplorer.prototype.getById = function (id)
  {
    return this.each(function (folder) {
      return folder.id === id;
    } );
  };

  ControllerExplorer.prototype.getAnyById = function (id)
  {
    var result = null,
        search = function (coll, callback) {
          return coll.some(function (i) {
            if(i.id === id) {
              result = i; return true;
            } else if(callback)
              return callback(i);
          } );
        };

    return search(this.folders_, function (f) {
      return search(f.subfolders, function (sb) {
        return search(sb.items);
      } );
    } ) === true ? result : null;
  };

  ControllerExplorer.prototype.setActive = function (item)
  {
    /* Don't activate item if currently active already. */
    if(!(item instanceof Item))
      throw "Invalid or no item specified";
    else if(this.active_ === item)
      return;

    /* Stop all ongoing request at once. */
    this.api.getDossierJs().stop('API.search');

    /* Invoke API to activate the item. If successful, update UI state and force
     * a redraw of the items container. */
    if(this.active_)
      this.active_.deactivate();

    this.active_ = item;

    if(item) {
      item.activate();

      if(this.owner_.initialised) {
        this.api.setQueryContentId(item.data.content_id,
                                   item.data.subtopic_id);
        this.owner_.sortingQueue.items.redraw();
      }
    } else {
      /* There is no active subfolder, which means we need to clear the list of
       * items, but we only do so *after* the query content id has been set
       * since Sorting Queue will attempt to refresh the items list. */
      this.reset_query_();
    }

    /* Finally, trigger event. */
    this.owner_.events.trigger('active', this.active_);
  };

  ControllerExplorer.prototype.updateActive = function ()
  {
    if(this.active_)
      this.active_.activate();
  };

  ControllerExplorer.prototype.updateFc = function (descriptor,
                                                    readonly /* = false */)
  {
    var self = this;

    /* Attempt to retrieve the feature collection for the bin's content id. */
    return this.api.getFeatureCollection(descriptor.content_id)
      .then(function (fc) {
        console.log("Feature collection GET successful (id=%s)",
                    descriptor.content_id);

        /* A feature collection was received. No further operations are carried
         * out if `readonly´ is true; otherwise its contents are updated. */
        if(!readonly) {
          self.set_fc_content_(fc, descriptor);
          return self.do_update_fc_(descriptor.content_id, fc);
        }

        return fc;
      },
      function () {
        /* It was not possible to retrieve the feature collection for this
         * descriptor's content id. */
        if(readonly) {
          console.error("Feature collection GET failed: "
                        + "NOT creating new (id=%s)",
                        descriptor.content_id);
          return null;
        }

        console.info("Feature collection GET failed: creating new (id=%s)",
                     descriptor.content_id);
        return self.api.createFeatureCollection(descriptor.content_id,
                                                descriptor.document)
          .done(function(fc) {
            console.log('Feature collection created: (id=%s)',
                        descriptor.content_id);

            self.set_fc_content_(fc, descriptor);
            self.api.setFeatureCollectionContent(
              fc, 'meta_url', descriptor.href.toString());

            return self.do_update_fc_(descriptor.content_id, fc);
          } )
          .fail(function () {
            self.owner_.networkFailure.incident(
              NetworkFailure.types.fc.create, descriptor);
          } );
      } );
  };

  ControllerExplorer.prototype.updateToolbar = function (loading)
  {
    var ela = this.owner_.nodes.toolbar.actions;
    loading = loading === true;

    ela.add.toggleClass('disabled', loading);

    ela.addContextual.toggleClass(
      'disabled',
      loading || !this.selected_
        || this.selected_ instanceof Item
        || (this.selected_ instanceof Subfolder
            && (!this.selected_.loaded
                || this.selected_.loading())));

    ela.jump.toggleClass(
      'disabled', loading || !(this.selected_ instanceof Item
             && this.selected_.loaded));

    ela.refresh.toggleClass('disabled', loading);
    ela.report.toggleClass('disabled', loading
                           || !(this.selected_ instanceof Folder))
  };

  /* Private interface */
  ControllerExplorer.prototype.set_fc_content_ = function (fc, descriptor)
  {
    var set = this.api.setFeatureCollectionContent;
    set(fc, descriptor.subtopic_id, descriptor.content);

    if(descriptor.type === 'image'
       && std.is_str(descriptor.data)
       && descriptor.data.length > 0)
    {
      set(fc, this.api.makeRawSubId(descriptor.subtopic_id, "data"),
          descriptor.data);
    }
  };

  ControllerExplorer.prototype.reset_query_ = function ()
  {
    this.api.getDossierJs().stop('API.search');
    this.api.setQueryContentId(null);
    this.owner_.sortingQueue.items.removeAll(false);
  };

  ControllerExplorer.prototype.do_update_fc_ = function (content_id, fc)
  {
    var self = this;

    return this.api.putFeatureCollection(content_id, fc)
      .done(function () {
        console.log("Feature collection PUT successful (id=%s)",
                    content_id);
      } )
      .fail(function () {
        self.owner_.networkFailure.incident(
          NetworkFailure.types.fc.save, {
            content_id: content_id, fc: fc
          } );
      } );
  };

  ControllerExplorer.prototype.do_add_label_ = function (label)
  {
    var self = this;

    return this.api.addLabel(label)
      .done(function () {
        console.log("Label ADD successful: '%s' %s '%s'",
                    label.cid1,
                    label.coref_value === self.api.COREF_VALUE_POSITIVE
                    ? '==' : '!=',
                    label.cid2);
      } )
      .fail(function () {
        self.owner_.networkFailure.incident(
          NetworkFailure.types.label, label
        );
      } );
  };

  ControllerExplorer.prototype.update_empty_state_ = function (hide)
  {
    var o = this.owner_;

    o.nodes.empty.stop();

    if(hide === true)
      o.nodes.empty.fadeOut(o.options.delays.emptyHide);
    else if(this.folders_.length === 0)
      o.nodes.empty.fadeIn(o.options.delays.emptyFadeIn);
    else
      o.nodes.empty.fadeOut(o.options.delays.emptyFadeOut);
  };

  ControllerExplorer.prototype.reset_tree_ = function ()
  {
    /* Reset every folder contained. */
    this.folders_.forEach(function (f) {
      f.reset();
    } );

    /* Reset relevant state. */
    this.folders_ = [ ];
    this.selected_ = this.creating_ = this.active_ = null;

    this.reset_query_();
  };

  ControllerExplorer.prototype.on_dropped_in_folder_ = function (ev, folder)
  {
    var self = this;

    this.get_selection_().done(function (result) {
      self.createSubfolder(
        folder, result.type === 'image'
          ? (result.caption || result.content.split('/').splice(-1)[0])
          : result.content,
        result);
    } );
  };

  ControllerExplorer.prototype.on_dropped_in_subfolder_ = function (
    ev, subfolder)
  {
    var self = this;

    this.get_selection_().done(function (result) {
      try {
        subfolder.add(result);
      } catch (x) {
        std.on_exception(x);
      }
    } );
  };

  ControllerExplorer.prototype.on_jump_bookmarked_page_ = function ()
  {
    if(this.selected_ !== null) {
      if(this.selected_ instanceof Item)
        this.selected_.jump();
      else
        console.error("Selected node not an item");
    } else
      console.error("No selected nodes found");
  };

  ControllerExplorer.prototype.get_selection_ = function ()
  {
    var self = this,
        deferred = $.Deferred();

    this.owner_.callbacks.invoke("getSelection").done(function (result) {
      if(!std.is_obj(result)) {
        console.info("No selection content retrieved");
        deferred.reject();
      }

      console.log("Got selection content: type=%s", result.type /*, result */);

      result.subtopic_id = self.generate_subtopic_id_(result);
      if(result.subtopic_id === null)
        deferred.reject();
      else
        deferred.resolve(result);
    } );

    return deferred.promise();
  };

  ControllerExplorer.prototype.generate_subtopic_id_ = function (descriptor)
  {
    switch(descriptor.type) {
    case 'image':
      return this.api.makeRawImageId(
        this.api.generateSubtopicId(descriptor.id));
    case 'text':
      return this.api.makeRawTextId(
        this.api.generateSubtopicId(descriptor.id));
    case 'manual':
      return this.api.makeRawCustomId(
        this.api.generateSubtopicId(descriptor.id), "manual");
    default:
      console.error("Invalid selection type");
      return null;
    }
  };


  /**
   * @class
   * */
  var ItemBase = function (owner)
  {
    /* Invoke base class constructor. */
    std.Drawable.call(this, owner);

    /* Getters */
    var def = Object.defineProperty;
    def(this, 'id', { get: function () { return this.id_; } } );
    def(this, 'controller', { get: function () {return this.controller_;}});
    def(this, 'api', { get: function () { return this.controller_.api; } } );
    def(this, 'tree', { get: function () { return this.controller_.tree; } } );
    def(this, 'opening', { get: function () { return this.opening_; } } );
    def(this, 'events', { get: function () { return this.events_; } } );
    def(this, 'loaded', { get: function () { return this.loaded_; } } );

    def(this, 'node', { get: function () {
      return this.controller.tree.get_node(this.id_, true); } } );

    def(this, 'nodeData', { get: function () {
      return this.controller.tree.get_node(this.id_); } } );

    /* Attributes */
    var ctrl = owner;
    while(ctrl !== null && !(ctrl instanceof ControllerExplorer))
      ctrl = ctrl.owner;

    if(ctrl === null)
      throw "Controller not found";

    this.controller_ = ctrl;
    this.loading_ = 0;
    this.id_ = null;
    this.opening_ = false;
    this.loaded_ = false;
    this.events_ = new std.Events(
      this,
      [ 'loading-start', 'loading-end', 'ready' ] );

    this.on( {
      "loading-end": function () {
        ctrl.updateToolbar();
      },
      "loaded": function () {
        ctrl.updateToolbar();
      }
    } );
  };

  ItemBase.prototype.open = function ()
  {
    /* Don't attempt to open if already opening as it will result in a stack
     * overflow error and catastrophic failure. */
    if(!this.opening_) {
      this.opening_ = true;
      this.tree.open_node(this.id_);
    }
  };

  ItemBase.prototype.onAfterOpen = function ()
  { this.opening_ = false; };

  ItemBase.prototype.setLoaded = function (state)
  {
    this.loaded_ = state;

    if(state)
      this.events_.trigger('loaded');
  };

  ItemBase.prototype.loading = function (state /* = true */)
  {
    if(arguments.length === 0)
      return this.loading_ > 0;

    if(state === false) {
      if(this.loading_ <= 0)
        console.error("Loading count is 0");
      else if(--this.loading_ === 0) {
        this.removeClass("jstree-loading");
        this.events_.trigger('loading-end');
      }
    } else if(state === true) {
      if(++this.loading_ === 1)
        this.events_.trigger('loading-begin');
    }

    /* Always force class. */
    if(this.loading_ > 0)
      this.addClass("jstree-loading");
  };

  ItemBase.prototype.addClass = function (cl)
  {
    var n = this.nodeData.li_attr,
        coll;

    if(n === undefined) return;
    coll = this.get_classes_(n);

    if(coll.indexOf(cl) === -1) {
      coll.push(cl);
      n.class = coll.join(' ');
      this.node.addClass(cl);
    }
  };

  ItemBase.prototype.removeClass = function (cl)
  {
    if(this.nodeData === undefined) return;

    var n = this.nodeData.li_attr,
        coll, ndx;

    if(n === undefined) return;
    coll = n.class.split(' ');
    ndx = coll.indexOf(cl);

    if(ndx >= 0) {
      coll.splice(ndx, 1);
      n.class = coll.join(' ');
      this.node.removeClass(cl);
    } else
      console.warn("CSS class not found: %s", cl);
  };

  ItemBase.prototype.get_classes_ = function (attr)
  {
    if(!std.is_str(attr.class)) {
      attr.class = '';
      return [ ];
    }

    return attr.class.split(' ');
  };


  /**
   * @class
   * */
  var Folder = function (owner, folder)
  {
    /* Invoke base class constructor. */
    ItemBase.call(this, owner);

    /* Getters */
    var def = Object.defineProperty;
    def(this, 'data', { get: function () { return this.folder_; } } );
    def(this, 'subfolders', { get: function () { return this.subfolders_; } });

    /* Initialisation sequence. */
    if(!std.is_obj(folder))
      throw "Invalid or no folder descriptor provided";

    /* Attributes */
    this.folder_ = folder;
    this.subfolders_ = [ ];

    /* Retrieve all subfolders for this folder. */
    var self = this;

    /* Render now. */
    this.render();

    /* If the folder was loaded from persistent storage load its subfolders
     * now. */
    if(folder.exists) {
      this.loading(true);

      this.api.foldering.listSubfolders(folder)
        .done(function (coll) {
          coll.forEach(function (sf) {
            self.subfolders_.push(new Subfolder(self, sf));
          } );
        } )
        .fail(function () {
          self.controller.owner.networkFailure.incident(
            NetworkFailure.types.folder.load, folder);
        } )
        .always(function () {
          self.loading(false);
        } );
    }
  };

  Folder.prototype = Object.create(ItemBase.prototype);

  Folder.prototype.render = function ()
  {
    this.id_ = this.tree.create_node(
      null, { state: 'open', text: this.folder_.name, type: 'folder'},
      "last");

    if(this.id_ === false)
      throw "Failed to create folder";
  };

  Folder.prototype.reset = function ()
  {
    this.subfolders_.forEach(function (s) { s.reset(); } );
    this.tree.delete_node(this.tree.get_node(this.id_));

    this.subfolders_ = this.folder_ = this.id_ = null;
  };

  Folder.prototype.add = function (subfolder)
  {
    var sf = new Subfolder(this, subfolder);
    this.subfolders_.push(sf);
    return sf;
  };


  /**
   * @class
   * */
  var FolderNew = function (owner)
  {
    /* Invoke base class constructor. */
    Folder.call(this, owner,
                owner.owner.api.foldering.folderFromName("<fake>"));
  };

  FolderNew.prototype = Object.create(Folder.prototype);

  FolderNew.prototype.render = function ()
  {
    var self = this;

    this.id_ = this.tree.create_node(
      null, { state: 'open', text: "", type: "folder" }, "last");

    if(this.id_ === false)
      throw "Failed to create folder";

    this.tree.edit(this.tree.get_node(this.id_),
                   this.owner_.owner.options.folderNewCaption);

    /* TODO: remove hardcoded timeout.
     * Scrolling into view has to be on a timeout because JsTree performs a
     * slide down animation. */
    window.setTimeout(function () { self.node.get(0).scrollIntoView(); }, 200);
  };


  /**
   * @class
   * */
  var Subfolder = function (owner, subfolder)
  {
    /* Invoke base class constructor. */
    ItemBase.call(this, owner);

    /* Getters */
    var def = Object.defineProperty;
    def(this, 'data', {get:function () { return this.subfolder_; }});
    def(this, 'items', {get:function () { return this.items_; }});

    /* Initialisation sequence. */
    if(!std.is_obj(subfolder))
      throw "Invalid or no subfolder descriptor provided";

    /* Attributes */
    this.subfolder_ = subfolder;
    this.items_ = [ ];
    this.setLoaded(!subfolder.exists);
    this.fake_ = null;

    this.render();
  };

  Subfolder.prototype = Object.create(ItemBase.prototype);

  Subfolder.prototype.reset = function ()
  {
    this.items_.forEach(function (i) { i.reset(); } );
    this.tree.delete_node(this.tree.get_node(this.id_));

    this.subfolder_ = this.id_ = this.items_ = null;
  };

  Subfolder.prototype.render = function ()
  {
    this.id_ = this.tree.create_node(
      this.owner_.id,
      { state: 'open',
        text: this.subfolder_.name,
        type: "subfolder"},
      "last");

    if(this.id_ === false)
      throw "Failed to create subfolder";

    if(!this.loaded_)
      this.create_fake_();

    this.owner_.open();
  };

  Subfolder.prototype.open = function ()
  {
    if(this.opening_)
      return;

    this.opening_ = true;

    /* Remove fake node, if one exists. */
    if(this.fake_ !== null) {
      this.tree.delete_node(this.fake_);
      this.fake_ = null;
    }

    /* Retrieve all items for this subfolder, if not yet loaded. */
    if(!this.loaded_) {
      var self = this;

      /* Set the `loaded_´ flag to true now to prevent entering here again. */
      this.loaded_ = true;
      this.loading(true);

      this.api.foldering.listItems(this.subfolder_)
        .done(function (coll) {
          coll.forEach(function(i) {
            try {
              self.items_.push(Item.construct(self, i));
            } catch(x) { std.on_exception(x); }
          } );

          self.tree.open_node(self.id);
          self.loading(false);
          self.setLoaded(true);
        } )
        .fail(function () {
          self.loading(false);
          self.setLoaded(false);
          self.tree.close_node(self.id);
          self.create_fake_();
          self.controller.owner.networkFailure.incident(
            NetworkFailure.types.subfolder.load, self.subfolder_
          );

        } );
    } else
      this.tree.open_node(this.id);
  };

  Subfolder.prototype.add = function (descriptor)
  {
    var self = this,
        item, obj;

    if(!std.is_obj(descriptor))
      throw "Invalid or no descriptor specified";

    /* First create `Api.Item´ instance after generating a valid content_id, if
     * it isn't already present in the descriptor, and then create and contain
     * our UI representation of an item.*/
    if(!descriptor.hasOwnProperty('content_id'))
      descriptor.content_id = this.api.generateContentId(descriptor.href);

    item = new this.api.foldering.Item(this.data, descriptor);

    /* Pass in `descriptor´ because we don't want it to retrieve the item's
     * feature collection; it doesn't exist yet. */
    obj = Item.construct(this, item, descriptor);
    this.items_.push(obj);

    /* Add item to subfolder in persistent storage. */
    this.api.foldering.addItem(this.subfolder_, item)
      .done(function () {
        console.info("Successfully added item to subfolder: id=%s",
                     item.subtopic_id);
      } )
      .fail(function () {
        self.controller.owner.networkFailure.incident(
          NetworkFailure.types.subfolder.add, descriptor
        );
      } )

    return obj;
  };

  Subfolder.prototype.remove = function (item)
  {
    var index = this.items_.indexOf(item);

    if(index < 0)
      throw "Item not contained: not removing";

    item.reset();
    this.items_.splice(index, 1);

    if(this.controller.active === item)
      this.controller.setActive(null);
  };

  /* Private interface */
  Subfolder.prototype.create_fake_ = function ()
  {
    if(this.fake_ !== null)
      throw "Fake node already exists";
    else if(this.id_ === null)
      throw "Subfolder not yet rendered";

    this.fake_ = this.tree.create_node(
      this.id_, { text: '<placeholder>' }, "last");
  };


  /**
   * @class
   * */
  var SubfolderNew = function (owner, name)
  {
    var o = owner.owner.owner;

    /* Invoke base class constructor. */
    Subfolder.call(
      this, owner,
      o.api.foldering.subfolderFromName(
        owner.data,
        name || o.options.folderNewCaption));
  };

  SubfolderNew.prototype = Object.create(Subfolder.prototype);

  SubfolderNew.prototype.render = function ()
  {
    var self = this,
        o = this.owner_;

    this.id_ = this.tree.create_node(
      this.owner_.id,
      { state: 'open',
        text: this.subfolder_.name,
        type: "subfolder" },
      "last");

    if(this.id_ === false)
      throw "Failed to create subfolder";

    o.open();
    this.tree.edit(this.id);

    /* TODO: remove hardcoded timeout.
     * Scrolling into view has to be on a timeout because JsTree performs a
     * slide down animation. */
    window.setTimeout(function () { self.node.get(0).scrollIntoView(); }, 200);
  };


  /**
   * @class
   * */
  var Item = function (owner, item, /* optional */ descriptor)
  {
    if(!(owner instanceof Subfolder))
      throw "Invalid or no owner specified: not `Subfolder´ instance";

    /* Invoke base class constructor. */
    ItemBase.call(this, owner);

    /* Getters */
    var def = Object.defineProperty;
    def(this, 'data', {get:function () { return this.item_; }});
    def(this, 'fc', {get:function () { return this.fc_; }});

    /* Initialisation sequence. */
    if(!(item instanceof this.api.foldering.Item))
      throw "Invalid or no item descriptor provided";

    /* Attributes */
    this.item_ = item;

    var self = this,
        ready = function () {
          if(self.id_ === null)
            self.render();

          /* Set this as active item if none set yet. */
          if(self.controller.active === null)
            self.controller.setActive(self);

          self.events_.trigger('ready');
        };

    /* Retrieve item's subtopic content from feature collection if `descriptor´
     * was not specified. */
    this.owner_.loading(true);

    if(!descriptor) {
      this.api.getFeatureCollection(item.content_id)
        .done(function (fc) { if(self.onGotFeatureCollection(fc)) ready(); } )
        .fail(function ()   { self.onGotFeatureCollection(null); } );
    } else {
      this.item_.content = descriptor.content;
      this.item_.data = descriptor.data;
      this.render();
      this.loading(true);

      /* Create or update feature collection. */
      this.controller.updateFc(descriptor, false)
        .done(function (fc) { self.onGotFeatureCollection(fc);   } )
        .fail(function ()   { self.onGotFeatureCollection(null); } )
        .always(function () { self.loading(false); } );
    }
  };

  /* Static methods */
  Item.construct = function (subfolder, item, descriptor)
  {
    if(!(subfolder instanceof Subfolder))
      throw "Invalid or no subfolder specified";

    var api = subfolder.api;
    if(!(item instanceof api.foldering.Item))
      throw "Invalid or no item specified";

    switch(api.getSubtopicType(item.subtopic_id)) {
    case 'image': return new ItemImage(subfolder, item, descriptor);
    case 'manual':
    case 'text':  return new ItemText (subfolder, item, descriptor);
    }

    throw "Invalid item type: " + api.getSubtopicType(item.subtopic_id);
  };

  /* Interface */
  Item.prototype = Object.create(ItemBase.prototype);

  Item.prototype.reset = function ()
  {
    this.tree.delete_node(this.tree.get_node(this.id_));
    this.item_ = this.id_ = null;
  };

  /* overridable */ Item.prototype.onGotFeatureCollection = function (fc)
  {
    var remove = false;

    if(!fc) remove = true;
    else {
      this.fc_ = fc;

      /* Return if the item has been reset meanwhile. */
      if(this.item_ === null) return;

      /* If this item does not yet have content, it exists and thus its feature,
       * given by its subtopic id, must exist in the feature collection.
       * Otherwise, the item is being created. */
      if(!this.item_.content) {
        this.item_.content = fc.feature(this.item_.subtopic_id);
        remove = !this.item_.content;
      }
    }

    this.setLoaded(!remove);
    this.owner_.loading(false);

    if(remove) {
      console.warn("Item's feature collection or content could not be "
                   + "retrieved: id=%s",
                   this.item_.subtopic_id);
      this.owner_.remove(this);
      return false;
    }

    return true;
  };

  Item.prototype.activate = function ()
  {
    this.addClass(Css.active);
  };

  Item.prototype.deactivate = function ()
  {
    this.removeClass(Css.active);
  };

  Item.prototype.jump = function ()
  {
    if(std.is_obj(this.fc_.raw) && std.is_str(this.fc_.raw.meta_url)) {
      var win = window.open(this.fc_.raw.meta_url, "_blank");
      win.focus();
    } else
      console.warn("No meta URL in feature collection");
  };


  /**
   * @class
   * */
  var ItemText = function (owner, subfolder, /* optional */ content)
  {
    /* Invoke base class constructor. */
    Item.call(this, owner, subfolder, content);
  };

  ItemText.prototype = Object.create(Item.prototype);

  ItemText.prototype.render = function ()
  {
    this.id_ = this.tree.create_node(
      this.owner_.id,
      { state: 'open', text: this.item_.content, type: 'item' },
      "last");

    if(this.id_ === false)
      throw "Failed to create subfolder";

    this.owner_.open();
  };


  /**
   * @class
   * */
  var ItemImage = function (owner, subfolder, /* optional */ content)
  {
    /* Invoke base class constructor. */
    Item.call(this, owner, subfolder, content);
  };

  ItemImage.prototype = Object.create(Item.prototype);

  ItemImage.prototype.onGotFeatureCollection = function (fc)
  {
    /* Delegate to base class' method to retrieve the item's feature
     * collection.  If successful, retrieve the item's data since here, the item's
     * data may contain the actual image data. */
    if(Item.prototype.onGotFeatureCollection.call(this, fc)) {
      this.item_.data = fc.feature(
        this.api.makeRawSubId(this.item_.subtopic_id, 'data'));
      return true;
    }

    return false;
  };

  ItemImage.prototype.render = function ()
  {
    this.id_ = this.tree.create_node(
      this.owner_.id,
      { state: 'open',
        type: 'item',
        text: [ '<img src="', this.item_.data || this.item_.content,
                '" />' ].join('') },
      "last");

    if(this.id_ === false)
      throw "Failed to create subfolder";

    this.owner_.open();
  };


  /**
   * @class
   * */
  var ItemNew = function (owner, name)
  {
    /* Invoke base class constructor. */
    ItemBase.call(this, owner);

    this.name_ = name;
    this.render();
  };

  ItemNew.prototype = Object.create(ItemBase.prototype);

  ItemNew.prototype.render = function ()
  {
    var self = this,
        o = this.owner_;

    this.id_ = this.tree.create_node(
      this.owner_.id,
      { state: 'open',
        text: this.name_,
        type: "item" },
      "last");

    if(this.id_ === false)
      throw "Failed to create manual item";

    o.open();
    this.tree.edit(this.id_);

    /* TODO: remove hardcoded timeout.
     * Scrolling into view has to be on a timeout because JsTree performs a
     * slide down animation. */
    window.setTimeout(function () { self.node.get(0).scrollIntoView(); }, 200);
  };

  ItemNew.prototype.reset = function ()
  {
    this.tree.delete_node(this.tree.get_node(this.id_));
  };


  /**
   * class
   * */
  var DragDropHandler = function (owner)
  {
    std.Owned.call(this, owner);

    /* Attributes */
    this.sd_ = owner.owner;
    this.target_ = null;
    this.timer_ = null;
    this.exit_ = true;
    this.events_ = new std.Events(this, [ 'drop-folder', 'drop-subfolder' ]);

    /* Initialisation sequence */
    var self = this;
    this.sd_.nodes.explorer.on( {
      "dragover":  function (ev){self.on_dragging_enter_(ev);return false;},
      "dragenter": function (ev){self.on_dragging_enter_(ev);return false;},
      "dragleave": function (ev){self.on_dragging_exit_(ev); return false;},
      "drop": function (ev)
      {
        var ent = self.on_dragging_exit_(ev);

        /* Prevent triggering default handler. */
        ev.originalEvent.preventDefault();

        if(ent instanceof Folder)
          self.events_.trigger('drop-folder', ev, ent);
        else if(ent instanceof Subfolder)
          self.events_.trigger('drop-subfolder', ev, ent);

        return false;
      }
    } );
  };

  DragDropHandler.TIMEOUT_CLEAR_TARGET = 250;

  DragDropHandler.prototype = Object.create(std.Owned.prototype);

  DragDropHandler.prototype.reset = function ()
  {
    this.sd_.nodes.explorer.off();
    this.target_ = this.sd_ = null;
  };

  DragDropHandler.prototype.clear_target_ = function (now)
  {
    var self = this;

    if(this.timer_ !== null) {
      this.do_clear_target_();
      window.clearTimeout(this.timer_);
    }

    this.timer_ = window.setTimeout(function () {
      if(self.target_ !== null)
        self.do_clear_target_();

        self.timer_ = null;
    }, now === true ? 0 : DragDropHandler.TIMEOUT_CLEAR_TARGET);
  };

  DragDropHandler.prototype.do_clear_target_ = function ()
  {
    if(this.target_ !== null) {
      this.target_.removeClass(Css.droppable.hover);
      this.target_ = null;
    }
  };

  DragDropHandler.prototype.set_target_ = function (el)
  {
    if(this.target_ !== null && !std.$.same(this.target_, el))
      this.target_.removeClass(Css.droppable.hover);

    this.target_ = el;
  };

  DragDropHandler.prototype.on_dragging_enter_ = function (ev)
  {
    this.exit_ = false;
    ev = ev.originalEvent;

    var self = this,
        to = ev.toElement || ev.target,
        el = to && to.nodeName.toLowerCase() === 'a' && to || false;

    if(el && el.parentNode && el.parentNode.id) {
      var fl = this.owner_.getAnyById(el.parentNode.id);

      if(std.instanceany(fl, Folder, Subfolder)) {
        el = $(el);

        /* Clear target immediately if current target not the same as active
         * element.  If it is the same, return straight away since we already
         * know the selection is valid (see below). */
        if(this.target_ !== null) {
          if(std.$.same(this.target_, el))
            return fl;

          this.clear_target_(true);
        }

        /* Disallow drops when folder/subfolder is in a loading state. */
        if(fl.loading())
          return fl;

        var d = this.sd_.callbacks.invokeMaybe("checkSelection");
        if(d === null)
          this.on_selection_queried_(el, true);
        else {
          d.done(function (result) {
            self.on_selection_queried_(el, result);
          } );
        }

        return fl;
      }
    }

    this.clear_target_();
    return null;
  };

  DragDropHandler.prototype.on_selection_queried_ = function (el, result)
  {
    /* Return straight away if there is a target already active, the
     * drag event terminated meanwhile or the selection check failed.
     * */
    if(this.target_ !== null || this.exit_ || result !== true)
      return;

    el.addClass(Css.droppable.hover);
    this.set_target_(el);
  };

  DragDropHandler.prototype.on_dragging_exit_ = function (ev)
  {
    this.exit_ = true;
    this.clear_target_(true);
    ev = ev.originalEvent;

    var to = ev.toElement || ev.target,
        el = to && to.nodeName.toLowerCase() === 'a' && to || false;

    if(el && el.parentNode && el.parentNode.id) {
      var fl = this.owner_.getAnyById(el.parentNode.id);

      if(std.instanceany(fl, Folder, Subfolder) && !fl.loading())
        return fl;
    }

    return null;
  };


  /**
   * @class
   * */
  var NetworkFailure = function (owner)
  {
    std.Owned.call(this, owner);
  };

  /* Constants */
  NetworkFailure.types = {
    folder: {
      list: 'folder-list',
      add: 'folder-add',
      load: 'folder-load'
    },
    subfolder: {
      load: 'subfolder-load',
      add: 'subfolder-add'
    },
    dismissal: 'item-dismissal',
    fc: {
      create: 'fc-create',
      save: 'fc-save'
    },
    label: 'label-add'
  };

  NetworkFailure.prototype = Object.create(std.Owned.prototype);

  NetworkFailure.prototype.incident = function (type, data)
  {
    this.owner_.callbacks.invokeMaybe('networkFailure', type, data);
  };


  /* Css classes */
  var Css = {
    clear: 'sd-clear',
    active: 'sd-active',
    disabled: 'sd-disabled',
    droppable: {
      hover: 'sd-droppable-hover'
    }
  };


  /* Default options */
  var defaults_ = {
    delays: {                   /* In milliseconds.     */
      binRemoval: 200,          /* Bin is removed from container. */
      addBinShow: 200,          /* Fade in of temporary bin when adding. */
      emptyFadeIn: 250,
      emptyFadeOut: 100,
      emptyHide: 50
    },
    constructors: {
      ControllerExplorer: ControllerExplorer
    },
    container: null,
    folderNewCaption: "Enter folder name",
    suggestion: {
      id: 'sd-suggestion'
    }
  };


  /* Module public API */
  return {
    Sorter: Sorter,
    ControllerExplorer: ControllerExplorer,
    NetworkFailure: NetworkFailure
  };

}, this);
