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
  var is_und = function (r) { return typeof r === typeof undefined; };
  var is_arr = function (r) { return r instanceof Array; };
  
  var is_str = function (r)
  { return typeof r === 'string' || r instanceof String; };

  var is_num = function (r)
  { return typeof r === 'number' || r instanceof Number; };
  
  var is_in  = function (/* (r, k) | (r, k0..n) */)
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

  
  /* jQuery-related */
  var jQueryExtensions = (function () {

    /* Interface
     * -- */
    /** Given a map of identifier -> jQuery instance references, unbind all
     * events on all nodes. The map can be multiple levels deep, with each level
     * processed recursively. This function can never be a jQuery plugin.
     *
     * @param {object} n - Object containing jQuery instance references and
     * possibly other objects.
     *
     * @returns {undefined} */
    var alloff = function (n)
    {
      for(var k in n) {
        var i = n[k];

        if(i instanceof $) i.off();
        else if(is_obj(i)) alloff(i);
      }
    };

    /** Convenient method that returns true if a given variable contains a valid
     * reference to a <code>jQuery</code> instance.
     *
     * @param {object} r - Variable to test.
     *
     * @returns {boolean} True, if <code>r</code> is a <code>jQuery</code>
     * instance. */
    var is = function (r)
    { return r instanceof $; };

    /** Convenient method meant to be used as a means of ensuring a given
     * variable contains a valid reference to a jQuery instance and that it
     * isn't empty.
     *
     * @param {object} r - Reference to jQuery instance. */
    var any = function (r)
    { return is(r) && r.length > 0; };


    /* Public interface */
    return {
      alloff: alloff,
      is: is,
      any: any
    };
    
  } )();


  var NodeFinder = (function (prefix, root) {

    prefix = [ '[data-sd-scope="', prefix, '-' ].join('');
    
    var find = function (scope, parent /* = prefix */ )
    {
      var p;

      if(parent instanceof $) p = parent;
      else if(is_str(parent)) p = find(parent);
      else                    p = root;

      return p.find( [ prefix, scope, '"]' ].join(''));
    };

    var root_ = function () { return root; };
    
    
    /* Public interface */
    return {
      find: find,
      root: root_
    };
  } );


  /**
   * @class
   * */
  var Url = (function () {
    /* Public interface */
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
    if(!like_obj(owner))
      throw "Invalid owner instance reference specified";
    
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
    if(!is_und(map)) {
      if(!is_obj(map))
        throw "Invalid callbacks map specified";
      
      /* Ensure all attributes in the map are functions. */
      for(var k in map) {
        if(!is_fn(map[k]))
          throw "Invalid callback found: " + k;
      }

      this.map_ = map;
    } else
      this.map_ = { };
  };

  Callbacks.prototype.exists = function (callback)
  { return this.map_.hasOwnProperty(callback); };

  /** Invoke a callback with optional parameters.
   *
   * The callback is always required to exist. If it doesn't exist, an exception
   * is thrown.
   * 
   * @param {string} name       - Name of callback to invoke.
   * @param {*}      parameters - One or more parameters to pass to callback. */
  Callbacks.prototype.invoke = function ( /* (name, arg0..n) */ )
  {
    if(arguments.length < 1)
      throw "Callback name not specified";

    return this.call_(arguments[0], true,
                      Array.prototype.splice.call(arguments, 1));
  };

  /** Invoke a callback with optional parameters.
   *
   * The callback may optionally <strong>not</strong> be required to exist if
   * the <code>mandatory</code> argument is <code>true</code>; otherwise,
   * <code>null</code> is returned instead.
   * 
   * @param {string}  name      - Name of callback to invoke.
   * 
   * @param {boolean} mandatory - If true, the callback must exist and an
   * exception is thrown if it doesn't.
   * 
   * @param {*}       parameters - One or more parameters to pass to callback.
   * */
  Callbacks.prototype.call = function (/* (name, mandatory = true, arg0..n) */ )
  {
    if(arguments.length < 2)
      throw "One or more parameters missing (name, mandatory)";

    return this.call_(arguments[0], arguments[1],
                      Array.prototype.splice.call(arguments, 2));
  };

  /* overridable */ Callbacks.prototype.onPostCall = function (name, result)
  { /* nop */ };

  /* Private methods */
  Callbacks.prototype.call_ = function (name, mandatory, args)
  {
    if(!is_str(name))
      throw "Invalid callback name specified";

    var callback = this.map_[name];
    if(!is_fn(callback)) {
      if(mandatory === true)
        throw "Attempting to invoke nonexistent callback: " + name;

      return null;
    }

    var result = callback.apply(null, args);
    this.onPostCall(name, result);
    return result;
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

  Constructor.prototype.instantiate = function ( /* (class, arg0..n) */ )
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
            dbg.error("Exception occurred:", x);
          }
        }

        /* Forcefully reset state as some drag and drop events don't cause the
         * dragleave event to be fired at the end. */
        dm.reset();

        return false;
      }
    } );
  };

  Droppable.prototype.add = function (scope)
  {
    if(!is_arr(this.options_.scopes))
      this.options_.scopes = [ ];

    if(this.options_.scopes.indexOf(scope) === -1)
      this.options_.scopes.push(scope);
  };

  Droppable.prototype.remove = function (scope)
  {
    if(is_arr(this.options_.scopes)) {
      var index = this.options_.scopes.indexOf(scope);
      if(index !== -1)
        this.options_.scopes.splice(index, 1);
    }
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
  var Observable = function ()
  {
    /* Attributes */
    this.observers_ = [ ];
  };

  Observable.prototype.register = function (observer)
  {
    if(this.exists(observer))
      throw "Observer already registered";
    else if(!(observer instanceof Observer))
      throw "Invalid observer instance reference specified";
    
    this.observers_.push(observer);
  };

  Observable.prototype.unregister = function (observer)
  {
    var index = this.observers_.indexOf(observer);

    if(index === -1)
      throw "Observer not registered";
    else
      this.observers_.splice(index, 1);
  };

  Observable.prototype.notify = function ( /* (arg0..n) */ )
  {
    this.observers_.forEach(function (observer) {
      observer.update.apply(observer, arguments);
    } );
  };


  /**
   * @class
   * */
  var Observer = function (owner, callback)
  {
    Owned.call(this, owner);

    if(!is_fn(callback))
      throw "Invalid or no callback function specified";

    /* Attributes */
    this.callback_ = callback;
  };

  Observer.prototype = Object.create(Owned.prototype);

  Observer.prototype.update = function ( /* (arg0..argn) */ )
  {
    this.callback_.apply(null, arguments);
  };
  
  
  /**
   * @class
   * */
  var Events = function ( /* <owner, names> | <names> */ )
  {
    var ent;

    /* Attributes */
    this.map_ = { };

    /* Initialisation proper
     * -- */
    /* Allow a reference to an owning reference to have not been specified. If
     * it was specified, add an `on´ and `off´ methods to its instance, if each
     * doesn't already exist. Note that we are not making any checks to ensure
     * the owning instance is a valid instantiated prototypal object. */
    if(arguments.length === 2) {
      ent = arguments[0];

      if(!like_obj(ent))
        throw "Invalid owner instance reference specified";

      /* Decorate owning instance by adding the `on´ and `off´ methods that
       * clients can conveniently use to attach and deattach events,
       * respectively. */
      if(!ent.hasOwnProperty('on'))
        ent.on = chainize(ent, this.register.bind(this));

      if(!ent.hasOwnProperty('off'))
        ent.off = chainize(ent, this.unregister.bind(this));

      ent = arguments[1];
    } else
      ent = arguments[0];

    /* It is assumed that the events a class advertises do not change since they
     * are directly related to the class' responsibilities and purpose, -- thus
     * its very identity -- and not state at any particular point in time. We
     * therefore require an array at instantiation time, given by `names´,
     * containing a list of event names clients can subsequently register
     * callbacks to.
     * -- */
    /* Prepare event callback containers. */
    if(!is_arr(ent))
      throw "Invalid or no event array specified";

    var self = this;
    ent.forEach(function (n) { self.map_[n] = [ ]; } );
  };

  Events.prototype.add = function (ev)
  {
    if(!is_str(ev) || ev.length === 0)
      throw "Invalid or no event name specified";
    else if(this.map_.hasOwnProperty(ev))
      throw "Event already exists: " + ev;

    this.map_[ev] = [ ];
    return true;
  };

  Events.prototype.remove = function (ev)
  {
    if(!is_str(ev) || ev.length === 0)
      throw "Invalid or no event name specified";
    else if(this.map_.hasOwnProperty(ev)) {
      delete this.map_[ev];
      return true;
    }

    return false;
  };
    

  Events.prototype.exists = function (ev)
  {
    ev = this.map_[ev];
    return is_arr(ev) ? ev.length > 0 : false;
  };

  Events.prototype.count = function (ev)
  {
    ev = this.map_[ev];
    return is_arr(ev) ? ev.length : -1;
  };

  Events.prototype.trigger = function ( /* (ev, arg0..n) */ )
  {
    var ev = arguments[0];
    
    if(!is_str(ev) || ev.length === 0)
      throw "Invalid or no event name specified";

    var d = this.map_[ev];
    if(is_arr(d)) {
      var args = Array.prototype.splice.call(arguments, 1);

      d.forEach(function (fn) {
        fn.apply(null, args);
      } );
    }
  };

  Events.prototype.register = function ( /* (event, handler)
                                          * | { event0: handler0
                                          *     ..n              } */ )
  {
    if(arguments.length === 0)
      throw "No event descriptor specified";

    var ev = arguments[0];

    if(arguments.length === 1) {
      /* Expect a map. */
      if(is_obj(ev)) {
        for(var k in ev)
          this.register_single_(k, ev[k]);
      } else
        throw "Invalid event(s) descriptor map";
    } else /* arguments >= 2; only first two are used */
      return this.register_single_(ev, arguments[1]);
  };

  Events.prototype.unregister = function (/* undefined | string | object */
    ev, fn)
  {
    if(is_str(ev))                        /* Unregister single event. */
      return this.unregister_single_(ev, fn);
    else if(is_obj(ev)) {
      for(var k in ev)                    /* Unregister multiple events. */
        this.unregister_single_(ev[k]);
    } else if(is_und(ev))
      this.map_ = { };                    /* Unregister all.  */
    else
      throw "Invalid event(s) descriptor";
  };
  
  /* Protected methods */
  Events.prototype.register_single_ = function (ev, fn)
  {
    if(!is_str(ev) || ev.length === 0)
      throw "Invalid or no event name";
    else if(!is_fn(fn))
      throw "Invalid or no event handler specified";

    var callbacks = this.map_[ev];
    if(is_arr(callbacks)) {
      callbacks.push(fn);
      return true;
    }

    return false;
  };

  Events.prototype.unregister_single_ = function (ev, fn)
  {
    if(!is_str(ev) || ev.length === 0)
      throw "Invalid or no event name";

    if(!this.map_.hasOwnProperty(ev))
      return false;

    if(is_und(fn))
      this.map_[ev] = [ ];
    else if(!is_fn(fn))
      throw "Invalid or no event handler specified";
    else {
      var index = this.map_[ev].indexOf(fn);
      if(index === -1)
        return false;
      
      this.map_splice(index, 1);
    }
    
    return true;
  };


  /**
   * @class
   * */
  var View = function (owner)
  {
    /* Invoke super constructor. */
    Drawable.call(this, owner);
  };

  View.prototype = Object.create(Drawable.prototype);

  View.prototype.reset = absm_noti;


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
    Events: Events,
    View: View,
    NodeFinder: NodeFinder,
    $: jQueryExtensions
  };
};


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("SortingCommon", [ "jquery" ], function ($) {
    return SortingCommon_(window, $);
  });
} else
  window.SortingCommon = SortingCommon_(window, $);
