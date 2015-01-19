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
    this.events_ = new std.Events(this, [ 'open', 'close', 'active' ]);
    this.constructor_ = new std.Constructor(
      $.extend($.extend({}, defaults_.constructors), opts.constructors));

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
        constructors: {
          Item: TextItem
        },
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
    folder_: null,
    draggable_: null,
    
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
    get folder ()       { return this.folder_; },
    get draggable ()    { return this.draggable_; },

    /* Interface */
    initialise: function ()
    {
      if(this.initialised_)
        throw "Sorting Desk component already initialised";
      
      var finder = new std.NodeFinder('sorting-desk', this.options_.container);
      
      /* Find nodes. */
      this.nodes_ = {
        container: finder.root(),
        bins: finder.find('bins'),
        buttons: {
          add: finder.find('button-add')
        },
        empty: {
          closed: finder.find('closed'),
          bins: finder.find('bins-empty')
        }
      };

      /* Begin instantiating and initialising controllers.
       *
       * Start by explicitly initialising SortingQueue's instance and proceed to
       * initialising our own instance. */
      this.sortingQueue_.initialise();
      
      (this.draggable_ = new ControllerDraggableImage(this))
        .initialise();

      this.initialised_ = true;
      console.log("Sorting Desk UI initialised");

      if(this.options.active)
        this.open(this.options.active);
      else
        this.nodes_.empty.closed.fadeIn();
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

      return this.sortingQueue_.reset()
        .done(function () {
          self.folder_.reset();

          self.folder_ = self.options_ = self.sortingQueue_ = null;
          self.initialised_ = false;

          console.log("Sorting Desk UI reset");
        } );
    },

    open: function (folder)
    {
      var self = this;

      /* Allow folder to be an object ready for consumption or a string
       * (containing an id) that can be used to retrieve the folder's
       * descriptor. */
      if(std.is_obj(folder)) {
        this.initialiseFolder_(folder);
        this.events_.trigger('open', this.folder_);
      } else if(folder) {         /* assume id */
        this.callbacks_.invoke('load', folder)
          .done(function (f) {
            self.initialiseFolder_(f);
            self.events_.trigger('open', self.folder_);
          } );
      }
        console.log('Invalid folder specified', folder);
    },

    close: function ()
    {
      /* Force reset of the bins controller, if an instance currently exists. */
      if(this.folder_ === null) {
        console.log("No folder currently active");
        return;
      }
      
      this.folder_.reset();
      this.folder_ = null;
      
      /* Clear the items queue list. */
      this.sortingQueue_.items.removeAll(false);
      this.events_.trigger('close');
      this.nodes_.empty.closed.fadeIn();
    },
    
    save: function ()
    {
      if(this.folder_)
        this.callbacks_.invoke('save', this.folder_.serialise() );
    },

    /* Private methods */
    initialiseFolder_: function (folder)
    {
      this.close();
      this.nodes_.empty.closed.hide();
      
      /* (Re-)instantiate the bins controller. */
      (this.folder_ = this.constructor_.instantiate('ControllerFolder', this))
        .initialise(folder);
    }
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

    /* The `LabelBrowser´ component requires a factory method since it needs
     * options passed in. */
    this.haveBrowser_ = !owner.constructor.isConstructor('LabelBrowser');

    /* Define getters. */
    this.__defineGetter__("id", function () { return this.id_; } );
    this.__defineGetter__("name", function () { return this.name_; } );
    this.__defineGetter__("bins", function () { return this.bins_; } );
    this.__defineGetter__("hover", function () { return this.hover_; } );
    this.__defineGetter__("active", function () { return this.active_; } );
    this.__defineGetter__("node", function () {
      return this.owner_.nodes.bins;
    } );

    this.__defineGetter__("haveBrowser", function () {
      return this.haveBrowser_;
    } );

    /* Instantiate spawner controller. */
    this.spawner_ = this.owner_.constructor.instantiate(
      'ControllerBinSpawner',
      this,
      function (input) {
        return self.owner_.constructor.instantiate(
          'Bin', self, { data: input }, null).render();
      },
      function (descriptor) {
        return self.add(self.construct(descriptor));
      } );
    
    /* Register for a bin dismissal event and process it accordingly. */
    owner.sortingQueue.dismiss.register('bin', function (e, id, scope) {
      var index = self.indexOfId(id);

      if(index !== -1) {
        self.removeAt(index);
        self.owner_.save();
      }
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
      throw "Invalid or no folder descriptor given";
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
    return this.owner_.constructor.instantiate(
      map[type],
      this,
      descriptor);
  };

  ControllerFolder.prototype.reset = function ()
  {
    /* Reset bin spawner controller and remove all children nodes inside the
     * bins HTML container. */
    this.spawner_.reset();
    this.owner_.nodes.bins.children().remove();
    this.owner_.api.setQueryContentId(null);

    /* De-register for events of 'bin' scope. */
    this.owner_.sortingQueue.dismiss.unregister('bin');

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

    this.updateEmptyNotification_();

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

    this.updateEmptyNotification_();
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
      this.owner_.nodes.bins.animate(
        { scrollLeft: bin.node.offset().left },
        250);

      this.owner_.callbacks.invoke('setActive', this.id);
    } else {
      /* There is no active bin, which means we need to clear the list of items,
       * but we only do so *after* the query content id has been set since
       * Sorting Queue will attempt to refresh the items list. */
      this.owner_.api.setQueryContentId(null);
      this.owner_.sortingQueue.items.removeAll();
    }

    /* Finally, trigger event. */
    this.owner_.events.trigger('active', bin);
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

    (this.browser_ = this.owner_.constructor.instantiate(
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
    
    this.owner_.nodes.bins.find('.' + opts.css.iconLabelBrowser)
      .removeClass(opts.css.disabled);
  };    

  /* overridable */ ControllerFolder.prototype.disableBrowser = function ()
  {
    var opts = this.owner_.options;
    
    this.owner_.nodes.bins.find('.' + opts.css.iconLabelBrowser)
      .addClass(opts.css.disabled);
  };    

  /* Protected methods */
  /* overridable */ ControllerFolder.prototype.append_ = function (node)
  {
    /* Add bin node to the very top of the container if aren't any yet,
     * otherwise insert it after the last contained bin. */
    if(!this.bins_.length)
      this.owner_.nodes.bins.prepend(node);
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

  ControllerFolder.prototype.updateEmptyNotification_ = function ()
  {
    this.owner_.nodes.empty.bins.stop();
    if(this.bins_.length === 0) {
      this.owner_.nodes.empty.bins.fadeIn(
        this.owner_.options.delays.binsEmptyFadeIn);
    } else {
      this.owner_.nodes.empty.bins.fadeOut(
        this.owner_.options.delays.binsEmptyFadeOut);
    }      
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

    new std.Droppable(this.node_, {
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
      new std.Draggable(self.node_, {
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

    this.node_ = parentOwner.nodes.buttons.add;

    this.droppable_ = new std.Droppable(this.node_, {
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
    css: {
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
      addBinShow: 200,          /* Fade in of temporary bin when adding. */
      binsEmptyFadeIn: 250,
      binsEmptyFadeOut: 100
    },
    constructors: {
      ControllerFolder: ControllerFolder,
      Bin: BinDefault,
      BinImage: BinImageDefault,
      ControllerBinSpawner: ControllerBinSpawnerDefault
    },
    container: null
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
