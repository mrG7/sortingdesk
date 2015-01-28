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


/**
 * The Sorting Desk module.
 *
 * @returns an object containing the module's public interface.
 * */
var SortingDesk_ = function (window, $, sq, std, Api) {


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

    /* TODO: must pass in Dossier API URL. */
    this.api_ = Api.initialize(this, opts.dossierUrl);
    this.options_ = $.extend(true, $.extend(true, {}, defaults_), opts);
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
    this.sortingQueue_ = new sq.Sorter(
      $.extend(true, this.options_.sortingQueue.options, {
        loadItemsAtStartup: false /* IMPORTANT: Explicitly deny loading of items
                                   * at startup as this would potentially break
                                   * request-(start|stop) event handlers set up
                                   * only *AFTER* this constructor exits. */
      }),
      $.extend(this.api_.getCallbacks(),
               this.options_.sortingQueue.callbacks || { } ));
  };

  Sorter.prototype = {
    initialised_: false,
    callbacks_: null,
    events_: null,
    constructor_: null,
    options_: null,
    nodes_: null,

    /* Instances */
    api_: null,
    sortingQueue_: null,
    explorer_: null,
    
    /* Getters */
    get sortingQueue () { return this.sortingQueue_; },
    get initialised ()  { return this.initialised_; },
    get constructor ()  { return this.constructor_; },
    get callbacks ()    { return this.callbacks_; },
    get events ()       { return this.events_; },
    get api ()          { return this.api_; },
    get resetting ()    { return this.sortingQueue_.resetting(); },
    get options ()      { return this.options_; },
    get nodes ()        { return this.nodes_; },
    get explorer ()     { return this.explorer_; },

    /* Interface */
    initialise: function ()
    {
      if(this.initialised_)
        throw "Sorting Desk component already initialised";

      var self = this,
          finder = new std.NodeFinder('sorting-desk', this.options_.container),
          els;
      
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
            addSubfolder: this.find('toolbar-add-subfolder'),
            remove: this.find('toolbar-remove'),
            rename: this.find('toolbar-rename'),
            refresh: this.find('toolbar-refresh')
          }
        };
      } );

      /* Begin instantiating and initialising controllers.
       *
       * Start by explicitly initialising SortingQueue's instance and proceed to
       * initialising our own instance. */
      this.sortingQueue_.initialise();

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
    }
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
    this.events_ = new std.Events(this, [ 'refresh-begin', 'refresh-end' ] );
    this.creating_ = null;
    this.selected_ = null;

    /* Initialise jstree. */
    this.tree_ = els.explorer.jstree( {
      core: {
        check_callback: true,
        multiple: false
      },
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
      plugins: [ "types" /* "dnd" */ ]
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

            api.foldering.addFolder(f.data)
              .done(function () {
                console.info("Successfully added folder", f.data);
              } )
              .fail(function () {
                console.error("Failed to add folder", f.data);
              } );

            if(self.folders_.length === 1)
              self.tree_.select_node(f.id);
          } else {
            f = new api.foldering.subfolderFromName(
              self.creating_.parent.data,
              data.text);
            self.creating_.parent.add(f);
          }
        }
        
        self.creating_.obj.reset();
        self.creating_ = null;
        self.update_empty_state_();
      },
      "dblclick.jstree": function (ev, data) {
        var i = self.getAnyById($(ev.target).closest("li").attr('id'));
        if(i instanceof Subfolder) {
          if(i.items.length > 0)
            self.setActive(i.items[0]);
        } if(i instanceof Item)
          self.setActive(i);
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
          console.log("Current selected node: ", self.selected_);
        }
        
        self.update_toolbar_();
      },
      "after_open.jstree": function (ev) {
        self.updateActive();
      },
      "dragover":  function (ev){self.on_dragging_enter_(ev);return false;},
      "dragenter": function (ev){self.on_dragging_enter_(ev);return false;},
      "dragleave": function (ev){self.on_dragging_exit_(ev); return false;},
      "drop": function (ev)
      {
        var ent = self.on_dragging_exit_(ev);

        /* Prevent triggering default handler. */
        ev.originalEvent.preventDefault();

        if(ent instanceof Folder)
          self.on_dropped_in_folder_(ev, ent);
        else if(ent instanceof Subfolder)
          self.on_dropped_in_subfolder_(ev, ent);
        
        return false;
      }
    } );

    /* Hook up to toolbar events. */
    els.toolbar.actions.refresh.click(function () { self.refresh(); } );
    els.toolbar.actions.add.click(function () { self.createFolder(); } );

    els.toolbar.actions.addSubfolder.click(function () {
      if(self.selected_ instanceof Folder)
        self.createSubfolder(self.selected_);
    } );

    els.toolbar.actions.remove.click(function () {
      console.info("Not implemented yet");
    } );

    els.toolbar.actions.rename.click(function () {
      console.info("Not implemented yet");
    } );

    /* Handle item dismissal. */
    this.owner_.sortingQueue.on('item-dismissed', function (item) {
      var query_id = api.getQueryContentId();

      if(query_id) {
        self.doAddLabel_(new (api.getClass('Label'))(
          item.content_id,
          query_id,
          api.getAnnotator(),
          api.COREF_VALUE_NEGATIVE));
      }
    } );
    
    /* Define getters. */
    this.__defineGetter__("id", function () { return this.id_; } );
    this.__defineGetter__("name", function () { return this.name_; } );
    this.__defineGetter__("active", function () { return this.active_; } );
    this.__defineGetter__("tree", function () { return this.tree_; } );
    this.__defineGetter__("selected", function () { return this.selected_; } );
    this.__defineGetter__("api", function () { return this.owner_.api; } );
    
    this.__defineGetter__("node", function () {
      return this.owner_.nodes.explorer;
    } );
  };

  ControllerExplorer.prototype = Object.create(std.Controller.prototype);

  ControllerExplorer.prototype.initialise = function ()
  {
    this.refresh();
  };
  
  ControllerExplorer.prototype.refresh = function ()
  {
    var self = this;

    if(this.refreshing_) {
      console.error("Already refreshing");
      return;
    }

    this.refreshing_ = true;
    this.reset_tree_();
    this.events_.trigger('refresh-begin');
    this.update_toolbar_(true);

    /* Hide empty notification while loading. */
    this.update_empty_state_(true);
          
    this.api.foldering.listFolders()
      .done(function (coll) {
        coll.forEach(function (f) {
          self.folders_.push(new Folder(self, f));
        } );
      } )
      .always(function () {
        self.update_empty_state_();
        self.refreshing_ = false;
        self.events_.trigger('refresh-end');

        if(self.folders_.length > 0)
          self.tree_.select_node(self.folders_[0].id);
        else
          self.update_toolbar_();
        
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
    /* Reset bin spawner controller and remove all children nodes inside the
     * bins HTML container. */
    this.reset_tree_();
    
    /* Reset state. */
    this.id_ = this.folders_ = null;
    this.refreshing_ = this.events_ = null;
  };

  ControllerExplorer.prototype.createFolder = function ()
  {
    this.update_empty_state_(true);
    this.creating_ = {
      parent: null,
      obj: new FolderNew(this)
    };
  };
  
  ControllerExplorer.prototype.createSubfolder = function (folder, name)
  {
    this.creating_ = {
      parent: folder,
      obj: new SubfolderNew(folder, name)
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

    return this.doAddLabel_(label);
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

        return self.doAddLabel_(label);
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
        this.api.setQueryContentId(item.data.content_id);
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
                                                    exists /* = false */)
  {
    var self = this;

    /* Attempt to retrieve the feature collection for the bin's content id. */
    return this.api.getFeatureCollection(descriptor.content_id)
      .then(function (fc) {
        console.log("Feature collection GET successful (id=%s)",
                    descriptor.content_id, fc);

        /* A feature collection was received. No further operations are carried
         * out if `exists´ is true; otherwise its contents are updated. */
        if(!exists) {
          self.api.setFeatureCollectionContent(
            fc, descriptor.subtopic_id, descriptor.content);

          return self.doUpdateFc_(descriptor.content_id, fc);
        }

        return fc;
      },
      function () {
        /* It was not possible to retrieve the feature collection for this
         * descriptor's content id. */
        if(exists) {
          console.error("Feature collection GET failed: NOT creating new"
                        + "(id=%s)", descriptor.content_id);
          return null;
        }

        console.info("Feature collection GET failed: creating new (id=%s)",
                     descriptor.content_id);
        return self.api.createFeatureCollection(
          descriptor.content_id,
          document.documentElement.outerHTML).done(function(fc) {
            console.log('Feature collection created:', fc);
            self.api.setFeatureCollectionContent(
              fc, descriptor.subtopic_id, descriptor.content);
            self.api.setFeatureCollectionContent(
              fc, 'meta_url', window.location.toString());
            return self.doUpdateFc_(descriptor.content_id, fc);
          });
      } );
  };
  
  /* Private interface */
  ControllerExplorer.prototype.reset_query_ = function ()
  {
    this.api.getDossierJs().stop('API.search');
    this.api.setQueryContentId(null);
    this.owner_.sortingQueue.items.removeAll(false);
  };
  
  ControllerExplorer.prototype.doUpdateFc_ = function (content_id, fc)
  {
    return this.api.putFeatureCollection(content_id, fc)
      .done(function () {
        console.log("Feature collection PUT successful (id=%s)",
                    content_id, fc);
      } )
      .fail(function () {
        console.error("Feature collection PUT failed (id=%s)",
                      content_id, fc);
      } );
  };

  ControllerExplorer.prototype.doAddLabel_ = function (label)
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
        console.error("Label ADD failed: '%s' ∧ '%s'",
                      label.cid1, label.cid2);
      } );
  };
  
  ControllerExplorer.prototype.update_toolbar_ = function (loading)
  {
    var ela = this.owner_.nodes.toolbar.actions;
    loading = loading === true;

    ela.add.toggleClass('disabled', loading);
    ela.addSubfolder.toggleClass(
      'disabled', loading || !(this.selected_ instanceof Folder));
    ela.refresh.toggleClass('disabled', loading);
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

  ControllerExplorer.prototype.on_dragging_enter_ = function (ev)
  {
    ev = ev.originalEvent;
    ev.dropEffect = 'move';

    var el = ev.toElement.nodeName.toLowerCase() === 'a'
          && ev.toElement || false;

    if(el && el.parentNode && el.parentNode.id) {
      var fl = this.getAnyById(el.parentNode.id);

      if(std.instanceany(fl, Folder, Subfolder)) {
        $(el).addClass(Css.droppable.hover);
        return fl;
      }
    }
    
    return null;
  };

  ControllerExplorer.prototype.on_dragging_exit_ = function (ev)
  {
    ev = ev.originalEvent;

    var el = ev.toElement.nodeName.toLowerCase() === 'a'
          && ev.toElement || false;

    if(el && el.parentNode && el.parentNode.id) {
      var fl = this.getAnyById(el.parentNode.id);

      if(std.instanceany(fl, Folder, Subfolder)) {
        $(el).removeClass(Css.droppable.hover);
        return fl;
      }
    }

    return null;
  };

  ControllerExplorer.prototype.on_dropped_in_folder_ = function (
    ev, folder)
  {
    var self = this;
    
    this.get_selection_().done(function (result) {
      self.createSubfolder(
        folder, result.type === 'image'
          ? (result.caption || result.content.split('/').splice(-1)[0])
          : result.content);
    } );
  };
  
  ControllerExplorer.prototype.on_dropped_in_subfolder_ = function (
    ev, subfolder)
  {
    var self = this;
    
    this.get_selection_().done(function (result) {
      try {
        subfolder.add(
          new self.api.foldering.Item(
            subfolder.data,
            { content_id: self.api.generateContentId(result.href),
              subtopic_id: result.subtopic_id } ),
          result.content);
      } catch (x) {
        std.on_exception(x);
      }
    } );
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
      
      console.log("Got selection content: type=%s",
                  result.type, result);

      switch(result.type) {
      case 'image':
        result.subtopic_id = self.api.makeRawImageId(
          self.api.generateSubtopicId(result.id));
        break;
        
      case 'text':
        result.subtopic_id = self.api.makeRawTextId(
          self.api.generateSubtopicId(result.id));
        break;
        
      default:
        console.error("Invalid selection type");
        deferred.reject();
      }

      deferred.resolve(result);
    } );

    return deferred.promise();
  };
  

  /**
   * @class
   * */
  var Folder = function (owner, folder)
  {
    /* Invoke base class constructor. */
    std.Drawable.call(this, owner);
    
    /* Getters */
    this.__defineGetter__('id', function () { return this.id_; } );
    this.__defineGetter__('data', function () { return this.folder_; } );
    this.__defineGetter__('api', function () { return owner.owner.api; } );
    this.__defineGetter__('tree', function () { return owner.tree; } );
    
    this.__defineGetter__(
      'node', function () { return owner.tree.get_node(this.id_); } );
    
    this.__defineGetter__('subfolders',
                          function () { return this.subfolders_; } );

    /* Initialisation sequence. */
    if(!std.is_obj(folder))
      throw "Invalid or no folder descriptor provided";

    /* Attributes */
    this.folder_ = folder;
    this.id_ = null;
    this.subfolders_ = [ ];

    /* Retrieve all subfolders for this folder. */
    var self = this;

    if(folder.exists) {
      this.api.foldering.listSubfolders(folder)
        .done(function (coll) {
          coll.forEach(function (sf) {
            self.subfolders_.push(new Subfolder(self, sf));
          } );
        } );
    }
    
    /* Now render. */
    this.render();
  };

  Folder.prototype = Object.create(std.Drawable.prototype);

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

  Folder.prototype.open = function ()
  {
    this.tree.open_node(this.node);
  };
  
  Folder.prototype.add = function (subfolder)
  {
    this.subfolders_.push(new Subfolder(this, subfolder));
    this.owner.updateActive();
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
    this.id_ = this.tree.create_node(
      null, { state: 'open', text: "", type: "folder" }, "last");

    if(this.id_ === false)
      throw "Failed to create folder";
    
    this.tree.edit(this.tree.get_node(this.id_),
                   this.owner_.owner.options.folderNewCaption);
  };


  /**
   * @class
   * */
  var Subfolder = function (owner, subfolder)
  {
    /* Invoke base class constructor. */
    std.Drawable.call(this, owner);
    
    /* Getters */
    this.__defineGetter__('id', function () { return this.id_; } );
    this.__defineGetter__('data', function () { return this.subfolder_; } );
    this.__defineGetter__('items', function () { return this.items_; } );
    this.__defineGetter__('controller',function () {return this.owner_.owner;});
    this.__defineGetter__('tree', function () { return this.controller.tree; });
    
    this.__defineGetter__(
      'api', function () { return this.controller.owner.api; } );
    
    this.__defineGetter__('node', function () {
      return this.controller.tree.get_node(this.id_, true); } );

    /* Initialisation sequence. */
    if(!std.is_obj(subfolder))
      throw "Invalid or no subfolder descriptor provided";

    /* Attributes */
    this.subfolder_ = subfolder;
    this.id_ = null;
    this.items_ = [ ];
    this.loading_ = 0;

    /* Retrieve all items for this folder. */
    var self = this;

    if(subfolder.exists) {
      this.api.foldering.listItems(subfolder)
        .done(function (coll) {
          coll.forEach(function(i) {
            try {
              self.items_.push(Item.construct(self.api, self, i));
            } catch(x) { std.on_exception(x); }
          } );
        } );
    }
    
    this.render();
  };

  Subfolder.prototype = Object.create(std.Drawable.prototype);

  Subfolder.prototype.reset = function ()
  {
    this.items_.forEach(function (i) { i.reset(); } );
    this.tree.delete_node(this.tree.get_node(this.id_));

    this.subfolder_ = this.id_ = this.items_ = null;
  };

  Subfolder.prototype.render = function ()
  {
    this.id_ = this.tree.create_node(
      this.owner_.node,
      { state: 'open',
        text: this.subfolder_.name,
        type: "subfolder"},
      "last");

    if(this.id_ === false)
      throw "Failed to create subfolder";

    this.owner_.open();
  };

  Subfolder.prototype.open = function ()
  {
    this.loading(null);
    this.tree.open_node(this.node);
  };

  Subfolder.prototype.add = function (item, content)
  {
    var self = this,
        api = this.api,
        obj;
    
    obj = Item.construct(api, this, item, content);
    this.items_.push(obj);

    /* Add item to subfolder in persistent storage. */
    this.api.foldering.addItem(this.subfolder_, item)
      .done(function () {
        console.info("Successfully added item to subfolder",
                     item, this.subfolder_);
      } )
      .fail(function () {
        console.error("Failed to add item to subfolder",
                      item, this.subfolder_);
      } );

    /* Create or update feature collection. */
    this.controller.updateFc(obj.data);

    /* Activate item if none is currently active. */
    obj.on({ 'ready': function () {
      var c = self.controller;
      if(c.active === null) self.controller.setActive(obj);
      else c.updateActive();
    } } );
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

  Subfolder.prototype.loading = function (state)
  {
    if(state === false) {
      if(this.loading_ === 0)
        console.error("Loading count is 0");
      else if(--this.loading_ === 0)
        this.node.removeClass("jstree-loading");
    } else if(state === true)
      ++this.loading_;

    /* Always force class. */
    if(this.loading_ > 0)
      this.node.addClass("jstree-loading");
  };


  /**
   * @class
   * */
  var SubfolderNew = function (owner)
  {
    /* Invoke base class constructor. */
    Subfolder.call(
      this, owner,
      owner.owner.owner.api.foldering.subfolderFromName(owner.data,
                                                        "<fake>"));
  };

  SubfolderNew.prototype = Object.create(Subfolder.prototype);

  SubfolderNew.prototype.render = function ()
  {
    this.id_ = this.tree.create_node(
      this.owner_.node,
      { state: 'open',
        text: [ '<img src="',
                std.Url.decode(this.subfolder_.name),
                '" />' ].join(''),
        type: "subfolder" },
      "last");

    if(this.id_ === false)
      throw "Failed to create subfolder";

    var o = this.owner_;
    o.open();
    this.tree.edit(this.tree.get_node(this.id_),
                   o.owner.owner.options.folderNewCaption);
  };


  /**
   * @class
   * */
  var Item = function (owner, item, /* optional */ content)
  {
    /* Invoke base class constructor. */
    std.Drawable.call(this, owner);
    
    /* Getters */
    this.__defineGetter__('id', function () { return this.id_; } );
    this.__defineGetter__('data', function () { return this.item_; } );
    this.__defineGetter__('fc', function () { return this.fc_; } );

    this.__defineGetter__('controller',function () {
      return this.owner_.controller; });
    this.__defineGetter__('tree', function () { return this.controller.tree; });
    
    this.__defineGetter__(
      'api', function () { return this.controller.owner.api; } );
    
    this.__defineGetter__('node', function () {
      return this.controller.tree.get_node(this.id_, true); } );

    /* Initialisation sequence. */
    if(!(item instanceof this.api.foldering.Item))
      throw "Invalid or no item descriptor provided";

    /* Attributes */
    this.item_ = item;
    this.id_ = null;
    this.events_ = new std.Events(this, [ 'ready' ]);

    var self = this,
        ready = function () {
          self.render();

          /* Set this as active item if none set yet. */
          if(self.controller.active === null)
            self.controller.setActive(self);
          else
            self.controller.updateActive();
          
          self.events_.trigger('ready');
        };

    if(!content) {
      this.owner_.loading(true);
      
      this.api.getFeatureCollection(item.content_id)
        .done(function (fc) {
          if(self.onGotFeatureCollection(fc))
            ready();
        })
        .fail (function () {
          self.onGotFeatureCollection(null);
        } );
    } else {
      this.item_.content = content;
      window.setTimeout(function () { ready(); } );
    }
  };

  /* Static methods */
  Item.construct = function (api, subfolder, item, content)
  {
    if(!(subfolder instanceof Subfolder))
      throw "Invalid or no subfolder specified";
    else if(!(item instanceof api.foldering.Item))
      throw "Invalid or no item specified";

    switch(api.getSubtopicType(item.subtopic_id)) {
    case 'image': return new ItemImage(subfolder, item, content);
    case 'text':  return new ItemText (subfolder, item, content);
    }
    
    throw "Invalid item type: " + api.getSubtopicType(item.subtopic_id);
  };
  
  /* Interface */
  Item.prototype = Object.create(std.Drawable.prototype);

  Item.prototype.reset = function ()
  {
    this.tree.delete_node(this.tree.get_node(this.id_));
    this.item_ = this.id_ = null;
  };

  /* overridable */ Item.prototype.onGotFeatureCollection = function (fc)
  {
    var remove;
    
    if(!fc) remove = true;
    else {
      this.item_.content = fc.feature(this.item_.subtopic_id);
      remove = !this.item_.content;
    }

    this.owner_.loading(false);
    
    if(remove) {
      console.warn("Item's feature collection or content could not be retrieved: id=%s",
                   this.item_.subtopic_id);
      this.owner_.remove(this);
      return false;
    }

    return true;
  };

  Item.prototype.activate = function ()
  {
    this.node.addClass(Css.active);
  };

  Item.prototype.deactivate = function ()
  {
    this.node.removeClass(Css.active);
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
      this.owner_.node,
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
  
  ItemImage.prototype.render = function ()
  {
    this.id_ = this.tree.create_node(
      this.owner_.node,
      { state: 'open',
        type: 'item',
        text: [ '<img src="', this.item_.content, '" />' ].join('') },
      "last");

    if(this.id_ === false)
      throw "Failed to create subfolder";

    this.owner_.open();
  };


  /* Css classes */
  var Css = {
    active: 'sd-active',
    disabled: 'sd-disabled',
    droppable: {
      hover: 'sd-droppable-hover'
    },
    icon: {
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
    folderNewCaption: "Enter folder name"
  };


  /* Module public API */
  return {
    Sorter: Sorter,
    ControllerExplorer: ControllerExplorer
  };

};


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("SortingDesk", [ "jquery", "SortingQueue", "SortingCommon", "API" ], function ($, sq, std, api) {
    return SortingDesk_(window, $, sq, std, api);
  });
} else
  window.SortingDesk = SortingDesk_(window, $, SortingQueue, SortingCommon, Api);
