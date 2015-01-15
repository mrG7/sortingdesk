/**
 * @file The Sorting Desk's base module.
 * @copyright 2014 Diffeo
 *
 * Comments:
 *
 */


/*global $, define */
/*jshint laxbreak:true */


/**
 * The base module.
 * */
var SortingCommon_ = function (window, $) {


  /* Module-wide function */
  var absm_noti = function ( ) { throw "Abstract method not implemented"; };
  
  var is_obj = function (r) { return r !== null && typeof r === 'object'; };
  var is_fn  = function (r) { return typeof r === 'function'; };
  var is_und = function (r) { return typeof r === 'undefined'; };
  var is_arr = function (r) { return r instanceof Array; };
  
  var is_str = function (r)
  { return typeof r === 'string' || r instanceof String; };

  var is_num = function (r)
  { return typeof r === 'number' || r instanceof Number; };
  
  var is_in  = function (/* r, k | r, k1, k2, ... */)
  {
    var r = arguments[0];

    if(!like_obj(r))
      throw "Reference not provided or not an object";
    
    for(var i = 1; i < arguments.length; ++i) {
      if(!r.hasOwnProperty(arguments[i]))
        return false;
    }

    return true;
  };

  var like = function (l, r) { return r instanceof Object && l instanceof r; };
  var like_obj = function (r) { return r instanceof Object; };
  
  var chainize = function (context, fn)
  {
    return function () {
      fn.apply(context, arguments);
      return context;
    };
  };


  /**
   * @class
   * */
  var Url = (function () {
    return {
      encode: function (s)
      {
        /* Taken from: http://goo.gl/kRTxRW
         * (Javascript's default `encodeURIComponent` does not strictly conform to
         * RFC 3986.) */
        return encodeURIComponent(s).replace(/[!'()*]/g, function(c) {
          return '%' + c.charCodeAt(0).toString(16);
        });
      },
      decode: function (s)
      {
        return decodeURIComponent(s);
      }
    };
  } )();


  /**
   * @class
   * */
  var /* abstract */ Owned = function (owner)
  {
    this.owner_ = owner;
  };

  Owned.prototype = {
    get owner () { return this.owner_; }
  };


  /**
   * @class
   * */
  var /* abstract */ Controller = function (owner)
  {
    /* Invoke super constructor. */
    Owned.call(this, owner);
  };

  Controller.prototype = Object.create(Owned.prototype);

  /* Following method to allow for deferred initialisation. */
  /* abstract */ Controller.prototype.initialise = absm_noti;

  /* abstract */ Controller.prototype.reset = absm_noti;


  /**
   * @class
   * */
  var /* abstract */ Drawable = function (owner)
  {
    /* Invoke super constructor. */
    Owned.call(this, owner);
  };

  Drawable.prototype = Object.create(Owned.prototype);

  /* abstract */ Drawable.prototype.render = absm_noti;


  /**
   * @class
   * */
  var Callbacks = function (map)
  {
    /* Set initial state. */
    this.map_ = map;
  };

  Callbacks.prototype.exists = function (callback)
  { return this.map_.hasOwnProperty(callback); };

  /** Invoke a callback with optional parameters.
   * @param {(string|object)} descriptor Name of callback to invoke or object
   * containing the following two attributes:
   * 
   * <pre><code>{
   *   name: {string}
   *   mandatory: {boolean}
   * }</code></pre>
   *
   * In the first form, where a string containing the callback's name is passed,
   * the callback must exist; if it doesn't, an exception is thrown.
   *
   * The second form allows an object to be passed specifying the callback's
   * name, via the <code>name</code> property, and whether it should exist by
   * setting the <code>mandatory</code> property appropriately. If
   * <code>mandatory</code> is set to true, then the callback must exist and, if
   * it doesn't, an exception is thrown.
   * 
   * @param {*}               parameters Parameters to pass to callback. */
  Callbacks.prototype.invoke = function ()
  {
    var arg, name,
        mandatory = true;

    /* First argument must exist. */
    if(arguments.length < 1)
      throw "Callback name or descriptor required";

    /* First argument can either be a string describing the callback's name or
     * an object containing two attributes, `name´ and `mandatory´. `name´
     * refers to the name of the callback to invoke, whereas `mandatory´
     * specifies whether the callback is required to exist or whether it is
     * allowed to be optional. If allowed to be optional and it doesn't exist,
     * `null´ is returned.
     *
     * If the callback doesn't exist and it isn't allowed to be optional, an
     * exception is thrown. */
    arg = arguments[0];
    
    if(is_obj(arg)) {
      name = arg.name;
      mandatory = arg.mandatory;
    } else
      name = arg;
    
    if(!this.map_.hasOwnProperty(name)) {
      if(mandatory)
        throw "Callback non existent: " + name;

      return null;
    }

    return this.map_[name].apply(null, [].slice.call(arguments, 1));
  };


  /**
   * @class
   * */
  var Constructor = function (map)
  {
    if(!is_obj(map))
      throw "Invalid map of constructors given";

    /* Ensure all attributes in the map are functions. */
    for(var k in map) {
      if(!is_fn(map[k]))
        throw "Invalid constructor found: " + k;
    }

    /* Attributes */
    this.map_ = map;
  };

  Constructor.prototype.exists = function (name)
  {
    return is_in(this.map_, name, 'create' + name);
  };

  Constructor.prototype.hasFactoryMethod = function (name)
  {
    return this.map_.hasOwnProperty('create' + name);
  };

  Constructor.prototype.hasConstructor = function (name)
  {
    return this.map_.hasOwnProperty(name);
  };

  Constructor.prototype.isConstructor = function (name)
  {
    return !this.hasFactoryMethod(name) && this.hasConstructor(name);
  };

  Constructor.prototype.instantiate = function ( /* class, ... */ )
  {
    if(arguments.length < 1)
      throw "Class name required";

    /* Invoke factory method to instantiate class, if it exists. */
    var descriptor = this.map_['create' + arguments[0]];

    if(descriptor)
      return descriptor.apply(null, [].slice.call(arguments, 1));

    /* Factory method doesn't exist. Ensure class constructor has been passed
     * and instantiate it. */
    descriptor = this.map_[arguments[0]];
    
    if(!descriptor)
      throw "Class or factory non existent: " + arguments[0];

    /* We don't want to use `eval' so we employ a bit of trickery to
     * instantiate a class using variable arguments. */
    var FakeClass = function () { },
        object;

    /* Instantiate class prototype. */
    FakeClass.prototype = descriptor.prototype;
    object = new FakeClass();

    /* Now simply call class constructor directly and keep reference to
     * correct constructor. */
    descriptor.apply(object, [].slice.call(arguments, 1));
    object.constructor = descriptor.constructor;

    return object;
  };


  /**
   * @class
   * */
  var ControllerGlobalKeyboard = function (owner)
  {
    /* Invoke super constructor. */
    Controller.call(this, owner);
  };

  ControllerGlobalKeyboard.prototype = Object.create(Controller.prototype);

  ControllerGlobalKeyboard.prototype.fnEventKeyUp = null;

  /* Required: */
  /* abstract */ ControllerGlobalKeyboard.prototype.onKeyUp = null;

  ControllerGlobalKeyboard.prototype.initialise = function ()
  {
    var self = this;

    /* Save event handler function so we are able to remove it when resetting
     * the instance. */
    this.fnEventKeyUp = function (evt) { self.onKeyUp(evt); };

    /* Set up listener for keyboard up events. */
    $('body').bind('keyup', this.fnEventKeyUp);
  };

  ControllerGlobalKeyboard.prototype.reset = function ()
  {
    /* Remove keyboard up event listener. */
    $('body').unbind('keyup', this.fnEventKeyUp);
    this.fnEventKeyUp = null;
  };

  
  /**
   * @class
   *
   * Static class.
   * */
  var DragDropManager = (function () {
    var activeNode = null;

    /* Interface */
    var isScope = function (event, scopes)
    {
      if(!scopes)
        return true;

      var isFilter = is_fn(scopes);

      if(!activeNode)
        return isFilter && scopes(null);

      var current = activeNode.getAttribute('data-scope');

      return isFilter
        ? scopes(current)
        : hasScope(scopes, current);
    };

    var getScope = function (event)
    {
      return activeNode
        ? activeNode.getAttribute('data-scope')
        : null;
    };

    var hasScope = function (all, target)
    {
      return (is_arr(all) ? all : [ all ])
        .some(function (s) {
          return s === target;
        } );
    };
    
    /* Event handlers */
    var onDragStart = function (event) {
      activeNode = (event.originalEvent || event).target;
    };

    var onDragEnd = function (event) {
      if(activeNode === (event.originalEvent || event).target) {
        activeNode = null;
      }
    };

    var reset = function () { activeNode = null; };

    
    /* Public interface */
    return {
      isScope: isScope,
      getScope: getScope,
      hasScope: hasScope,
      reset: reset,
      onDragStart: onDragStart,
      onDragEnd: onDragEnd
    };
  } )();


  /**
   * @class
   * */
  var Draggable = function (node, options)
  {
    node.on( {
      dragstart: function (e) {
        /* Note: event propagation needs to be stopped before assignment of
         * `originalEvent' or some tests will break. */
        e.stopPropagation();
        e = e.originalEvent;
        e.dataTransfer.setData('Text', ' ');
        e.dataTransfer.setData('DossierId', this.id);

        if(options.classDragging)
          node.addClass(options.classDragging);

        DragDropManager.onDragStart(e);

        if(options.dragstart)
          options.dragstart(e);
      },

      dragend: function (e) {
        /* Note: event propagation needs to be stopped before assignment of
         * `originalEvent' or some tests will break. */
        e.stopPropagation();
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
   * @class
   * */
  var Droppable = function (node, options)
  {
    var dm = DragDropManager;
    
    if(!(node instanceof $))
      throw "Invalid or no jQuery reference specified";

    /* Attributes */
    this.options_ = options;
    this.node_ = node;

    /* Set up events on node provided. */
    node.on( {
      dragover: function (e) {
        if(!dm.isScope(e = e.originalEvent, options.scopes))
          return;

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
      },

      dragenter: function (e) {
        /* IE requires the following special measure. */
        if(!dm.isScope(e = e.originalEvent, options.scopes))
          return;

        e.dropEffect = 'move';
        return false;
      },

      dragleave: function (e) {
        if(!dm.isScope(e = e.originalEvent, options.scopes))
          return;

        if(options.classHover)
          node.removeClass(options.classHover);

        return false;
      },

      drop: function (e) {
        if(!dm.isScope(e = e.originalEvent, options.scopes))
          return;

        if(options.classHover)
          node.removeClass(options.classHover);

        if(options.drop) {
          /* The following try-catch is required to prevent the drop event from
           * bubbling up, should an error occur inside the handler. */
          try {
            options.drop(
              e,
              e.dataTransfer && e.dataTransfer.getData('DossierId') || null,
              dm.getScope());
          } catch (x) {
            console.log("Exception occurred:", x);
          }
        }

        /* Forcefully reset state as some drag and drop events don't cause the
         * dragleave event to be fired at the end. */
        dm.reset();

        return false;
      }
    } );
  };

  Droppable.prototype.addScope = function (scope)
  {
    if(!this.options_.scopes)
      this.options_.scopes = [ ];

    if(!this.options_.scopes.hasOwnProperty(scope))
      this.options_.scopes.push(scope);
  };

  Droppable.prototype.reset = function ()
  {
    /* Clear all events.
     *
     * Note that this may be undesirable since all the events attached to the
     * element are cleared, including any events the client may have set
     * up. */
    this.node_.off();
    this.node_ = this.options_ = null;
  };

  
  /**
   * @class
   * */
  var Events = function (owner, names)
  {
    /* Attributes */
    this.map_ = { };

    /* Initialisation proper
     * -- */
    /* Allow `owner´ to have not been specified. If it was specified, however,
     * add an `on´ and `off´ methods to its prototypal namespace, if each
     * doesn't already exist. Note that we are not making any checks to ensure
     * `owner´ is an instantiated prototypal object. */
    if(like_obj(owner)) {
      if(!owner.hasOwnProperty('on'))
        owner.on = chainize(owner, this.register.bind(this));

      if(!owner.hasOwnProperty('off'))
        owner.off = chainize(owner, this.unregister.bind(this));
    }

    /* It is assumed that the events a class advertises do not change since they
     * are directly related to the class' responsibilities and purpose, -- thus
     * its very identity -- and not state at any particular point in time. We
     * therefore require an array at instantiation time, given by `names´,
     * containing a list of event names clients can subsequently register
     * callbacks to.
     * -- */
    /* Prepare event callback containers. */
    if(!is_arr(names) || names.length === 0)
      throw "Invalid, empty or no event array";

    var self = this;
    names.forEach(function (n) { self.map_[n] = [ ]; } );
  };

  Events.prototype.trigger = function ( /* ev, arg0, arg1... */ )
  {
    var ev = arguments[0];
    
    if(!is_str(ev) || ev.length === 0)
      throw "Invalid event name specified";

    var d = this.map_[ev];
    if(is_arr(d)) {
      var args = Array.prototype.splice(arguments, 1);
      
      d.forEach(function (fn) {
        fn.apply(null, args);
      } );
    }
  };

  Events.prototype.register = function ( /* event, handler */ )
  {
    if(arguments.length === 0)
      throw "No event descriptor specified";

    var ev = arguments[0];
    
    if(arguments.length === 1) {
      /* Expect a map. */
      if(is_obj(ev)) {
        for(var k in ev)
          this.register_simple_(k, ev[k]);
      }
    } else /* arguments >= 2; only first two are used */
      this.register_single_(ev, arguments[1]);
  };

  Events.prototype.unregister = function (/* undefined | string | object */ ev)
  {
    if(is_str(ev))
      this.unregister_single_(ev);        /* Unregister single event. */
    else if(is_arr(ev)) {
      ev.forEach(function (e) {           /* Unregister multiple events. */
        this.unregister_simple_(e);
      } );
    } else if(is_und(ev))
      this.map_ = { };                    /* Unregister all.  */
    else
      throw "Invalid event(s) descriptor";
  };
  
  /* Private methods */
  Events.prototype.register_single_ = function (ev, fn)
  {
    if(!is_str(ev) || ev.length === 0)
      throw "Invalid or no event name";
    else if(!is_fn(fn))
      throw "Invalid or no event handler specified";

    var callbacks = this.map_[ev];
    if(is_arr(callbacks))
      callbacks.push(fn);
  };

  Events.prototype.unregister_simple_ = function (ev)
  {
    if(!is_str(ev) || ev.length === 0)
      throw "Invalid or no event name";

    if(this.map_.hasOwnProperty(ev))
      delete this.map_[ev];
  };


  /* Return public interface. */
  return {
    /* Functions */
    absm_noti: absm_noti,
    is_obj: is_obj,
    is_fn: is_fn,
    is_und: is_und,
    is_arr: is_arr,
    is_str: is_str,
    is_num: is_num,
    like: like,
    like_obj: like_obj,
    is_in: is_in,
    chainize: chainize,

    /* Classes */
    Url: Url,
    Owned: Owned,
    Controller: Controller,
    Drawable: Drawable,
    Callbacks: Callbacks,
    Constructor: Constructor,
    ControllerGlobalKeyboard: ControllerGlobalKeyboard,
    Draggable: Draggable,
    Droppable: Droppable,
    Events: Events
  };
};


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("SortingCommon", [ "jquery" ], function ($) {
    return SortingCommon_(window, $);
  });
} else
  window.SortingCommon = SortingCommon_(window, $);
