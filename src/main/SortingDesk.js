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
    this.requests_ = [ ];
    this.controllers_ = { };
    
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
    controllers_: null,
    over_: null,
    requests_: null,

    
    /**
     * Resets the component to a virgin state. Removes all nodes contained by
     * `options_.nodes.items' and `options_.nodes.bins', if any.
     *
     * @returns {Boolean}   Returns status of operation: true if succeeded,
     *                      false otherwise.*/
    reset: function () {
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
          
          this.options_ = this.callbacks_ = this.controllers_.bins
            = this.controllers_.items = null;
          
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
    isInitialised: function () {
      return this.initialised_;
    },

    getOption: function (key)
    { return this.options_[key]; },

    getOptions: function (key)
    { return this.options_; },

    getControllers: function ()
    { return this.controllers_; },

    getController: function (controller)
    { return this.controllers_[controller]; },

    initialise_: function (bins) {
      var self = this;
      
      if(!this.options_.nodes.buttonDismiss)
        this.options_.nodes.buttonDismiss = $();

      (this.controllers_.dismiss = new ControllerButtonDismiss(this))
        .initialise();
      
      /* Do not create bin container or process any bins if a bin HTML container
       * wasn't given OR the bins' data result array wasn't received. */
      if(this.options_.nodes.bins && bins) {
        (this.controllers_.bins = new ControllerBins(this))
          .initialise();

        for(var id in bins) {
          var bin = bins[id];
          
          if(bin.error) {
            console.log("Failed to load bin:", id, bin.error);
            continue;
          }
          
          new BinGeneric(this.controllers_.bins, id, bin).add();
        }
      }
      
      (this.controllers_.items = new ControllerItems(this))
        .initialise();

      /* Set up listener for keyboard up events. */
      $('body').bind('keyup', function (evt) { self.onKeyUp_(evt); } );

      this.initialised_ = true;
      console.log("Sorting Desk UI initialised");
    },
    
    onKeyUp_: function (evt) {
      var self = this;
      
      /* First process alpha key strokes. */
      if(evt.keyCode >= 65 && evt.keyCode <= 90) {
        var bin = this.getBinByShortcut_(evt.keyCode);

        if(this.over_) {
          if(!bin)
            this.over_.setShortcut(evt.keyCode);
        } else {
          if(bin) {
            /* Simulate the effect produced by a mouse click by assigning the
             * CSS class that contains identical styles to the pseudo-class
             * :hover, and removing it after the milliseconds specified in
             * `options_.delay.animateAssign'. */
            bin.getNode().addClass(this.options_.css.binAnimateAssign);
            
            window.setTimeout(function () {
              bin.getNode().removeClass(self.options_.css.binAnimateAssign);
            }, this.options_.delays.animateAssign);
            
            this.invoke_("textDroppedInBin",
                         this.controllers_.items.current(),
                         bin);
            
            this.controllers_.items.remove();
          }
        }
        
        return false;
      }
      
      /* Not alpha. */
      switch(evt.keyCode) {
      case this.options_.keyboard.listUp:
        this.list.selectOffset(-1);
        break;
      case this.options_.keyboard.listDown:
        this.list.selectOffset(1);
        break;
      case this.options_.keyboard.listDismiss:
        this.controllers_.dismiss.activate(function () {
          self.controllers_.dismiss.deactivate();
        } );
        
        this.invoke_("textDismissed", this.controllers_.items.current());
        this.controllers_items.remove();
        
        break;
        
      default:
        return;
      }

      return false;
    },

    onClick_: function (bin) {
      this.invoke_("textDroppedInBin", this.controllers_.items.current(), bin);
      this.controllers_.items.remove();
    },

    onMouseEnter_: function (bin) {
      this.over_ = bin;
    },

    onMouseLeave_: function () {
      this.over_ = null;
    },

    invoke_: function () {
      if(arguments.length < 1)
        throw "Callback name required";
      else if(!(arguments[0] in this.callbacks_))
        throw "Callback non existent: " + arguments[0];

      var result = this.callbacks_[arguments[0]]
            .apply(null, [].slice.call(arguments, 1));

      if(result && 'always' in result) {
        var self = this;
        
        this.onRequestStart_(result);
        
        result.always(function () {
          self.onRequestStop_(result);
        } );
      }

      return result;
    },

    onRequestStart_: function (id) {
      this.requests_.push(id);

      /* Trigger callback. */
      if("onRequestStart" in this.callbacks_)
        this.callbacks_.onRequestStart(id);
    },

    onRequestStop_: function (id) {
      this.requests_.splice(this.requests_.indexOf(id), 1);

      /* Trigger callback. */
      if("onRequestStop" in this.callbacks_)
        this.callbacks_.onRequestStop(id);
    }
  };


  /**
   * @class@
   * */
  var /* abstract */ Controller = function () { };

  Controller.prototype = {
    /* Following method to allow for deferred initialisation. */
    /* abstract */ initialise: function ()
    { throw "Abstract method not implemented"; },

    /* abstract */ reset: function ()
    { throw "Abstract method not implemented"; }
  };
  
  
  /**
   * @class@
   * */
  var ControllerButtonDismiss = function (owner)
  {
    this.owner = owner;
  };

  ControllerButtonDismiss.prototype = Object.create(Controller.prototype);

  ControllerButtonDismiss.prototype.initialise = function () {
    var self = this,
        options = this.owner.getOptions();
    
    if(!options.nodes.buttonDismiss.length)
      return;
    
    new Droppable(options.nodes.buttonDismiss, {
      classHover: options.css.droppableHover,
      scopes: [ 'bin', 'text-item' ],

      drop: function (e, id, scope) {
        switch(scope) {
        case 'bin':
          var controller = self.owner.getControllers().bins,
          bin = controller.getBinById(decodeURIComponent(id));

          if(bin) {
            /* It doesn't matter if the API request succeeds or not for the
             * bin is always deleted. The only case (that I am aware of) where
             * the API request would fail is if the bin didn't exist
             * server-side, in which case it should be deleted from the UI
             * too. So, always delete, BUT, if the request fails show the user
             * a notification; for what purpose, I don't know. */
            controller.removeAt(controller.indexOf(bin));

            self.owner.invoke_('removeBin', bin.getId())
              .fail(function (result) {
                console.log("bin-remove:", result.error);
                /* TODO: user notification not implemented yet. */
              } );
          }

          break;

        case 'text-item':
          var controller = self.owner.getControllers().items,
          item = controller.getById(id);

          self.owner.invoke_("textDismissed", item);
          controller.remove(decodeURIComponent(id));
          
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
  
  ControllerButtonDismiss.prototype.activate = function (callback) {
    var options = this.owner.getOptions();
      
    options.nodes.buttonDismiss.stop().fadeIn(
      options.delays.dismissButtonShow,
      typeof callback == 'function' ? callback : null);
  };

  ControllerButtonDismiss.prototype.deactivate = function () {
    var options = this.owner.getOptions();
    
    options.nodes.buttonDismiss.stop().fadeOut(
      options.delays.dismissButtonHide);
  };


  /**
   * @class
   * */
  var ControllerBins = function (owner)
  {
    this.owner = owner;
    this.bins = [ ];
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

        self.owner.invoke_('addBin', text)
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
    var id = bin.getId();

    /* Ensure a bin with the same id isn't already contained. */
    this.bins.forEach(function (ib) {
      if(ib.getId() == id)
        throw "Bin is already contained: " + id;
    } );

    /* Contain bin and append its HTML node. */
    this.append(bin.getNode());
    this.bins.push(bin);
  };
    
  ControllerBins.prototype.append = function (node)
  {
    /* Add bin node to the very top of the container if aren't any yet,
     * otherwise insert it after the last contained bin. */
    if(!this.bins.length)
      this.owner.getOption("nodes").bins.prepend(node);
    else
      this.bins[this.bins.length - 1].getNode().after(node);
  };

  ControllerBins.prototype.indexOf = function (bin)
  {
    return this.bins.indexOf(bin);
  };

  ControllerBins.prototype.removeAt = function (index)
  {
    var bin;

    if(index < 0 || index >= this.bins.length)
      throw "Invalid bin index";

    bin = this.bins[index];
    this.bins.splice(index, 1);
    
    bin.getNode().remove(); 
  };

  ControllerBins.prototype.getBinByShortcut = function (keyCode)
  {
    var result = null;

    this.bins.some(function (bin) {
      if(bin.getShortcut() == keyCode) {
        result = bin;
        return true;
      }

      return false;
    } );

    return result;
  };

  ControllerBins.prototype.getBinById = function (id)
  {
    var result = null;
    
    this.bins.some(function (bin) {
      if(bin.getId() == id) {
        result = bin;
        return true;
      }

      return false;
    } );

    return result;
  };
    
  ControllerBins.prototype.getBins = function ()
  { return this.bins; };

  ControllerBins.prototype.getOwner = function ()
  { return this.owner; };
    
  /* TODO: This method is here because it isn't clear at this time whether more
   * than one bin container will exist going forward. Presently that's not the
   * case and hence it simply returns `options_.nodes.bins'. */
  ControllerBins.prototype.getContainer = function ()
  { return this.owner.getOption("nodes").bins; };


  /**
   * @class
   * */
  var BinBase = function (owner, id, bin)
  {
    this.owner = owner;
    this.id = id;
    this.bin = bin;
  };
  
  BinBase.prototype = {
    owner: null,
    id: null,
    bin: null,
    node: null,
    shortcut: null,

    initialise: function ()
    {
      var self = this,
          parentOwner = self.owner.getOwner();

      (this.node = this.render())
        .attr( {
          'data-scope': 'bin',
          'id': encodeURIComponent(this.id)
        } )
        .on( {
          mouseenter: function () {
            parentOwner.onMouseEnter_(self);
          },
          mouseleave: function () {
            parentOwner.onMouseLeave_();
          },
          click: function () {
            parentOwner.onClick_(self);
          }
        } );

      new Droppable(this.node, {
        classHover: parentOwner.getOption("css").droppableHover,
        scopes: [ 'text-item' ],
        
        drop: function (e) {
          var id = decodeURIComponent(e.dataTransfer.getData('Text')),
              item = parentOwner.getControllers().items.getById(id);

          parentOwner.invoke_("textDroppedInBin", item, self);
          parentOwner.getControllers().items.remove(
            decodeURIComponent(item.getContent().node_id));
        }
      } );

      /* We must defer initialisation of D'n'D because owning object's `bin'
       * attribute will have not yet been set. */
      window.setTimeout(function () {
        new Draggable(self.node, {
          dragstart: function (e) {
            parentOwner.getControllers().dismiss.activate();
          },
          
          dragend: function (e) {
            parentOwner.getControllers().dismiss.deactivate();
          }
        } );
      }, 0);
    },

    /* abstract */ add: function () {
      throw "Abstract method must be implemented";
    },

    /* abstract */ render: function () {
      throw "Abstract method must be implemented";
    },
    
    getId: function ()
    { return this.id; },
    
    setShortcut: function (keyCode)
    {
      this.shortcut = keyCode;

      this.getNodeShortcut().html(String.fromCharCode(keyCode).toLowerCase());
    },

    getShortcut: function ()
    { return this.shortcut; },
    
    getNode: function ()
    { return this.node; },

    /* overridable */ getNodeShortcut: function ()
    { return this.node.find(
      '.'+ this.owner.getOwner().getOption("css").binShortcut); },

    getOwner: function ()
    { return this.owner; }
  };


  /**
   * @class
   * */
  var Bin = function (owner, id, bin)
  {
    /* Invoke super constructor. */
    BinBase.call(this, owner, id, bin);

    this.children = [ ];
  };

  Bin.prototype = Object.create(BinBase.prototype);
    
  Bin.prototype.render = function () {
    /* Wrap bin name inside a DIV. */
    return $('<div class="sd-bin"><div class="sd-bin-shortcut"/>'
             + this.bin.name + '</div>');
  };

  Bin.prototype.getChildren = function () {
    return this.children;
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

  BinGeneric.prototype.add = function () {
    this.initialise(this.render());
    this.owner.add(this);
  };


  /**
   * @class
   * */
  var SubBin = function (owner, id, bin, parent)
  {
    /* Invoke super constructor. */
    BinBase.call(this, owner, id, bin);

    this.parent = parent;
  };

  SubBin.prototype = Object.create(BinBase.prototype);

  SubBin.prototype.render = function () {
    /* Wrap bin statement_text inside a DIV. */
    return $('<div class="sd-bin-sub"><div class="sd-bin-shortcut"/>'
             + this.bin.name + '</div>');
  };

  SubBin.prototype.getParent = function () {
    return this.parent;
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
    this.owner = owner;
    this.container = owner.getOption("nodes").items;
    this.items = [ ];
  };

  ControllerItems.prototype = Object.create(Controller.prototype);

  ControllerItems.prototype.initialise = function ()
  { this.check(); };
  
  ControllerItems.prototype.check = function ()
  {
    if(this.items.length >= this.owner.getOption("visibleItems"))
      return;
    
    var self = this,
        promise = this.owner.invoke_(
          "moreTexts",
          this.owner.getOption("visibleItems") );

    /* Check that our request for more text items hasn't been refused. */
    if(!promise)
      return;
    
    promise.done(function (items) {
      self.owner.onRequestStart_('check-items');

      items.forEach(function (item, index) {
        window.setTimeout( function () {
          self.items.push(new TextItemGeneric(self, item));
        }, Math.pow(index, 2) * 1.1);
      } );

      window.setTimeout( function () {
        self.select();
      }, 10);

      /* Ensure event is fired after the last item is added. */
      window.setTimeout( function () {
        self.owner.onRequestStop_('check-items');
      }, Math.pow(items.length - 1, 2) * 1.1 + 10);

    } );
  };

  ControllerItems.prototype.select = function (variant)
  {
    /* Fail silently if not initialised anymore. This might happen if, for
     * example, the `reset' method was invoked but the component is still
     * loading text items. */
    if(!this.owner.isInitialised())
      return;
    
    var csel = this.owner.getOption("css").itemSelected;
    
    if(!this.container.children().length)
      return;
    
    if(typeof variant == 'undefined') {
      variant = this.container.find('.' + csel);

      if(variant.length == 0)
        variant = this.container.children().eq(0);
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
      else if(variant > this.container.children().length - 1)
        variant = this.container.children().length - 1;

      variant = this.container.children().eq(variant);
    } else if(variant instanceof TextItem)
      variant = variant.getNode();

    this.container.find('.' + csel).removeClass(csel);
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
    var st = this.container.scrollTop(),       /* scrolling top */
        ch = this.container.innerHeight(),     /* container height */
        ipt = variant.position().top,          /* item position top */
        ih = st + ipt + variant.outerHeight(); /* item height */

    if(st + ipt < st            /* top */
       || variant.outerHeight() > ch) {
      this.container.scrollTop(st + ipt);
    } else if(ih > st + ch) {   /* bottom */
      this.container.scrollTop(st + ipt - ch
                               + variant.outerHeight()
                               + parseInt(variant.css('marginBottom'))
                               + parseInt(variant.css('paddingBottom')));
    }
  };

  ControllerItems.prototype.selectOffset = function (offset)
  {
    var csel = this.owner.getOption("css").itemSelected,
        index;

    if(!this.container.length)
      return;
    else if(!this.container.find('.' + csel).length) {
      this.select();
      return;
    }

    index = this.container.find('.' + csel).prevAll().length + offset;

    if(index < 0)
      index = 0;
    else if(index > this.container.children().length - 1)
      index = this.container.children().length - 1;

    this.select(index);
  };

  ControllerItems.prototype.current = function()
  {
    var node = this.container.find(
      '.' + this.owner.getOption("css").itemSelected);
    
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
    
    $.each(this.items, function (i, item) {
      if(item.getContent().node_id != id)
        return true;
      
      if(item.isSelected()) {
        if(i < self.items.length - 1)
          self.select(self.items[i + 1]);
        else if(self.items.length)
          self.select(self.items[i - 1]);
        else
          console.log("No more items available");
      }
      
      item.getNode()
        .css('opacity', 0.6)  /* to prevent flicker */
        .animate( { opacity: 0 },
                  self.owner.getOption("delays").textItemFade,
                  function () {
                    $(this).slideUp(
                      self.owner.getOption("delays").slideItemUp,
                      function () {
                        $(this).remove();
                        self.select();
                      } );
                  } );

      self.items.splice(i, 1);
      result = true;
      
      return false;  
    } );
    
    this.check();

    return result;
  };

  ControllerItems.prototype.getById = function (id)
  {
    var result = null;
    
    this.items.some(function (item) {
      if(item.getContent().node_id == id) {
        result = item;
        return true;
      }

      return false;
    } );

    return result;
  };

  ControllerItems.prototype.getOwner = function ()
  { return this.owner; };


  /**
   * @class
   * */
  var TextItem = function (owner, item)
  {
    this.owner = owner;
    this.content = item;
  };

  TextItem.prototype = {
    owner: null,
    content: null,                /* Note: unlike bins, a text item contains
                                   * its own id. (?) */
    node: null,

    initialise: function() {
      var self = this,
          parentOwner = self.owner.getOwner();

      this.node
        .attr( {
          id: encodeURIComponent(this.content.node_id),
          "data-scope": "text-item"
        } )
        .click(function () {
          self.owner.select(self);
        } );

      this.getNodeClose()
        .click(function () {
          parentOwner.invoke_("textDismissed", self.content);
          parentOwner.remove(decodeURIComponent(self.content.node_id));
          return false;
        } );

      new Draggable(this.node, {
        classDragging: parentOwner.getOption("css").itemDragging,
        
        dragstart: function (e) {
          /* Firstly select item being dragged to ensure correct item position
           * in container. */
          self.owner.select(self);

          /* Activate deletion/dismissal button. */
          parentOwner.getControllers().dismiss.activate();
        },
        
        dragend: function () {
          /* Deactivate deletion/dismissal button. */
          parentOwner.getControllers().dismiss.deactivate();
        }
      } );
    },

    replaceNode: function (newNode) {
      this.node.replaceWith(newNode);
      this.node = newNode;
      this.initialise();
      this.owner.select(this);
    },
    
    /* abstract */ render: function ()
    { throw "Abstract method must be implemented"; },

    getContent: function ()
    { return this.content; },

    getNode: function ()
    { return this.node; },

    /* overridable */ getNodeClose: function ()
    { return this.node.find('.sd-text-item-close'); },

    /* overridable */ getNodeLess: function ()
    { return this.node.find('.sd-less'); },

    /* overridable */ getNodeMore: function ()
    { return this.node.find('.sd-more'); },

    /* overridable */ isSelected: function ()
    { return this.node.hasClass('sd-selected'); }
  };
  
  
  /**
   * @class
   * */
  var TextItemGeneric = function (owner, item)
  {
    /* Fail silently if not initialised anymore. This might happen if, for
     * example, the `reset' method was invoked but the component is still
     * loading text items. */
    if(!owner.getOwner().isInitialised())
      return;

    TextItem.call(this, owner, item);

    this.node = this.render(TextItemGeneric.VIEW_HIGHLIGHTS);
    
    this.initialise();
    owner.getOwner().getOption("nodes").items.append(this.node);
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
      this.content.text,
      TextItemGeneric.VIEW_UNRESTRICTED,
      new TextItemSnippet(this.content.text).canTextBeReduced(
        TextItemGeneric.CHARS_HIGHLIGHTS,
        TextItemGeneric.CHARS_HIGHLIGHTS)
        ? true : null);
  };

  TextItemGeneric.prototype.renderHighlights_ = function ()
  {
    return this.renderHtml_(
      new TextItemSnippet(this.content.text).highlights(
        TextItemGeneric.CHARS_HIGHLIGHTS,
        TextItemGeneric.CHARS_HIGHLIGHTS),
      TextItemGeneric.VIEW_HIGHLIGHTS,
      false);
  };

  TextItemGeneric.prototype.renderHtml_ = function (text, view, less)
  {
    var node = $('<div class="sd-text-item view-' + view + '"/>'),
        content = $('<div class="sd-text-item-content"/>'),
        anchor = this.content.name;

    /* Append title if existent. */
    if(this.content.title)
      anchor += '&ndash; ' + this.content.title;

    node.append('<a class="sd-text-item-title" target="_blank" '
                + 'href="' + this.content.url + '">'
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
    var parentOwner = owner.getOwner();
    
    this.owner = owner;
    this.fnRender = fnRender;
    this.fnAdd = fnAdd;

    var self = this,
        button = this.render()
          .addClass(parentOwner.getOption("css").buttonAdd)
          .on( {
            click: function () {
              self.onAdd();
            }
          } );          

    new Droppable(button, {
      classHover: parentOwner.getOption("css").droppableHover,
      scopes: [ 'text-item' ],
      
      drop: function (e, id) {
        self.onAdd(decodeURIComponent(id));
      }
    } );

    owner.getContainer().append(button);
  };

  BinAddButton.prototype = {
    owner: null,
    fnRender: null,
    fnAdd: null,

    /* overridable */ render: function () {
      return $('<div><span>+</span></div>');
    },
    
    onAdd: function (id) {
      var parentOwner = this.owner.getOwner(),
          options = parentOwner.getOptions();
      
      /* Do not allow entering into concurrent `add' states. */
      if(this.owner.getContainer().find('.' + options.css.binAdding).length)
        return;

      var nodeContent = id ? 'Please wait...'
            : ('<input placeholder="Enter bin description" '
               + 'type="text"/>'),
          node = this.fnRender(nodeContent)
            .addClass(options.css.binAdding)
            .fadeIn(options.delays.addBinShow);

      this.owner.append(node);
      
      if(!id) {
        this.onAddManual(node);
        return;
      }

      var item = parentOwner.getControllers().items.getById(id);

      if(!item) {
        node.remove();
        throw "onAdd: failed to retrieve text item: " + id;
      }

      this.fnAdd(id,
                 new TextItemSnippet(item.getContent().text)
                 .highlights(options.binCharsLeft, options.binCharsRight))
        .always(function () { node.remove(); } );
    },

    onAddManual: function (node) {
      var self = this,
          input = node.find('input');

      input
        .focus()
        .blur(function () {
          if(!this.value) {
            node.fadeOut(self.owner.getOwner().getOption("delays")
                         .addBinShow,
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
    }    
  };


  /**
   * @class@
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
        /* IE requires the following special measure or the primary bin won't
         * accept text-items drops. INSANE. */
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
    this.text = text;
  };

  TextItemSnippet.prototype = {
    text: null,
    
    highlights: function (left, right) {
      var re = /<\s*[bB]\s*[^>]*>/g,
          matcho = re.exec(this.text),
          matchc,
          i, j, skip,
          highlight,
          result;

      if(!matcho)
        return this.condense(left + right);
      
      /* We (perhaps dangerously) assume that a stranded closing tag </B> will
       * not exist before the first opening tag <b>. */
      matchc = /<\s*\/[bB]\s*>/.exec(this.text); /* find end of B tag */

      /* Skip tag, position and extract actual text inside B tag. Use semantic
       * STRONG rather than B tag. */
      i = matcho.index + matcho[0].length;
      highlight = '<STRONG>' + this.text.substr(
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
        + this.text.substr(i < 0 ? 0 : i, matcho.index - i) + highlight;

      /* Set index to the right of the closing B tag and skip at most `right'
       * chars, taking care not to count chars that are part of any HTML tags
       * towards the `right' chars limit. Align to word boundary and add
       * text. */
      i = matchc.index + matchc[0].length;
      skip = this.skip(i, right);
      j = this.indexOfWordRight(skip.index);
      
      result += this.text.substr(i, j - i);

      /* Close stranded opened tags.
       *
       * Note: probably not necessary but since we know about the non-closed
       * tags, why not close them anyway? */
      j = skip.tags.length;
      
      while(j--)
        result += '</' + skip.tags[j] + '>';
      
      /* Append ellipsis at end of result if index not at end of string. */
      if(j < this.text.length - 1)
        result += "&nbsp;[...]";

      /* And Bob's your uncle. */
      return result;
    },

    condense: function (right) {
      var i = this.indexOfWordRight(right),
          result = this.text.substring(0, i);

      if(i < this.text.length - 1)
        result += '&nbsp;[...]';

      return result;
    },

    skip: function (ndx, count) {
      var tags = [ ];

      while(ndx < this.text.length && count) {
        var ch = this.text.charAt(ndx);

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
      var match = /<\s*(\/)?\s*([a-zA-Z]+)\s*[^>]*>/.exec(this.text.substr(ndx));

      if(match) {
        return { index: match.index + ndx + match[0].length,
                 tag: match[1] ? null : match[2] };
      }
      
      return { index: ndx };
    },

    indexOfWordLeft: function (ndx) {
      while(ndx >= 0) {
        if(this.text.charAt(ndx) == ' ')
          return ndx + 1;
        
        --ndx;
      }

      return 0;
    },

    indexOfWordRight: function (ndx) {
      while(ndx < this.text.length && this.text.charAt(ndx) != ' ')
        ++ndx;

      return ndx;
    },

    canTextBeReduced: function (left, right) {
      var reduced = this.highlights(left, right);
      return reduced.length < this.text.length;
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
