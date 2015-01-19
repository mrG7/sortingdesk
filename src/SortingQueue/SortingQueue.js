/**
 * @file Sorting Queue component.
 * @copyright 2014 Diffeo
 *
 * Comments:
 * Uses the `SortingCommon´ component.
 *
 */


/*global $, define */
/*jshint laxbreak:true */


/**
 * The Sorting Queue module.
 *
 * @returns an object containing class constructors.
 * */
var SortingQueue_ = function (window, $, std) {

  /**
   * @class
   * */
  /**
   * Constructor responsible for initialising Sorting Queue.
   *
   * @param   {Object}    opts  Initialisation options (please refer to
   *                            `defaults_' above)
   * @param   {Object}    cbs   Map of all callbacks
   *
   * @param   cbs.moreTexts           Retrieve additional text items.
   * */
  var Sorter = function (opts, cbs)
  {
    this.resetter_ = false;

    /* Allow a jQuery element to be passed in instead of an object containing
     * options. In the case that a jQuery element is detected, it is assumed to
     * be the `nodes.items' element. */
    if(!std.is_obj(opts))
      throw "Invalid or no options map provided";
    else if(std.$.is(opts))
      opts = { container: opts };
    else if(!std.$.is(opts.container))
      throw "Invalid or no container provided";

    /* Allow a function to be passed in instead of an object containing
     * callbacks. In the case that a function is passed in, it is assumed to be
     * the `moreTexts' callback. */
    if(std.is_und(cbs))
      throw "Invalid or no callbacks map provided";
    else if(std.is_fn(cbs))
      cbs = { moreTexts: cbs };
    else if(!std.is_fn(cbs.moreTexts))
      throw "Mandatory `moreTexts' callback missing";

    console.log("Initialising Sorting Queue UI");

    this.options_ = $.extend(true, $.extend(true, {}, defaults_), opts);

    /* Begin instantiating and initialising classes needed. */
    (this.requests_ = new ControllerRequests(this))
      .initialise();
    
    this.constructor_ = new std.Constructor(this.options_.constructors);
    
    this.callbacks_ = new Callbacks(
      $.extend(true, {
        itemDismissed: function() {},
        itemSelected: function() {},
        itemDeselected: function() {},
        onRequestStart: function() {},
        onRequestStop: function() {}
      }, cbs),
      this.requests_);

    this.events_ = new std.Events(
      this,
      [ 'request-start', 'request-stop', 'items-updated', 'item-dismissed',
        'item-deselected', 'item-selected' ]);
  };

  Sorter.prototype = {
    initialised_: false,
    resetter_: false,
    options_: null,
    nodes_: null,
    /* Controllers */
    constructor_: null,
    callbacks_: null,
    events_: null,
    requests_: null,
    dismiss_: null,
    keyboard_: null,
    items_: null,

    /* Getters */
    get initialised ()  { return this.initialised_; },
    get resetting ()    { return !!this.resetter_; },
    get options ()      { return this.options_; },
    get nodes ()        { return this.nodes_; },
    get constructor ()  { return this.constructor_; },
    get callbacks ()    { return this.callbacks_; },
    get events ()       { return this.events_; },
    get requests ()     { return this.requests_; },
    get dismiss ()      { return this.dismiss_; },
    get items ()        { return this.items_; },

    /* Interface */
    initialise: function ()
    {
      if(this.initialised_)
        throw "Sorting Queue component already initialised";

      var self = this,
          finder = new std.NodeFinder('sorting-queue',
                                      this.options_.container);

      /* Find nodes. */
      this.nodes_ = {
        container: finder.root(),
        items: finder.find('items'),
        buttons: {
          dismiss: finder.find('button-dismiss')
        },
        empty: {
          items: finder.find('items-empty')
        }
      };

      (this.dismiss_ = new ControllerButtonDismiss(this))
        .initialise();

      this.dismiss_.register('text-item', function (e, id, scope) {
        var item = self.items.getById(std.Url.decode(id));

        self.events_.trigger("item-dismissed", item.content);
        self.items.remove(item);
      } );

      (this.items_ = new ControllerItems(this))
        .initialise();

      (this.keyboard_ = new ControllerKeyboard(this))
        .initialise();

      this.initialised_ = true;
      console.log("Sorting Queue UI initialised");
    },

    /**
     * Resets the component to a virgin state.
     *
     * @returns {Promise} Returns promise that is fulfilled upon successful
     *                    instance reset. */
    reset: function ()
    {
      var self = this;

      /* + If a reset is already underway, simply return its instance.
       * + Throw an exception if Sorting Queue has just been instantiated and is
       * currently initialising itself. */
      if(this.resetter_)
        return this.resetter_;

      this.resetter_ = new InstanceResetter(this).reset(
        [ this.requests_,
          this.keyboard_,
          this.dismiss_,
          [ this.items_ ]
        ] )
        .done(function () {
          self.options_ = self.callbacks_ = self.events_ = self.items_ = null;
          self.requests_ = self.dismiss_ = self.keyboard_ = null;

          self.initialised_ = false;

          console.log("Sorting Queue UI reset");
        } )
        .always(function () {
          self.resetter_ = false;
        } );

      return this.resetter_;
    }
  };


  /**
   * @class
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
        if(std.is_arr(e))
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
        if(std.is_arr(e)) {
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
          if(result && result.hasOwnProperty('always')) {
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
   * @class
   * */
  var Callbacks = function (callbacks, requests)
  {
    /* invoke super constructor. */
    std.Callbacks.call(this, callbacks);

    /* Attributes */
    this.requests_ = requests;
  };

  Callbacks.prototype = Object.create(std.Callbacks.prototype);

  Callbacks.prototype.onPostCall = function (name, result)
  {
    if(std.like_obj(result) && result.hasOwnProperty('always')) {
      this.requests_.begin(name);

      var self = this;
      result.always(function () {
        self.requests_.end(name);
      } );
    }

    return result;
  };


  /**
   * @class
   * */
  var ControllerRequests = function (owner)
  {
    /* invoke super constructor. */
    std.Controller.call(this, owner);

    /* Set initial state. */
    this.requests_ = { };
    this.count_ = 0;

    /* Define getters. */
    this.__defineGetter__("count", function () { return this.count_; } );
  };

  ControllerRequests.prototype = Object.create(std.Controller.prototype);

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

    /* Trigger request start. */
    this.owner_.events.trigger("request-start", id);
  };

  ControllerRequests.prototype.end = function (id)
  {
    if(this.requests_.hasOwnProperty(id)) {
      /* Delete request from internal collection if last one, otherwise
       * decrement reference count. */
      if(this.requests_[id] === 1)
        delete this.requests_[id];
      else if(this.requests_[id] > 1)
        --this.requests_[id];
      else
        throw "Requests controller in invalid state";

      --this.count_;
    } else
      console.log("WARNING: unknown request ended:", id);

    /* Trigger request end. */
    this.owner_.events.trigger("request-stop", id);
  };


  /**
   * @class
   * */
  var ControllerKeyboard = function (owner)
  {
    /* Invoke super constructor. */
    std.ControllerGlobalKeyboard.call(this, owner);
  };

  ControllerKeyboard.prototype =
    Object.create(std.ControllerGlobalKeyboard.prototype);

  ControllerKeyboard.prototype.onKeyUp = function (evt)
  {
    var self = this,
        options = this.owner_.options;

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

      var sel = this.owner_.items.selected();
      if(sel) {
        this.owner_.events.trigger("item-dismissed", sel.content);
        this.owner_.items.remove();
      }
      
      break;

    default:
      return;
    }

    return true;
  };


  /**
   * @class
   * */
  var ControllerButtonDismiss = function (owner)
  {
    /* Invoke super constructor. */
    std.Controller.call(this, owner);

    /* Attributes */
    this.handlers_ = null;
  };

  ControllerButtonDismiss.prototype = Object.create(std.Controller.prototype);

  ControllerButtonDismiss.prototype.droppable_ = null;
  ControllerButtonDismiss.prototype.handlers_ = null;

  ControllerButtonDismiss.prototype.initialise = function ()
  {
    var self = this;

    this.handlers_ = new std.Events([ ]);
    this.droppable_ = new std.Droppable(this.owner_.nodes.buttons.dismiss, {
      classHover: this.owner_.options.css.droppableHover,
      scopes: [ ],

      drop: function (e, id, scope) {
        if(self.handlers_.exists(scope)) {
          self.handlers_.trigger(scope, e, id, scope);
        } else {
          console.log("Warning: unknown scope: " + scope);
          return;
        }

        self.deactivate();

        return false;
      }
    } );
  };

  ControllerButtonDismiss.prototype.reset = function ()
  {
    this.owner_.nodes.buttons.dismiss.off();
    this.handlers_ = this.droppable_ = null;
  };

  ControllerButtonDismiss.prototype.register = function (scope, handler)
  {
    if(this.droppable_ === null)
      return;

    if(!this.handlers_.exists(scope)) {
      this.handlers_.add(scope);
      this.droppable_.add(scope);
    }

    this.handlers_.register(scope, handler);
  };

  ControllerButtonDismiss.prototype.unregister = function (scope, handler)
  {
    if(this.droppable_ === null)
      return;
    
    var count = this.handlers_.count(scope);

    if(count > 0) {
      if(this.handlers_.unregister(scope, handler)) {
        if(count === 1) {
          this.handlers_.remove(scope);
          this.droppable_.remove(scope);
        }
      }
    }
  };

  ControllerButtonDismiss.prototype.activate = function (callback)
  {
    this.owner_.nodes.buttons.dismiss.stop().fadeIn(
      this.owner_.options.delays.dismissButtonShow,
      std.is_fn(callback) ? callback : null);
  };

  ControllerButtonDismiss.prototype.deactivate = function ()
  {
    this.owner_.nodes.buttons.dismiss.stop().fadeOut(
      this.owner_.options.delays.dismissButtonHide);
  };


  /**
   * @class
   * */
  var ControllerItems = function (owner)
  {
    /* Invoke super constructor. */
    std.Controller.call(this, owner);

    this.node_ = this.owner_.nodes.items;
    this.items_ = [ ];
    this.fnDisableEvent_ = function (e) { return false; };

    /* Define getters. */
    this.__defineGetter__("items", function () { return this.items_; } );
  };

  ControllerItems.prototype = Object.create(std.Controller.prototype);

  ControllerItems.prototype.initialise = function ()
  {
    /* Disallow dragging of elements over items container. */
    this.node_.on( {
      dragover: this.fnDisableEvent_
    } );

    if(this.owner_.options.loadItemsAtStartup)
      this.check();
    else
      this.updateEmptyNotification_();
  };

  ControllerItems.prototype.reset = function ()
  {
    /* Reallow dragging of elements over items container. */
    this.node_.off( {
      dragover: this.fnDisableEvent_
    } );

    this.owner_.nodes.empty.items.hide();

    this.removeNodes_();
    this.node_ = this.items_ = this.fnDisableEvent_ = null;
  };

  ControllerItems.prototype.redraw = function ()
  {
    this.removeNodes_();
    this.items_ = [ ];
    this.check();
  };

  // Returns a de-duped `items`.
  // This includes de-duping with respect to items currently in the queue.
  ControllerItems.prototype.dedupItems = function(items) {
    var seen = {},
        deduped = [];
    for (var i = 0; i < this.items.length; i++) {
      seen[this.items[i].content.node_id] = true;
    }
    for (var i = 0; i < items.length; i++) {
      var id = items[i].node_id;
      if (!seen[id]) {
        seen[id] = true;
        deduped.push(items[i]);
      }
    }
    return deduped;
  };

  ControllerItems.prototype.check = function ()
  {
    if(this.items_.length >= this.owner_.options.visibleItems)
      return;

    var self = this;

    this.updateEmptyNotification_(true);
    this.owner_.callbacks.invoke("moreTexts",
                                 this.owner_.options.visibleItems)
      .done(function (items) {
        self.owner_.requests.begin('check-items');

        /* Ensure we've received a valid items array. */
        if(!std.is_arr(items))
          throw "Invalid or no items array";

        items = self.dedupItems(items);

        items.forEach(function (item, index) {
          window.setTimeout( function () {
            self.items_.push(
              self.owner_.constructor.instantiate('Item', self, item));
          }, Math.pow(index, 2) * 1.1);
        } );

        window.setTimeout( function () {
          self.select();
        }, 10);
        
        /* Ensure event is fired after the last item is added. */
        window.setTimeout( function () {
          self.owner_.requests.end('check-items');
          self.owner_.events.trigger('items-updated', self.items_.length);
          self.updateEmptyNotification_();
        }, Math.pow(items.length - 1, 2) * 1.1 + 10);
      } )
      .fail(function () {
        self.updateEmptyNotification_();
      } );
  };

  ControllerItems.prototype.select = function (variant)
  { this.select_(variant); };

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

    return this.getById(std.Url.decode(node.attr('id')));
  };

  ControllerItems.prototype.removeAll = function(check /* = true */) {
    this.removeNodes_();
    this.items_ = [];

    if(std.is_und(check) || check === true)
      this.check();
    else
      this.updateEmptyNotification_();

    this.owner_.events.trigger('items-updated', 0);
  };

  ControllerItems.prototype.remove = function (item)
  {
    if(std.is_und(item)) {
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
      throw "Invalid item index: " + index;

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
    this.owner_.events.trigger('items-updated', 0);

    return true;
  };

  ControllerItems.prototype.getByNode = function($node) {
    return this.getById(std.Url.decode($node.attr('id')));
  };

  ControllerItems.prototype.getById = function (id)
  {
    var result = null;

    this.items_.some(function (item) {
      if(item.content.node_id === id) {
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

  /* Private methods */
  ControllerItems.prototype.select_ = function (variant,
                                                /* optional */ ev)
  {
    /* Fail silently if not initialised anymore. This might happen if, for
     * example, the `reset' method was invoked but the component is still
     * loading text items. */
    if(!this.owner_.initialised)
      return;

    var csel = this.owner_.options.css.itemSelected;

    if(!this.node_.children().length)
      return;

    if(std.is_und(variant)) {
      variant = this.node_.find('.' + csel);

      if(variant.length === 0)
        variant = this.node_.children().eq(0);
      else if(variant.length > 1) {
        /* We should never reach here. */
        console.log("WARNING! Multiple text items selected:", variant.length);

        variant = variant.eq(0);
      }
    } else if(std.is_num(variant)) {
      if(variant < 0)
        variant = 0;
      else if(variant > this.node_.children().length - 1)
        variant = this.node_.children().length - 1;

      variant = this.node_.children().eq(variant);
    } else if(variant instanceof Item)
      variant = variant.node;

    /* Select next item (if any), making sure currently active item (if any) is
     * deselected. */
    var current = this.getNodeSelected(),
        next = this.getByNode(variant);

    if(current.length)
      this.getByNode(current).deselect();

    if(next)
      next.select_(ev);

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

  ControllerItems.prototype.updateEmptyNotification_ = function (loading)
  {
    this.owner_.nodes.empty.items.stop();
    if(loading !== true && this.items.length === 0) {
      this.owner_.nodes.empty.items.fadeIn(
        this.owner_.options.delays.queueEmptyFadeIn);
    } else {
      this.owner_.nodes.empty.items.fadeOut(
        this.owner_.options.delays.queueEmptyFadeOut);
    }      
  };

  ControllerItems.prototype.removeNodes_ = function ()
  {
    this.items_.forEach(function (item) { item.node.remove(); } );
  };    


  /**
   * @class
   * */
  var Item = function (owner, item)
  {
    /* Fail silently if not initialised anymore. This might happen if, for
     * example, the `reset' method was invoked but the component is still
     * loading text items. */
    if (!owner.owner.initialised) {
        return;
    }

    /* Invoke super constructor. */
    std.Drawable.call(this, owner);

    this.content_ = item;
    this.node_ = null;

    /* Define getters. */
    this.__defineGetter__("content", function () { return this.content_; } );
    this.__defineGetter__("node", function () { return this.node_; } );

    this.node_ = this.render();
    this.initialise();
    owner.owner.nodes.items.append(this.node_);
  };

  Item.prototype = Object.create(std.Drawable.prototype);

  Item.prototype.initialise = function()
  {
    var self = this,
        parentOwner = this.owner_.owner;

    this.node_
      .attr( {
        id: std.Url.encode(this.content_.node_id),
        "data-scope": "text-item"
      } )
      .click(function (ev) {
        self.owner_.select_(self, ev);
      } );

    this.getNodeClose()
      .click(function () {
        parentOwner.events.trigger("item-dismissed", self.content_);
        self.owner_.remove(self);
        return false;
      } );

    /* Do not set up drag and drop on the item if not supposed to. */
    if(!parentOwner.options.itemsDraggable)
      return;

    new std.Draggable(this.node_, {
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

  Item.prototype.replaceNode = function (newNode)
  {
      this.node_.replaceWith(newNode);
      this.node_ = newNode;
      this.initialise();
      this.owner_.select(this);
  };

  Item.prototype.deselect = function() {
    this.node.removeClass(this.owner_.owner.options.css.itemSelected);
    this.owner_.owner.events.trigger("item-deselected", this.content);
  };

  Item.prototype.render = function() {
    var css = this.owner_.owner.options.css,
        node = $('<div class="' + css.item + '"/>'),
        content = $('<div class="' + css.itemContent + '"/>'),
        anchor = this.content_.name;

    /* Append title if existent. */
    if (this.content_.title)
      anchor += '&ndash; ' + this.content_.title;

    if(this.content_.url && anchor) {
      node.append('<a class="' + css.itemTitle + '" target="_blank" '
                  + 'href="' + this.content_.url + '">'
                  + anchor + '</a>');
    }

    node.append('<a class="' + css.itemClose + '" href="#">x</a>');

    /* Append content and remove all CSS classes from children. */
    content.append(this.content_.text);
    content.children().removeClass();
    node.append(content);
    return node;
  };

  /* Not mandatory. */
  /* overridable */
  Item.prototype.getNodeClose = function() {
    return this.node_.find('.' + this.owner_.owner.options.css.itemClose);
  };

  /* overridable */ Item.prototype.isSelected = function ()
  { return this.node_.hasClass(this.owner_.owner.options.css.itemSelected); };

  /* Private methods */
  Item.prototype.select_ = function (ev) {
    this.node.addClass(this.owner_.owner.options.css.itemSelected);
    this.owner_.owner.events.trigger("item-selected", this.content, ev);
  };


  /* ----------------------------------------------------------------------
   *  Default options
   *  Private attribute.
   * ---------------------------------------------------------------------- */
  var defaults_ = {
    css: {
      item: 'sd-text-item',
      itemContent: 'sd-text-item-content',
      itemTitle: 'sd-text-item-title',
      itemClose: 'sd-text-item-close',
      itemSelected: 'sd-selected',
      itemDragging: 'sd-dragging'
    },
    keyboard: {                 /* Contains scan codes. */
      listUp: 38,               /* up                   */
      listDown: 40,             /* down                 */
      listDismiss: 46           /* dismiss              */
    },
    delays: {                   /* In milliseconds.     */
      animateAssign: 75,        /* Duration of assignment of text item via
                                 * shortcut. */
      slideItemUp: 150,         /* Slide up length of deleted text item. */
      textItemFade: 100,        /* Fade out duration of text item after
                                 * assignment. */
      queueEmptyFadeIn: 250,
      queueEmptyFadeOut: 100
    },
    constructors: {
      Item: Item
    },
    visibleItems: 20,           /* Arbitrary.           */
    binCharsLeft: 25,
    binCharsRight: 25,
    itemsDraggable: true,
    loadItemsAtStartup: true    
  };


  /**
   * Module public interface. */
  return {
    /* SortingQueue proper */
    Sorter: Sorter,
    Item: Item
  };

};


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("SortingQueue", [ "jquery", "SortingCommon" ], function ($, std) {
    return SortingQueue_(window, $, std);
  });
} else
  window.SortingQueue = SortingQueue_(window, $, SortingCommon);
