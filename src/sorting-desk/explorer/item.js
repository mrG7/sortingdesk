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
  explorer.Item = function (owner, item, /* optional */ descriptor)
  {
    if(!(owner instanceof explorer.Subfolder))
      throw "Invalid or no owner specified: not `Subfolder´ instance";

    /* Invoke base class constructor. */
    explorer.ItemBase.call(this, owner);

    /* Getters */
    var def = Object.defineProperty;
    def(this, 'data', {get:function () { return this.item_; }});
    def(this, 'fc', {get:function () { return this.fc_; }});

    /* Initialisation sequence. */
    if(!(item instanceof this.api.foldering.Item))
      throw "Invalid or no item descriptor provided";

    /* Attributes */
    this.item_ = item;

    var self = this;
    var ready = function () {
      if(self.id_ === null) self.render();

      /* Set this as active item if none set yet. */
      if(self.controller.active === null) self.controller.setActive(self);
      self.events_.trigger('ready');
    };

    /* Retrieve item's subtopic content from feature collection if `descriptor´
     * was not specified. */
    this.owner_.loading(true);

    if(!descriptor) {
      this.api.fc.get(item.content_id)
        .done(function (fc) { if(self.onGotFeatureCollection(fc)) ready(); } )
        .fail(function ()   { self.onGotFeatureCollection(null); } );
    } else {
      this.item_.content = descriptor.content;
      this.item_.data = descriptor.data;
      this.render();
      this.loading(true);

      /* Create or update feature collection. */
      this.updateFc(descriptor, false)
        .done(function (fc) { self.onGotFeatureCollection(fc);   } )
        .fail(function ()   { self.onGotFeatureCollection(null); } )
        .always(function () { self.loading(false); } );
    }
  };

  /* Static methods */
  explorer.Item.construct = function (subfolder, item, descriptor)
  {
    if(!(subfolder instanceof explorer.Subfolder))
      throw "Invalid or no subfolder specified";

    var api = subfolder.api;
    if(!(item instanceof api.foldering.Item))
      throw "Invalid or no item specified";

    switch(api.getSubtopicType(item.subtopic_id)) {
    case 'image': return new explorer.ItemImage(subfolder, item, descriptor);
    case 'manual':
    case 'text':  return new explorer.ItemText(subfolder, item, descriptor);
    }

    throw "Invalid item type: " + api.getSubtopicType(item.subtopic_id);
  };

  /* Interface */
  explorer.Item.prototype = Object.create(explorer.ItemBase.prototype);

  explorer.Item.prototype.reset = function ()
  {
    if(this.controller.active === this)
      this.controller.setActive(null);

    this.tree.delete_node(this.tree.get_node(this.id_));
    this.item_ = this.id_ = null;
  };

  explorer.Item.prototype.remove = function ()
  {
    var self = this;

    if(this.loading()) return null;
    this.loading(true);
    return this.api.foldering.deleteSubfolderItem(
      this.owner_.data, this.item_.content_id, this.item_.subtopic_id)
      .done(function () { self.owner_.remove(self); } )
      .fail(function () {
        self.controller.owner.networkFailure.incident(
          sd.ui.NetworkFailure.types.fc.remove, self.item_
        );
      } )
      .always(function () { self.loading(false); } );
  };

  explorer.Item.prototype.rename = function ()
  { throw "Only items of text type can be renamed"; };

  /* overridable */ explorer.Item.prototype.onGotFeatureCollection = function (fc)
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

  explorer.Item.prototype.activate = function ()
  {
    this.addClass(sd.ui.Css.active);
  };

  explorer.Item.prototype.deactivate = function ()
  {
    this.removeClass(sd.ui.Css.active);
  };

  explorer.Item.prototype.jump = function ()
  {
    if(std.is_obj(this.fc_.raw) && std.is_str(this.fc_.raw.meta_url)) {
      var win = window.open(this.fc_.raw.meta_url, "_blank");
      win.focus();
    } else
      console.warn("No meta URL in feature collection");
  };

  explorer.Item.prototype.updateFc = function (descriptor, readonly /* = false */)
  {
    var self = this;

    /* Attempt to retrieve the feature collection for the content id. */
    return this.api.fc.get(descriptor.content_id)
      .then(function (fc) {
        console.log("Feature collection GET successful (id=%s)",
                    descriptor.content_id);

        /* A feature collection was received. No further operations are carried
         * out if `readonly´ is true; otherwise its contents are updated. */
        if(!readonly) return self.do_update_fc_(fc, descriptor);
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
        return self.api.fc.create(descriptor.content_id, descriptor.document)
          .then(function(fc) {
            console.log('Feature collection created: (id=%s)',
                        descriptor.content_id);

            /* Capture page as an image. */
            return self.controller_.owner.callbacks.invoke('capturePage')
              .then(function (capture) {
                return { fc: fc, capture: capture };
              } );
          } )
          .then(function (data) {
            /* Set meta attributes. */
            self.api.fc.setContent(data.fc, "meta_url",
                                   descriptor.href.toString());

            if(std.is_str(data.capture) && data.capture.length > 0)
              self.api.fc.setContent(data.fc, "meta_capture", data.capture);
            else
              console.info("Page capture data unavailable");

            return self.do_update_fc_(data.fc, descriptor);
          } )
          .fail(function () {
            self.controller.owner.networkFailure.incident(
              sd.ui.NetworkFailure.types.fc.create, descriptor);
          } );
      } );
  };

  /* Private/protected interface */
  explorer.Item.prototype.do_update_fc_ = function (fc, descriptor)
  {
    console.log("Item: updating feature collection");
    var self = this;

    this.api.fc.setContent(fc, descriptor.subtopic_id, descriptor.content);

    /* Instruct backend to update feature collection. */
    return this.api.fc.put(descriptor.content_id, fc)
      .done(function () {
        console.log("Feature collection PUT successful (id=%s)",
                    descriptor.content_id);
      } )
      .fail(function () {
        self.controller.owner.networkFailure.incident(
          sd.ui.NetworkFailure.types.fc.save, {
            content_id: descriptor.content_id, fc: fc
          } );
      } );
  };


  /**
   * @class
   * */
  explorer.ItemText = function (owner, subfolder, /* optional */ content)
  {
    /* Invoke base class constructor. */
    explorer.Item.call(this, owner, subfolder, content);
  };

  explorer.ItemText.prototype = Object.create(explorer.Item.prototype);

  explorer.ItemText.prototype.render = function ()
  {
    this.id_ = this.tree.create_node(
      this.owner_.id,
      { state: 'open', text: this.item_.content, type: 'item' },
      "last"
    );

    if(this.id_ === false) throw "Failed to create subfolder";
    this.owner_.open();
  };

  explorer.ItemText.prototype.rename = function (name)
  {
    var self = this;

    if(this.loading()) return null;
    this.loading(true);
    return this.api.fc.get(this.item_.content_id)
      .then(function (fc) {
        self.api.fc.setContent(fc, self.item_.subtopic_id, name);
        self.item_.content = fc.feature(self.item_.subtopic_id);
        return self.api.fc.put(self.item_.content_id, fc);
      } )
      .fail(function () {
        self.controller.owner.networkFailure.incident(
          sd.ui.NetworkFailure.types.fc.rename, {
            content_id: self.item_.content_id
          }
        );
      } )
      .always(function () { self.loading(false); } );
  };


  /**
   * @class
   * */
  explorer.ItemImage = function (owner, subfolder, /* optional */ content)
  {
    /* Invoke base class constructor. */
    explorer.Item.call(this, owner, subfolder, content);
  };

  explorer.ItemImage.prototype = Object.create(explorer.Item.prototype);

  explorer.ItemImage.prototype.onGotFeatureCollection = function (fc)
  {
    /* Delegate to base class' method to retrieve the item's feature
     * collection.  If successful, retrieve the item's data since here, the item's
     * data may contain the actual image data. */
    if(explorer.Item.prototype.onGotFeatureCollection.call(this, fc)) {
      this.item_.data = fc.feature(
        this.api.makeRawSubId(this.item_.subtopic_id, 'data')
      );
      return true;
    }

    return false;
  };

  explorer.ItemImage.prototype.render = function ()
  {
    this.id_ = this.tree.create_node(
      this.owner_.id,
      { state: 'open',
        type: 'item',
        text: [ '<img src="', this.item_.data || this.item_.content,
                '" />' ].join('')
      }, "last");

    if(this.id_ === false) throw "Failed to create subfolder";
    this.owner_.open();
  };

  /* Private/protected interface */
  explorer.ItemImage.prototype.do_update_fc_ = function (fc, descriptor)
  {
    console.log("ItemImage: updating feature collection");
    if(descriptor.type !== 'image')
      throw "Invalid descriptor: not image";
    else if(std.is_str(descriptor.data) || descriptor.data.length > 0) {
      this.api.fc.setContent(
        fc, this.api.makeRawSubId(descriptor.subtopic_id, "data"),
        descriptor.data
      );
    }

    /* Now invoke base class method. */
    return explorer.Item.prototype.do_update_fc_.call(this, fc, descriptor);
  };


  /**
   * @class
   * */
  explorer.ItemNew = function (owner, name)
  {
    /* Invoke base class constructor. */
    explorer.ItemBase.call(this, owner);

    this.name_ = name;
    this.render();
  };

  explorer.ItemNew.prototype = Object.create(explorer.ItemBase.prototype);

  explorer.ItemNew.prototype.render = function ()
  {
    var self = this,
        o = this.owner_;

    this.id_ = this.tree.create_node(
      this.owner_.id,
      { state: 'open',
        text: this.name_,
        type: "item" },
      "last"
    );

    if(this.id_ === false) throw "Failed to create manual item";

    o.open();
    this.tree.edit(this.id_);

    /* TODO: remove hardcoded timeout.
     * Scrolling into view has to be on a timeout because JsTree performs a
     * slide down animation. */
    window.setTimeout(function () { self.node.get(0).scrollIntoView(); }, 200);
  };

  explorer.ItemNew.prototype.reset = function ()
  {
    this.tree.delete_node(this.tree.get_node(this.id_));
  };


  return sd;

})(this,
   this.$,
   this.SortingCommon,
   this.SortingDesk);