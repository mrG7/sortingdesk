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
  define("SortingDesk", [ "jQuery" ], function() {
    return SortingDesk;
  });
}


/**
 * The Sorting Desk module.
 *
 * @returns a "class" constructor that creates a Sorting Desk instance.
 * */
var SortingDesk = (function () {
  
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
    /* IMPORTANT: It is crucial that the `initialised_' attribute below has an
     * initial value of `null' *prior* to the method `initialise_' being
     * called. This is so we can reset a Sorting Desk instance that is
     * initialisING. */
    this.initialised_ = null;
    this.resetter_ = false;
    
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

    /* Create dummy jQuery element if bins container not provided. */
    if(!opts.nodes.bins) {
      opts.nodes.binsProvided = false;
      opts.nodes.bins = $();
    }
    
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
    
    this.options_ = $.extend(true, $.extend(true, {}, defaults_), opts);
    this.callbacks_ = cbs;
    
    /* Do not request bin data if a bins HTML container (`options_.nodes.bins')
     * wasn't given OR content ids (`options_.nodes.contentIds') were not
     * specified. */
    if(this.options_.nodes.bins && this.options_.contentIds) {
      if(!this.callbacks_.getBinData)
        throw "Mandatory `getBinData' callback missing";
      
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
    initialised_: null,
    resetter_: false,
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
      var self = this;

      /* + If a reset is already underway, simply return its instance.
       * + Throw an exception if Sorting Desk has just been instantiated and is
       * currently initialising itself. */
      if(this.resetter_)
        return this.resetter_;
      else if(this.initialised_ === null)
        throw "Instance still initialising";
      
      this.resetter_ = new InstanceResetter(this).reset(
        [ this.requests_,
          this.keyboard_,
          this.dismiss_,
          [ this.bins_,
            this.items_,
            [
              this.callbacks_
            ]
          ]
        ] )
        .done(function () {
          self.options_ = self.callbacks_ = self.bins_ = self.items_ = null;
          self.requests_ = self.dismiss_ = self.keyboard_ = null;
          
          self.initialised_ = false;
          
          console.log("Sorting Desk UI reset");
        } )
        .always(function () {
          self.resetter_ = false;
        } );

      return this.resetter_;
    },

    /**
     * Returns a boolean value indicating whether Sorting Desk has been
     * initialised and is ready to be used.
     *
     * @returns {Boolean}   Returns true if Sorting Desk has been successful
     *                      initialised, false otherwise.
     * */
    get initialised ()
    { return this.initialised_; },

    get resetting ()
    { return !!this.resetter_; },

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

      /* Begin instantiating and initialising controllers. */
      (this.callbacks_ = new ControllerCallbacks(this, this.callbacks_))
        .initialise();
      
      (this.requests_ = new ControllerRequests(this))
        .initialise();
      
      if(!this.options_.nodes.buttonDismiss)
        this.options_.nodes.buttonDismiss = $();

      (this.dismiss_ = new ControllerButtonDismiss(this))
        .initialise();

      (this.bins_ = this.instantiate('ControllerBins', this))
        .initialise();
      
      /* Add bins only if a bin container node has been provided and there bins
       * to add. */
      if(this.options_.nodes.binsProvided !== false && bins) {
        for(var id in bins) {
          var descriptor = bins[id],
              bin;
          
          if(descriptor.error) {
            console.log("Failed to load bin:", id, descriptor.error);
            continue;
          }

          bin = this.instantiate('Bin', this.bins_, id, descriptor);
          this.bins_.add(bin);

          /* Instantiate and add sub-bins. */
          for(var iid in descriptor.children) {
            bin.add(bin.createSubBin(iid,
                                     descriptor.children[iid]));
          }
        }
      }
      
      (this.items_ = new ControllerItems(this))
        .initialise();

      (this.keyboard_ = new ControllerKeyboard(this))
        .initialise();

      this.initialised_ = true;
      console.log("Sorting Desk UI initialised");
    },

    instantiate: function ( /* class, ... */ )
    {
      if(arguments.length < 1)
        throw "Class name required";

      var descriptor = this.options_.constructors['create' + arguments[0]];

      /* Invoke factory method to instantiate class, if it exists. */
      if(descriptor)
        return descriptor.apply(null, [].slice.call(arguments, 1));

      /* Factory method doesn't exist. Ensure class constructor has been passed
       * and instantiate it. */
      if(!(arguments[0] in this.options_.constructors))
        throw "Class or factory non existent: " + arguments[0];

      descriptor = this.options_.constructors[arguments[0]];

      /* We don't want to use `eval' so we employ a bit of trickery to
       * instantiate a class using variable arguments. */
      var fakeClass = function () { },
          object;

      /* Instantiate class prototype. */
      fakeClass.prototype = descriptor.prototype;
      object = new fakeClass();

      /* Now simply call class constructor directly and keep reference to
       * correct constructor. */
      descriptor.apply(object, [].slice.call(arguments, 1));
      object.constructor = descriptor.constructor;
      
      return object;
    }
  };


  /**
   * @class@
   * */
  var InstanceResetter = function (instance)
  {
    this.instance_ = instance;
    this.count_ = 0;
  };

  InstanceResetter.prototype = {
    instance_: null,
    count_: null,

    reset: function (entities)
    {
      var deferred = $.Deferred();
      
      if(!this.instance_.initialised || this.instance_.resetting) {
        window.setTimeout(function () {
          deferred.reject();
        } );
      } else {
        var self = this;
        this.count_ = this.countEntities_(entities);

        /* Begin resetting entities. */
        this.resetEntities_(entities);

        /* Begin main instance resetting timer sequence. */
        var interval = window.setInterval(function () {
          /* Wait until all instances have reset. */
          if(self.count_)
            return;

          /* Clear interval. */
          window.clearInterval(interval);

          /* State reset. Resolve promise */
          window.setTimeout(function () {
            deferred.resolve();
          }, 10);
        }, 10);
      }
      
      return deferred.promise();
    },

    countEntities_: function (entities)
    {
      var self = this,
          count = 0;

      entities.forEach(function (e) {
        if(e instanceof Array)
          count += self.countEntities_(e);
        else
          ++count;
      } );

      return count;
    },

    resetEntities_: function (entities)
    {
      var self = this,
          waiting = 0;
      
      entities.forEach(function (e) {
        /* Deal with sub-dependencies if current element is an array. */
        if(e instanceof Array) {
          var interval = window.setInterval(function () {
            if(waiting)
              return;

            window.clearInterval(interval);
            self.resetEntities_(e);
          }, 10);
        } else {
          var result;

          try {
            result = e.reset();
          } catch(x) {
            console.log('Exception thrown whilst resetting:', x);
          }

          /* Special measure for instances that return a promise. */
          if(result && 'always' in result) {
            ++waiting;

            /* Wait until it finishes. The assumption is made that instances
             * must always reset and therefore it matters not whether the
             * promise is rejected or not. */
            result.always(function () {
              --waiting;
              --self.count_;
            } );
          } else
            --self.count_;
        }
      } );
    }
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
  ControllerCallbacks.prototype.reset = function () { };
  
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
  ControllerRequests.prototype.reset = function ()
  {
    var self = this,
        deferred = $.Deferred(),
        interval;

    /* Don't signal state reset until all requests processed. */
    interval = window.setInterval(function () {
      if(self.count_)
        return;

      window.clearInterval(interval);
      deferred.resolve();
    }, 10);

    return deferred.promise();
  };

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
            if(bin.parent)
              bin.parent.remove(bin);
            else
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
          self.owner_.items.remove(
            self.owner_.items.getById(decodeURIComponent(id)));
          
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

  ControllerButtonDismiss.prototype.reset = function ()
  {
    this.owner_.options.nodes.buttonDismiss.off();
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

    /* Save event handler function so we are able to remove it when resetting
     * the instance. */
    this.fnEventKeyUp = function (evt) { self.onKeyUp_(evt); };
    
    /* Set up listener for keyboard up events. */
    $('body').bind('keyup', this.fnEventKeyUp);
  };

  ControllerKeyboard.prototype.reset = function ()
  {
    /* Remove keyboard up event listener. */
    $('body').unbind('keyup', this.fnEventKeyUp);
    this.fnEventKeyUp = null;
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
          this.owner_.bins.setShortcut(this.owner_.bins.hover, evt.keyCode);
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
                                       this.owner_.items.selected(),
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
                                   this.owner_.items.selected());
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

    this.owner_.instantiate(
      'BinAddButton',
      this,
      function (input) {
        return self.owner_.instantiate('Bin',
                                       self,
                                       null,
                                       { name: input },
                                       null)
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

              self.owner_.bins.add(
                self.owner_.instantiate('Bin',
                                        self,
                                        id,
                                        bin[id]));
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
    var id = bin.id;

    /* Ensure a bin with the same id isn't already contained. */
    this.bins_.forEach(function (ib) {
      if(ib.id == id)
        throw "Bin is already contained: " + id;
    } );

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
              search(bin.children);

              if(result)
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
    this.owner_.callbacks.invoke("textDroppedInBin",
                                 this.owner_.items.selected(), bin);
    this.owner_.items.remove();
  };

  ControllerBins.prototype.onMouseEnter_ = function (bin)
  { this.hover_ = bin; };

  ControllerBins.prototype.onMouseLeave_ = function ()
  { this.hover_ = null; };


  /**
   * @class
   * */
  var Bin = function (owner, id, bin)
  {
    /* Invoke super constructor. */
    Drawable.call(this, owner);

    this.id_ = id;
    this.bin_ = bin;
    this.node_ = this.shortcut_ = null;

    this.children_ = [ ];
    this.parent_ = null;        /* Parents are set by parent bins directly. */

    /* Define getters. */
    this.__defineGetter__("bin", function () { return this.bin_; } );
    this.__defineGetter__("id", function () { return this.id_; } );
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

  Bin.prototype = Object.create(Drawable.prototype);

  Bin.prototype.initialise = function ()
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

    new Droppable(this.node_, {
      classHover: parentOwner.options.css.droppableHover,
      scopes: [ 'text-item' ],
      
      drop: function (e) {
        var id = decodeURIComponent(e.dataTransfer.getData('Text')),
            item = parentOwner.items.getById(id);

        parentOwner.callbacks.invoke("textDroppedInBin", item, self);
        parentOwner.items.remove(item);
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

  /* overridable */ Bin.prototype.createSubBin = function (id, bin)
  {
    return this.owner_.owner.instantiate('Bin', this.owner_, id, bin);
  };
  
  Bin.prototype.add = function (bin)
  {
    /* Contain sub-bin only once it's established it's not contained. */
    var id = bin.id;

    /* Ensure a bin with the same id isn't already contained. */
    this.children_.forEach(function (ib) {
      if(ib.id == id)
        throw "Bin is already contained: " + id;
    } );
    
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
    return this.node_.find('>.' + this.owner_.owner.options.css.binChildren);
  };

  
  /**
   * @class
   * */
  var BinDefault = function (owner, id, bin)
  {
    /* Invoke super constructor. */
    Bin.call(this, owner, id, bin);
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

  ControllerItems.prototype.reset = function ()
  {
    this.owner_.options.nodes.items.children().remove();
  };
  
  ControllerItems.prototype.check = function ()
  {
    if(this.items_.length >= this.owner_.options.visibleItems)
      return;
    
    var self = this,
        promise = this.owner_.callbacks.invoke(
          "moreTexts",
          this.owner_.options.visibleItems);

    /* Check that our request for more text items hasn't been denied. */
    if(!promise)
      return;
    
    promise.done(function (items) {
      self.owner_.requests.begin('check-items');

      items.forEach(function (item, index) {
        window.setTimeout( function () {
          self.items_.push(self.owner_.instantiate('TextItem', self, item));
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
    if(!this.owner_.initialised)
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
        console.log("WARNING! Multiple text items selected:", variant.length);

        variant = variant.eq(0);
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

  ControllerItems.prototype.selected = function()
  {
    var node = this.getNodeSelected();
    
    if(!node || !node.length)
      return null;
    
    return this.getById(decodeURIComponent(node.attr('id')));
  };

  ControllerItems.prototype.remove = function (item)
  {
    if(typeof item == 'undefined') {
      var selected = this.selected();
      if (!selected) {
        this.check();
        return null;
      }
      
      return this.removeAt(this.items_.indexOf(selected));
    }

    return this.removeAt(this.items_.indexOf(item));
  };

  ControllerItems.prototype.removeAt = function (index)
  {
    if(index < 0 || index >= this.items_.length)
      throw "Invalid item index";

    var self = this,
        item = this.items_[index];
    
    if(item.isSelected()) {
      if(index < this.items_.length - 1)
        this.select(this.items_[index + 1]);
      else if(this.items_.length)
        this.select(this.items_[index - 1]);
      else
        console.log("No more items available");
    }
    
    item.node
      .css('opacity', 0.6)  /* to prevent flicker */
      .animate( { opacity: 0 },
                this.owner_.options.delays.textItemFade,
                function () {
                  $(this).slideUp(
                    self.owner_.options.delays.slideItemUp,
                    function () {
                      $(this).remove();
                      self.select();
                    } );
                } );

    this.items_.splice(index, 1);
    this.check();

    return true;
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

  /* overridable */ ControllerItems.prototype.getNodeSelected = function ()
  {
    return this.node_.find('.' + this.owner_.options.css.itemSelected);
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
        self.owner_.remove(self);
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

  /* Not mandatory. */
  /* overridable */ TextItem.prototype.getNodeClose = function ()
  { return $(); };

  /* Not mandatory. */
  /* overridable */ TextItem.prototype.getNodeLess = function ()
  { return $(); };

  /* Not mandatory. */
  /* overridable */ TextItem.prototype.getNodeMore = function ()
  { return $(); };

  /* overridable */ TextItem.prototype.isSelected = function ()
  { return this.node_.hasClass(this.owner_.owner.options.css.itemSelected); };
  
  
  /**
   * @class
   * */
  var TextItemDefault = function (owner, item)
  {
    /* Fail silently if not initialised anymore. This might happen if, for
     * example, the `reset' method was invoked but the component is still
     * loading text items. */
    if(!owner.owner.initialised)
      return;

    TextItem.call(this, owner, item);

    this.node_ = this.render(TextItemDefault.VIEW_HIGHLIGHTS);
    
    this.initialise();
    owner.owner.options.nodes.items.append(this.node_);
  };

  /* Constants */
  TextItemDefault.VIEW_HIGHLIGHTS = 1;
  TextItemDefault.VIEW_UNRESTRICTED = 2;
  TextItemDefault.CHARS_HIGHLIGHTS = 150;

  /* Prototype */
  TextItemDefault.prototype = Object.create(TextItem.prototype);

  TextItemDefault.prototype.initialise = function ()
  {
    var self = this;

    /* Call overrided method. */
    TextItem.prototype.initialise.call(this);

    /* Add logic to less/more links. */
    this.getNodeLess().click(function () {
      self.replaceNode(self.render(TextItemDefault.VIEW_HIGHLIGHTS));
      return false;
    } );

    this.getNodeMore().click(function () {
      self.replaceNode(self.render(TextItemDefault.VIEW_UNRESTRICTED));
      return false;
    } );
  };
  
  TextItemDefault.prototype.render = function (view)
  {
    switch(view || TextItemDefault.VIEW_HIGHLIGHTS) {
    case TextItemDefault.VIEW_UNRESTRICTED:
      return this.renderUnrestricted_();
    case TextItemDefault.VIEW_HIGHLIGHTS:
    default:
      return this.renderHighlights_();
    }
  };

  TextItemDefault.prototype.renderUnrestricted_ = function ()
  {
    return this.renderHtml_(
      this.content_.text,
      TextItemDefault.VIEW_UNRESTRICTED,
      new TextItemSnippet(this.content_.text).canTextBeReduced(
        TextItemDefault.CHARS_HIGHLIGHTS,
        TextItemDefault.CHARS_HIGHLIGHTS)
        ? true : null);
  };

  TextItemDefault.prototype.renderHighlights_ = function ()
  {
    return this.renderHtml_(
      new TextItemSnippet(this.content_.text).highlights(
        TextItemDefault.CHARS_HIGHLIGHTS,
        TextItemDefault.CHARS_HIGHLIGHTS),
      TextItemDefault.VIEW_HIGHLIGHTS,
      false);
  };

  TextItemDefault.prototype.renderHtml_ = function (text, view, less)
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

  TextItemDefault.prototype.renderLessMore_ = function (less)
  {
    var cl = less && 'less' || 'more';
    return '<div class="sd-less-more sd-' + cl + '">' + cl + '</div>'
      + '<div style="display: block; clear: both" />';
  };

  TextItemDefault.prototype.getNodeClose = function ()
  { return this.node_.find('.sd-text-item-close'); };

  TextItemDefault.prototype.getNodeLess = function ()
  { return this.node_.find('.sd-less'); };

  TextItemDefault.prototype.getNodeMore = function ()
  { return this.node_.find('.sd-more'); };


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

        e.stopPropagation();
      },
      
      dragend: function (e) {
        e = e.originalEvent;
        
        if(options.classDragging)
          node.removeClass(options.classDragging);

        DragDropManager.onDragEnd(e);
        
        if(options.dragend)
          options.dragend(e);

        e.stopPropagation();
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
      binTop: 'sd-bin',
      binShortcut: 'sd-bin-shortcut',
      binChildren: 'sd-children',
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
    constructors: {
      ControllerBins: ControllerBins,
      Bin: BinDefault,
      TextItem: TextItemDefault,
      BinAddButton: BinAddButton
    },
    visibleItems: 20,           /* Arbitrary.           */
    binCharsLeft: 25,
    binCharsRight: 25
  };


  /**
   * Module public interface. */
  return {
    Instance: Instance,
    ControllerBins: ControllerBins,
    Bin: Bin,
    TextItem: TextItem,
    BinAddButton: BinAddButton,
    TextItemSnippet: TextItemSnippet
  };
  
} )();
