/**
 * @file Sorting Desk component.
 * @copyright 2014 Diffeo
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

  var TextItem = function(owner, item) {
    if (!owner.owner.initialised) {
      return;
    }
    sq.Item.call(this, owner, item);
  };

  TextItem.prototype = Object.create(sq.Item.prototype);

  TextItem.prototype.render = function(text, view, less) {
    var fc = this.content_.fc;
    var desc = fc.value('meta_clean_visible').trim();
    desc = desc.replace(/\s+/g, ' ');
    desc = desc.slice(0, 200);
    var title = fc.value('title') || (desc.slice(0, 50) + '...');
    var url = fc.value('meta_url');

    var ntitle = $(
      '<p style="font-size: 12pt; margin: 0 0 8px 0;">'
      + '<strong></strong>'
      + '</p>'
    );
    ntitle.find('strong').text(title);

    var ndesc = $('<p style="font-size: 8pt; display: block; margin: 0;" />');
    ndesc.text(desc + '...');

    var nurl = $(
      '<p style="margin: 8px 0 0 0; display: block;">'
      + '<a style="color: #349950;" href="' + url + '">' + url + '</a>'
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
   *
   * @param   {Object}    opts  Initialisation options (please refer to
   *                            `defaults_' at the end of this source file)
   * @param   {Object}    cbs   Map of all callbacks in a key to function
   *                            manner.
   * */
  var Sorter = function (opts, cbs)
  {
    var self = this;

    console.log("Initialising Sorting Desk UI");

    /* TODO: must pass in Dossier API URL. */
    this.api_ = Api.initialize(this, opts.dossierUrl);

    this.options_ = $.extend(true, $.extend(true, {}, defaults_), opts);
    this.sortingQueue_ = new sq.Sorter(
      $.extend(true, this.options_, {
        constructors: {
          Item: TextItem
        }
      }),
      $.extend(this.api_.getCallbacks(), cbs));

    /* Restore state from local storage. */
    window.setTimeout(function () { self.initialise_(); } );
  };

  Sorter.prototype = {
    initialised_: false,
    options_: null,

    /* Instances */
    api_: null,
    sortingQueue_: null,
    folder_: null,
    draggable_: null,

    open: function (folder)
    {
      var self = this;

      if(std.is_obj(folder))
        this.initialiseFolder_(folder);
      else if(folder) {         /* assume id */
        this.sortingQueue_.callbacks.invoke('load', folder)
          .done(function (f) { self.initialiseFolder_(f); } );
      }
    },

    close: function ()
    {
      /* Force reset of the bins controller, if an instance currently exists. */
      if(this.folder_) {
        this.folder_.reset();
        this.folder_ = null;
      }

      /* Clear the items queue list. */
      this.sortingQueue_.items.removeAll();
    },
    
    save: function ()
    {
      if(this.folder_) {
        return this.sortingQueue_.callbacks.invoke(
          'save', this.folder_.serialise() );
      }
    },

    /**
     * Resets the component to a virgin state. Removes all nodes contained by
     * `options_.nodes.bins', if any, after the active `SortingQueue' instance
     * has successfully reset.
     *
     * @returns {Promise}   Returns promise that is fulfilled upon successful
     *                      instance reset. */
    reset: function ()
    {
      if(!this.initialised_ || this.sortingQueue_.resetting())
        return this.sortingQueue_.reset();

      var self = this;

      return this.sortingQueue_.reset()
        .done(function () {
          self.folder_.reset();

          self.folder_ = self.options_ = self.sortingQueue_ = null;
          self.initialised_ = false;

          console.log("Sorting Desk UI reset");
        } );
    },

    /* Private methods */
    initialise_: function ()
    {
      var self = this;

      /* Begin instantiating and initialising controllers.
       *
       * Start by explicitly initialising SortingQueue's instance and proceed to
       * initialising our own instance. */
      this.sortingQueue_.initialise();

      (this.draggable_ = new ControllerDraggableImage(this))
        .initialise();

      /* Register for a bin dismissal event and process it accordingly. */
      this.sortingQueue_.dismiss.register('bin', function (e, id, scope) {
        var bin = self.folder_.getById(id);

        if(bin) {
          self.folder_.removeAt(self.folder_.indexOf(bin));
          self.save();
        }
      } );

      this.initialised_ = true;
      console.log("Sorting Desk UI initialised");

      if(this.options.active)
        this.open(this.options.active);
    },

    initialiseFolder_: function (folder)
    {
      this.close();
      
      /* (Re-)instantiate the bins controller. */
      (this.folder_ = this.sortingQueue_.instantiate('ControllerFolder', this))
        .initialise(folder);
    },

    /* Getter methods */
    get sortingQueue ()
    { return this.sortingQueue_; },

    /**
     * Returns a boolean value indicating whether Sorting Queue has been
     * initialised and is ready to be used.
     *
     * @returns {Boolean}   Returns true if Sorting Queue has been successful
     *                      initialised, false otherwise.
     * */
    get initialised ()
    { return this.initialised_; },

    get api ()
    { return this.api_; },

    get resetting ()
    { return this.sortingQueue_.resetting(); },

    get options ()
    { return this.options_; },

    get folder ()
    { return this.folder_; },

    get draggable ()
    { return this.draggable_; }
  };


  /**
   * @class
   * */
  var ControllerDraggableImage = function (owner)
  {
    /* Invoke super constructor. */
    std.Controller.call(this, owner);
    /* Define getters. */
    this.__defineGetter__("activeNode",
                          function () { return this.activeNode_; } );
  };

  ControllerDraggableImage.prototype = Object.create(
    std.Controller.prototype);

  /* Attributes */
  ControllerDraggableImage.prototype.saveCursor_ = null;
  ControllerDraggableImage.prototype.activeNode_ = null;

  /* Methods */
  ControllerDraggableImage.prototype.initialise = function ()
  {
    var self = this;

    /* Attach specialised `drag´ event listeners to every image found on the
     * page. */
    $('IMG').each( function () {
      var el = $(this);

      el.on( {
        mouseenter: function () {
          self.saveCursor_ = el.css('cursor');
          el.css('cursor', 'copy');
        },

        mouseleave: function () {
          el.css('cursor', self.saveCursor_);
        },

        dragstart: function (ev) {
          self.activeNode_ = $(ev.target);
        },

        dragend: function () {
          self.activeNode_ = null;
        }
      } );
    } );
  };

  ControllerDraggableImage.prototype.reset = function ()
  { this.clear(); };

  ControllerDraggableImage.prototype.clear = function ()
  { this.activeNode_ = null; };


  /**
   * @class
   * */
  var ControllerFolder = function (owner)
  {
    var self = this;

    /* Invoke base class constructor. */
    std.Controller.call(this, owner);

    this.id_ = null;
    this.name_ = null;
    this.bins_ = [ ];
    this.hover_ = null;
    this.active_ = null;
    this.spawner_ = null;
    this.browser_ = null;

    /* TODO: at the very least, a `hasConstructor´ method should be created in
     * the `SortingQueue.Sorter´ class.  Ideally, a controller class responsible
     * for constructors should be created instead and the `instantiate´ and
     * `hasContructor´ methods should be placed there. An additional method,
     * `canInstantiate´ method should be created to query for classes that can
     * be instantiated indirectly via a constructor method or directly via class
     * instantiation.
     *
     * The `LabelBrowser´ component requires a constructor method since it needs
     * options passed in. */
    this.haveBrowser_ = owner.sortingQueue.options.constructors
      .hasOwnProperty('createLabelBrowser')
      && !owner.sortingQueue.options.constructors
      .hasOwnProperty('LabelBrowser');

    /* Define getters. */
    this.__defineGetter__("id", function () { return this.id_; } );
    this.__defineGetter__("name", function () { return this.name_; } );
    this.__defineGetter__("bins", function () { return this.bins_; } );
    this.__defineGetter__("hover", function () { return this.hover_; } );
    this.__defineGetter__("active", function () { return this.active_; } );
    this.__defineGetter__("node", function () {
      return this.owner_.options.nodes.bins;
    } );

    this.__defineGetter__("haveBrowser", function () {
      return this.haveBrowser_;
    } );

    /* Instantiate spawner controller. */
    this.spawner_ = this.owner_.sortingQueue.instantiate(
      'ControllerBinSpawner',
      this,
      function (input) {
        return self.owner_.sortingQueue.instantiate(
          'Bin', self, { data: input }, null).render();
      },
      function (descriptor) {
        return self.add(self.construct(descriptor));
      } );
  };

  ControllerFolder.prototype = Object.create(std.Controller.prototype);

  ControllerFolder.prototype.initialise = function (folder)
  {
    var self = this,
        bin;

    this.spawner_.initialise();

    if(!std.is_obj(folder)
       || !folder.hasOwnProperty('bins')
       || !std.is_arr(folder.bins))
    {
      console.log("Invalid or no folder descriptor given");
      return;
    }

    this.id_ = folder.id;
    this.name_ = folder.name;

    console.log("Folder opened: id=%s | name=%s", this.id_, this.name_);
    
    if(folder.bins.length === 0)
      return;

    folder.bins.forEach(function (descriptor) {
      self.add(self.construct(descriptor), false, true);
    } );

    /* Now manually set the active bin. */
    if(folder.active)
      bin = this.getById(folder.active);

    /* Attempt to recover if we've been given an invalid id to activate. */
    if(!bin) {
      console.log("Failed to set the active bin: setting first (id=%s)",
                  folder.active || null);

      bin = this.bins_.getAt(0);
    }

    this.setActive(bin);
  };

  ControllerFolder.prototype.construct = function (descriptor)
  {
    var map = { 'text': 'Bin',
                'image': 'BinImage' },
        type;

    if(!descriptor)
      throw "Invalid bin descriptor";

    /* Extract bin type. */
    type = this.owner_.api.getSubtopicType(descriptor.subtopic_id);

    if(!map.hasOwnProperty(type))
      throw "Invalid bin type: " + type;

    /* Finaly instantiate correct Bin class. */
    return this.owner_.sortingQueue.instantiate(
      map[type],
      this,
      descriptor);
  };

  ControllerFolder.prototype.reset = function ()
  {
    /* Reset bin spawner controller and remove all children nodes inside the
     * bins HTML container. */
    this.spawner_.reset();
    this.owner_.options.nodes.bins.children().remove();
    this.owner_.api.setQueryContentId(null);

    console.log("Folder closed: id=%s, name=%s", this.id_, this.name_);

    this.id_ = this.name_ = null;
    this.bins_ = this.hover_ = this.active_ = this.spawner_ = null;
  };

  ControllerFolder.prototype.add = function (bin,
                                             activate /* = true */,
                                             exists   /* = false */)
  {
    /* Ensure a bin with the same id isn't already contained. */
    if(this.getById(bin.id))
      throw "Bin is already contained: " + bin.id;

    /* Initialise bin. */
    bin.initialise();

    /* Contain bin and append its HTML node. */
    this.append_(bin.node);
    this.bins_.push(bin);

    /* If first bin to be contained, activate it by default, unless told not to
     * do so. */
    if(activate !== false && !this.active_)
      this.setActive(bin);

    /* Request update of the bin's feature collection. Set the bin's state to
     * unknown if it is supposed to exist in the backend (`exists´ is true,
     * which means it is being loaded from local storage) but a feature
     * collection was not retrieved. */
    this.update_(bin.data, exists === true)
      .fail(function () {
        bin.setUnknown();
      } );

    return bin;
  };

  ControllerFolder.prototype.merge = function (dropped, dragged)
  {
    var api = this.owner_.api,
        label = new (api.getClass('Label'))(
          dropped.id,
          dragged.id,
          api.getAnnotator(),
          api.COREF_VALUE_POSITIVE,
          dropped.data.subtopic_id,
          dragged.data.subtopic_id);

    /* NOTE: since bins are UI creations and don't exist as such in the backend,
     * we always remove the bin regardless what the result is from adding the
     * label. */
    this.removeAt(this.indexOf(dragged));
    this.owner_.save();

    return this.doAddLabel_(label);
  };

  ControllerFolder.prototype.addLabel = function (bin, descriptor)
  {
    var self = this,
        api = this.owner_.api;

    return this.update_(descriptor)
      .then(function (fc) {
        /* Create label between snippet/image and bin. */
        var label = new (api.getClass('Label'))(
          bin.data.content_id,
          descriptor.content_id,
          api.getAnnotator(),
          api.COREF_VALUE_POSITIVE,
          bin.data.subtopic_id,
          descriptor.subtopic_id);

        return self.doAddLabel_(label);
      },
      function () {
        console.log("Unable to add label between '%s' and '%s': "
                    + "feature collection not found",
                    bin.id,
                    descriptor.content_id);
      } );
  };

  ControllerFolder.prototype.find = function (callback)
  {
    var result = null;

    this.bins_.some(function (bin) {
      if(callback(bin)) {
        result = bin;
        return true;
      }
    } );

    return result;
  };

  ControllerFolder.prototype.indexOf = function (bin)
  {
    return this.bins_.indexOf(bin);
  };

  ControllerFolder.prototype.indexOfId = function (id)
  {
    for(var i = 0, l = this.bins_.length; i < l; ++i) {
      if(this.bins_[i].id === id)
        return i;
    }

    return -1;
  };

  ControllerFolder.prototype.remove = function (bin)
  {
    return this.removeAt(this.bins_.indexOf(bin));
  };

  ControllerFolder.prototype.removeAt = function (index)
  {
    var bin;

    if(index < 0 || index >= this.bins_.length)
      throw "Invalid bin index";

    bin = this.bins_[index];
    this.bins_.splice(index, 1);

    bin.node.remove();

    if(bin === this.active_)
      this.setActive(this.bins_.length > 0 && this.bins_[0] || null);
  };

  ControllerFolder.prototype.getAt = function (index)
  {
    if(index < 0 || index >= this.bins_.length)
      throw "Invalid bin index";

    return this.bins_[index];
  };

  ControllerFolder.prototype.getById = function (id)
  {
    return this.find(function (bin) {
      return bin.id === id;
    } );
  };

  ControllerFolder.prototype.setActive = function (bin)
  {
    /* Don't activate bin if currently active already. */
    if(this.active_ === bin)
      return;

    /* Invoke API to activate the bin. If successful, update UI state and force
     * a redraw of the items container. */
    if(this.active_)
      this.active_.deactivate();

    this.active_ = bin;

    if(bin) {
      bin.activate();

      if(this.owner_.initialised) {
        this.owner_.api.setQueryContentId(bin.data.content_id);
        this.owner_.sortingQueue.items.redraw();
      }

      /* Ensure bin is visible. */
      this.owner_.options.nodes.bins.animate(
        { scrollLeft: bin.node.offset().left },
        250);

      this.owner_.sortingQueue.callbacks.invoke('setActive', this.id);
    }
  };

  ControllerFolder.prototype.browse = function (bin)
  {
    var self = this,
        opts = this.owner_.options;

    if(!this.haveBrowser_)
      throw "Label Browser component unavailable";
    else if(this.browser_)
      throw "Label Browser already active";

    /* Disable browser icons. */
    this.disableBrowser();

    (this.browser_ = this.owner_.sortingQueue.instantiate(
      'LabelBrowser', { api: this.owner_.api, ref_bin: bin } ) )
      .initialise()
      .done(function () {
        self.browser_.reset();
        self.browser_ = null;

        /* Re-enable browser icons. */
        self.enableBrowser();
      } );
  };

  /* overridable */ ControllerFolder.prototype.serialise = function ()
  {
    var bins = [ ];

    /* Push serialised bin data into array. */
    this.bins.forEach(function (bin) {
      bins.push(bin.serialise());
    } );

    return {
      id: this.id_,
      name: this.name_,
      bins: bins,
      active: this.active_ ? this.active_.id : null
    };
  };

  /* Events */
  ControllerFolder.prototype.onDropSpecial = function (scope)
  {
    var api = this.owner_.api,
        result = { },
        content;

    if(scope) {
      console.log("Drop event not special case: ignored");
      return null;
    }

    result.content_id = api.generateContentId(window.location.href);
    result.raw = { };

    /* Process this drop event separately for text snippets and images. We
     * assume that this event originates in an image if the active
     * `ControllerDraggableImage´ instance has an active node. Otherwise,
     * we attempt to retrieve a text snippet. */
    if(this.owner_.draggable.activeNode) {
      content = this.owner_.draggable.activeNode.attr('src');

      if(content) {
        result.subtopic_id = api.makeRawImageId(
          api.generateSubtopicId(content));
        result.content = content;
      } else
        console.log("Unable to retrieve valid `src´ attribute");
    } else if(std.is_fn(window.getSelection)) {
      content = window.getSelection();

      if(content && content.anchorNode) {
        var str = content.toString();

        /* Craft a unique id for this text snippet based on its content,
         * Xpath representation, offset from selection start, length and,
         * just to be sure, current system timestamp. This id is
         * subsequently used to generate a unique and collision free
         * unique subtopic id (see below). */
        result.subtopic_id = api.makeRawTextId(
          api.generateSubtopicId(
            [ str,
              Html.getXpathSimple(content.anchorNode),
              content.anchorOffset,
              str.length,
              Date.now() ].join('|') ) );

        result.content = str;
      }
    }

    /* Clear the currently active node. */
    this.owner_.draggable.clear();

    return result.subtopic_id && result;
  };

  /* overridable */ ControllerFolder.prototype.enableBrowser = function ()
  {
    var opts = this.owner_.options;
    
    opts.nodes.bins.find('.' + opts.css.iconLabelBrowser)
      .removeClass(opts.css.disabled);
  };    

  /* overridable */ ControllerFolder.prototype.disableBrowser = function ()
  {
    var opts = this.owner_.options;
    
    opts.nodes.bins.find('.' + opts.css.iconLabelBrowser)
      .addClass(opts.css.disabled);
  };    

  /* Protected methods */
  /* overridable */ ControllerFolder.prototype.append_ = function (node)
  {
    /* Add bin node to the very top of the container if aren't any yet,
     * otherwise insert it after the last contained bin. */
    if(!this.bins_.length)
      this.owner_.options.nodes.bins.prepend(node);
    else
      this.bins_[this.bins_.length - 1].node.after(node);
  };

  ControllerFolder.prototype.onMouseEnter_ = function (bin)
  { this.hover_ = bin; };

  ControllerFolder.prototype.onMouseLeave_ = function ()
  { this.hover_ = null; };

  /* Private methods */
  ControllerFolder.prototype.update_ = function (descriptor,
                                                 exists /* = false */)
  {
    var self = this,
        api = this.owner_.api;

    /* Attempt to retrieve the feature collection for the bin's content id. */
    return api.getFeatureCollection(descriptor.content_id)
      .then(function (fc) {
        console.log("Feature collection GET successful (id=%s)",
                    descriptor.content_id, fc);

        /* A feature collection was received. No further operations are carried
         * out if `exists´ is true since it means `descriptor´ is actually a bin
         * is being loaded from local storage and therefore its feature
         * collection shouldn't be updated. */
        if(!exists) {
          api.setFeatureCollectionContent(
            fc, descriptor.subtopic_id, descriptor.content);

          return self.doUpdateFc_(descriptor.content_id, fc);
        }

        return fc;
      },
      function () {
        /* It was not possible to retrieve the feature collection for this
         * descriptor's content id. No further operations are carried out if
         * `exists´ is true since it means `descriptor´ is actually a bin being
         * loaded from local storage and therefore its feature collection
         * shouldn't be created. */
        if(exists) {
          console.log("Feature collection GET failed: NOT creating new"
                      + "(id=%s)", descriptor.content_id);
          return null;
        }

        console.log("Feature collection GET failed: creating new (id=%s)",
                    descriptor.content_id);
        return api.createFeatureCollection(descriptor.content_id,
                                           document.documentElement.outerHTML)
          .done(function(fc) {
            console.log('Feature collection created:', fc);
            api.setFeatureCollectionContent(
              fc, descriptor.subtopic_id, descriptor.content);
            api.setFeatureCollectionContent(
              fc, 'meta_url', window.location.toString());
            return self.doUpdateFc_(descriptor.content_id, fc);
          });
      } );
  };

  ControllerFolder.prototype.doUpdateFc_ = function (content_id, fc)
  {
    return this.owner_.api.putFeatureCollection(content_id, fc)
      .done(function () {
        console.log("Feature collection PUT successful (id=%s)",
                    content_id, fc);
      } )
      .fail(function () {
        console.log("Feature collection PUT failed (id=%s)",
                    content_id, fc);
      } );
  };

  ControllerFolder.prototype.doAddLabel_ = function (label)
  {
    return this.owner_.api.addLabel(label)
      .done(function () {
        console.log("Label ADD successful: '%s' == '%s'",
                    label.cid1, label.cid2);
      } )
      .fail(function () {
        console.log("Label ADD failed: '%s' ∧ '%s'",
                    label.cid1, label.cid2);
      } );
  };


  /**
   * @class
   * */
  var Bin = function (owner, descriptor)
  {
    /* Invoke super constructor. */
    std.Drawable.call(this, owner);

    this.id_ = Bin.makeId(descriptor);
    this.data_ = descriptor;
    this.node_ = null;

    /* Define getters. */
    this.__defineGetter__("id",   function () { return this.id_;   } );
    this.__defineGetter__("data", function () { return this.data_; } );
    this.__defineGetter__("node", function () { return this.node_; } );
  };

  /* Static methods */
  Bin.makeId = function (descriptor)
  {
    return descriptor.content_id + '+' + descriptor.subtopic_id;
  }

  /* Class interface */
  Bin.prototype = Object.create(std.Drawable.prototype);

  Bin.prototype.initialise = function ()
  {
    var self = this,
        parentOwner = self.owner_.owner;

    (this.node_ = this.render())
      .attr( {
        'data-scope': 'bin',
        'id': this.id
      } )
      .on( {
        mouseenter: function () {
          self.owner_.onMouseEnter_(self);
          return false;
        },
        mouseleave: function () {
          self.owner_.onMouseLeave_();
          return false;
        },
        mousedown: function() {
          $(this).addClass(parentOwner.options.css.mouseDown);
        },
        mouseup: function () {
          $(this).removeClass(parentOwner.options.css.mouseDown);
        }
      } );

    new sq.Droppable(this.node_, {
      classHover: parentOwner.options.css.droppableHover,
      scopes: function (scope) { return scope === 'bin' || scope === null; },

      drop: function (e, id, scope) {
        switch(scope) {
        case 'bin':
          var bin = self.owner_.getById(id);

          /* Ensure dragged bin exists since it is being DRAGGED and disable
           * dropping bin onto self. */
          if(!bin)
            throw "Failed to retrieve bin: " + id;
          else if(bin === self)
            break;

          /* Request merge of dropped bin (`bin´) with this Bin instance
           * (`self´). */
          self.owner_.merge(self, bin);

          /* Important: DOM node is destroyed above, which means the `dragend'
           * event won't be triggered, leaving the dismissal button visible. */
          parentOwner.sortingQueue.dismiss.deactivate();

          break;

        case null:
          var result = self.owner_.onDropSpecial(scope);

          /* If we received a map object, assume a valid drop. */
          if(result)
            self.owner_.addLabel(self, result);
          else
            console.log("Invalid drop: not text or image");

          break;

        default:
          throw "Invalid scope: " + scope;
        }
      }
    } );

    /* We must defer initialisation of D'n'D because owning object's `bin'
     * attribute will have not yet been set. */
    window.setTimeout(function () {
      new sq.Draggable(self.node_, {
        dragstart: function (e) {
          parentOwner.sortingQueue.dismiss.activate();
        },

        dragend: function (e) {
          parentOwner.sortingQueue.dismiss.deactivate();
          self.node_.removeClass(parentOwner.options.css.mouseDown);
        }
      } );
    }, 0);
  };

  Bin.prototype.activate = function ()
  {
    this.node.addClass(this.owner_.owner.options.css.binActive);
  };

  Bin.prototype.deactivate = function ()
  {
    this.node.removeClass(this.owner_.owner.options.css.binActive);
  };

  Bin.prototype.setUnknown = function (state /* = true */)
  {
    this.node.toggleClass(this.owner_.owner.options.css.binUnknown,
                          std.is_und(state) || state === true);
  };

  /* overridable */ Bin.prototype.serialise = function ()
  {
    return this.data_;
  };

  /* overridable */ Bin.prototype.renderBrowserIcon = function (node)
  {
    if(this.owner_.haveBrowser) {
      var self = this,
          icon = $('<a class="' + this.owner_.owner.options.css.iconLabelBrowser
                   + '" href="#"></a>')
            .on( {
              mousedown: function () { return false; },
              click: function () {
                self.owner_.browse(self);
                return false;
              }
            } );

      node.prepend(icon);
    }

    return node;
  };


  /**
   * @class
   * */
  var BinDefault = function (owner, descriptor)
  {
    /* Invoke super constructor. */
    Bin.call(this, owner, descriptor);
  };

  BinDefault.prototype = Object.create(Bin.prototype);

  BinDefault.prototype.initialise = function ()
  {
    var self = this;

    /* Invoke base class implementation. */
    Bin.prototype.initialise.call(this);

    /* Trap mouse clicks so we can make this bin instance the active one. */
    this.node_.click(function () {
      self.owner_.setActive(self);
      return false;
    } );

  };

  BinDefault.prototype.render = function ()
  {
    var css = this.owner_.owner.options.css,
        node = $('<div></div>').addClass(css.bin);

    $('<div></div>')
      .appendTo(node)
      .addClass(css.binName)
      .html(this.data_.content);

    return this.renderBrowserIcon(node);
  };


  /**
   * @class
   * */
  var BinImageDefault = function (owner, bin)
  {
    /* Invoke super constructor. */
    Bin.call(this, owner, bin);
  };

  BinImageDefault.prototype = Object.create(Bin.prototype);

  BinImageDefault.prototype.initialise = function ()
  {
    var self = this;

    /* Invoke base class implementation. */
    Bin.prototype.initialise.call(this);

    /* Trap mouse clicks so we can make this bin instance the active one. */
    this.node_.click(function () {
      self.owner_.setActive(self);
      return false;
    } );

  };

  BinImageDefault.prototype.render = function ()
  {
    var css = this.owner_.owner.options.css,
        node = $('<div></div>').addClass([ css.bin, css.binImage ].join(' '));

    $('<div></div>')
      .addClass(css.binName)
      .appendTo(node)
      .html('<img draggable="false" src="' + this.data_.content + '"/>');

    return this.renderBrowserIcon(node);
  };


  /**
   * @class
   * */
  var ControllerBinSpawner = function (owner, fnRender, fnAdd)
  {
    /* Invoke super constructor. */
    std.Controller.call(this, owner);

    this.fnRender_ = fnRender;
    this.fnAdd_ = fnAdd;
  };

  ControllerBinSpawner.prototype =
    Object.create(std.Controller.prototype);

  ControllerBinSpawner.prototype.reset = function ()
  {
    this.fnRender_ = this.fnAdd_ = null;
  };

  ControllerBinSpawner.prototype.add = function (descriptor)
  {
    if(!descriptor || !descriptor.content_id || !descriptor.subtopic_id
       || !descriptor.content) {
      throw "Invalid descriptor specified";
    }

    var bin = this.fnAdd_(descriptor);
    this.owner_.owner.save();

    return bin;
  };


  /**
   * @class
   * */
  var ControllerBinSpawnerDefault = function (owner, fnRender, fnAdd)
  {
    /* Invoke base class constructor. */
    ControllerBinSpawner.call(this, owner, fnRender, fnAdd);

    /* Attributes */
    this.node_ = null;
    this.droppable_ = null;
  };

  ControllerBinSpawnerDefault.prototype =
    Object.create(ControllerBinSpawner.prototype);

  ControllerBinSpawnerDefault.prototype.initialise = function ()
  {
    var self = this,
        parentOwner = this.owner_.owner;

    this.node_ = parentOwner.options.nodes.add;

    this.droppable_ = new sq.Droppable(this.node_, {
      classHover: parentOwner.options.css.droppableHover,
      scopes: function (scope) { return !scope; },
      drop: function (e, id, scope) {
        var result = self.owner_.onDropSpecial(scope);

        /* If we received a map object, assume a valid drop. */
        if(result)
          self.add(result);

        self.node_.removeClass(parentOwner.options.css.droppableHover);

        return false;
      }
    } );
  };

  ControllerBinSpawnerDefault.prototype.reset = function ()
  {
    this.droppable_.reset();
    this.node_ = this.droppable_ = null;

    ControllerBinSpawner.prototype.reset.call(this);
  };


  /**
   * @class
   * */
  var Html = {
    getXpathSimple: function (node)
    {
      var result = [ ];

      if(node instanceof $)
        node = node.get(0);

      if(node) {
        do {
          result.push(node.nodeName);
        } while( (node = node.parentNode) );
      }

      return result.reverse().join('/');
    }
  };


  /* Default options */
  var defaults_ = {
    nodes: {
      items: null,
      bins: null,
      add: null,
      buttonDismiss: null
    },
    css: {
      item: 'sd-text-item',
      itemContent: 'sd-text-item-content',
      itemTitle: 'sd-text-item-title',
      itemClose: 'sd-text-item-close',
      itemSelected: 'sd-selected',
      itemDragging: 'sd-dragging',
      bin: 'sd-bin',
      binImage: 'sd-bin-image',
      binName: 'sd-bin-name',
      binAnimateAssign: 'sd-assign',
      binAdding: 'sd-adding',
      binActive: 'sd-active',
      binUnknown: 'sd-unknown',
      buttonAdd: 'sd-button-add',
      droppableHover: 'sd-droppable-hover',
      mouseDown: 'sd-mousedown',
      iconLabelBrowser: 'sd-bin-browser-icon',
      disabled: 'sd-disabled'   /* Indicates something is disabled. */
    },
    delays: {                   /* In milliseconds.     */
      binRemoval: 200,          /* Bin is removed from container. */
      addBinShow: 200           /* Fade in of temporary bin when adding. */
    },
    constructors: {
      ControllerFolder: ControllerFolder,
      Bin: BinDefault,
      BinImage: BinImageDefault,
      ControllerBinSpawner: ControllerBinSpawnerDefault
    }
  };


  /* Module public API */
  return {
    Sorter: Sorter,
    ControllerFolder: ControllerFolder,
    Bin: Bin,
    BinDefault: BinDefault,
    BinImageDefault: BinImageDefault,
    ControllerBinSpawner: ControllerBinSpawner,
    ControllerBinSpawnerDefault: ControllerBinSpawnerDefault
  };

};


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("SortingDesk", [ "jquery", "SortingQueue", "SortingCommon", "API" ], function ($, sq, std, api) {
    return SortingDesk_(window, $, sq, std, api);
  });
} else
  window.SortingDesk = SortingDesk_(window, $, SortingQueue, SortingCommon, Api);
