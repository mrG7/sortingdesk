/**
 * @file Sorting Desk component.
 * @copyright 2014 Diffeo
 *
 * Comments:
 * Uses the `SortingQueue' component.
 *
 */


/*global SortingQueue, define */
/*jshint laxbreak:true */

// Notes from the contractor on abstracting out the use of `chrome` in this file:
//
// + a mechanism to send notifications whenever in need of saving state. I
// thought we could use the existing (outwards facing) callbacks and extending
// it so the component can communicate with the owning instance, which in
// Chrome's case is the script `Ui.js´, but you may have a different strategy
// in mind.
//
// + a mechanism that enables `SortingDesk´ to *receive* notifications;
// presently this is required so it knows when to update state when, for
// instance, state changes in a different tab. In essence, this is the opposite
// of the callbacks mechanism in place now; instead of issuing notifications,
// it needs to receive them. My suggestion would be to create a method in the
// `SortingDesk.Sorter´, part of the module's public API, that returns an
// object containing its (inwards facing) callbacks.


/**
 * The Sorting Desk module.
 *
 * @returns an object containing the module's public interface.
 * */
var SortingDesk_ = function (window, $, Api) {

  var Url = {
    encode: function (s)
    {
      /* Taken from: http://goo.gl/kRTxRW
       * (Javascript's default `encodeURIComponent` does not strictly conform to
       * RFC 3986.) */
        return encodeURIComponent(s).replace(/[!'()*]/g, function(c) {
          return '%' + c.charCodeAt(0).toString(16);
        });
    }
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
    this.sortingQueue_ = new SortingQueue.Sorter(
      this.options_,
      $.extend(this.api_.getCallbacks(), cbs));

    /* Restore state from local storage. */
    this.load_()
      .done(function (bins) {
        var bin;
        
        /* If bins were retrieved from local storage, activate the bin that is
         * the currently active one (as specified in `options.activeBinId´) or,
         * if one isn't yet active, use the first element as the active bin.
         *
         * If no bins exist in local storage, don't do anything and keep the
         * current query content id null. */
        if(bins && bins.length > 0) {
          var index = -1;

          if(opts.activeBinId) {
            bins.some(function (bin, position) {
              if(Bin.makeId(bin) === opts.activeBinId) {
                index = position;
                return true;
              }
            } );
          }

          if(index === -1)
            console.log("Unable to find active bin: using first bin");
          
          bin = bins[index === -1 ? 0 : index];

          /* Set query content before initialising SortingQueue to ensure
           * correct contexts for items retrieved. */
          self.api_.setQueryContentId(bin.content_id);
        }

        self.initialise_(bins, bin && Bin.makeId(bin) || null);
      } );
  };

  Sorter.prototype = {
    initialised_: false,
    options_: null,

    /* Instances */
    api_: null,
    sortingQueue_: null,
    bins_: null,
    draggable_: null,

    load: function (activeBinId)
    {
      var self = this;

      return this.load_()
        .done(function (bins) {
          self.initialiseBins_(bins, activeBinId);
        } );
    },

    save: function ()
    {
      return this.sortingQueue_.callbacks.invoke(
        'setBins',
        { bins: this.bins_.serialise() } );
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
          self.bins_.reset();

          self.bins_ = self.options_ = self.sortingQueue_ = null;
          self.initialised_ = false;

          console.log("Sorting Desk UI reset");
        } );
    },

    onDropSpecial: function (scope)
    {
      var result = { },
          content;
      
      if(scope) {
        console.log("Drop event not special case: ignored");
        return null;
      }

      result.content_id = this.api_.generateContentId(window.location.href);
      result.raw = { };
      
      /* Process this drop event separately for text snippets and images. We
       * assume that this event originates in an image if the active
       * `ControllerDraggableImage´ instance has an active node. Otherwise,
       * we attempt to retrieve a text snippet. */
      if(this.draggable_.activeNode) {
        content = this.draggable_.activeNode.attr('src');

        if(content) {
          result.subtopic_id = this.api_.makeRawImageId(
            this.api_.generateSubtopicId(content));
          result.content = content;
        } else
          console.log("Unable to retrieve valid `src´ attribute");
      } else if(typeof window.getSelection === 'function') {
        content = window.getSelection();

        if(content && content.anchorNode) {
          var str = content.toString();

          /* Craft a unique id for this text snippet based on its content,
           * Xpath representation, offset from selection start, length and,
           * just to be sure, current system timestamp. This id is
           * subsequently used to generate a unique and collision free
           * unique subtopic id (see below). */
          result.subtopic_id = this.api_.makeRawTextId(
            this.api_.generateSubtopicId(
              [ str,
                Html.getXpathSimple(content.anchorNode),
                content.anchorOffset,
                str.length,
                Date.now() ].join('|') ) );
          
          result.content = str;
        }
      }
      
      /* Clear the currently active node. */
      this.draggable_.clear();

      return result.subtopic_id && result;
    },

    /* Private methods */
    initialise_: function (bins, activeBinId)
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
        var bin = self.bins_.getById(id);

        if(bin) {
          self.bins_.removeAt(self.bins_.indexOf(bin));
          self.save();
        }
      } );

      /* Once the bins controller has been instantiated and initialised, we're
       * all good. */
      this.initialiseBins_(bins, activeBinId);

      this.initialised_ = true;
      console.log("Sorting Desk UI initialised");
    },

    initialiseBins_: function (bins, activeBinId)
    {
      /* Force reset of the bins controller, if an instance currently exists. */
      if(this.bins_)
        this.bins_.reset();

      /* Clear the items queue list. */
      this.sortingQueue_.items.removeAll();

      /* (Re-)instantiate the bins controller. */
      (this.bins_ = this.sortingQueue_.instantiate('ControllerBins', this))
        .initialise(bins, activeBinId);
    },

    load_: function ()
    {
      return this.sortingQueue_.callbacks.invoke('getBins');
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

    get bins ()
    { return this.bins_; },

    get draggable ()
    { return this.draggable_; }
  };


  /**
   * @class
   * */
  var ControllerDraggableImage = function (owner)
  {
    /* Invoke super constructor. */
    SortingQueue.Controller.call(this, owner);
    /* Define getters. */
    this.__defineGetter__("activeNode",
                          function () { return this.activeNode_; } );
  };

  ControllerDraggableImage.prototype = Object.create(
    SortingQueue.Controller.prototype);

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
  var ControllerBins = function (owner)
  {
    var self = this;

    /* Invoke base class constructor. */
    SortingQueue.Controller.call(this, owner);

    this.bins_ = [ ];
    this.hover_ = null;
    this.active_ = null;
    this.spawner_ = null;
    this.browser_ = null;

    /* TODO: at the very least, a `hasConstructor´ method should be created in
     * the `SortingQueue.Sorter´ class.  Ideally, a controller class responsible
     * for constructors should be created instead and the `instantiate´ and
     * `hasContructor´ methods should be placed there. */
    this.haveBrowser_ = owner.sortingQueue.options.constructors
      .hasOwnProperty('createLabelBrowser')
      || owner.sortingQueue.options.constructors
      .hasOwnProperty('LabelBrowser');
                
    /* Define getters. */
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

  ControllerBins.prototype = Object.create(SortingQueue.Controller.prototype);

  ControllerBins.prototype.initialise = function (bins, activeBinId)
  {
    var self = this,
        bin;
    
    this.spawner_.initialise();
    
    /* Load initial bin state, if bins exist. */
    if(!(bins instanceof Array) || bins.length === 0)
      return;

    bins.forEach(function (descriptor) {
      self.add(self.construct(descriptor), false, true);
    } );
    
    /* Now manually set the active bin. */
    bin = this.getById(activeBinId);

    /* Attempt to recover if we've been given an invalid id to activate. */
    if(!bin) {
      console.log("Failed to set the active bin: setting first (id=%s)",
                  activeBinId);

      bin = self.bins_.getAt(0);
    }

    this.setActive(bin);
  };

  ControllerBins.prototype.construct = function (descriptor)
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
  
  ControllerBins.prototype.reset = function ()
  {
    /* Reset bin spawner controller and remove all children nodes inside the
     * bins HTML container. */
    this.spawner_.reset();
    this.owner_.options.nodes.bins.children().remove();

    this.bins_ = this.hover_ = this.active_ = this.spawner_ = null;
  };

  ControllerBins.prototype.add = function (bin,
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
        if(exists)
          bin.setUnknown();
      } );

    return bin;
  };

  ControllerBins.prototype.merge = function (dropped, dragged)
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

  ControllerBins.prototype.addLabel = function (bin, descriptor)
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

  ControllerBins.prototype.find = function (callback)
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

  ControllerBins.prototype.indexOf = function (bin)
  {
    /* Note: returns the index of top level bins only. */
    return this.bins_.indexOf(bin);
  };

  ControllerBins.prototype.remove = function (bin)
  {
    return this.removeAt(this.bins_.indexOf(bin));
  };

  ControllerBins.prototype.removeAt = function (index)
  {
    var bin;

    if(index < 0 || index >= this.bins_.length)
      throw "Invalid bin index";

    bin = this.bins_[index];
    this.bins_.splice(index, 1);

    bin.node.remove();

    if(bin === this.active_)
      this.setActive(this.bins_.length && this.bins_[0] || null);
  };

  ControllerBins.prototype.getAt = function (index)
  {
    if(index < 0 || index >= this.bins_.length)
      throw "Invalid bin index";

    return this.bins_[index];
  };

  ControllerBins.prototype.getById = function (id)
  {
    return this.find(function (bin) {
      return bin.id === id;
    } );
  };

  ControllerBins.prototype.setActive = function (bin)
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
        { scrollLeft: bin.node.position().left },
        250);
    }

    /* Let the extension know that the active bin has changed. */
    this.owner_.sortingQueue.callbacks.invoke('setActiveBin', bin.id);
  };

  ControllerBins.prototype.browse = function (bin)
  {
    var self = this,
        opts = this.owner_.options;
    
    if(!this.haveBrowser_)
      throw "Label Browser component unavailable";
    else if(this.browser_)
      throw "Label Browser already active";

    /* Disable browser icons. */
    opts.nodes.bins.find('.' + opts.css.iconLabelBrowser)
      .addClass(opts.css.disabled);

    (this.browser_ = this.owner_.sortingQueue.instantiate(
      'LabelBrowser', this, this.owner_.api, bin))
      .initialise()
      .done(function () {
        self.browser_.reset();
        self.browser_ = null;

        /* Re-enable browser icons. */
        opts.nodes.bins.find('.' + opts.css.iconLabelBrowser)
          .removeClass(opts.css.disabled);
      } );
  };

  /* overridable */ ControllerBins.prototype.serialise = function ()
  {
    var bins = [ ];

    /* Push serialised bin data into array. */
    this.bins.forEach(function (bin) {
      bins.push(bin.serialise());
    } );

    return bins;
  };

  /* Protected methods */
  /* overridable */ ControllerBins.prototype.append_ = function (node)
  {
    /* Add bin node to the very top of the container if aren't any yet,
     * otherwise insert it after the last contained bin. */
    if(!this.bins_.length)
      this.owner_.options.nodes.bins.prepend(node);
    else
      this.bins_[this.bins_.length - 1].node.after(node);
  };

  ControllerBins.prototype.onMouseEnter_ = function (bin)
  { this.hover_ = bin; };

  ControllerBins.prototype.onMouseLeave_ = function ()
  { this.hover_ = null; };

  /* Private methods */
  ControllerBins.prototype.update_ = function (descriptor,
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
        
        var fc = new (api.getClass('FeatureCollection'))( {
          title: window.document.title,
          titleBow: api.mapWordCount(window.document.title),
          snippet: descriptor.content,
          snippetBow: api.mapWordCount(descriptor.content)
        } );
        
        console.log("Feature collection GET failed: creating new (id=%s)",
                    descriptor.content_id, fc);

        api.setFeatureCollectionContent(
          fc, descriptor.subtopic_id, descriptor.content);

        return self.doUpdateFc_(descriptor.content_id, fc);
      } );
  };

  ControllerBins.prototype.doUpdateFc_ = function (content_id, fc)
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

  ControllerBins.prototype.doAddLabel_ = function (label)
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
    SortingQueue.Drawable.call(this, owner);

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
  Bin.prototype = Object.create(SortingQueue.Drawable.prototype);

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

    new SortingQueue.Droppable(this.node_, {
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
          var result = parentOwner.onDropSpecial(scope);

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
      new SortingQueue.Draggable(self.node_, {
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
                          typeof state === 'undefined' || state === true);
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
    SortingQueue.Controller.call(this, owner);

    this.fnRender_ = fnRender;
    this.fnAdd_ = fnAdd;
  };

  ControllerBinSpawner.prototype =
    Object.create(SortingQueue.Controller.prototype);

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
    
    this.droppable_ = new SortingQueue.Droppable(this.node_, {
      classHover: parentOwner.options.css.droppableHover,
      scopes: function (scope) { return !scope; },
      drop: function (e, id, scope) {
        var result = parentOwner.onDropSpecial(scope);

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
  var LabelBrowser = function (owner, api, bin)
  {
    /* Invoke super-constructor. */
    SortingQueue.Controller.call(this, owner);

    /* Attributes */
    this.api_ = api;
    this.deferred_ = null;
    this.nodes_ = { };
    this.ref_bin_ = bin;
    this.ref_fc_ = null;
    this.eqv_fcs_ = [ ];
    this.view_ = null;
    this.viewType_ = LabelBrowser.VIEW_DEFAULT;

    /* Getters */
    this.__defineGetter__('api', function () { return this.api_; } );
    this.__defineGetter__('nodes', function () { return this.nodes_; } );
    this.__defineGetter__('ref_bin', function () { return this.ref_bin_; } );
    this.__defineGetter__('ref_fc', function () { return this.ref_fc_; } );
    this.__defineGetter__('eqv_fcs', function () { return this.eqv_fcs_; } );
    this.__defineGetter__('viewType', function () { return this.viewType_; } );
    this.__defineGetter__('view', function () { return this.view_; } );
  };

  /* Constants
   * --
   * View types */
  LabelBrowser.VIEW_LIST = 0x01;
  LabelBrowser.VIEW_GROUPED = 0x02;
  LabelBrowser.VIEW_DEFAULT = LabelBrowser.VIEW_LIST;

  /* Interface */
  LabelBrowser.prototype = Object.create(SortingQueue.Controller.prototype);

  LabelBrowser.prototype.initialise = function ()
  {
    var self = this,
        els = this.nodes_;

    console.log("Initializing Label Browser component");

    var onEndInitialise = function () {
      console.log("Label Browser component initialized");
    };
    
    this.deferred_ = $.Deferred();

    /* Begin set up nodes. */
    els.container = $('[data-sd-scope="container-label-browser"]');

    els.buttonClose = this.find_node_('close')
      .click( function () { self.close(); } );

    els.toolbar = {
      view: {
        list: this.find_node_('toolbar-list'),
        group: this.find_node_('toolbar-group')
      }
    };

    els.heading = {
      title: this.find_node_('heading-title'),
      content: this.find_node_('heading-content')
    };

    els.items = this.find_node_('items');
    els.table = els.items.find('TABLE');
    /* End setup up nodes. */

    /* Retrieve feature collection for the bin's `content_id´. */
    this.api_.getFeatureCollection(this.ref_bin_.data.content_id)
      .done(function (fc) { self.set_heading_(fc); } )
      .fail(function () { self.set_heading_(null); } );

    /* Retrieve all existing labels for the bin's `content_id´. */
    this.api_.getLabelsUniqueById(this.ref_bin_.data.content_id)
      .then(function (ids) {
        console.log("Got labels' unique ids:", ids);
        
        self.api_.getAllFeatureCollections(ids)
          .done(function (fcs) {
            console.log("Unique labels' content id collection GET successful:",
                        fcs);

            self.eqv_fcs_ = fcs instanceof Array ? fcs : [ ];
            self.render_();
          } )
          .fail(function () {
            console.log('Failed to retrieve all feature collections');
            onEndInitialise();
          } );
      } )
      .fail(function () {
        console.log('Failed to load state');
        onEndInitialise();
      } );

    /* NOTE: This should really be an event. */
    this.owner_.owner.sortingQueue.callbacks.invoke({
      name: "onLabelBrowserInitialised",
      mandatory: false
    }, this.nodes_.container);

    this.show();

    return this.deferred_.promise();
  };

  LabelBrowser.prototype.reset = function ()
  {
    /* Remove all children nodes. */
    this.nodes_.heading.title.children().remove();
    this.nodes_.heading.content.children().remove();
    this.nodes_.table.find('TR:not(:first-child)').remove();

    /* Resolve promise if one still exists. */
    if(this.deferred_)
      this.deferred_.resolve();

    /* Detach all events. */
    this.nodes_.buttonClose.off();

    this.deferred_ = this.ref_bin_ = this.view_ = this.nodes_ = null;
    this.ref_fc_ = this.eqv_fcs_ = this.viewType_ = this.api_ = null;

    console.log("Label Browser component reset");
  };

  LabelBrowser.prototype.show = function ()
  {
    this.nodes_.container.css( {
      transform: 'scale(1,1)',
      opacity: 1
    } );
  };
  
  LabelBrowser.prototype.close = function ()
  {
    this.nodes_.container
      .css( {
        transform: 'scale(.2,.2)',
        opacity: 0
      } );

    if(this.deferred_) {
      this.deferred_.resolve();
      this.deferred_ = null;
    }
  };

  /* Private methods */
  LabelBrowser.prototype.render_ = function ()
  {
    if(this.view_) {
      this.view_.reset();
      this.view_ = null;
    }
    
    switch(this.viewType_) {
    case LabelBrowser.VIEW_LIST:
      this.view_ = new LabelBrowserViewList(this, this.eqv_fcs_);
      break;

    default:
      throw "Invalid view type or view unsupported: " + this.viewType_;
    }

    /* Render view. */
    this.view_.render();
  };

  LabelBrowser.prototype.set_heading_ = function (fc)
  {
    this.nodes_.heading.title
      .html(typeof fc === 'object'
            && typeof fc.raw === 'object'
            && typeof fc.raw.title === 'string'
            && fc.raw.title
            || "<unknown title>");

    /* TODO: using reference bin's own content rather than snippet from
     * retrieved feature collection. */
    this.nodes_.heading.content.html(this.ref_bin_.data.content);
  };

  LabelBrowser.prototype.find_node_ = function (scope,
                                                parent /* = container */)
  {
    var p;

    if(parent instanceof $)
      p = parent;
    else if(typeof parent === 'string')
      p = this.find_node_(parent);
    else
      p = this.nodes_.container;

    return p.find( [ '[data-sd-scope="label-browser-', scope, '"]' ].join(''));
  };


  /**
   * @class
   * */
  var LabelBrowserView = function (owner, fcs)
  {
    /* Invoke super constructor. */
    SortingQueue.Drawable.call(this, owner);
    
    /* Check `fcs' argument IS an array. */
    if(!(fcs instanceof Array))
      throw "Invalid feature collection array specified";

    /* Attributes */
    this.fcs_ = fcs;

    /* Getters */
    this.__defineGetter__('fcs', function () { return this.fcs_; } );
  };

  LabelBrowserView.prototype = Object.create(SortingQueue.Drawable.prototype);


  /**
   * @class
   * */
  var LabelBrowserRowGroup = function (owner, fc)
  {
    /* Invoke super constructor. */
    SortingQueue.Drawable.call(this, owner);

    /* Attributes */
    this.fc_ = fc;

    /* Getters */
    this.__defineGetter__("fc", function () { return this.fc_; } );
  };

  LabelBrowserRowGroup = Object.create(SortingQueue.Drawable.prototype);


  /**
   * @class
   * */
  var LabelBrowserRow = function (owner, id, content)
  {
    /* Invoke super constructor. */
    SortingQueue.Drawable.call(this, owner);
    
    /* Attributes */
    this.id_ = id;
    this.content_ = content;

    /* Getters */
    this.__defineGetter__('id', function () { return this.id_; } );
    this.__defineGetter__('content', function () { return this.content_; } );
  };

  LabelBrowserRow.prototype = Object.create(SortingQueue.Drawable.prototype);
  

  /**
   * @class
   * */
  var LabelBrowserViewList = function (owner, fcs)
  {
    /* Invoke super constructor. */
    LabelBrowserView.call(this, owner, fcs);

    /* Attributes */
    this.rows_ = [ ];
    this.subtopics_ = { };

    var self = this,
        api = owner.api,
        count = 0;

    /* TODO: below we are merging subtopics from all feature collections to
     * avoid duplicates. Is this really necessary or would it be best to just
     * show them all, regardless? */
    
    /* Merge subtopics from all feature collections. */
    fcs.forEach(function (fc) {
      if(typeof fc.raw !== 'object') {
        console.log("Feature collection `raw´ attribute not found or invalid",
                    fc);
        return;
      }

      /* Contain entries in the feature collection's `raw´ attribute that are
       * subtopics. If an entry with the same key exists, it is replaced. */
      for(var k in fc.raw) {
        if(api.isSubtopic(k)) {
          self.subtopics_[k] = fc.raw[k];
          ++count;
        }
      }
    } );

    console.log("Merged subtopics from %d feature collection(s): count=%d",
                fcs.length,
                count,
                this.subtopics_);
  };

  LabelBrowserViewList.prototype = Object.create(LabelBrowserView.prototype);

  LabelBrowserViewList.prototype.render = function (fcs)
  {
    /* Finally create and render rows. */
    for(var k in this.subtopics_) {
      var row = new LabelBrowserViewListRow(
        this,
        this.owner_.api.extractSubtopicId(k),
        this.subtopics_[k]);
      
      this.rows_.push(row);
      row.render();
    }
  };


  /**
   * @class
   * */
  var LabelBrowserViewListRow = function (owner, id, content)
  {
    /* Invoke super constructor. */
    LabelBrowserRow.call(this, owner, id, content);
  };

  LabelBrowserViewListRow.prototype = Object.create(LabelBrowserRow.prototype);

  LabelBrowserViewListRow.prototype.render = function ()
  {
    var row = $('<tr></tr>');

    $('<td></td>')
      .addClass(Css.LabelBrowser.items.id)
      .html(this.id_)
      .appendTo(row);

    $('<td></td>')
      .addClass(Css.LabelBrowser.items.content)
      .html(this.content_)
      .appendTo(row);
      
    row.insertAfter(this.owner_.owner.nodes.table.find('TR:last-child'));
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


  /* CSS class names used. */
  var Css = {
    LabelBrowser: {
      items: {
        id: 'sd-lb-items-id',
        content: 'sd-lb-items-content'
      }
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
      binUnkown: 'sd-unknown',
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
      ControllerBins: ControllerBins,
      Bin: BinDefault,
      BinImage: BinImageDefault,
      ControllerBinSpawner: ControllerBinSpawnerDefault,
      LabelBrowser: LabelBrowser
    }
  };


  /* Module public API */
  return {
    Sorter: Sorter,
    ControllerBins: ControllerBins,
    Bin: Bin,
    BinDefault: BinDefault,
    BinImageDefault: BinImageDefault,
    ControllerBinSpawner: ControllerBinSpawner,
    ControllerBinSpawnerDefault: ControllerBinSpawnerDefault,
    LabelBrowser: LabelBrowser
  };

};


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("SortingDesk", [ "jquery", "api" ], function ($, Api) {
    return SortingDesk_(window, $, Api);
  });
} else
  window.SortingDesk = SortingDesk_(window, $, Api);
