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
  explorer.Subfolder = function (owner, subfolder)
  {
    /* Invoke base class constructor. */
    explorer.ItemBase.call(this, owner);

    /* Getters */
    var def = Object.defineProperty;
    def(this, 'data',  { get:function () { return this.subfolder_; }});
    def(this, 'items', { get:function () { return this.items_;     }});

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

  explorer.Subfolder.prototype = Object.create(explorer.ItemBase.prototype);

  explorer.Subfolder.prototype.reset = function ()
  {
    this.items_.forEach(function (i) { i.reset(); } );
    this.tree.delete_node(this.tree.get_node(this.id_));

    this.subfolder_ = this.id_ = this.items_ = null;
  };

  explorer.Subfolder.prototype.render = function ()
  {
    this.id_ = this.tree.create_node(
      this.owner_.id,
      { state: 'open',
        text: this.subfolder_.name,
        type: "subfolder"},
      "last"
    );

    if(this.id_ === false) throw "Failed to create subfolder";
    if(!this.loaded_) this.create_fake_();
    this.owner_.open();
  };

  explorer.Subfolder.prototype.open = function (focus /* = false */)
  {
    if(this.opening_) return;
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
              self.items_.push(explorer.Item.construct(self, i));
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
            sd.ui.NetworkFailure.types.subfolder.load, self.subfolder_
          );

        } );
    } else
      this.tree.open_node(this.id);

    if(focus === true) this.select(true);
  };

  explorer.Subfolder.prototype.add = function (descriptor)
  {
    var self = this,
        item, obj;

    if(!std.is_obj(descriptor)) throw "Invalid or no descriptor specified";

    /* First create `Api.Item´ instance after generating a valid content_id, if
     * it isn't already present in the descriptor, and then create and contain
     * our UI representation of an item.*/
    if(!descriptor.hasOwnProperty('content_id'))
      descriptor.content_id = this.api.generateContentId(descriptor.href);

    item = new this.api.foldering.Item(this.data, descriptor);

    /* Pass in `descriptor´ because we don't want it to retrieve the item's
     * feature collection; it doesn't exist yet. */
    obj = explorer.Item.construct(this, item, descriptor);
    this.items_.push(obj);

    /* Add item to subfolder in persistent storage. */
    this.api.foldering.addItem(this.subfolder_, item)
      .done(function () {
        console.info(
          "Successfully added item to subfolder: id=%s",
          item.subtopic_id
        );
      } )
      .fail(function () {
        self.controller.owner.networkFailure.incident(
          sd.ui.NetworkFailure.types.subfolder.add, descriptor
        );
      } );

    return obj;
  };

  explorer.Subfolder.prototype.remove = function (item)
  {
    var self = this;

    /* Removing self when `item´ not given. */
    if(item === undefined) {
      if(this.loading()) return null;

      if(!this.subfolder_.exists && this.items_.length === 0) {
        var d = $.Deferred();
        self.owner_.remove(self);
        window.setTimeout(function () { d.resolve(); }, 0);
        return d.promise();
      }

      this.loading(true);
      return this.api.foldering.deleteSubfolder(this.subfolder_)
        .done(function () {
          self.owner_.remove(self);
        } )
        .fail(function () {
          self.controller.owner.networkFailure.incident(
            sd.ui.NetworkFailure.types.subfolder.remove, self.subfolder_
          );
        } )
        .always(function () { self.loading(false); } );
    }

    var index = this.items_.indexOf(item);
    if(index < 0) throw "Item not contained: not removing";

    item.reset();
    this.items_.splice(index, 1);
  };

  explorer.Subfolder.prototype.rename = function (name)
  {
    if(name === this.subfolder_.name) {
      console.error("Not renaming: same name");
      return null;
    } else if(this.loading())
      return null;

    var self = this,
        to = this.api.foldering.subfolderFromName(this.owner_.data, name);

    /* Edge case: subfolder does not exist in the backend and there are no
     * items.  In this case, rename locally only.
     *
     * This is because subfolders aren't actually created in the backend in the
     * same way that folders are. */
    to.exists = this.subfolder_.exists;
    if(!this.subfolder_.exists && this.items_.length === 0) {
      this.subfolder_ = to;
      var d = $.Deferred();
      window.setTimeout(function () { d.resolve(); }, 0);
      return d.promise();
    }

    this.loading(true);
    return this.api.foldering.renameSubfolder(this.subfolder_, to)
      .done(function () { $.extend(true, self.subfolder_, to); } )
      .fail(function () {
        self.controller.owner.networkFailure.incident(
          sd.ui.NetworkFailure.types.folder.rename, self.subfolder_
        );
      } )
      .always(function () { self.loading(false); } );
  };

  /* Private interface */
  explorer.Subfolder.prototype.create_fake_ = function ()
  {
    if(this.fake_ !== null)    throw "Fake node already exists";
    else if(this.id_ === null) throw "Subfolder not yet rendered";

    this.fake_ = this.tree.create_node(
      this.id_, { text: '<placeholder>' }, "last"
    );
  };


  /**
   * @class
   * */
  explorer.SubfolderNew = function (owner, name)
  {
    var o = owner.owner.owner;

    /* Invoke base class constructor. */
    explorer.Subfolder.call(
      this, owner,
      o.api.foldering.subfolderFromName(
        owner.data,
        name || o.options.folderNewCaption
      )
    );
  };

  explorer.SubfolderNew.prototype = Object.create(
    explorer.Subfolder.prototype
  );

  explorer.SubfolderNew.prototype.render = function ()
  {
    var self = this,
        o = this.owner_;

    this.id_ = this.tree.create_node(
      this.owner_.id,
      { state: 'open',
        text: this.subfolder_.name,
        type: "subfolder" },
      "last"
    );

    if(this.id_ === false)
      throw "Failed to create subfolder";

    o.open();
    this.tree.edit(this.id);

    /* TODO: remove hardcoded timeout.
     * Scrolling into view has to be on a timeout because JsTree performs a
     * slide down animation. */
    window.setTimeout(function () { self.node.get(0).scrollIntoView(); }, 200);
  };


  return sd;

})(this,
   this.$,
   this.SortingCommon,
   this.SortingDesk);