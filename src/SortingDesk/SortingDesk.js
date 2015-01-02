/**
 * @file Sorting Desk component.
 * @copyright 2014 Diffeo
 *
 * @author Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 * Uses the `SortingQueue' component.
 *
 */


/*global SortingQueue, $, define */
/*jshint laxbreak:true */

// Notes from Miguel on abstracting out the use of `chrome` in this file:
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
var SortingDesk_ = function (window, $) {

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
   *                            manner. These are: 
   *                            + makeId
   *                            + setQueryContentId
   *                            + generateId
   *                            + mergeBins
   *                            + updateQueryFc
   *                            + addLabel
   *                            + getBins
   *                            + setBins
   *                            + setActiveBin
   * */
  var Sorter = function (opts, cbs)
  {
    var self = this,
        queryId;

    console.log("Initialising Sorting Desk UI");

    this.options_ = $.extend(true, $.extend(true, {}, defaults_), opts);
    this.sortingQueue_ = new SortingQueue.Sorter(this.options_, cbs);

    /* Restore state from local storage. */
    this.load_()
      .done(function (bins) {
        /* If no bins were retrievable from local storage, create a default bin
         * for the current page.  Otherwise, activate the bin that is the
         * currently active one (as specified in `options.activeBinId´) or, if
         * one isn't yet active, use the first element as the active bin. */
        if(!bins || bins.length === 0) {
          /* Set `queryId´ accordingly. */
          queryId = self.sortingQueue_.callbacks
            .invoke('makeId', (Url.encode(window.location.href)));

          bins = [ { id: queryId,
                     data: window.document.title.trim()
                           || '&lt; no-name &gt;' } ];

          /* Forcefully save state since a bin was added by default. */
          window.setTimeout(function () { self.save(); });
        } else {
          var index = -1;

          /* Look for the active bin, if one has been specified, and set query
           * id accordingly. */
          if(opts.activeBinId) {
            bins.some(function (bin, position) {
              if(bin.id === opts.activeBinId) {
                index = position;
                return true;
              }
            } );
          }

          queryId = bins[index === -1 ? 0 : index].id;
        }

        /* Set query content before initialising SortingQueue to ensure correct
         * contexts for items retrieved. */
        self.sortingQueue_.callbacks.invoke('setQueryContentId', queryId);
        self.initialise_(bins, queryId);
      } );
  };

  Sorter.prototype = {
    initialised_: false,
    options_: null,

    /* Instances */
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
      var result = { };

      if(scope) {
        console.log("Drop event not special case");
        return null;
      }

      /* Process this drop event separately for text snippets and images. We
       * assume that this event originates in an image if the active
       * `ControllerDraggableImage´ instance has an active node. Otherwise,
       * we attempt to retrieve a text snippet. */
      if(this.draggable_.activeNode) {
        result.isImage = true;
        result.data = this.draggable_.activeNode.attr('src');

        if(result.data) {
          result.id = this.sortingQueue_.callbacks
            .invoke('generateId', result.data);
        } else
          console.log("Unable to retrieve valid `src´ attribute");
      } else {
        result.isImage = false;

        if(window.getSelection)
          result.data = window.getSelection().toString();
        else if(document.selection && document.selection.type !== "Control")
          result.data = document.selection.createRange().text;

        if(result.data) {
          result.id = this.sortingQueue_.callbacks
            .invoke('generateId', result.data);
        }
      }

      /* Clear the currently active node. */
      this.draggable_.clear();

      return result.id && result;
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
        var bin = self.bins_.getById(decodeURIComponent(id));

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

      if(!(bins instanceof Array) || bins.length === 0)
        throw "Bins array container invalid or empty";

      if(this.bins_)
        this.bins_.reset();

      this.sortingQueue_.items.removeAll();

      (this.bins_ = this.sortingQueue_.instantiate('ControllerBins', this))
        .initialise();

      bins.forEach(function (descriptor) {
        var bin = self.sortingQueue_.instantiate(
          descriptor.isImage ? 'BinImage' : 'Bin',
          self.bins_,
          descriptor);

        self.bins_.add(bin, false);
      } );

      /* Now manually set the active bin. */
      bin = this.bins_.getById(activeBinId);

      /* Attempt to recover if we've been given an invalid id to activate. */
      if(!bin) {
        console.log("Failed to set the active bin: id=%s: setting first",
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
      function (id, data, hasImage) {
        return self.owner_.bins.add(self.owner_.sortingQueue.instantiate(
          hasImage ? 'BinImage' : 'Bin',
          self, {
            id: id,
            data: data } ) );
      } );
  };

  ControllerBins.prototype = Object.create(SortingQueue.Controller.prototype);

  ControllerBins.prototype.initialise = function ()
  {
    this.spawner_.initialise();
  };

  ControllerBins.prototype.reset = function ()
  {
    this.spawner_.reset();
    this.node.children().remove();

    this.bins_ = this.hover_ = this.active_ = this.spawner_ = null;
  };

  ControllerBins.prototype.add = function (bin, activate /* = true */)
  {
    /* Ensure a bin with the same id isn't already contained. */
    if(this.getById(bin.id))
      throw "Bin is already contained: " + bin.id;

    /* Initialise bin. */
    bin.initialise();

    /* Contain bin and append its HTML node. */
    this.append(bin.node);
    this.bins_.push(bin);

    /* If first bin to be contained, activate it by default, unless told not to
     * do so. */
    if(activate !== false && !this.active_)
      this.setActive(bin);

    return bin;
  };

  /* overridable */ ControllerBins.prototype.append = function (node)
  {
    /* Add bin node to the very top of the container if aren't any yet,
     * otherwise insert it after the last contained bin. */
    if(!this.bins_.length)
      this.owner_.options.nodes.bins.prepend(node);
    else
      this.bins_[this.bins_.length - 1].node.after(node);
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

  ControllerBins.prototype.getById = function (id)
  {
    return this.find(function (bin) {
      return bin.id === id;
    } );
  };

  ControllerBins.prototype.setActive = function (bin)
  {
    var self = this;

    /* Don't activate bin if currently active already. */
    if(this.active_ === bin)
      return;

    /* Invoke API to activate the bin. If successful, update UI state and force
     * a redraw of the items container. */
    if(self.active_)
      self.active_.deactivate();

    self.active_ = bin;

    if(bin) {
      bin.activate();

      if(this.owner_.initialised) {
        self.owner_.sortingQueue.callbacks.invoke("setQueryContentId", bin.id);
        self.owner_.sortingQueue.items.redraw();
      }

      /* Ensure bin is visible. */
      this.owner_.options.nodes.bins.animate(
        { scrollLeft: bin.node.position().left },
        250);
    }

    /* Let the extension know that the active bin has changed. */
    this.owner_.sortingQueue.callbacks.invoke('setActiveBin', bin.data);
  };

  ControllerBins.prototype.browse = function (bin)
  {
    var self = this;
    
    if(!this.haveBrowser_)
      throw "Label Browser component unavailable";
    else if(this.browser_)
      throw "Label Browser already active";

    (this.browser_ = this.owner_.sortingQueue.instantiate('LabelBrowser',
                                                          this,
                                                          bin))
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
  ControllerBins.prototype.onMouseEnter_ = function (bin)
  { this.hover_ = bin; };

  ControllerBins.prototype.onMouseLeave_ = function ()
  { this.hover_ = null; };


  /**
   * @class
   * */
  var Bin = function (owner, data)
  {
    /* Invoke super constructor. */
    SortingQueue.Drawable.call(this, owner);

    this.data_ = data;
    this.node_ = null;

    /* Define getters. */
    this.__defineGetter__("data", function () { return this.data_; } );
    this.__defineGetter__("id", function () { return this.data_.id; } );
    this.__defineGetter__("node", function () { return this.node_; } );
  };

  Bin.prototype = Object.create(SortingQueue.Drawable.prototype);

  Bin.prototype.initialise = function ()
  {
    var self = this,
        parentOwner = self.owner_.owner;

    (this.node_ = this.render())
      .attr( {
        'data-scope': 'bin',
        'id': encodeURIComponent(this.id)
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
          var bin = self.owner_.getById(decodeURIComponent(id));

          /* Ensure dragged bin exists since it is being DRAGGED and disable
           * dropping bin onto self. */
          if(!bin)
            throw "Failed to retrieve bin: " + id;
          else if(bin === self)
            break;

          parentOwner.sortingQueue.callbacks.invoke("mergeBins", self, bin);
          self.owner_.removeAt(self.owner_.indexOf(bin));

          /* Important: DOM node is destroyed above, which means the `dragend'
           * event won't be triggered, leaving the dismissal button visible. */
          parentOwner.sortingQueue.dismiss.deactivate();

          break;

        case null:
          var result = parentOwner.onDropSpecial(scope);

          /* If we received a map object, assume a valid drop. */
          if(result) {
            /* Create label between snippet/image and bin. */
            parentOwner.sortingQueue.callbacks
              .invoke("addLabel", result.id, self);

            /* Update query FC. */
            parentOwner.sortingQueue.callbacks
              .invoke("updateQueryFc", result.id, result.data)
              .fail(function () {
                console.log("Failed to update query FC");
              } );
          } else
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

  /* overridable */ Bin.prototype.serialise = function ()
  {
    return {
      id: this.data_.id,
      data: this.data_.data
    };
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
  var BinDefault = function (owner, bin)
  {
    /* Invoke super constructor. */
    Bin.call(this, owner, bin);
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
        node = $('<div class="' + css.bin + '"><div class="' + css.binName + '">'
                 + this.data_.data + '</div></div>');

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

  BinImageDefault.prototype.serialise = function ()
  {
    return {
      id: this.data_.id,
      data: this.data_.data,
      isImage: true
    };
  };

  BinImageDefault.prototype.render = function ()
  {
    var css = this.owner_.owner.options.css;

    return $('<div class="' + css.bin + '"><div class="' + css.binName + '">'
             + '<img draggable="false" src="' + this.data_.data
             + '"/></div></div>');
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

  ControllerBinSpawner.prototype.add = function (id, data, hasImage)
  {
    if(!id)
      throw "An id was not specified";

    var bin = this.fnAdd_(id, data, hasImage);
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

    this.node_ = parentOwner.options.nodes.add
      .on( {
        click: function () {
          var bin,
              id = parentOwner.sortingQueue.callbacks
                .invoke('makeId', (Url.encode(window.location.href)));

          bin = parentOwner.bins.getById(id);

          if(!bin) {
            bin = self.add(id, window.document.title.trim()
                               || '&lt; no-name &gt;');
          }

          parentOwner.bins.setActive(bin);

          return false;
        }
      } );

    this.droppable_ = new SortingQueue.Droppable(this.node_, {
      classHover: parentOwner.options.css.droppableHover,
      scopes: function (scope) { return !scope; },
      drop: function (e, id, scope) {
        var result = parentOwner.onDropSpecial(scope);

        /* If we received a map object, assume a valid drop. */
        if(result)
          self.add(result.id, result.data, result.isImage);

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
    var self = this;

    this.deferred_ = $.Deferred();

    this.nodes_.container = $('[data-sd-purpose="container-label-browser"]');
    
    this.nodes_.buttonClose = this.nodes_.container
      .find('[data-sd-purpose="label-browser-close"]')
      .click( function () {
        self.close();
      } );
    
    this.nodes_.heading = this.nodes_.container
      .find('[data-sd-purpose="label-browser-heading"]')
      .html(this.bin_.data.data);
    
    this.nodes_.items = this.nodes_.container
      .find('[data-sd-purpose="label-browser-items"]');

    this.nodes_.table = this.nodes_.items.find('TABLE');

    this.show();

    var cbs = this.owner_.owner.sortingQueue.callbacks,
        api = cbs.invoke('getApi');

    (new (cbs.invoke('getClass', 'LabelFetcher'))(api))
      .cid(this.bin_.id)
      .which('positive')
      .get()
      .done(function (labels) {
        console.log('retrieved LABEL:', labels.slice());

        var fnGetNext = function () {
          if(labels.length) {
            var cid = labels.shift().cid2;
            
            api.fcGet(cid)
              .done(function(fc) {
                console.log('retrieved FC:', fc);
                fnGetNext();
              } )
              .fail(function () {
                console.log('Failed to retrieve feature collection (id=%s)',
                            cid);
              } );
          } else
            console.log('Done loading feature collections');
        };

        fnGetNext();
      } )
      .fail(function () {
        console.log('Failed to retrieve labels');
      } );


    return this.deferred_.promise();
  };

  LabelBrowser.prototype.reset = function ()
  {
    /* TODO: implement! */
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
    
    this.deferred_.resolve();
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
      binName: 'sd-bin-name',
      binAnimateAssign: 'sd-assign',
      binAdding: 'sd-adding',
      binActive: 'sd-active',
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
  define("SortingDesk", [ "jquery" ], function ($) {
    return SortingDesk_(window, $);
  });
} else
  window.SortingDesk = SortingDesk_(window, $);
