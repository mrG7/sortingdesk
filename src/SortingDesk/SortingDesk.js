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
    this.api_ = Api.initialize(this);

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
         * if one isn't yet active, use the first element as the active bin. */
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

          if(index === -1) {
            console.log("Failed to set query id to active bin's content id: "
                        + "using first bin");
          }
          
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

      var self = this,
          reset = this.sortingQueue_.reset();

      reset.done(function () {
        self.bins_.reset();

        self.bins_ = self.options_ = self.sortingQueue_ = null;
        self.initialised_ = false;

        console.log("Sorting Desk UI reset");
      } );

      return reset;
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
       * initialising our own instance.. */
      this.sortingQueue_.initialise();

      (this.draggable_ = new ControllerDraggableImage(this))
        .initialise();

      this.sortingQueue_.dismiss.register('bin', function (e, id, scope) {
        var bin = self.bins_.getById(id);

        if(bin) {
          /* Disallow removal of last bin. */
          if(self.bins_.bins.length === 1)
          {
            console.log("Disallowing removal of last bin when items' queue"
                        + " empty");
            return;
          }

          self.bins_.removeAt(self.bins_.indexOf(bin));
          self.save();
        }
      } );

      this.initialiseBins_(bins, activeBinId);

      this.initialised_ = true;
      console.log("Sorting Desk UI initialised");
    },

    initialiseBins_: function (bins, activeBinId)
    {
      var self = this,
          bin;

      if(this.bins_)
        this.bins_.reset();

      this.sortingQueue_.items.removeAll();

      (this.bins_ = this.sortingQueue_.instantiate('ControllerBins', this))
        .initialise();

      if(!(bins instanceof Array) || bins.length === 0)
        return;

      bins.forEach(function (descriptor) {
        self.bins_.add(self.bins_.construct(descriptor), false, true);
      } );
      
      /* Now manually set the active bin. */
      bin = this.bins_.getById(activeBinId);

      /* Attempt to recover if we've been given an invalid id to activate. */
      if(!bin) {
        console.log("Failed to set the active bin: setting first (id=%s)",
                    activeBinId);

        bin = bins[0];
      }

      this.bins_.setActive(bin);
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

  ControllerBins.prototype.initialise = function ()
  {
    this.spawner_.initialise();
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
    this.spawner_.reset();
    this.node.children().remove();

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
          bin.id,
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
        this.owner_.api.setQueryContentId(bin.id);
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
    var self = this;
    
    if(!this.haveBrowser_)
      throw "Label Browser component unavailable";
    else if(this.browser_)
      throw "Label Browser already active";

    (this.browser_ = this.owner_.sortingQueue.instantiate(
      'LabelBrowser', this, bin))
      .initialise()
      .done(function () {
        self.browser_.reset();
        self.browser_ = null;
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
  var LabelBrowser = function (owner, bin)
  {
    /* Invoke super-constructor. */
    SortingQueue.Controller.call(this, owner);

    /* Attributes */
    this.deferred_ = null;
    this.nodes_ = { };
    this.bin_ = bin;
    this.rows_ = [ ];

    /* Getters */
    this.__defineGetter__('nodes', function () { return this.nodes_; } );
  };

  LabelBrowser.prototype = Object.create(SortingQueue.Controller.prototype);

  LabelBrowser.prototype.initialise = function ()
  {
    var self = this,
        api = this.owner_.owner.api;

    console.log("Initializing Label Browser component");

    var onEndInitialise = function () {
      console.log("Label Browser component initialized");
    };
    
    this.deferred_ = $.Deferred();

    this.nodes_.container = $('[data-sd-purpose="container-label-browser"]');

    this.nodes_.buttonClose = this.nodes_.container
      .find('[data-sd-purpose="label-browser-close"]')
      .click( function () {
        self.close();
      } );
    
    this.nodes_.heading = this.nodes_.container
      .find('[data-sd-purpose="label-browser-heading"]')
      .html(this.bin_.data.content);
    
    this.nodes_.items = this.nodes_.container
      .find('[data-sd-purpose="label-browser-items"]');

    this.nodes_.table = this.nodes_.items.find('TABLE');

    (new (api.getClass('LabelFetcher'))(api.getApi()))
      .cid(this.bin_.id)
      .which('positive')
      .get()
      .done(function (labels) {
        console.log('Label GET successful:', labels.slice());

        var getNext = function () {
          if(labels.length === 0) {
            onEndInitialise();
            return;
          }
          
          var cid = labels.shift().cid2;

          api.getFeatureCollection(cid)
            .done(function(fc) {
              console.log('Feature collection GET successful (id=%s)',
                          cid, fc);
              getNext();
            } )
            .fail(function () {
              console.log('Feature collection GET failed (id=%s)',
                          cid);
              getNext();
            } );
        };

        /* Retrieve feature collection for the first label. */
        getNext();
      } )
      .fail(function () {
        console.log('Failed to retrieve labels');
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
    this.nodes_.heading.children().remove();
    this.nodes_.table.children().remove();

    /* Resolve promise if one still exists. */
    if(this.deferred_)
      this.deferred_.resolve();

    /* Detach all events. */
    this.nodes_.buttonClose.off();

    this.deferred_ = this.bin_ = this.rows_ = this.nodes_ = null;

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


  var LabelBrowserRow = function (owner, label)
  {
    var row = $('<tr><td>' + label.cid2 + '</td>'
                + '<td>undefined</td>'
                + '<td>' + label.annotator_id + '</td>');
    
    owner.nodes.table.append(row);
  };

  LabelBrowserRow.prototype = {
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
      binUnkown: 'sd-unknown',
      buttonAdd: 'sd-button-add',
      droppableHover: 'sd-droppable-hover',
      mouseDown: 'sd-mousedown',
      iconLabelBrowser: 'sd-bin-browser-icon'
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
