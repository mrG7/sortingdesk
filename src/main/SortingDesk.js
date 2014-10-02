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


/*global $, define */
/*jshint laxbreak:true */


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("SortingDesk", [ "jQuery", "API-SortingDesk" ], function() {
    return SortingDesk;
  });
}


/**
 * The Sorting Desk module.
 *
 * @returns a "class" constructor that creates a Sorting Desk instance.
 * */
var SortingDesk = (function () {

  /* ----------------------------------------------------------------------
   *  Default options
   *  Private attribute.
   * ----------------------------------------------------------------------
   * 
   * In addition to the properties below, which are obviously optional, the
   * following attributes are also accepted:
   *
   * nodes: {
   *   items: jQuery-element,           ; mandatory
   *   bins: jQuery-element,            ; optional
   *   buttonDismiss: jQuery-element    ; optional
   * },
   * contentIds: array<string>          ; optional
   * 
   */
  var defaults_ = {
    css: {
      binGeneric: 'sd-bin',
      binShortcut: 'sd-bin-shortcut',
      binAnimateAssign: 'sd-assign',
      binAdding: 'sd-adding',
      buttonAdd: 'sd-button-add',
      itemSelected: 'sd-selected',
      itemDragging: 'sd-dragging',
      droppableHover: 'sd-droppable-hover'
    },
    keyboard: {                 /* Contains scan codes. */
      listUp: 38,               /* up                   */
      listDown: 40,             /* down                 */
      listDismiss: 46           /* dismiss              */
    },
    delays: {                   /* In milliseconds.     */
      animateAssign: 75,        /* Duration of assignment of text item via
                                 * shortcut. */
      binRemoval: 200,          /* Bin is removed from container. */
      dismissButtonShow: 150,   /* Time taken to fade in dismiss button. */
      dismissButtonHide: 300,   /* Time to fade out dismiss button. */
      slideItemUp: 150,         /* Slide up length of deleted text item. */
      addBinShow: 200,          /* Fade in of temporary bin when adding. */
      textItemFade: 100         /* Fade out duration of text item after
                                 * assignment. */
    },
    visibleItems: 20,           /* Arbitrary.           */
    binCharsLeft: 25,
    binCharsRight: 25
  };

  
  /**
   * Constructor responsible for initialising Sorting Desk.
   * 
   * @param   {Object}    opts  Initialisation options (please refer to
   *                            `defaults_' above)
   * @param   {Object}    cbs   Map of all callbacks
   * 
   * @param   cbs.moreText            Retrieve additional text items.
   * @param   cbs.getBinData          Get data about bins.
   * @param   cbs.saveBinData         Save bin state.
   * @param   cbs.addBin              Add a bin.
   * @param   cbs.addSubBin           Add a sub bin.
   * @param   cbs.onRequestStart      Executed after request initiated.
   * @param   cbs.onRequestStop       Executed after request finished.
   * */
  var Instance = function (opts, cbs)
  {
    this.initialised_ = this.resetting_ = false;
    
    /* Allow a jQuery element to be passed in instead of an object containing
     * options. In the case that a jQuery element is detected, it is assumed to
     * be the `nodes.items' element. */
    if(!opts)
      throw "No options given: some are mandatory";
    else if(opts instanceof $) {
      opts = {
        nodes: {
          items: opts
        }
      };
    } else if(!opts.nodes)
      throw "No nodes options given: `items' required";
    else if(!opts.nodes.items)
      throw "Missing `items' nodes option";

    /* Allow a function to be passed in instead of an object containing
     * callbacks. In the case that a function is passed in, it is assumed to be
     * the `moreTexts' callback. */
    if(!cbs)
      throw "No callbacks given: some are mandatory";
    else if(cbs instanceof Function) {
      cbs = {
        moreTexts: cbs
      };
    } else if(!cbs.moreTexts)
      throw "Mandatory `moreTexts' callback missing";
    
    console.log("Initialising Sorting Desk UI");
    
    this.options_ = $.extend(true, defaults_, opts);
    this.callbacks_ = cbs;
    
    /* Do not request bin data if a bins HTML container (`options_.nodes.bins')
     * wasn't given OR content ids (`options_.nodes.contentIds') were not
     * specified. */
    if(this.options_.nodes.bins && this.options_.contentIds) {
      var promise = this.callbacks_.getBinData(this.options_.contentIds),
          self = this;

      if(!promise)
        throw "Another `getBinData' request is ongoing";
      
      promise
        .done(function(result) {
          self.initialise_(result);
        } ).fail(function () {
          console.log("Failed to initialise Sorting Desk UI");
        } );
    } else
      this.initialise_();
  };

  Instance.prototype = {
    initialised_: false,
    resetting_: false,
    callbacks_: null,
    options_: null,
    /* Controllers */
    callbacks_: null,
    requests_: null,
    dismiss_: null,
    keyboard_: null,
    bins_: null,
    items_: null,
    
    /**
     * Resets the component to a virgin state. Removes all nodes contained by
     * `options_.nodes.items' and `options_.nodes.bins', if any.
     *
     * @returns {Boolean}   Returns status of operation: true if succeeded,
     *                      false otherwise.*/
    reset: function ()
    {
      var deferred = $.Deferred();
      
      if(!this.options_ || this.resetting_) {
        window.setTimeout(function () {
          deferred.reject();
        } );
      } else {
        var self = this;
        
        this.resetting_ = true;
        
        /* Detach `keyup' event right away. */
        $('body').unbind('keyup', function (evt) { self.this.onKeyUp_(evt); } );
        
        var interval = window.setInterval(function () {
          if(this.requests_.length)
            return;
          
          if(this.options_.nodes.items)
            this.options_.nodes.items.children().remove();

          if(this.options_.nodes.bins)
            this.options_.nodes.bins.children().remove();

          /* Detach events from bin/text item delete button. */
          if(this.options_.nodes.buttonDismiss)
            this.options_.nodes.buttonDismiss.off();
          
          this.options_ = this.callbacks_ = null;
          this.requests_ = this.dismiss_ = this.keyboard_ = null;
          this.bins_ = this.items_ = null;
          
          this.initialised_ = false;
          
          window.clearInterval(interval);
          window.setTimeout(function () {
            console.log("Sorting Desk UI reset");
            this.resetting_ = false;
            deferred.resolve();
          });
        }, 10);
      }
      
      return deferred.promise();
    },

    /**
     * Returns a boolean value indicating whether Sorting Desk has been
     * initialised and is ready to be used.
     *
     * @returns {Boolean}   Returns true if Sorting Desk has been successful
     *                      initialised, false otherwise.
     * */
    get isInitialised ()
    { return this.initialised_; },

    get options ()
    { return this.options_; },

    get callbacks ()
    { return this.callbacks_; },

    get requests ()
    { return this.requests_; },

    get dismiss ()
    { return this.dismiss_; },

    get bins ()
    { return this.bins_; },

    get items ()
    { return this.items_; },

    initialise_: function (bins)
    {
      var self = this;

      (this.callbacks_ = new ControllerCallbacks(this, this.callbacks_))
        .initialise();
      
      (this.requests_ = new ControllerRequests(this))
        .initialise();
      
      if(!this.options_.nodes.buttonDismiss)
        this.options_.nodes.buttonDismiss = $();

      (this.dismiss_ = new ControllerButtonDismiss(this))
        .initialise();
      
      /* Do not create bin container or process any bins if a bin HTML container
       * wasn't given OR the bins' data result array wasn't received. */
      if(this.options_.nodes.bins && bins) {
        (this.bins_ = new ControllerBins(this))
          .initialise();

        for(var id in bins) {
          var bin = bins[id];
          
          if(bin.error) {
            console.log("Failed to load bin:", id, bin.error);
            continue;
          }
          
          new BinGeneric(this.bins_, id, bin).add();
        }
      }
      
      (this.items_ = new ControllerItems(this))
        .initialise();

      (this.keyboard_ = new ControllerKeyboard(this))
        .initialise();

      this.initialised_ = true;
      console.log("Sorting Desk UI initialised");
    },
  };


  /**
   * @class@
   * */
  var /* abstract */ Owned = function (owner)
  {
    this.owner_ = owner;
  };

  Owned.prototype = {
    get owner ()
    { return this.owner_; }
  };    
  

  /**
   * @class@
   * */
  var /* abstract */ Controller = function (owner)
  {
    /* Invoke super constructor. */
    Owned.call(this, owner);
  };

  Controller.prototype = Object.create(Owned.prototype);

  /* Following method to allow for deferred initialisation. */
  /* abstract */ Controller.prototype.initialise = function ()
  { throw "Abstract method not implemented"; };

  /* abstract */ Controller.prototype.reset = function ()
  { throw "Abstract method not implemented"; };


  /**
   * @class@
   * */
  var /* abstract */ Drawable = function (owner)
  {
    /* Invoke super constructor. */
    Owned.call(this, owner);
  };

  Drawable.prototype = Object.create(Owned.prototype);

  /* abstract */ Drawable.prototype.render = function ()
  { throw "Abstract method not implemented"; };


  /**
   * @class@
   * */
  var ControllerCallbacks = function (owner, callbacks)
  {
    /* invoke super constructor. */
    Controller.call(this, owner);

    /* Set initial state. */
    this.callbacks_ = callbacks;
  };

  ControllerCallbacks.prototype = Object.create(Controller.prototype);

  ControllerCallbacks.prototype.initialise = function () { };
  
  ControllerCallbacks.prototype.exists = function (callback)
  { return callback in this.callbacks_; };

  ControllerCallbacks.prototype.invoke = function ()
  {
    var result = this.call_.apply(this, arguments);
    
    if(result && 'always' in result) {
      var self = this;
      
      this.owner_.requests.begin(result);
      
      result.always(function () {
        self.owner_.requests.end(result);
      } );
    }

    return result;
  };

  ControllerCallbacks.prototype.passThrough = function ()
  {
    return this.call_.apply(this, arguments);
  };

  ControllerCallbacks.prototype.call_ = function ()
  {
    if(arguments.length < 1)
      throw "Callback name required";
    else if(!(arguments[0] in this.callbacks_))
      throw "Callback non existent: " + arguments[0];

    return this.callbacks_[arguments[0]]
      .apply(null, [].slice.call(arguments, 1));
  };
  

  /**
   * @class@
   * */
  var ControllerRequests = function (owner)
  {
    /* invoke super constructor. */
    Controller.call(this, owner);

    /* Set initial state. */
    this.requests_ = { };
    this.count_ = 0;

    /* Define getters. */
    this.__defineGetter__("count", function () { return this.count_; } );
  };

  ControllerRequests.prototype = Object.create(Controller.prototype);

  ControllerRequests.prototype.initialise = function () {  };

  ControllerRequests.prototype.begin = function (id)
  {
    if(!this.requests_[id])
      this.requests_[id] = 1;
    else
      ++this.requests_[id];

    ++this.count_;
      
    /* Trigger callback. */
    if(this.owner_.callbacks.exists("onRequestStart"))
      this.owner_.callbacks.passThrough("onRequestStart", id);
  };

  ControllerRequests.prototype.end = function (id)
  {
    if(id in this.requests_) {
      /* Delete request from internal collection if last one, otherwise
       * decrement reference count. */
      if(this.requests_[id] == 1)
        delete this.requests_[id];
      else if(this.requests_[id] > 1)
        --this.requests_[id];
      else
        throw "Requests controller in invalid state";
      
      --this.count_;
    } else
      console.log("WARNING: unknown request ended:", id);

    /* Trigger callback. */
    if(this.owner_.callbacks.exists("onRequestStop"))
      this.owner_.callbacks.passThrough("onRequestStop", id);
  };
  
  
  /**
   * @class@
   * */
  var ControllerButtonDismiss = function (owner)
  {
    /* Invoke super constructor. */
    Controller.call(this, owner);
  };

  ControllerButtonDismiss.prototype = Object.create(Controller.prototype);

  ControllerButtonDismiss.prototype.initialise = function ()
  {
    var self = this,
        options = this.owner_.options;
    
    if(!options.nodes.buttonDismiss.length)
      return;
    
    new Droppable(options.nodes.buttonDismiss, {
      classHover: options.css.droppableHover,
      scopes: [ 'bin', 'text-item' ],

      drop: function (e, id, scope) {
        switch(scope) {
        case 'bin':
          var bin = self.owner_.bins.getById(decodeURIComponent(id));

          if(bin) {
            /* It doesn't matter if the API request succeeds or not for the
             * bin is always deleted. The only case (that I am aware of) where
             * the API request would fail is if the bin didn't exist
             * server-side, in which case it should be deleted from the UI
             * too. So, always delete, BUT, if the request fails show the user
             * a notification; for what purpose, I don't know. */
            self.owner_.bins.removeAt(self.owner_.bins.indexOf(bin));

            self.owner_.callbacks.invoke('removeBin', bin.id)
              .fail(function (result) {
                console.log("bin-remove:", result.error);
                /* TODO: user notification not implemented yet. */
              } );
          }

          break;

        case 'text-item':
          var item = self.owner_.items.getById(id);

          self.owner_.callbacks.invoke("textDismissed", item);
          self.owner_.items.remove(decodeURIComponent(id));
          
          break;

        default:
          console.log("Warning: unknown scope:", scope);
          break;
        }

        self.deactivate();

        return false;
      }
    } );
  };
  
  ControllerButtonDismiss.prototype.activate = function (callback)
  {
    var options = this.owner_.options;
      
    options.nodes.buttonDismiss.stop().fadeIn(
      options.delays.dismissButtonShow,
      typeof callback == 'function' ? callback : null);
  };

  ControllerButtonDismiss.prototype.deactivate = function ()
  {
    var options = this.owner_.options;
    
    options.nodes.buttonDismiss.stop().fadeOut(
      options.delays.dismissButtonHide);
  };


  /**
   * @class
   * */
  var ControllerKeyboard = function (owner)
  {
    /* Invoke super constructor. */
    Controller.call(this, owner);
  };

  ControllerKeyboard.prototype = Object.create(Controller.prototype);

  ControllerKeyboard.prototype.initialise = function ()
  {
    var self = this;
    
    /* Set up listener for keyboard up events. */
    $('body').bind('keyup', function (evt) { self.onKeyUp_(evt); } );
  };

  ControllerKeyboard.prototype.onKeyUp_ = function (evt)
  {
    var self = this,
        options = this.owner_.options;
    
    /* First process alpha key strokes. */
    if(evt.keyCode >= 65 && evt.keyCode <= 90) {
      var bin = this.owner_.bins.getByShortcut(evt.keyCode);

      if(this.owner_.bins.hover) {
        if(!bin)
          this.owner_.bins.hover.setShortcut(evt.keyCode);
      } else {
        if(bin) {
          /* TODO: The following animation should be decoupled. */
          
          /* Simulate the effect produced by a mouse click by assigning the
           * CSS class that contains identical styles to the pseudo-class
           * :hover, and removing it after the milliseconds specified in
           * `options.delay.animateAssign'. */
          bin.node.addClass(options.css.binAnimateAssign);
          
          window.setTimeout(function () {
            bin.node.removeClass(options.css.binAnimateAssign);
          }, options.delays.animateAssign);
          
          this.owner_.callbacks.invoke("textDroppedInBin",
                                       this.owner_.items.current(),
                                       bin);
          this.owner_.items.remove();
        }
      }
      
      return false;
    }
    
    /* Not alpha. */
    switch(evt.keyCode) {
    case options.keyboard.listUp:
      this.owner_.items.selectOffset(-1);
      break;
    case options.keyboard.listDown:
      this.owner_.items.selectOffset(1);
      break;
    case options.keyboard.listDismiss:
      this.owner_.dismiss.activate(function () {
        self.owner_.dismiss.deactivate();
      } );
      
      this.owner_.callbacks.invoke("textDismissed",
                                   this.owner_.items.current());
      this.owner_.items.remove();
      
      break;
      
    default:
      return;
    }

    return false;
  };


  /**
   * @class
   * */
  var ControllerBins = function (owner)
  {
    Controller.call(this, owner);
    
    this.bins_ = [ ];
    this.hover_ = null;

    /* Define getters. */
    this.__defineGetter__("bins", function () { return this.bins_; } );
    this.__defineGetter__("hover", function () { return this.hover_; } );
    this.__defineGetter__("node", function () {
      return this.owner_.options.nodes.bins;
    } );
  };

  ControllerBins.prototype = Object.create(Controller.prototype);

  ControllerBins.prototype.initialise = function ()
  {
    var self = this;

    new BinAddButton(
      this,
      function (input) {
        return new BinGeneric(null, null, { name: input } )
          .render();
      },
      function (id, text) {
        var deferred = $.Deferred();

        self.owner_.callbacks.invoke('addBin', text)
          .fail(function () {
            /* TODO: show message box and notify user. */
            console.log("Failed to add bin:", id, text);
            deferred.reject();
          } )
          .done(function (bin) {
            window.setTimeout(function () {
              /* We rely on the API returning exactly ONE descriptor. */
              var id = Object.firstKey(bin);
              new BinGeneric(self, id, bin[id]).add();
            }, 0);
            
            deferred.resolve();
          } );

        return deferred.promise();
      } );
  };
  
  ControllerBins.prototype.add = function (bin)
  {
    var id = bin.id;

    /* Ensure a bin with the same id isn't already contained. */
    this.bins_.forEach(function (ib) {
      if(ib.id == id)
        throw "Bin is already contained: " + id;
    } );

    /* Contain bin and append its HTML node. */
    this.append(bin.node);
    this.bins_.push(bin);
  };
    
  ControllerBins.prototype.append = function (node)
  {
    /* Add bin node to the very top of the container if aren't any yet,
     * otherwise insert it after the last contained bin. */
    if(!this.bins_.length)
      this.owner_.options.nodes.bins.prepend(node);
    else
      this.bins_[this.bins_.length - 1].node.after(node);
  };

  ControllerBins.prototype.indexOf = function (bin)
  {
    return this.bins_.indexOf(bin);
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

  ControllerBins.prototype.getByShortcut = function (keyCode)
  {
    var result = null;

    this.bins_.some(function (bin) {
      if(bin.shortcut == keyCode) {
        result = bin;
        return true;
      }

      return false;
    } );

    return result;
  };

  ControllerBins.prototype.getById = function (id)
  {
    var result = null;
    
    this.bins_.some(function (bin) {
      if(bin.id == id) {
        result = bin;
        return true;
      }

      return false;
    } );

    return result;
  };

  ControllerBins.prototype.onClick_ = function (bin)
  {
    this.owner_.callbacks.invoke("textDroppedInBin",
                                 this.owner_.items.current(), bin);
    this.owner_.items.remove();
  };

  ControllerBins.prototype.onMouseEnter_ = function (bin)
  { this.hover_ = bin; };

  ControllerBins.prototype.onMouseLeave_ = function ()
  { this.hover_ = null; };
  

  /**
   * @class
   * */
  var BinBase = function (owner, id, bin)
  {
    /* Invoke super constructor. */
    Drawable.call(this, owner);

    this.id_ = id;
    this.bin_ = bin;
    this.node_ = this.shortcut_ = null;

    /* Define getters. */
    this.__defineGetter__("bin", function () { return this.bin_; } );
    this.__defineGetter__("id", function () { return this.id_; } );
    this.__defineGetter__("shortcut", function () { return this.shortcut_; } );
    this.__defineGetter__("node", function () { return this.node_; } );
  };

  BinBase.prototype = Object.create(Drawable.prototype);
  
  BinBase.prototype.initialise = function ()
  {
    var self = this,
        parentOwner = self.owner_.owner;

    (this.node_ = this.render())
      .attr( {
        'data-scope': 'bin',
        'id': encodeURIComponent(this.id_)
      } )
      .on( {
        mouseenter: function () {
          self.owner_.onMouseEnter_(self);
        },
        mouseleave: function () {
          self.owner_.onMouseLeave_();
        },
        click: function () {
          self.owner_.onClick_(self);
        }
      } );

    new Droppable(this.node_, {
      classHover: parentOwner.options.css.droppableHover,
      scopes: [ 'text-item' ],
      
      drop: function (e) {
        var id = decodeURIComponent(e.dataTransfer.getData('Text')),
            item = parentOwner.items.getById(id);

        parentOwner.callbacks.invoke("textDroppedInBin", item, self);
        parentOwner.items.remove(decodeURIComponent(item.content.node_id));
      }
    } );

    /* We must defer initialisation of D'n'D because owning object's `bin'
     * attribute will have not yet been set. */
    window.setTimeout(function () {
      new Draggable(self.node_, {
        dragstart: function (e) {
          parentOwner.dismiss.activate();
        },
        
        dragend: function (e) {
          parentOwner.dismiss.deactivate();
        }
      } );
    }, 0);
  };

  /* abstract */ BinBase.prototype.add = function ()
  { throw "Abstract method must be implemented"; };
    
  BinBase.prototype.setShortcut = function (keyCode)
  {
    this.shortcut_ = keyCode;
    this.getNodeShortcut().html(String.fromCharCode(keyCode).toLowerCase());
  };

  /* overridable */ BinBase.prototype.getNodeShortcut = function ()
  {
    return this.node_.find(
      '.'+ this.owner_.owner.options.css.binShortcut);
  };


  /**
   * @class
   * */
  var Bin = function (owner, id, bin)
  {
    /* Invoke super constructor. */
    BinBase.call(this, owner, id, bin);

    this.children_ = [ ];

    this.__defineGetter__("children", function () { return this.children_; } );
  };

  Bin.prototype = Object.create(BinBase.prototype);

  Bin.prototype.add = function ()
  {
    this.initialise(this.render());
    this.owner_.add(this);
  };

  
  /**
   * @class
   * */
  var BinGeneric = function (owner, id, bin)
  {
    /* Invoke super constructor. */
    Bin.call(this, owner, id, bin);
  };

  BinGeneric.prototype = Object.create(Bin.prototype);
    
  BinGeneric.prototype.render = function ()
  {
    /* Wrap bin name inside a DIV. */
    return $('<div class="sd-bin"><div class="sd-bin-shortcut"/>'
             + this.bin_.name + '</div>');
  };


  /**
   * @class
   * */
  var SubBin = function (owner, id, bin, parent)
  {
    /* Invoke super constructor. */
    BinBase.call(this, owner, id, bin);

    this.parent_ = parent;

    this.__defineGetter__("parent", function () { return this.parent_; } );
  };

  SubBin.prototype = Object.create(BinBase.prototype);

  SubBin.prototype.render = function ()
  {
    /* Wrap bin statement_text inside a DIV. */
    return $('<div class="sd-bin-sub"><div class="sd-bin-shortcut"/>'
             + this.bin_.name + '</div>');
  };


  /**
   * @class
   * */
  var SubBinGeneric = function (owner, id, bin, parent)
  {
    /* Invoke super constructor. */
    Bin.call(this, owner, id, bin, parent);
    
    this.initialise(this.render());
    parent.add(this);
  };

  SubBinGeneric.prototype = Object.create(SubBin.prototype);


  /**
   * @class
   * */
  var ControllerItems = function (owner)
  {
    /* Invoke super constructor. */
    Controller.call(this, owner);
    
    this.node_ = this.owner_.options.nodes.items;
    this.items_ = [ ];
  };

  ControllerItems.prototype = Object.create(Controller.prototype);

  ControllerItems.prototype.initialise = function ()
  { this.check(); };
  
  ControllerItems.prototype.check = function ()
  {
    if(this.items_.length >= this.owner_.options.visibleItems)
      return;
    
    var self = this,
        promise = this.owner_.callbacks.invoke(
          "moreTexts",
          this.owner_.options.visibleItems);

    /* Check that our request for more text items hasn't been refused. */
    if(!promise)
      return;
    
    promise.done(function (items) {
      self.owner_.requests.begin('check-items');

      items.forEach(function (item, index) {
        window.setTimeout( function () {
          self.items_.push(new TextItemGeneric(self, item));
        }, Math.pow(index, 2) * 1.1);
      } );

      window.setTimeout( function () {
        self.select();
      }, 10);

      /* Ensure event is fired after the last item is added. */
      window.setTimeout( function () {
        self.owner_.requests.end('check-items');
      }, Math.pow(items.length - 1, 2) * 1.1 + 10);

    } );
  };

  ControllerItems.prototype.select = function (variant)
  {
    /* Fail silently if not initialised anymore. This might happen if, for
     * example, the `reset' method was invoked but the component is still
     * loading text items. */
    if(!this.owner_.isInitialised)
      return;
    
    var csel = this.owner_.options.css.itemSelected;
    
    if(!this.node_.children().length)
      return;
    
    if(typeof variant == 'undefined') {
      variant = this.node_.find('.' + csel);

      if(variant.length == 0)
        variant = this.node_.children().eq(0);
      else if(variant.length > 1) {
        /* We should never reach here. */
        console.log("WARNING! Multiple text items selected:",
                    variant.length);
        
        variant.removeClass(csel);

        variant = variant.eq(0);
        variant.addClass(csel);
      }
    } else if(typeof variant == 'number') {
      if(variant < 0)
        variant = 0;
      else if(variant > this.node_.children().length - 1)
        variant = this.node_.children().length - 1;

      variant = this.node_.children().eq(variant);
    } else if(variant instanceof TextItem)
      variant = variant.node;

    this.node_.find('.' + csel).removeClass(csel);
    variant.addClass(csel);

    /* WARNING: the present implementation requires knowledge of the list
     * items' container's height or it will fail to ensure the currently
     * selected item is always visible.
     *
     * A particular CSS style involving specifying the container's height
     * using `vh' units was found to break this behaviour.
     */
    
    /* Ensure text item is _always_ visible at the bottom and top ends of
     * the containing node. */
    var st = this.node_.scrollTop(),           /* scrolling top */
        ch = this.node_.innerHeight(),         /* container height */
        ipt = variant.position().top,          /* item position top */
        ih = st + ipt + variant.outerHeight(); /* item height */

    if(st + ipt < st            /* top */
       || variant.outerHeight() > ch) {
      this.node_.scrollTop(st + ipt);
    } else if(ih > st + ch) {   /* bottom */
      this.node_.scrollTop(st + ipt - ch
                           + variant.outerHeight()
                           + parseInt(variant.css('marginBottom'))
                           + parseInt(variant.css('paddingBottom')));
    }
  };

  ControllerItems.prototype.selectOffset = function (offset)
  {
    var csel = this.owner_.options.css.itemSelected,
        index;

    if(!this.node_.length)
      return;
    else if(!this.node_.find('.' + csel).length) {
      this.select();
      return;
    }

    index = this.node_.find('.' + csel).prevAll().length + offset;

    if(index < 0)
      index = 0;
    else if(index > this.node_.children().length - 1)
      index = this.node_.children().length - 1;

    this.select(index);
  };

  ControllerItems.prototype.current = function()
  {
    var node = this.node_.find(
      '.' + this.owner_.options.css.itemSelected);
    
    if(!node.length)
      return null;
    
    var item = this.getById(decodeURIComponent(node.attr('id')));
    return item ? item.content : null;
  };

  /* TODO: This class has different item removal semantics than `Bin'. */
  ControllerItems.prototype.remove = function (id)
  {
    if(typeof id == 'undefined') {
      var cur = this.current();
      if (!cur) {
        this.check();
        return null;
      }
      
      id = cur.node_id;
    }

    var self = this,
        result = false;
    
    $.each(this.items_, function (i, item) {
      if(item.content.node_id != id)
        return true;
      
      if(item.isSelected()) {
        if(i < self.items_.length - 1)
          self.select(self.items_[i + 1]);
        else if(self.items_.length)
          self.select(self.items_[i - 1]);
        else
          console.log("No more items available");
      }
      
      item.node
        .css('opacity', 0.6)  /* to prevent flicker */
        .animate( { opacity: 0 },
                  self.owner_.options.delays.textItemFade,
                  function () {
                    $(this).slideUp(
                      self.owner_.options.delays.slideItemUp,
                      function () {
                        $(this).remove();
                        self.select();
                      } );
                  } );

      self.items_.splice(i, 1);
      result = true;
      
      return false;  
    } );
    
    this.check();

    return result;
  };

  ControllerItems.prototype.getById = function (id)
  {
    var result = null;
    
    this.items_.some(function (item) {
      if(item.content.node_id == id) {
        result = item;
        return true;
      }

      return false;
    } );

    return result;
  };


  /**
   * @class
   * */
  var TextItem = function (owner, item)
  {
    /* Invoke super constructor. */
    Drawable.call(this, owner);

    this.content_ = item;
    this.node_ = null;

    /* Define getters. */
    this.__defineGetter__("content", function () { return this.content_; } );
    this.__defineGetter__("node", function () { return this.node_; } );
  };

  TextItem.prototype = Object.create(Drawable.prototype);

  TextItem.prototype.initialise = function()
  {
    var self = this,
        parentOwner = this.owner_.owner;

    this.node_
      .attr( {
        id: encodeURIComponent(this.content_.node_id),
        "data-scope": "text-item"
      } )
      .click(function () {
        self.owner_.select(self);
      } );

    this.getNodeClose()
      .click(function () {
        parentOwner.callbacks.invoke("textDismissed", self.content_);
        self.owner_.remove(decodeURIComponent(self.content_.node_id));
        return false;
      } );

    new Draggable(this.node_, {
      classDragging: parentOwner.options.css.itemDragging,
      
      dragstart: function (e) {
        /* Firstly select item being dragged to ensure correct item position
         * in container. */
        self.owner_.select(self);

        /* Activate deletion/dismissal button. */
        parentOwner.dismiss.activate();
      },
      
      dragend: function () {
        /* Deactivate deletion/dismissal button. */
        parentOwner.dismiss.deactivate();
      }
    } );
  };

  TextItem.prototype.replaceNode = function (newNode)
  {
      this.node_.replaceWith(newNode);
      this.node_ = newNode;
      this.initialise();
      this.owner_.select(this);
  };
    
  /* abstract */ TextItem.prototype.render = function ()
  { throw "Abstract method must be implemented"; };

  /* overridable */ TextItem.prototype.getNodeClose = function ()
  { return this.node_.find('.sd-text-item-close'); };

  /* overridable */ TextItem.prototype.getNodeLess = function ()
  { return this.node_.find('.sd-less'); };

  /* overridable */ TextItem.prototype.getNodeMore = function ()
  { return this.node_.find('.sd-more'); };

  /* overridable */ TextItem.prototype.isSelected = function ()
  { return this.node_.hasClass('sd-selected'); };
  
  
  /**
   * @class
   * */
  var TextItemGeneric = function (owner, item)
  {
    /* Fail silently if not initialised anymore. This might happen if, for
     * example, the `reset' method was invoked but the component is still
     * loading text items. */
    if(!owner.owner.isInitialised)
      return;

    TextItem.call(this, owner, item);

    this.node_ = this.render(TextItemGeneric.VIEW_HIGHLIGHTS);
    
    this.initialise();
    owner.owner.options.nodes.items.append(this.node_);
  };

  /* Constants */
  TextItemGeneric.VIEW_HIGHLIGHTS = 1;
  TextItemGeneric.VIEW_UNRESTRICTED = 2;
  TextItemGeneric.CHARS_HIGHLIGHTS = 150;

  /* Prototype */
  TextItemGeneric.prototype = Object.create(TextItem.prototype);

  TextItemGeneric.prototype.initialise = function ()
  {
    var self = this;

    /* Call overrided method. */
    TextItem.prototype.initialise.call(this);

    /* Add logic to less/more links. */
    this.getNodeLess().click(function () {
      self.replaceNode(self.render(TextItemGeneric.VIEW_HIGHLIGHTS));
      return false;
    } );

    this.getNodeMore().click(function () {
      self.replaceNode(self.render(TextItemGeneric.VIEW_UNRESTRICTED));
      return false;
    } );
  };
  
  TextItemGeneric.prototype.render = function (view)
  {
    switch(view || TextItemGeneric.VIEW_HIGHLIGHTS) {
    case TextItemGeneric.VIEW_UNRESTRICTED:
      return this.renderUnrestricted_();
    case TextItemGeneric.VIEW_HIGHLIGHTS:
    default:
      return this.renderHighlights_();
    }
  };

  TextItemGeneric.prototype.renderUnrestricted_ = function ()
  {
    return this.renderHtml_(
      this.content_.text,
      TextItemGeneric.VIEW_UNRESTRICTED,
      new TextItemSnippet(this.content_.text).canTextBeReduced(
        TextItemGeneric.CHARS_HIGHLIGHTS,
        TextItemGeneric.CHARS_HIGHLIGHTS)
        ? true : null);
  };

  TextItemGeneric.prototype.renderHighlights_ = function ()
  {
    return this.renderHtml_(
      new TextItemSnippet(this.content_.text).highlights(
        TextItemGeneric.CHARS_HIGHLIGHTS,
        TextItemGeneric.CHARS_HIGHLIGHTS),
      TextItemGeneric.VIEW_HIGHLIGHTS,
      false);
  };

  TextItemGeneric.prototype.renderHtml_ = function (text, view, less)
  {
    var node = $('<div class="sd-text-item view-' + view + '"/>'),
        content = $('<div class="sd-text-item-content"/>'),
        anchor = this.content_.name;

    /* Append title if existent. */
    if(this.content_.title)
      anchor += '&ndash; ' + this.content_.title;

    node.append('<a class="sd-text-item-title" target="_blank" '
                + 'href="' + this.content_.url + '">'
                + anchor + '</a>');

    node.append('<a class="sd-text-item-close" href="#">x</a>');

    /* Append content and remove all CSS classes from children. */
    content.append(text);
    content.children().removeClass();

    if(less !== null)
      content.append(this.renderLessMore_(less));

    node.append(content);
    
    return node;
  };

  TextItemGeneric.prototype.renderLessMore_ = function (less)
  {
    var cl = less && 'less' || 'more';
    return '<div class="sd-less-more sd-' + cl + '">' + cl + '</div>'
      + '<div style="display: block; clear: both" />';
  };


  /**
   * @class
   * */
  var BinAddButton = function (owner, fnRender, fnAdd)
  {
    /* Invoke super constructor. */
    Drawable.call(this, owner);
    
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

    new Droppable(button, {
      classHover: parentOwner.options.css.droppableHover,
      scopes: [ 'text-item' ],
      
      drop: function (e, id) {
        self.onAdd(decodeURIComponent(id));
      }
    } );

    owner.node.append(button);
  };

  BinAddButton.prototype = Object.create(Drawable.prototype);

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

    var item = parentOwner.items.getById(id);

    if(!item) {
      node.remove();
      throw "onAdd: failed to retrieve text item: " + id;
    }

    this.fnAdd(id,
               new TextItemSnippet(item.content.text)
               .highlights(options.binCharsLeft, options.binCharsRight))
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


  /**
   * @class@
   *
   * Static class.
   * */
  var DragDropManager = {
    activeNode: null,

    onDragStart: function (event) {
      DragDropManager.activeNode = (event.originalEvent || event).target;
    },

    onDragEnd: function (event) {
      if(DragDropManager.activeNode == (event.originalEvent || event).target) {
        DragDropManager.activeNode = null;
      }
    },
    
    isScope: function (event, scopes)
    {
      if(!DragDropManager.activeNode)
        return false;

      return (scopes instanceof Array ? scopes : [ scopes ])
        .some(function (scope) {
          return DragDropManager.activeNode.getAttribute('data-scope') == scope;
        } );
    },

    getScope: function (event)
    {
      return DragDropManager.activeNode
        ? DragDropManager.activeNode.getAttribute('data-scope')
        : null;
    }
  };


  /**
   * @class@
   * */
  var Draggable = function (node, options)
  {
    var self = this;

    node.on( {
      dragstart: function (e) {
        e = e.originalEvent;
        e.dataTransfer.setData('Text', this.id);

        if(options.classDragging)
          node.addClass(options.classDragging);

        DragDropManager.onDragStart(e);

        if(options.dragstart)
          options.dragstart(e);
      },
      
      dragend: function (e) {
        e = e.originalEvent;
        
        if(options.classDragging)
          node.removeClass(options.classDragging);

        DragDropManager.onDragEnd(e);
        
        if(options.dragend)
          options.dragend(e);
      }
    } ).prop('draggable', true);
  };


  /**
   * @class@
   * */
  var Droppable = function (node, options)
  {
    var self = this;

    node.on( {
      dragover: function (e) {
        if(DragDropManager.isScope(e = e.originalEvent, options.scopes)) {
          /* Drag and drop has a tendency to suffer from flicker in the sense that
           * the `dragleave' event is fired while the pointer is on a valid drop
           * target but the `dragenter' event ISN'T fired again, causing the
           * element to lose its special styling -- given by `options.classHover'
           * -- and its `dropEffect'. We then need re-set everything in the
           * `dragover' event. */
          if(options.classHover)
            node.addClass(options.classHover);

          e.dropEffect = 'move';
          return false;
        }
      },
      
      dragenter: function (e) {
        /* IE requires the following special measure. */
        if(DragDropManager.isScope(e = e.originalEvent, options.scopes)) {
          e.dropEffect = 'move';
          
          return false;
        }
      },
      
      dragleave: function (e) {
        if(DragDropManager.isScope(e = e.originalEvent, options.scopes)) {
          if(options.classHover)
            node.removeClass(options.classHover);

          return false;
        }
      },
      
      drop: function (e) {
        if(!DragDropManager.isScope(e = e.originalEvent, options.scopes))
          return;

        if(options.classHover)
          node.removeClass(options.classHover);

        if(options.drop) {
          options.drop(e,
                       e.dataTransfer.getData('Text'),
                       DragDropManager.getScope());
        }
        
        return false;
      }
    } );
  };


  /**
   * @class
   * */
  var TextItemSnippet = function (text)
  {
    this.text_ = text;
  };

  TextItemSnippet.prototype = {
    text_: null,
    
    highlights: function (left, right) {
      var re = /<\s*[bB]\s*[^>]*>/g,
          matcho = re.exec(this.text_),
          matchc,
          i, j, skip,
          highlight,
          result;

      if(!matcho)
        return this.condense(left + right);
      
      /* We (perhaps dangerously) assume that a stranded closing tag </B> will
       * not exist before the first opening tag <b>. */
      matchc = /<\s*\/[bB]\s*>/.exec(this.text_); /* find end of B tag */

      /* Skip tag, position and extract actual text inside B tag. Use semantic
       * STRONG rather than B tag. */
      i = matcho.index + matcho[0].length;
      highlight = '<STRONG>' + this.text_.substr(
        i,
        matchc.index - i) + '</STRONG>';

      /* Move `left' chars to the left of current position and align to word
       * boundary.
       *
       * Note: the assumption is that the browser will be smart enough (and
       * modern ones are) to drop any closed but unopened tags between `i' and
       * `matcho.index'. */
      i = this.indexOfWordLeft(matcho.index - left);

      /* Prepend ellipsis at beginning of result if index not at beginning of
       * string and add text to left of highlight as well as highlight
       * itself.. */
      result = (i > 0 ? "[...]&nbsp;" : '')
        + this.text_.substr(i < 0 ? 0 : i, matcho.index - i) + highlight;

      /* Set index to the right of the closing B tag and skip at most `right'
       * chars, taking care not to count chars that are part of any HTML tags
       * towards the `right' chars limit. Align to word boundary and add
       * text. */
      i = matchc.index + matchc[0].length;
      skip = this.skip(i, right);
      j = this.indexOfWordRight(skip.index);
      
      result += this.text_.substr(i, j - i);

      /* Close stranded opened tags.
       *
       * Note: probably not necessary but since we know about the non-closed
       * tags, why not close them anyway? */
      j = skip.tags.length;
      
      while(j--)
        result += '</' + skip.tags[j] + '>';
      
      /* Append ellipsis at end of result if index not at end of string. */
      if(j < this.text_.length - 1)
        result += "&nbsp;[...]";

      /* And Bob's your uncle. */
      return result;
    },

    condense: function (right) {
      var i = this.indexOfWordRight(right),
          result = this.text_.substring(0, i);

      if(i < this.text_.length - 1)
        result += '&nbsp;[...]';

      return result;
    },

    skip: function (ndx, count) {
      var tags = [ ];

      while(ndx < this.text_.length && count) {
        var ch = this.text_.charAt(ndx);

        if(ch == '<') {
          var result = this.extractTag(ndx);

          ndx = result.index;

          if(result.tag)
            tags.push(result.tag);
          else
            tags.pop();
        } else {
          ++ndx;
          --count;
        }
      }

      return { index: ndx, tags: tags };
    },

    extractTag: function (ndx) {
      var match = /<\s*(\/)?\s*([a-zA-Z]+)\s*[^>]*>/.exec(
        this.text_.substr(ndx));

      if(match) {
        return { index: match.index + ndx + match[0].length,
                 tag: match[1] ? null : match[2] };
      }
      
      return { index: ndx };
    },

    indexOfWordLeft: function (ndx) {
      while(ndx >= 0) {
        if(this.text_.charAt(ndx) == ' ')
          return ndx + 1;
        
        --ndx;
      }

      return 0;
    },

    indexOfWordRight: function (ndx) {
      while(ndx < this.text_.length && this.text_.charAt(ndx) != ' ')
        ++ndx;

      return ndx;
    },

    canTextBeReduced: function (left, right) {
      var reduced = this.highlights(left, right);
      return reduced.length < this.text_.length;
    }
  };


  /**
   * Module public interface. */
  return {
    Instance: Instance,
    Bin: Bin,
    TextItem: TextItem,
    BinAddButton: BinAddButton,
    TextItemSnippet: TextItemSnippet
  };
  
} )();
