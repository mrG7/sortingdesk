/**
 * @file Sorting Queue component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingCommon´ component.
 *
 */


/*global $, define */
/*jshint laxbreak:true */


(function (factory, root) {

  /* Compatibility with RequireJs. */
  if(typeof define === "function" && define.amd) {
    define("SortingQueue", [ "jquery", "SortingCommon" ], function ($, std) {
      return factory(root, $, std);
    });
  } else
    window.SortingQueue = factory(root, $, SortingCommon);

} )(function (window, $, std) {

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

    /* Ensure visible items setting > 0. */
    if(this.options_.items.visible < 1) {
      console.info("Invalid visible items setting: < 1");
      this.options_.items.visible = 1;
    }

    /* Begin instantiating and initialising classes needed. */
    (this.async_ = new ControllerAsync(this))
      .initialise();

    this.constructor_ = new std.Constructor(this.options_.constructors);
    this.callbacks_ = new Callbacks(cbs, this.async_);

    this.events_ = new std.Events(
      this,
      [ 'request-begin', 'request-end', 'items-updated', 'item-dismissed',
        'item-deselected', 'item-selected', 'loading-begin', 'loading-end',
        'pre-render' ]);
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
    async_: null,
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
    get async ()        { return this.async_; },
    get dismiss ()      { return this.dismiss_; },
    get items ()        { return this.items_; },

    /* Interface */
    initialise: function ()
    {
      if(this.initialised_)
        throw "Sorting Queue component already initialised";

      var self = this,
          finder = new std.NodeFinder('data-sd-scope',
                                      'sorting-queue',
                                      this.options_.container);

      /* Find nodes. */
      this.nodes_ = {
        container: finder.root,
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

      (this.items_ = new ControllerItems(this))
        .initialise();

      (this.keyboard_ = new ControllerKeyboard(this))
        .initialise();

      this.initialised_ = true;
      console.info("Sorting Queue UI initialised");
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
        [ this.async_,
          this.keyboard_,
          this.dismiss_,
          [ this.items_ ]
        ] )
        .done(function () {
          self.options_ = self.callbacks_ = self.events_ = self.items_ = null;
          self.async_ = self.dismiss_ = self.keyboard_ = null;

          self.initialised_ = false;

          console.info("Sorting Queue UI reset");
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
            console.error('Exception thrown whilst resetting:', x);
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
  var Callbacks = function (callbacks, async)
  {
    /* invoke super constructor. */
    std.Callbacks.call(this, callbacks);

    /* Attributes */
    this.async_ = async;
  };

  Callbacks.prototype = Object.create(std.Callbacks.prototype);

  Callbacks.prototype.onPostCall = function (name, result)
  {
    if(std.like_obj(result) && result.hasOwnProperty('always')) {
      this.async_.begin(name);

      var self = this;
      result.always(function () {
        self.async_.end(name);
      } );
    }

    return result;
  };


  /**
   * @class
   * */
  var ControllerAsync = function (owner)
  {
    /* invoke super constructor. */
    std.Controller.call(this, owner);

    /* Set initial state. */
    this.async_ = { };
    this.count_ = 0;

    /* Define getters. */
    this.__defineGetter__("count", function () { return this.count_; } );
  };

  ControllerAsync.prototype = Object.create(std.Controller.prototype);

  ControllerAsync.prototype.initialise = function () {  };
  ControllerAsync.prototype.reset = function ()
  {
    var self = this,
        deferred = $.Deferred(),
        interval;

    /* Don't signal state reset until all async processes finished. */
    interval = window.setInterval(function () {
      if(self.count_)
        return;

      window.clearInterval(interval);
      deferred.resolve();
    }, 10);

    return deferred.promise();
  };

  ControllerAsync.prototype.begin = function (id)
  {
    if(!this.async_[id])
      this.async_[id] = 1;
    else
      ++this.async_[id];

    ++this.count_;

    /* Trigger request start. */
    this.owner_.events.trigger("request-begin", id);
  };

  ControllerAsync.prototype.end = function (id)
  {
    if(this.async_.hasOwnProperty(id)) {
      /* Delete async process from internal collection if last one, otherwise
       * decrement reference count. */
      if(this.async_[id] === 1)
        delete this.async_[id];
      else if(this.async_[id] > 1)
        --this.async_[id];
      else
        throw "Async controller in invalid state";

      --this.count_;
    } else
      console.warn("Unknown request ended:", id);

    /* Trigger request end. */
    this.owner_.events.trigger("request-end", id);
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
      if(sel)
        this.owner_.items.dismiss(sel);

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
      classHover: Css.dnd.droppable.hover,
      scopes: [ ],

      drop: function (e, id, scope) {
        if(self.handlers_.exists(scope)) {
          self.handlers_.trigger(scope, e, id, scope);
        } else {
          console.warn("Unknown scope: " + scope);
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
      return false;

    if(!this.handlers_.exists(scope)) {
      this.handlers_.add(scope);
      this.droppable_.add(scope);
    }

    return this.handlers_.register(scope, handler);
  };

  ControllerButtonDismiss.prototype.unregister = function (scope, handler)
  {
    var count = this.handlers_.count(scope);

    if(this.droppable_ !== null && count > 0) {
      if(this.handlers_.unregister(scope, handler)) {
        if(count === 1) {
          this.handlers_.remove(scope);
          this.droppable_.remove(scope);
        }
      }

      return true;
    }

    return false;
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

    this.node_ = owner.nodes.items;
    this.items_ = [ ];
    this.loading_ = false;
    this.fnDisableEvent_ = function (e) { return false; };
  };

  ControllerItems.prototype = Object.create(std.Controller.prototype);

  ControllerItems.prototype.initialise = function ()
  {
    var self = this;

    /* Register for `text-items´ scope events. */
    this.owner_.dismiss.register('text-item', function (e, id, scope) {
      self.dismiss(self.getById(std.Url.decode(id)));
    } );

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
    /* Unregister ALL `text-item´ scope events. */
    this.owner_.dismiss.unregister('text-item');

    /* Reallow dragging of elements over items container. */
    this.node_.off( {
      dragover: this.fnDisableEvent_
    } );

    this.owner_.nodes.empty.items.hide();

    this.removeNodes_();
    this.node_ = this.items_ = this.fnDisableEvent_ = null;
  };

  ControllerItems.prototype.refresh = function ()
  {
    this.removeAll(true);
  };

  ControllerItems.prototype.redraw = function ()
  {
    for (var i = 0, l = this.items_.length, c = 0; i < l; ++i) {
      var it = this.items_[i];
      if(this.owner_.callbacks.invokeMaybe('filter', it.content) === false)
        it.disable();
      else {
        ++ c;
        it.enable();
      }
    }

    this.owner_.events.trigger('items-updated', c);
    this.updateEmptyNotification_();
    this.select();
  };

  ControllerItems.prototype.count = function ()
  {
    var c = 0;

    for (var i = 0, l = this.items_.length; i < l; ++i) {
      if(this.items_[i].enabled) ++c;
    }

    return c;
  };

  // Returns a de-duped `items`.
  // This includes de-duping with respect to items currently in the queue.
  ControllerItems.prototype.dedup = function(items)
  {
    var seen = {}, deduped = [];

    for (var i = 0, l = items.length; i < l; ++i) {
      var j = items[i], id = j.node_id;
      if (!seen.hasOwnProperty(id)) {
        seen[id] = true; deduped.push(j);
      }
    }

    return deduped;
  };

  ControllerItems.prototype.check = function ()
  {
    if(this.loading_) {
      console.info("check: ignoring: currently loading");
      return;
    } else if(this.items_.length >= this.owner_.options.items.visible)
      return;

    var self = this,
        end_ = function () {
          self.owner_.async.end('check-items');
          self.owner_.events.trigger('loading-end');
          self.updateEmptyNotification_();
          self.loading_ = false;
        };

    this.loading_ = true;
    this.updateEmptyNotification_(true);
    this.owner_.events_.trigger('loading-begin');
    this.owner_.callbacks.invoke("moreTexts",
                                 this.owner_.options.items.visible)
      .done(function (data) {
        /* Rendering of items is asynchronous, which means we need to manually
         * begin an async process. */
        self.owner_.async.begin('check-items');

        /* Trigger event 'pre-render' to signal that we've received data and
         * are about to render items. */
        self.owner_.events.trigger('pre-render', data);

        /* We're only using the actual search results, which are found in the
         * `results´ property. */
        data = data.results;

        /* Ensure we've received a valid items array. */
        if(!std.is_arr(data)) {
          console.error("Invalid or no results array");
          end_();
          return;
        }

        /* Now drop duplicates and render each item. */
        self.dedup(data).forEach(function (item, index) {
          window.setTimeout( function () {
            /* Only continue adding items if the owning Sorting Queue is still
             * in an `initialised´ state. Given the asynchronous nature of this
             * method, it might be the case that the owning instance might have
             * been issued a reset, in which case no more items are to be
             * loaded. */
            if(!self.owner_.initialised) return;

            var inst = self.owner_.constructor.instantiate('Item', self, item);
            self.items_.push(inst);
            if(self.owner_.callbacks.invokeMaybe('filter', item) === false)
              inst.disable();
          }, Math.pow(index, 2) * 1.1);
        } );

        window.setTimeout( function () { self.select(); }, 10);

        /* Ensure event is fired after the last item is added. */
        window.setTimeout( function () {
          end_();
          self.owner_.events.trigger('items-updated', self.count());
        }, Math.pow(data.length - 1, 2) * 1.1 + 10);
      } )
      .fail(function () {
        end_();
      } );
  };

  ControllerItems.prototype.select = function (variant)
  { this.select_(variant); };

  ControllerItems.prototype.selectOffset = function (offset)
  {
    var csel = Css.item.selected,
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

  ControllerItems.prototype.dismiss = function (item)
  {
    var self = this,
        p = this.owner_;

    if(!(item instanceof Item))
      throw "Invalid or no Item reference specified";
    else if(item.dismissing)
      throw "Already dismissing item: #" + item.content.node_id;

    if(p.constructor.exists('ItemDismissal')) {
      item.dismissing = p.constructor.instantiate('ItemDismissal', item);
    } else {
      this.owner_.events.trigger("item-dismissed", item.content);
      this.remove(item);
    }
  };

  ControllerItems.prototype.removeAll = function(check /* = true */)
  {
    this.removeNodes_();

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
                    self.owner_.options.delays.slideItem,
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

  ControllerItems.prototype.getByNode = function($node)
  {
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
    return this.node_.find('.' + Css.item.selected);
  };

  /* Private methods */
  ControllerItems.prototype.select_ = function (variant,
                                                /* optional */ ev)
  {
    var csel = Css.item.selected;

    if(this.node_.children().length === 0)
      return;

    if(std.is_und(variant)) {
      variant = this.node_.find('.' + csel);

      if(variant.length === 0)
        variant = this.node_.children().eq(0);
      else if(variant.length > 1) {
        /* We should never reach here. */
        console.warn("Multiple text items selected:", variant.length);

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

    if(st + ipt < st || variant.outerHeight() > ch)
      this.node_.scrollTop(st + ipt);
    else if(ih > st + ch) {   /* bottom */
      this.node_.scrollTop(st + ipt - ch
                           + variant.outerHeight()
                           + parseInt(variant.css('marginBottom'))
                           + parseInt(variant.css('paddingBottom')));
    }
  };

  ControllerItems.prototype.updateEmptyNotification_ = function (loading)
  {
    this.owner_.nodes.empty.items.stop();
    if(loading !== true && this.count() === 0) {
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
    this.items_ = [];
  };


  /**
   * @class
   * */
  var Item = function (owner, item)
  {
    /* Invoke super constructor. */
    std.Drawable.call(this, owner);

    this.content_ = item;
    this.node_ = null;
    this.dismissing_ = false;
    this.enabled_ = false;

    /* Getters */
    this.__defineGetter__("content", function () { return this.content_; } );
    this.__defineGetter__("node", function () { return this.node_; } );
    this.__defineGetter__("dismissing", function ()
                          { return this.dismissing_; } );
    this.__defineGetter__("enabled", function () {return this.enabled_;});

    /* Setters */
    this.__defineSetter__("dismissing", function (state)
                          { this.dismissing_ = state; } );

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
        if(ev.originalEvent.target.nodeName.toLowerCase() !== 'a')
          self.owner_.select_(self, ev);
      } );

    this.getNodeClose()
      .click(function () {
        self.owner_.dismiss(self);
        return false;
      } );

    /* Do not set up drag and drop on the item if not supposed to. */
    if(!parentOwner.options.items.draggable)
      return;

    new std.Draggable(this.node_, {
      classDragging: Css.item.dragging,

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

  Item.prototype.deselect = function()
  {
    this.node.removeClass(Css.item.selected);
    this.owner_.owner.events.trigger("item-deselected", this.content);
  };

  Item.prototype.render = function()
  {
    var node = $('<div class="' + Css.item.container + '"/>'),
        content = $('<div class="' + Css.item.content + '"/>'),
        anchor = this.content_.name;

    /* Append title if existent. */
    if (this.content_.title)
      anchor += '&ndash; ' + this.content_.title;

    if(this.content_.url && anchor) {
      node.append('<a class="' + Css.item.title + '" target="_blank" '
                  + 'href="' + this.content_.url + '">'
                  + anchor + '</a>');
    }

    node.append('<a class="' + Css.item.close + '" href="#">x</a>');

    /* Append content and remove all CSS classes from children. */
    content.append(this.content_.text);
    content.children().removeClass();
    node.append(content);
    return node;
  };

  Item.prototype.enable = function ()
  { this.setEnabled_(true); }

  Item.prototype.disable = function ()
  { this.setEnabled_(false); }

  /* Not mandatory. */
  /* overridable */
  Item.prototype.getNodeClose = function()
  {
    return this.node_.find('.' + Css.item.close);
  };

  /* overridable */ Item.prototype.isSelected = function ()
  { return this.node_.hasClass(Css.item.selected); };

  /* Private methods */
  Item.prototype.select_ = function (ev)
  {
    this.node.addClass(Css.item.selected);
    this.owner_.owner.events.trigger("item-selected", this.content, ev);
  };

  Item.prototype.setEnabled_ = function (state)
  {
    if(this.node_ === null) throw "Invalid or no item node";
    this.node_.css('display', state !== false ? 'block' : 'none');
    this.enabled_ = state !== false;
  };


  /**
   * @class
   * */
  var ItemDismissal = function (item, options)
  {
    /* Input validation */
    if(!(item instanceof Item))
      throw "Invalid or no item reference specified";
    else if(!std.is_obj(options))
      throw "Invalid or empty options object specified";

    /* Invoke super constructor. */
    std.Drawable.call(this, item);

    /* Attributes */
    this.options_ = $.extend({ }, ItemDismissal.defaults, options);
    this.node_ = null;
    this.events_ = new std.Events(this, [ 'dismissed' ] );
    this.timer_ = null;
    this.resetHtml_ = null;

    /* Getters */
    this.__defineGetter__("node", function () { return this.node_; } );

    /* Initialisation */
    this.initialise();
  };

  ItemDismissal.defaults = {
    delayTimedDismissal: 5,
    delayFade: 100,
    closeIsChoice: true
  };

  ItemDismissal.prototype = Object.create(std.Drawable.prototype);

  ItemDismissal.prototype.initialise = function ()
  {
    var self = this;

    if(this.events_ === null)
      throw "Instance already reset";

    this.render();

    /* Remove close button if requested to do so */
    if(this.options_.closeIsChoice === true) {
      /* Set tooltip on button close, if requested. */
      if(std.is_str(this.options_.tooltipClose)) {
        this.owner_.getNodeClose().attr('title',
                                        this.options_.tooltipClose);
      }

      /* Attach handler to click event. */
      this.owner_.getNodeClose()
        .off()
        .click(function (ev) {
          self.dismiss_(null);
        } );
    } else
      this.owner_.getNodeClose().remove();

    this.owner_.owner.select(this.owner_);

    if(!std.$.is(this.node_))
      throw "Item dismissal node not created";

    this.node_.click(function (ev) {
      ev.preventDefault();
      ev = ev.originalEvent;

      var target = $(ev.target);
      if(!target.hasClass(Css.dismissal.option))
        return false;

      self.dismiss_(target.data('id'));
      return false;
    } );

    var delay = this.options_.delayTimedDismissal;
    if(!std.is_num(delay) || delay <= 0)
      return;

    this.owner_.node_.on( {
      mouseenter: function (ev) {
        if(self.timer_ !== null)
          window.clearTimeout(self.timer_);
      },
      mouseleave: function (ev) {
        /* Ensure reset hasn't been invoked meanwhile. */
        if(self.node_ === null)
          return;

        self.timer_ = window.setTimeout(function () {
          self.timer_ = null;
          self.dismiss_(null);
        }, self.options_.delayTimedDismissal * 1000);
      }
    } );
  };

  /** Set the reset HTML.  Currently, dismissal events are not reversible.
   * Whenever the user initiates a dismissal event, it will always result in the
   * user having to make a choice and consequently the handling `ItemDismissal´
   * instance being reset.  This method allows for custom HTML to be assigned to
   * the owning item instance on instance reset.  Useful to show a "loading" or
   * "processing" message, for instance.
   *
   * @param {string} html The HTML to assign at reset time. */
  ItemDismissal.prototype.setResetHtml = function (html)
  {
    this.resetHtml_ = html;
  };

  ItemDismissal.prototype.reset = function ()
  {
    if(this.timer_)
      window.clearTimeout(self.timer_);

    this.node_.off();
    this.node_.remove();
    this.node_ = this.options_ = this.events_ = this.dismissing_ = null;
    this.timer_ = null;

    /* Change the owning item's HTML to the set in `resetHtml_´, if any. */
    if(this.resetHtml_ !== null)
      this.owner_.node.html(this.resetHtml_);
  };

  ItemDismissal.prototype.render = std.absm_noti;

  ItemDismissal.prototype.brief = function ()
  {
    var text = this.owner_.node.find(
      ':not(IFRAME):not(.' + Css.item.close + ')')
          .addBack().contents()
          .filter(function() {
            return this.nodeType == 3;
          });

    return text.length > 0 ? $(text[0]).text() : null;
  };

  /* Private interface */
  ItemDismissal.prototype.dismiss_ = function (id)
  {
    this.events_.trigger('dismissed', id, this.owner_.content);
    this.reset();
  };


  /**
   * @class
   * */
  var ItemDismissalReplace = function (item, options)
  {
    ItemDismissal.call(this, item, options);
  };

  ItemDismissalReplace.prototype = Object.create(ItemDismissal.prototype);

  ItemDismissalReplace.prototype.render = function ()
  {
    var self = this,
        el = this.owner_.node,
        choices = this.options_.choices,
        brief = self.brief();

    var co, ci;
    if(std.is_arr(choices) && choices.length > 0) {
      co = $('<table/>').addClass(Css.dismissal.containers.options);

      for(var i = 0, l = choices.length; i < l; ++i) {
        var o = choices[i];

        if(i % 2 === 0)
          ci = $('<tr/>').appendTo(co);

        $([ '<button',
            '" data-id="', o.id, '">', o.title, '</button>' ]
          .join(''))
          .addClass(Css.dismissal.option)
          .appendTo($('<td/>').appendTo(ci));
      }
    } else
      co = $();

    this.node_ = $([ '<div class="', Css.dismissal.containers.main,
                     '"></div>' ]
                   .join('')).addClass(Css.dismissal.context.replace);

    this.append_not_empty_('question');
    this.append_not_empty_('description');
    this.node_.append(co);

    if(brief) {
      this.node_.append($(['<p>', brief, '</p>'].join(''))
                        .addClass(Css.dismissal.brief));
    }

    el.fadeOut(this.options_.delayFade, function () {

      el.children().not(self.owner.getNodeClose()).remove();
      el.append(self.node_);
      el.addClass(Css.dismissal.dismissing);

      el.fadeIn(self.options_.delayFade);
    } );
  };

  /* Private interface */
  ItemDismissalReplace.prototype.append_not_empty_ = function (
    attr,
    cssClass /* == null ? attr : cssClass */)
  {
    var s = this.options_[attr];
    if(!std.is_str(s)) return;

    s = s.trim();
    if(s.length === 0) return;

    this.node_.append($(['<p>', s, '</p>'].join(''))
                      .addClass(Css.dismissal[cssClass || attr]));
  };


  /**
   * @class
   * */
  var ItemDismissalReplaceTight = function (item, options)
  {
    ItemDismissalReplace.call(this, item, options);
  };

  ItemDismissalReplaceTight.prototype = Object.create(
    ItemDismissalReplace.prototype);

  ItemDismissalReplaceTight.prototype.render = function ()
  {
    var self = this,
        el = this.owner_.node,
        choices = this.options_.choices,
        brief = self.brief();

    var co, ci;
    if(std.is_arr(choices) && choices.length > 0) {
      co = $('<table/>').addClass(Css.dismissal.containers.options);

      for(var i = 0, l = choices.length; i < l; ++i) {
        var o = choices[i];

        if(i % 2 === 0)
          ci = $('<tr/>').appendTo(co);

        $([ '<button',
            '" data-id="', o.id,
            '" title="', o.tooltip || '',
            '">', o.title, '</button>' ]
          .join(''))
          .addClass(Css.dismissal.option)
          .appendTo($('<td/>').appendTo(ci));
      }
    } else
      co = $();

    this.node_ = $([ '<div class="', Css.dismissal.containers.main,
                     '"></div>' ]
                   .join('')).addClass(Css.dismissal.context.tight);

    if(brief) {
      this.node_.append($(['<p>', brief, '</p>'].join(''))
                        .addClass(Css.dismissal.brief));
    }

    this.node_.append(co);

    el.fadeOut(this.options_.delayFade, function () {
      el.children().not(self.owner.getNodeClose()).remove();
      el.append(self.node_);
      el.addClass(Css.dismissal.dismissing);

      el.fadeIn(self.options_.delayFade);
    } );
  };


  /* ---------------------------------------------------------------------- */
  /**
   * Namespace containing all the CSS classes used by Sorting Queue.
   * @namespace
   * @private
   **/
  var Css = {
    item: {
      container: 'sd-text-item',
      content: 'sd-text-item-content',
      title: 'sd-text-item-title',
      close: 'sd-text-item-close',
      selected: 'sd-selected',
      dragging: 'sd-dragging'
    },
    dismissal: {
      context: {
        replace: 'sd-dismissal-replace',
        tight: 'sd-dismissal-replace-tight'
      },
      containers: {
        main: 'sd-dismissal',
        options: 'sd-dismissal-options',
        row: 'sd-dismissal-options-row'
      },
      question: 'sd-dismissal-question',
      description: 'sd-dismissal-description',
      dismissing: 'sd-dismissal-dismissing',
      option: 'sd-dismissal-option',
      brief: 'sd-dismissal-brief'
    },
    dnd: {
      droppable: {
        hover: 'sd-droppable-hover'
      }
    }
  };

  /* ---------------------------------------------------------------------- */
  /**
   * Default options.
   * @namespace
   * @private
   **/
  var defaults_ = {
    keyboard: {                 /* Contains scan codes. */
      listUp: 38,               /* up                   */
      listDown: 40,             /* down                 */
      listDismiss: 46           /* dismiss              */
    },
    delays: {                   /* In milliseconds.     */
      animateAssign: 75,        /* Duration of assignment of text item via
                                 * shortcut. */
      slideItem: 150,           /* Item slide up/down. */
      textItemFade: 100,        /* Fade out duration of text item after
                                 * assignment. */
      queueEmptyFadeIn: 250,
      queueEmptyFadeOut: 100
    },
    constructors: {
      Item: Item
    },
    items: {
      visible: 20,
      draggable: true
    },
    loadItemsAtStartup: true
  };


  /**
   * Module public interface. */
  return {
    Css: Css,
    Sorter: Sorter,
    Item: Item,
    ItemDismissal: ItemDismissal,
    ItemDismissalReplace: ItemDismissalReplace,
    ItemDismissalReplaceTight: ItemDismissalReplaceTight
  };

}, this);