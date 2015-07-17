/**
 * @file Sorting Desk: explorer component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingCommon´ component.
 *
 */

this.SortingDesk = (function (window, $, std, sd, undefined) {

  /**
   * @namespace
   * */
  sd = sd || { };
  var explorer = sd.explorer = sd.explorer || { };


  /**
   * @class
   * */
  explorer.Controller = function (owner)
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
        'selected-subfolder'
      ]
    );

    this.processing_ = null;
    this.selected_ = null;

    /* Drag and drop handler */
    this.dnd_ = new explorer.DragDropHandler(this);
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
                action: self.on_rename_.bind(self),
                _disabled: obj === null || obj.loading() || !obj.loaded
                  || obj instanceof explorer.ItemImage
              },
              "remove": {
                label: "Remove",
                icon: "glyphicon glyphicon-remove",
                action: self.on_remove_.bind(self),
                _disabled: obj === null || obj.loading() || !obj.loaded
              }
            };

          if(obj instanceof explorer.Folder) {
            items["report"] = {
              label: "Export data",
              icon: "glyphicon glyphicon-download-alt",
              separator_before: true,
              action: self.export.bind(self)
            };
          } else if(obj instanceof explorer.Subfolder) {
            items["create"] = {
              label: "Create manual item",
              icon: "glyphicon glyphicon-plus",
              separator_before: true,
              action: self.createItem.bind(self),
              _disabled: obj.loading() || !obj.loaded
            };
          } else if(obj instanceof explorer.Item) {
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
        if(self.processing_ === null) {
          console.warn("No descriptor available");
          return;
        }

        self.processing_.do(data.text.trim());
        /* TODO: empty if-block. */
        if(data.text !== owner.options.folderNewCaption) {
        }

        self.processing_.reset();
        self.processing_ = null;
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
          if(i instanceof explorer.Subfolder) {
            i.open();

            if(i.items.length > 0)
              self.setActive(i.items[0]);
          } else if(i instanceof explorer.Item)
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

          if(i instanceof explorer.Folder)
            self.events_.trigger('selected-folder');
          else if(i instanceof explorer.Subfolder)
            self.events_.trigger('selected-subfolder');
        }

        self.updateToolbar();
      }
    } );

    /* Hook up to toolbar events. */
    els.toolbar.refresh.explorer.click(function () { self.refresh();});
    els.toolbar.refresh.search.click(function () {
      self.owner_.sortingQueue.items.refresh();
    });

    els.toolbar.add.click(function () { self.createFolder(); } );
    els.toolbar.report.excel.click(function () {
      self.onExport(this, 'excel'); } );
    els.toolbar.report.simple.click(function () {
      self.onExport(this, 'simple-pdf'); } );
    els.toolbar.report.rich.click(function () {
      self.onExport(this, 'rich-pdf'); } );

    els.toolbar.addContextual.click(function () {
      if(self.selected_ instanceof explorer.Folder)
        self.createSubfolder(self.selected_);
      else if(self.selected_ instanceof explorer.Subfolder)
        self.createItem(self.selected_);
      else
        console.error('Invalid selected item: contextual action unavailable');
    } );

    els.toolbar.remove.click(function () { self.on_remove_(); } );
    els.toolbar.rename.click(function () { self.on_rename_(); } );

    els.toolbar.jump.click(function () {
      self.on_jump_bookmarked_page_();
    } );

    /* Handle item dismissal. */
    this.owner_.sortingQueue.on( {
      "item-dismissed": function (item) {
        var query_id = api.qitems.getQueryContentId();

        if(query_id) {
          self.addLabel(new (api.getClass("Label"))(
            item.content_id,
            query_id,
            api.qitems.getAnnotator(),
            api.consts.coref.NEGATIVE));
        }
      },
      "request-begin": function () {
        els.toolbar.refresh.search.addClass('disabled');
        els.toolbar.filter.addClass('disabled');
      },
      "request-end": function () {
        els.toolbar.refresh.search.removeClass('disabled');
        els.toolbar.filter.removeClass('disabled');
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

  explorer.Controller.prototype = Object.create(std.Controller.prototype);

  explorer.Controller.prototype.initialise = function ()
  {
    this.refresh(true);
  };

  explorer.Controller.prototype.refresh = function (init)
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
          self.folders_.push(new explorer.Folder(self, f));
        } );
      } )
      .fail(function () {
        self.owner_.networkFailure.incident(
          sd.ui.NetworkFailure.types.folder.list, null
        );
      } )
      .always(function () {
        self.update_empty_state_();
        self.refreshing_ = false;
        self.events_.trigger('refresh-end');

        if(self.folders_.length > 0) self.folders_[0].select();
        else                         self.updateToolbar();

        console.log("Loaded folders:", self.folders_);
      } );
  };

  explorer.Controller.prototype.reset = function ()
  {
    this.reset_tree_();
    this.dnd_.reset();

    /* Reset state. */
    this.id_ = this.folders_ = null;
    this.refreshing_ = this.events_ = this.dropTarget_ = null;
    this.dnd_ = null;
  };

  explorer.Controller.prototype.createFolder = function ()
  {
    if(this.processing_) {
      console.error("Deferred processing ongoing");
      return std.instareject();
    }

    this.update_empty_state_(true);
    return (this.processing_ = new explorer.DeferredCreationFolder(
      this, new explorer.FolderNew(this)
    )).promise();
  };

  explorer.Controller.prototype.createSubfolder = function (
    folder, name, descriptor)
  {
    if(this.processing_) {
      console.error("Deferred processing ongoing");
      return std.instareject();
    }

    return (this.processing_ = new explorer.DeferredCreationSubfolder(
      this, folder, new explorer.SubfolderNew(folder, name), descriptor
    )).promise();
  };

  explorer.Controller.prototype.createItem = function (subfolder, name)
  {
    if(this.processing_) {
      console.error("Deferred processing ongoing");
      return std.instareject();
    } else if(subfolder === undefined)
      subfolder = this.selected_;
    if(!(subfolder instanceof explorer.Subfolder)) {
      console.error("Invalid or no subfolder");
      return std.instareject();
    }

    return (this.processing_ = new explorer.DeferredCreationItem(
      this, subfolder, new explorer.ItemNew(subfolder, name)
    )).promise();
  };

  explorer.Controller.prototype.onExport = function (item, type)
  {
    if($(item).hasClass('disabled')) return;
    this.export(type);
  };

  explorer.Controller.prototype.export = function (type)
  {
    if(!(this.selected_ instanceof explorer.Folder)) return;
    this.owner_.callbacks.invoke('export', type, this.selected_.data.id);
  };

  explorer.Controller.prototype.setSuggestions = function (title, suggestions)
  {
    if(!std.is_str(title) || (title = title.trim()).length === 0)
      throw 'Invalid or no title specified';
    else if(!std.is_arr(suggestions) || suggestions.length === 0)
      throw 'Invalid or no array of suggestions specified';

    if(!(this.selected_ instanceof explorer.Folder)) {
      window.alert('Please select a folder to add the soft selectors to.');
      return false;
    }

    var self = this,
        index = 0,
        subfolder = this.selected_.add(
          this.owner.api.foldering.subfolderFromName(
            this.selected_.data, title.replace(/\//g, "_")));

    var next = function () {
      /* Detach listener previously attached below when adding the subfolder.
       * */
      /* TODO: confirm this is actually being detached */
      if(std.is_fn(this.off)) {
        console.log("detaching");
        this.off('loading-end', next);
      }

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
        .on('loading-end', next);
    };
    next();

    return true;
  };

  explorer.Controller.prototype.each = function (callback)
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

  explorer.Controller.prototype.indexOf = function (folder)
  {
    return this.folders_.indexOf(folder);
  };

  explorer.Controller.prototype.getById = function (id)
  {
    return this.each(function (folder) {
      return folder.id === id;
    } );
  };

  explorer.Controller.prototype.getAnyById = function (id)
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

  explorer.Controller.prototype.getAnyByOwnId = function (id)
  {
    var result = null,
        search = function (coll, callback) {
          return coll.some(function (i) {
            if(i.data.id === id) {
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

  explorer.Controller.prototype.setActive = function (item)
  {
    /* Don't activate item if currently active already. */
    if(item !== null) {
      if(!(item instanceof explorer.Item))
        throw "Invalid item specified";
      else if(this.active_ === item)
        return;
    }

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
        this.api.qitems.setQueryContentId(item.data.content_id,
                                          item.data.subtopic_id);
        this.owner_.sortingQueue.items.refresh();
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

  explorer.Controller.prototype.updateToolbar = function (loading)
  {
    var flag, ela = this.owner_.nodes.toolbar;
    loading = loading === true;

    ela.add.toggleClass('disabled', loading);

    flag = this.selected_ === null || loading
      || this.selected_.loading()
      || !this.selected_.loaded;
    ela.remove.toggleClass('disabled', flag);
    ela.rename.toggleClass(
      'disabled', flag || this.selected_ instanceof explorer.ItemImage
    );

    ela.addContextual.toggleClass(
      'disabled',
      loading || !this.selected_
        || this.selected_ instanceof explorer.Item
        || (this.selected_ instanceof explorer.Subfolder
            && (!this.selected_.loaded
                || this.selected_.loading()))
    );

    ela.jump.toggleClass(
      'disabled',
      loading || !(this.selected_ instanceof explorer.Item
                   && this.selected_.loaded)
    );

    ela.refresh.explorer.toggleClass('disabled', loading);

    flag = loading || !this.active_;
    ela.refresh.search.toggleClass('disabled', flag);
    ela.filter.toggleClass('disabled', flag);

    flag = loading || !(this.selected_ instanceof explorer.Folder);
    ela.report.excel.toggleClass('disabled', flag);
    ela.report.simple.toggleClass('disabled', flag);
    ela.report.rich.toggleClass('disabled', flag);
  };

  explorer.Controller.prototype.addLabel = function (label)
  {
    var self = this;

    return this.api.label.add(label)
      .fail(function () {
        self.owner_.networkFailure.incident(
          sd.ui.NetworkFailure.types.label, label
        );
      } );
  };

  explorer.Controller.prototype.remove = function (folder)
  {
    var ndx = this.folders_.indexOf(folder);
    if(ndx < 0) throw "Folder not contained: already removed?";
    folder.reset();
    this.folders_.splice(ndx, 1);
    if(this.selected_ === folder)
      this.selected_ = null;
    this.update_empty_state_();
  };

  /* Private interface
   * --
   * TODO: re-assess: most of these private methods should probably go in a
   * `util` namespace. */
  explorer.Controller.prototype.reset_query_ = function ()
  {
    this.api.getDossierJs().stop('API.search');
    this.api.qitems.setQueryContentId(null);
    this.owner_.sortingQueue.items.removeAll(false);
  };

  explorer.Controller.prototype.update_empty_state_ = function (hide)
  {
    var o = this.owner_, n = o.nodes.empty.explorer;

    n.stop();

    if(hide === true)
      n.fadeOut(o.options.delays.emptyHide);
    else if(this.folders_.length === 0)
      n.fadeIn(o.options.delays.emptyFadeIn);
    else
      n.fadeOut(o.options.delays.emptyFadeOut);
  };

  explorer.Controller.prototype.reset_tree_ = function ()
  {
    /* Reset every folder contained. */
    this.folders_.forEach(function (f) {
      f.reset();
    } );

    /* Reset relevant state. */
    if(this.processing_ !== null)
      this.processing_.reset();

    this.folders_ = [ ];
    this.selected_ = this.processing_ = this.active_ = null;

    this.reset_query_();
  };

  explorer.Controller.prototype.on_dropped_in_folder_ = function (ev, folder)
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

  explorer.Controller.prototype.on_dropped_in_subfolder_ = function (
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

  explorer.Controller.prototype.on_rename_ = function ()
  {
    if(this.selected_ === null) {
      console.error("No selected nodes found");
      return;
    } else if(this.selected instanceof explorer.ItemImage)
      throw "Can't rename items of type image";

    var self = this;
    this.processing_ = new explorer.DeferredRename(this, this.selected);
  };

  explorer.Controller.prototype.on_remove_ = function ()
  {
    if(this.selected_ === null) {
      console.error("No selected nodes found");
      return;
    }

    var self = this;
    this.selected_.remove().done(function () {
      self.selected_ = null;
      self.updateToolbar();
    } );
  };

  explorer.Controller.prototype.on_jump_bookmarked_page_ = function ()
  {
    if(this.selected_ === null)
      console.error("No selected nodes found");
    else if(this.selected_ instanceof explorer.Item)
      this.selected_.jump();
    else
      console.error("Selected node not an item");
  };

  explorer.Controller.prototype.get_selection_ = function ()
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
    } ).fail(function () { deferred.reject(); } );

    return deferred.promise();
  };

  explorer.Controller.prototype.generate_subtopic_id_ = function (descriptor)
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


  return sd;

})(this,
   this.$,
   this.SortingCommon,
   this.SortingDesk);