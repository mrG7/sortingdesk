/**
 * @file Sorting Dossier component.
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


/**
 * The Sorting Dossier module.
 * 
 * @returns an object containing the module's public interface.
 * */
var SortingDossier_ = function (window, $) {

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

    console.log("Initialising Sorting Dossier UI");

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

        console.log("Sorting Dossier UI reset");
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
      console.log("Sorting Dossier UI initialised");
    },

    initialiseBins_: function (bins, activeBinId)
    {
      var self = this,
          bin;

      if(!bins || !(bins instanceof Array) || bins.length === 0)
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

    /* Define getters. */
    this.__defineGetter__("bins", function () { return this.bins_; } );
    this.__defineGetter__("hover", function () { return this.hover_; } );
    this.__defineGetter__("active", function () { return this.active_; } );
    this.__defineGetter__("node", function () {
      return this.owner_.options.nodes.bins;
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

    if(bin == this.active_)
      this.setActive(this.bins_.length && this.bins_[0] || null);
  };

  ControllerBins.prototype.getById = function (id)
  {
    return this.find(function (bin) {
      return bin.id == id;
    } );
  };

  ControllerBins.prototype.setActive = function (bin)
  {
    var self = this;

    /* Don't activate bin if currently active already. */
    if(this.active_ == bin)
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
    chrome.runtime.sendMessage( { operation: 'set-active-bin',
                                  bin: bin.data } );
  };

  ControllerBins.prototype.serialise = function ()
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
    var css = this.owner_.owner.options.css;

    return $('<div class="' + css.bin + '"><div class="' + css.binName + '">'
             + this.data_.data + '</div></div>');
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


  var defaults_ = {
    css: {
      item: 'sdw-text-item',
      itemContent: 'sdw-text-item-content',
      itemTitle: 'sdw-text-item-title',
      itemClose: 'sdw-text-item-close',
      itemSelected: 'sdw-selected',
      itemDragging: 'sdw-dragging',
      bin: 'sdw-bin',
      binName: 'sdw-bin-name',
      binAnimateAssign: 'sdw-assign',
      binAdding: 'sdw-adding',
      binActive: 'sdw-active',
      buttonAdd: 'sdw-button-add',
      droppableHover: 'sdw-droppable-hover'
    },
    delays: {                   /* In milliseconds.     */
      binRemoval: 200,          /* Bin is removed from container. */
      addBinShow: 200           /* Fade in of temporary bin when adding. */
    },
    constructors: {
      ControllerBins: ControllerBins,
      Bin: BinDefault,
      BinImage: BinImageDefault,
      ControllerBinSpawner: ControllerBinSpawnerDefault
    }
  };

  return {
    Sorter: Sorter,
    ControllerBins: ControllerBins,
    Bin: Bin,
    BinDefault: BinDefault,
    BinImageDefault: BinImageDefault,
    ControllerBinSpawner: ControllerBinSpawner,
    ControllerBinSpawnerDefault: ControllerBinSpawnerDefault
  };

};


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("SortingDossier", [ "jquery" ], function ($) {
    return SortingDossier_(window, $);
  });
} else
  window.SortingDossier = SortingDossier_(window, $);
