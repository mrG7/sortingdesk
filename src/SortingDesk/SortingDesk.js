/**
 * @file Sorting Desk component.
 * @copyright 2014 Diffeo
 *
 * @author Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 *
 */


/*global SortingQueue, jQuery, define */
/*jshint laxbreak:true */


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("SortingDesk", [ "SortingQueue", "jQuery" ],
         function (SortingQueue, $) {
           return SortingDesk;         /* ideally, we would want the module to
                                        * be defined here. */
         } );
}


/**
 * The Sorting Desk module.
 *
 * @returns an object containing class constructors.
 * */
var SortingDesk = (function (window, $) {
  
  /**
   * @class@
   * */
  /**
   * Constructor responsible for initialising Sorting Desk.
   *
   * @param   {Object}    opts  Initialisation options (please refer to
   *                            `defaults_' above)
   * @param   {Object}    cbs   Map of all callbacks
   *
   * @param   cbs.addBin              Add a bin.
   * */
  var Instance = function (opts, cbs)
  {
    var self = this;

    /* Since we aim to be compatible with RequireJs and conventional script loading
     * methods, we have no way of executing the code that follows only AFTER
     * dependencies (and sub-dependencies) have been loaded (see `define' statement
     * above). The simple statement below is thus to ensure that `SortingQueue' has
     * been loaded prior to continuing; similarly, if `SortingQueue' is defined,
     * we can safely assume that jQuery has been loaded too. */
    if(typeof SortingQueue == 'undefined')
      throw "SortingQueue not loaded";
    
    /* Allow a jQuery element to be passed in instead of an object containing
     * options. In the case that a jQuery element is detected, it is assumed to
     * be the `nodes.items' element. */
    if(!opts)
      throw "No options given: some are mandatory";
    else if(!opts.nodes)
      opts.nodes = { };

    /* Create dummy jQuery element if bins container not provided. */
    if(!opts.nodes.bins)
      opts.nodes.bins = $();

    if(!cbs)
      throw "No callbacks given: some are mandatory";

    console.log("Initialising Sorting Desk UI");

    this.options_ = $.extend(true, $.extend(true, {}, defaults_), opts);
    cbs = $.extend({
        addBin: function () {}
    }, cbs);

    /* Begin instantiating and initialising controllers. */
    /* NOTE: `opts' and `cbs' */
    this.sortingQueue_ = new SortingQueue.Instance(this.options_, cbs);

    (this.bins_ = this.sortingQueue_.instantiate('ControllerBins', this))
      .initialise();

    /* Add bins only if a bin container node has been provided and there bins
     * to add. */
    if(this.options_.bins) {
      this.options_.bins.forEach(function (descriptor) {
        var bin = self.sortingQueue_.instantiate('Bin', self.bins_, descriptor);
        self.bins_.add(bin);

        /* Instantiate and add sub-bins. */
        descriptor.children && descriptor.children.forEach(function (sb) {
          bin.add(bin.createSubBin(sb));
        } );
      } );
    }

    this.initialised_ = true;
    console.log("Sorting Desk UI initialised");
  };

  Instance.prototype = {
    initialised_: false,
    options_: null,
    
    /* Instances */
    sortingQueue_: null,
    bins_: null,

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
    { return this.bins_; }
  };


  /**
   * @class
   * */
  var ControllerBins = function (owner)
  {
    SortingQueue.Controller.call(this, owner);

    this.bins_ = [ ];
    this.hover_ = null;

    /* Define getters. */
    this.__defineGetter__("bins", function () { return this.bins_; } );
    this.__defineGetter__("hover", function () { return this.hover_; } );
    this.__defineGetter__("node", function () {
      return this.owner_.options.nodes.bins;
    } );
  };

  ControllerBins.prototype = Object.create(SortingQueue.Controller.prototype);

  ControllerBins.prototype.initialise = function ()
  {
    var self = this;

    this.owner_.sortingQueue.instantiate(
      'BinAddButton',
      this,
      function (input) {
        return self.owner_.sortingQueue.instantiate('Bin',
                                                    self,
                                                    { name: input },
                                                    null)
          .render();
      },
      function (id, text) {
        var deferred = $.Deferred();

        self.owner_.sortingQueue.callbacks.invoke('addBin', text)
          .fail(function () {
            /* TODO: show message box and notify user. */
            console.log("Failed to add bin:", id, text);
            deferred.reject();
          } )
          .done(function (bin) {
            window.setTimeout(function () {
              /* We rely on the API returning exactly ONE descriptor. */
              self.owner_.bins.add(
                self.owner_.sortingQueue.instantiate('Bin', self, bin));
            }, 0);

            deferred.resolve();
          } );

        return deferred.promise();
      } );
  };

  ControllerBins.prototype.reset = function ()
  {
    this.node.children().remove();
  };

  ControllerBins.prototype.add = function (bin)
  {
    /* Ensure a bin with the same id isn't already contained. */
    if(this.getById(bin.id))
      throw "Bin is already contained: " + bin.id;

    /* Initialise bin. */
    bin.initialise();

    /* Contain bin and append its HTML node. */
    this.append(bin.node);
    this.bins_.push(bin);
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
    var result = null,
        search = function (bins) {
          bins.some(function (bin) {
            /* Invoke callback. A true result means a positive hit and the
             * current bin is returned, otherwise a search is initiated on the
             * children bins, if any are found. */
            if(callback(bin)) {
              result = bin;
              return true;
            } else if(bin.children.length) {
              if(search(bin.children))
                return true;
            }

            return false;
          } );
        };

    search(this.bins_);

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
  };

  ControllerBins.prototype.setShortcut = function (bin, keyCode)
  {
    /* Ensure shortcut not currently in use and that bin is contained. */
    if(this.getByShortcut(keyCode))
      return false;

    /* Set new shortcut. */
    bin.setShortcut(keyCode);
    return true;
  };

  ControllerBins.prototype.getByShortcut = function (keyCode)
  {
    return this.find(function (bin) {
      return bin.shortcut == keyCode;
    } );
  };

  ControllerBins.prototype.getById = function (id)
  {
    return this.find(function (bin) {
      return bin.id == id;
    } );
  };

  ControllerBins.prototype.onClick_ = function (bin)
  {
    this.owner_.sortingQueue.callbacks.invoke(
      "textDroppedInBin",
      this.owner_.sortingQueue.items.selected(), bin);
    
    this.owner_.sortingQueue.items.remove();
  };

  ControllerBins.prototype.onMouseEnter_ = function (bin)
  { this.hover_ = bin; };

  ControllerBins.prototype.onMouseLeave_ = function ()
  { this.hover_ = null; };


  /**
   * @class
   * */
  var Bin = function (owner, bin)
  {
    /* Invoke super constructor. */
    SortingQueue.Drawable.call(this, owner);

    this.bin_ = bin;
    this.node_ = this.shortcut_ = null;

    this.children_ = [ ];
    this.parent_ = null;        /* Parents are set by parent bins directly. */

    /* Define getters. */
    this.__defineGetter__("bin", function () { return this.bin_; } );
    this.__defineGetter__("id", function () { return this.bin_.id; } );
    this.__defineGetter__("shortcut", function () { return this.shortcut_; } );
    this.__defineGetter__("node", function () { return this.node_; } );

    this.__defineGetter__("parent", function () { return this.parent_; } );
    this.__defineGetter__("children", function () { return this.children_; } );

    /* Define setters. */
    this.__defineSetter__("parent", function (bin) {
      if(bin.children.indexOf(this) == -1)
        throw "Not a parent of bin";

      this.parent_ = bin;
    } );
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
        click: function () {
          self.owner_.onClick_(self);
          return false;
        }
      } );

    new SortingQueue.Droppable(this.node_, {
      classHover: parentOwner.options.css.droppableHover,
      scopes: [ 'text-item' ],

      drop: function (e) {
        var id = decodeURIComponent(e.dataTransfer.getData('Text')),
            item = parentOwner.sortingQueue.items.getById(id);

        parentOwner.sortingQueue.callbacks.invoke("textDroppedInBin",
                                                  item,
                                                  self);
        
        parentOwner.sortingQueue.items.remove(item);
      }
    } );

    /* We must defer initialisation of D'n'D because owning object's `bin'
     * attribute will have not yet been set. */
    window.setTimeout(function () {
      new SortingQueue.Draggable(self.node_, {
        dragstart: function (e) {
          parentOwner.dismiss.activate();
        },

        dragend: function (e) {
          parentOwner.dismiss.deactivate();
        }
      } );
    }, 0);
  };

  /* overridable */ Bin.prototype.createSubBin = function (bin)
  {
    return this.owner_.owner.sortingQueue.instantiate('Bin', this.owner_, bin);
  };

  Bin.prototype.add = function (bin)
  {
    /* Ensure a bin with the same id isn't already contained. */
    if(this.owner_.getById(bin.id))
      throw "Bin is already contained: " + bin.id;

    this.children_.push(bin);

    /* Initialise bin and append its HTML. */
    bin.parent = this;
    bin.initialise();

    this.append(bin.node);
  };

  Bin.prototype.indexOf = function (bin)
  {
    /* Note: returns the index of immediately contained children bins. */
    return this.children_.indexOf(bin);
  };

  Bin.prototype.remove = function (bin)
  {
    return this.removeAt(this.children_.indexOf(bin));
  };

  Bin.prototype.removeAt = function (index)
  {
    var bin;

    if(index < 0 || index >= this.children_.length)
      throw "Invalid bin index";

    bin = this.children_[index];
    this.children_.splice(index, 1);

    bin.node.remove();
  };

  /* overridable */ Bin.prototype.append = function (node)
  {
    this.getNodeChildren().append(node);
  };

  Bin.prototype.setShortcut = function (keyCode)
  {
    this.shortcut_ = keyCode;

    /* Set shortcut visual cue, if a node exists for this purpose. */
    var node = this.getNodeShortcut();
    if(node && node.length)
      node[0].innerHTML = String.fromCharCode(keyCode).toLowerCase();
  };

  /* overridable */ Bin.prototype.getNodeShortcut = function ()
  {
    return this.node_.find('.' + this.owner_.owner.options.css.binShortcut);
  };

  /* overridable */ Bin.prototype.getNodeChildren = function ()
  {
    return this.node_.find('>.'
                           + this.owner_.owner.options.css.binChildren
                           + ':nth(0)');
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

  BinDefault.prototype.render = function ()
  {
    var css = this.owner_.owner.options.css;

    return $('<div class="' + css.binTop + '"><div class="'
             + css.binShortcut + '"/><div>' + this.bin_.name
             + '</div><div class="' + css.binChildren + '"></div></div>');
  };


  /**
   * @class
   * */
  var BinAddButton = function (owner, fnRender, fnAdd)
  {
    /* Invoke super constructor. */
    SortingQueue.Drawable.call(this, owner);

    var parentOwner = owner.owner;

    this.fnRender = fnRender;
    this.fnAdd = fnAdd;

    var self = this,
        button = this.render()
          .addClass(parentOwner.options.css.buttonAdd)
          .on( {
            click: function () {
              self.onAdd();
            }
          } );

    new SortingQueue.Droppable(button, {
      classHover: parentOwner.options.css.droppableHover,
      scopes: [ 'text-item' ],

      drop: function (e, id) {
        self.onAdd(decodeURIComponent(id));
      }
    } );

    owner.node.append(button);
  };

  BinAddButton.prototype = Object.create(SortingQueue.Drawable.prototype);

  /* overridable */ BinAddButton.prototype.render = function ()
  {
    return $('<div><span>+</span></div>');
  };

  BinAddButton.prototype.onAdd = function (id)
  {
    var parentOwner = this.owner_.owner,
        options = parentOwner.options;

    /* Do not allow entering into concurrent `add' states. */
    if(this.owner_.node.find('.' + options.css.binAdding).length)
      return;

    var nodeContent = id ? 'Please wait...'
          : ('<input placeholder="Enter bin description" '
             + 'type="text"/>'),
        node = this.fnRender(nodeContent)
          .addClass(options.css.binAdding)
          .fadeIn(options.delays.addBinShow);

    this.owner_.append(node);

    if(!id) {
      this.onAddManual(node);
      return;
    }

    var item = parentOwner.sortingQueue.items.getById(id);

    if(!item) {
      node.remove();
      throw "onAdd: failed to retrieve text item: " + id;
    }

    this.fnAdd(id,
/*                new TextItemSnippet(item.content.text) */
/*                .highlights(options.binCharsLeft, options.binCharsRight)) */
               item.content.text)
      .always(function () { node.remove(); } );
  };

  BinAddButton.prototype.onAddManual = function (node)
  {
    var self = this,
        input = node.find('input');

    input
      .focus()
      .blur(function () {
        if(!this.value) {
          node.fadeOut(self.owner_.owner.options.delays.addBinShow,
                       function () { node.remove(); } );
          return;
        }

        this.disabled = true;

        /* TODO: do not use an `alert'. */
        self.fnAdd(null, this.value)
          .fail(function () { alert("Failed to create a sub-bin."); } )
          .always(function () { node.remove(); } );
      } )
      .keyup(function (evt) {
        if(evt.keyCode == 13)
          this.blur();

        /* Do not allow event to propagate. */
        return false;
      } );
  };

  
  var defaults_ = {
    css: {
      binTop: 'sd-bin',
      binShortcut: 'sd-bin-shortcut',
      binChildren: 'sd-children',
      binAnimateAssign: 'sd-assign',
      binAdding: 'sd-adding',
      buttonAdd: 'sd-button-add',
      droppableHover: 'sd-droppable-hover'
    },
    delays: {                   /* In milliseconds.     */
      animateAssign: 75,        /* Duration of assignment of text item via
                                 * shortcut. */
      binRemoval: 200,          /* Bin is removed from container. */
      addBinShow: 200           /* Fade in of temporary bin when adding. */
    },
    constructors: {
      ControllerBins: ControllerBins,
      Bin: BinDefault,
      BinAddButton: BinAddButton
    }
  };

  return {
    Instance: Instance,
    ControllerBins: ControllerBins,
    Bin: Bin
  };
  
} )(typeof window == 'undefined' ? this : window, jQuery);