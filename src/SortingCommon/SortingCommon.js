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
   * the callback must exist; if it doesn't, an exception is thrown. The second
   * form allows an object to be passed which results in the specified callback
   * being invoked if it is defined, otherwise no exceptions are thrown.
   * @param {*}               parameters Parameters to pass to callback. */
  Callbacks.prototype.invoke = function ()
  {
    var name,
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
    if(typeof arguments[0] === 'object') {
      name = arguments[0].name;
      mandatory = arguments[0].mandatory;
    } else
      name = arguments[0];
    
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

    /* Classes */
    Url: Url,
    Owned: Owned,
    Controller: Controller,
    Drawable: Drawable,
    Callbacks: Callbacks,
    Constructor: Constructor,
    ControllerGlobalKeyboard: ControllerGlobalKeyboard    
  };
};


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("SortingCommon", [ "jquery" ], function ($) {
    return SortingCommon_(window, $);
  });
} else
  window.SortingCommon = SortingCommon_(window, $);
