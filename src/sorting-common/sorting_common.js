/**
 * @file The Sorting Desk's base module.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */


(function (Module, root) {

  /* Compatibility with RequireJs. */
  if(typeof define === "function" && define.amd) {
    define("SortingCommon", [ "jquery" ], function ($) {
      return new Module(root, $);
    });
  } else
    root.SortingCommon = new Module(root, $);

} )(function (window, $, undefined) {

  this.absm_noti = absm_noti;
  function absm_noti( ) { throw "Abstract method not implemented"; }

  this.is_obj = is_obj;
  function is_obj(r) { return r !== null && typeof r === 'object'; }

  this.is_fn  = is_fn;
  function is_fn(r) { return typeof r === 'function'; }

  this.is_und = is_und;
  function is_und(r) { return typeof r === typeof undefined; }

  this.is_arr = is_arr;
  function is_arr(r) { return r instanceof Array; }

  this.is_str = is_str;
  function is_str(r)
  { return typeof r === 'string' || r instanceof String; }

  this.is_num = is_num;
  function is_num(r)
  { return typeof r === 'number' || r instanceof Number; }

  this.is_in = is_in;
  function is_in(/* (r, k) | (r, k0..n) */)
  {
    var r = arguments[0];

    if(!like_obj(r))
      throw "Reference not provided or not an object";

    for(var i = 1; i < arguments.length; ++i) {
      if(!r.hasOwnProperty(arguments[i]))
        return false;
    }

    return true;
  }

  this.any_in = any_in;
  function any_in(/* (r, k) | (r, k0..n) */)
  {
    var r = arguments[0];

    if(!like_obj(r))
      throw "Reference not provided or not an object";

    for(var i = 1; i < arguments.length; ++i) {
      if(r.hasOwnProperty(arguments[i]))
        return true;
    }

    return false;
  }

  this.like = like;
  function like(l, r) { return r instanceof Object && l instanceof r; }

  this.like_obj = like_obj;
  function like_obj(r) { return r instanceof Object; }

  this.first_key = first_key;
  function first_key(obj)
  {
    if(!like_obj(obj))
      throw "Invalid object reference specified";

    for(var k in obj)
      return k;

    return null;
  }

  this.next_key = next_key;
  function next_key(obj, key)
  {
    if(!like_obj(obj))
      throw "Invalid object reference specified";

    var coll = Object.keys(obj),
        index = coll.indexOf(key);

    return index === -1 || index >= coll.length ? null : coll[index + 1];
  }

  this.chainize = chainize;
  function chainize(context, fn)
  {
    return function () {
      fn.apply(context, arguments);
      return context;
    };
  }

  this.instanceany = instanceany;
  function instanceany()
  {
    var a = arguments, o = a[0];
    for(var i = 1, l = a.length; i < l; ++i) {
      if(o instanceof a[i])
        return true;
    }

    return false;
  }

  this.on_exception = on_exception;
  function on_exception(x)
  {
    console.error("Exception thrown: " + x,
                  x.stack || "\n<no stack information available>");

    throw x;
  }

  this.is_obj_empty = is_obj_empty;
  function is_obj_empty(x)
  {
    if(!like_obj(x))
      throw "Reference not provided or not an object";

    for(var k in x) {
      if(x.hasOwnProperty(k))
        return false;
    }

    return true;
  }

  this.instareject = instareject;
  function instareject() {
    return $.Deferred(function (d) {
      d.reject.apply(d, arguments);
    } ).promise();
  }


  /**
   * @class
   * */
  var jQueryExtensions;
  jQueryExtensions = this.$ = this.jQueryExtensions = new (function () {

    /* Interface
     * -- */
    /** Given a map of <code>identifier</code> -> <code>jQuery</code> instance
     * references, unbind all events on all nodes. The map can be multiple
     * levels deep, with each level processed recursively. This function can
     * never be a jQuery plugin.
     *
     * @param {Object} n - Object containing jQuery instance references and
     * possibly other objects.
     *
     * @returns {undefined} */
    this.alloff = alloff;
    function alloff(n)
    {
      for(var k in n) {
        var i = n[k];

        if(i instanceof $) i.off();
        else if(is_obj(i)) alloff(i);
      }
    }

    /** Convenient method that returns true if a given variable contains a valid
     * reference to a <code>jQuery</code> instance.
     *
     * @param {Object} r - Variable to test.
     *
     * @returns {boolean} True, if <code>r</code> is a <code>jQuery</code>
     * instance. */
    this.is = is;
    function is(r)
    { return r instanceof $; }

    /** Convenient method meant to be used as a means of ensuring a given
     * variable contains a valid reference to a <code>jQuery</code> instance and
     * that it isn't empty.
     *
     * @param {Object} r - Variable to test.
     *
     * @returns {boolean} True, if <code>r</code> is a <code>jQuery</code>
     * instance <strong>and</strong> contains at least one element; False
     * otherwise. */
    this.any = any;
    function any(r)
    { return is(r) && r.length > 0; }

    /** Returns true if two jQuery collections contain the exact same DOM
     * elements.
     *
     * @param {Object} l - Left collection to test.
     * @param {Object} r - Right collection to test.
     *
     * @returns {boolean} True, if <code>r</code> contains the same DOM
     * elements as <code>l</code>.  This implies that the collections of both
     * <code>l</code> and <code>r</code> contain the same number of elements
     * too. */
    this.same = same;
    function same(l, r)
    {
      if(!is(l) || !is(r))
        throw "Invalid jQuery reference(s) specified";
      else if(l.length !== r.length)
        return false;

      for(var i = 0, c = l.length; i < c; ++i) {
        if(l.get(i) !== r.get(i))
          return false;
      }

      return true;
    }

    this.inview = inview;
    function inview(el)
    {
      if(!is(el))
        el = $(el);

      var $window = $(window),
          docTop = $window.scrollTop(),
          docBottom = docTop + $window.height(),
          top = el.offset().top,
          bottom = top + el.height();

      return ((bottom <= docBottom) && (top >= docTop));
    }

    this.scrollIntoView = scrollIntoView;
    function scrollIntoView(el, c)
    {
      if(!is(el))
        el = $(el);

      var container = c === undefined ? $(window) : (is(c) ? c : $(c)),
          containerTop = container.scrollTop(),
          containerBottom = containerTop + container.height(),
          elemTop = el.offset().top,
          elemBottom = elemTop + el.height();

      if (elemTop < containerTop)
        container.off().scrollTop(elemTop);
      else if (elemBottom > containerBottom)
        container.off().scrollTop(elemBottom - container.height());
    }

    this.mapTo$ = mapTo$;
    function mapTo$(map)
    {
      for(var k in map) {
        var e = map[k];

             if(is_str(e))        map[k] = $("#" + e);
        else if(Html.is_node(e))  map[k] = $(e);
        else if(is(e))            continue;
        else if(is_obj(e))        mapTo$(e);
        else                      map[k] = $();
      }
    }
  });


  /**
   * @class
   * */
  var Html;
  Html = this.Html = new (function () {

    /* Interface
     * -- */
    /** This method retrieves image data in base64 encoding. It can either be
     * passed a reference to an existing <code>Image</code> instance or a string
     * assumed to contain the URL of an image. When given a string, it attempts
     * to first load the image before retrieving its image data.
     *
     * In both instances, a jQuery <code>Deferred</code> promise object is
     * returned and is resolved as soon as the image data is available. The
     * promise is only rejected when attempting to load the image fails.
     *
     * @param {(object|string)} ent - Can be either a reference to an
     * <code>Image</code> instance or a string assumed to contain the URL of an
     * image.
     *
     * @returns {string} Image data in base64 encoding without the prefix
     * <code>data:image/TYPE;base64,</code>. */
    this.imageToBase64 = imageToBase64;
    function imageToBase64(ent)
    {
      var deferred = $.Deferred();

      if(is_image(ent)) {
        window.setTimeout(function () {
          var data = getImageData_(ent);
          deferred.resolve(data);
        }, 0);
      } else if(is_str(ent)) {
        var img;

        ent = ent.trim();
        img = new window.Image();
        img.src = /^\/\//.test(ent) ? "http:" + ent : ent;

        /* Set up events. */
        img.onload = function () { deferred.resolve(getImageData_(img)); };
        img.onerror = function () {
          console.error("Failed to load image: %s", img.src);
          deferred.reject();
        };
      } else
        throw "Invalid image source specified";

      return deferred.promise();
    }

    this.xpathOf = xpathOf;
    function xpathOf(node)
    {
      var id, xpath = '';

      if(jQueryExtensions.is(node))
        node = node.get(0);

      for( ; node !== null && node.nodeType === 1 || node.nodeType === 3;
           node = node.parentNode) {
        id = indexOf(node) + 1;
        xpath = '/' + node.nodeName.toLowerCase()
          + (id === 1 ? '' : '[' + id + ']')
          + xpath;
      }

      return xpath;
    }

    this.indexOf = indexOf;
    function indexOf(node)
    {
      var index = 0;

      while( (node = node.previousSibling) !== null)
        ++ index;

      return index;
    }

    this.visit = visit;
    function visit(node, cb)
    {
      if(!is_fn(cb))
        throw 'Invalid or no callback function specified';

      var visitor = function (el) {
        var children = el.childNodes;

        if(children.length) {
          for(var i = 0, l = children.length; i < l; ++i)
            visitor(children[i]);
        } else
          cb(el);
      };

      visitor(node);
    }

    this.subtreeBetween = subtreeBetween;
    function subtreeBetween(node, parent /* = document.body */)
    {
      if(parent === undefined)
        parent = document.body;

      var subtree = [ node ];

      while(node !== parent) {
        node = node.parentNode;
        if(node === null)
          return [ ];

        subtree.push(node);
      }

      return subtree;
    }


    /* Is-type functions */
    this.is_image = is_image;
    function is_image(el)
    {
      return el instanceof window.HTMLImageElement
        || el instanceof window.Image;
    }

    this.is_node = is_node;
    function is_node(o)
    {
      return (
        is_obj(Node) === "object"
          ? o instanceof Node
          : is_obj(o) && is_num(o.nodeType) && is_str(o.nodeName)
      );
    }

    this.is_element = is_element;
    function is_element(o)
    {
      return (
        is_obj(HTMLElement)
          ? o instanceof HTMLElement
          : is_obj(o) && o.nodeType === 1 && is_str(o.nodeName)
      );
    }

    /* Private interface */
    var getImageData_ = function (img)
    {
      var canvas = window.document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      return canvas.toDataURL("image/png");
    };

  });


  /**
   * @class
   * Support for Intra-Process Communication.
   * */
  this.ipc = new function ()
  {
    var lastid = 0;

    this.post = function (/* method [, arg0, .. , argn ] */)
    {
      var method, args,
          l = arguments.length,
          msgid = ++lastid,
          deferred = $.Deferred();

      if(arguments.length === 0) throw "Invalid parameters";
      method = arguments[0];
      if(!is_str(method)) throw "Invalid method name";

      if(l > 1) args = Array.prototype.slice.call(arguments, 1, l);
      else      args = [ ];

      var handler = function (ev) {
        var data = ev.data;
        if(!is_obj(data) || !data.reply || data.id !== msgid) return;
        window.removeEventListener("message", handler);
        deferred.resolve(data.result);
      };

      /* Attach listener to receive reply. */
      window.addEventListener("message", handler, false);

      /* ... and post message. */
      window.postMessage( {
        id:     msgid,
        method: method,
        reply:  false,
        args :  args
      }, "*");

      /* A response is returned in the following promise. */
      return deferred.promise();
    };

    this.on = function (method, callback)
    {
      var handler = function (ev) {
        /* We are supposed to process this message if it isn't a reply and is
         * the method we're after. */
        var data = ev.data;
        if(!is_obj(data) || data.reply !== false || data.method !== method)
          return;

        var reply = function (result) {
          window.postMessage( {
            id:     data.id,
            method: method,
            reply:  true,
            result: result
          }, "*");
        };

        /* Invoke method handler and allow for a response to be given
         * asynchronously. */
        var r = callback.apply(window, ev.data.args);
        if(r && is_fn(r.then)) r.then(reply);
        else reply(r);
      };

      /* Attach message listener. */
      window.addEventListener("message", handler, false);
    };
  }();


  /**
   * @class
   * */
  this.NodeFinder = NodeFinder;
  function NodeFinder(
    tag,    /* = "data-scope"  */
    prefix, /* = ""            */
    root    /* = document.body */
  ) {
    this.tag_ = tag || "data-scope";
    this.prefix_ = [ '[', this.tag_, '="',
                     prefix && prefix.length > 0 ? prefix + '-' : ''
                   ].join('');
    this.root_ = root || $(document.body);
  }

  NodeFinder.prototype = {
    tag_: null,
    prefix_: null,
    root_: null,

    get root() { return this.root_;  },

    find: function (scope, parent /* = prefix */ )
    {
      var p;

      if(parent instanceof $) p = parent;
      else if(is_str(parent)) p = this.find(parent);
      else                    p = this.root_;

      return p.find( [ this.prefix_, scope, '"]' ].join(''));
    },

    withroot: function (newRoot, callback)
    {
      if(!is_fn(callback))
        throw "Invalid or no callback function specified";

      var v, t = this.root_;
      this.root_ = newRoot;
      v = callback.call(this);
      this.root_ = t;
      return v;
    },

    map: function (dict)
    {
      var result = { };

      for(var k in dict) {
        var n = dict[k];

        if(n === undefined)
          result[k] = this.root;
        else if(is_obj(n)) {
          if("withroot" in n) {
            result[k] = this.withroot(this.find(n.withroot), function () {
              return this.map(n);
            } );
            delete result[k].withroot;
          } else
            result[k] = this.map(n);
        } else
          result[k] = this.find(n || k);
      }

      return result;
    }
  };


  /**
   * @class
   * */
  this.TemplateFinder = TemplateFinder;
  function TemplateFinder(type, tag /* = "data-scope" */)
  {
    this.scripts = Array.prototype.slice.call(
      document.getElementsByTagName('script'), 0)
      .filter(function (i) {
        return i.type === type;
      } );

    this.tag = tag || 'data-scope';
  }

  TemplateFinder.prototype.find = function (id)
  {
    for(var i = 0, l = this.scripts.length; i < l; ++i) {
      if(this.scripts[i].id === id)
        return new Template(this.scripts[i].innerHTML, this.tag);
    }

    return null;
  };

  TemplateFinder.prototype.map = function (dict)
  {
    var result = { };

    for(var k in dict) {
      var n = dict[k];

      if(is_obj(n)) result[k] = this.map(n);
      else          result[k] = this.find(n || k);
    }

    return result;
  };


  /**
   * @class
   * */
  this.Template = Template;
  function Template(html, tag)
  {
    this.html = html;
    this.tag = tag || null;

    Object.defineProperty(this, 'html', { value: html } );
  }

  Template.prototype.clone = function ()
  {
    return new TemplateInstance($(this.html), this.tag);
  };


  /**
   * @class
   * */
  this.TemplateInstance = TemplateInstance;
  function TemplateInstance(node, tag)
  {
    this.node = node;
    this.tag = tag || null;
  }

  TemplateInstance.prototype.get = function () { return this.node; };

  TemplateInstance.prototype.find = function (scope)
  {
    if(this.prefix === null) return $();
    return this.node.find('[' + this.tag + '=' + scope + ']');
  };


  /**
   * @class
   * */
  var Url;
  Url = this.Url = new (function () {

    this.encode = encode;
    function encode(s)
    {
      /* Taken from: http://goo.gl/kRTxRW
       * (Javascript's default `encodeURIComponent` does not strictly conform to
       * RFC 3986.) */
      return encodeURIComponent(s).replace(/[!'()*]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16);
      });
    }

    this.decode = decode;
    function decode(s)
    { return decodeURIComponent(s); }

  });


  /**
   * @class
   * */
  this.Owned = Owned;
  /* abstract */ function Owned(owner)
  {
    if(!like_obj(owner))
      throw "Invalid owner instance reference specified";

    /* Getters */
    Object.defineProperty(this, 'owner', {
      get: function () { return this.owner_; } } );

    /* Attributes */
    this.owner_ = owner;
  }


  /**
   * @class
   * */
  this.Controller = Controller;
  /* abstract */ function Controller(owner)
  {
    /* Invoke super constructor. */
    Owned.call(this, owner);
  }

  /* Following method to allow for deferred initialisation. */
  /* abstract */ Controller.prototype.initialise = absm_noti;
  /* abstract */ Controller.prototype.reset      = absm_noti;


  /**
   * @class
   * */
  this.Drawable = Drawable;
  /* abstract */ function Drawable(owner)
  {
    /* Invoke super constructor. */
    Owned.call(this, owner);
  }

  /* abstract */ Drawable.prototype.render = absm_noti;


  /**
   * @class
   * */
  this.Callbacks = Callbacks;
  function Callbacks(map)
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
  }

  Callbacks.prototype.exists = function (callback)
  { return this.map_.hasOwnProperty(callback); };

  /** Invoke a callback with optional parameters.
   *
   * The callback is always required to exist. If it doesn't exist, an
   * exception is thrown.
   *
   * @param {string} name       - Name of callback to invoke.
   * @param {*}      parameters - One or more parameters to pass to callback.
   * */
  Callbacks.prototype.invoke = function ( /* (name, arg0..n) */ )
  {
    if(arguments.length < 1)
      throw "Callback name not specified";

    return this.call_(arguments[0], true,
                      Array.prototype.splice.call(arguments, 1));
  };

  /** Invoke a callback with optional parameters <strong>if</strong>, if it
   * exists.
   *
   * The callback is not required to exist and, in this event,
   * <code>undefined</code> is returned.
   *
   * @param {string} name       - Name of callback to invoke.
   * @param {*}      parameters - One or more parameters to pass to callback.
   * */
  Callbacks.prototype.invokeMaybe = function ( /* (name, arg0..n) */ )
  {
    if(arguments.length < 1)
      throw "Callback name not specified";

    return this.call_(arguments[0], false,
                      Array.prototype.splice.call(arguments, 1));
  };

  /** Invoke a callback with optional parameters.
   *
   * The callback may optionally <strong>not</strong> be required to exist if
   * the <code>mandatory</code> argument is <code>false</code>, in which case
   * no further action is taken and <code>null</code> is returned.
   *
   * @param {string}  name      - Name of callback to invoke.
   *
   * @param {boolean} mandatory - If true, the callback must exist and an
   * exception is thrown if it doesn't.
   *
   * @param {*}       parameters - One or more parameters to pass to callback.
   * */
  Callbacks.prototype.call = function (/* (name, mandatory = true, arg0..n) */)
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

      return undefined;
    }

    var result = callback.apply(null, args);
    this.onPostCall(name, result);
    return result;
  };


  /**
   * @class
   * */
  this.Constructor = Constructor;
  function Constructor(map)
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
  }

  /* Static interface */
  Constructor.exists = function (obj, name)
  {
    if(!like_obj(obj))
      throw "Invalid or no object specified";

    return any_in(obj, name, 'create' + name);
  };

  /* Instance interface */
  Constructor.prototype.exists = function (name)
  {
    return any_in(this.map_, name, 'create' + name);
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
  this.ControllerGlobalKeyboard = ControllerGlobalKeyboard;
  function ControllerGlobalKeyboard(owner)
  {
    /* Invoke super constructor. */
    Controller.call(this, owner);
  }

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
  var DragDropManager;
  DragDropManager = this.DragDropManager = new (function () {

    var activeNode = null;

    /* Interface */
    this.isScope = isScope;
    function isScope(event, scopes)
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
    }

    this.getScope = getScope;
    function getScope(event)
    {
      return activeNode
        ? activeNode.getAttribute('data-scope')
        : null;
    }

    this.hasScope = hasScope;
    function hasScope(all, target)
    {
      return (is_arr(all) ? all : [ all ])
        .some(function (s) {
          return s === target;
        } );
    }

    /* Event handlers */
    this.onDragStart = onDragStart;
    function onDragStart(event) {
      activeNode = (event.originalEvent || event).target;
    }

    this.onDragEnd = onDragEnd;
    function onDragEnd(event) {
      if(activeNode === (event.originalEvent || event).target) {
        activeNode = null;
      }
    }

    this.reset = reset;
    function reset() { activeNode = null; }

  } );


  /**
   * @class
   * */
  this.Draggable = Draggable;
  function Draggable(node, options)
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
  }


  /**
   * @class
   * */
  this.Droppable = Droppable;
  function Droppable(node, options)
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
            console.error("Exception occurred:", x);
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
  this.Observable = Observable;
  function Observable()
  {
    /* Attributes */
    this.observers_ = [ ];
  }

  Observable.prototype.exists = function (observer)
  {
    return this.observers.some(function (ob) {
      return ob == observer;
    } );
  };

  Observable.prototype.register = function (observer)
  {
    if(this.exists(observer))
      throw "Observer already registered";
    else if(typeof observer !== 'function' && !(observer instanceof Observer))
      throw "Invalid observer instance or function reference specified";

    this.observers_.push(observer);
  };

  Observable.prototype.unregister = function (observer)
  {
    var index = this.observers_.indexOf(observer);

    if(index !== -1) {
      this.observers_.splice(index, 1);
      return;
    }

    throw "Observer not registered";
  };

  Observable.prototype.notify = function ( /* (arg0..n) */ )
  {
    this.observers_.forEach(function (observer) {
      /* `observer´ here may be either a function or is expected to be a class
       * instance implementing a method by the name `update´.  */
      if(typeof observer === 'function')
        observer.apply(observer, arguments);
      else
        observer.update.apply(observer, arguments);
    } );
  };


  /**
   * @class
   * */
  this.Observer = Observer;
  function Observer(owner, callback)
  {
    Owned.call(this, owner);

    if(!is_fn(callback))
      throw "Invalid or no callback function specified";

    /* Attributes */
    this.callback_ = callback;
  }

  Observer.prototype = Object.create(Owned.prototype);

  Observer.prototype.update = function ( /* (arg0..argn) */ )
  {
    this.callback_.apply(null, arguments);
  };


  /**
   * @class
   * */
  this.Events = Events;
  function Events( /* <owner, names> | <names> */ )
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
      ent = this.owner_ = arguments[0];

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
    } else {
      this.owner_ = null;
      ent = arguments[0];
    }

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
  }

  Events.prototype.extend = function (names)
  {
    var self = this;

    if(!is_arr(names))
      throw "Invalid or no event array specified";

    names.forEach(function (e) {
      if(self.map_.hasOwnProperty(e))
        console.info("Event already defined: %s", e);
      else
        self.map_[e] = [ ];
    } );
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
    var self = this,
        ev = arguments[0];

    if(!is_str(ev) || ev.length === 0)
      throw "Invalid or no event name specified";

    var d = this.map_[ev];
    if(is_arr(d)) {
      var args = Array.prototype.splice.call(arguments, 1);

      d.forEach(function (fn) {
        try {
          fn.apply(self.owner_, args);
        } catch(x) {
          on_exception(x);
        }
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
        var ct = 0,
            cg = 0;

        for(var k in ev) {
          ++ct;
          if(this.register_single_(k, ev[k])) ++cg;
        }

        return cg === ct;
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

      this.map_[ev].splice(index, 1);
    }

    return true;
  };


  /**
   * @class
   * */
  this.View = View;
  function View(owner)
  {
    /* Invoke super constructor. */
    Drawable.call(this, owner);
  }

  View.prototype = Object.create(Drawable.prototype);

  View.prototype.reset = absm_noti;


  /**
   * @class
   * */
  this.Position = Position;
  function Position(l, t)
  {
    if(arguments.length === 2) this.set(l, t);
    else this.set(0, 0);

    this.__defineGetter__("left", function () { return this.left_; } );
    this.__defineGetter__("top", function () { return this.top_; } );

    this.__defineSetter__("left", function (l) { this.left_ = l; } );
    this.__defineSetter__("top", function (t) { this.top_ = t; } );
  }

  Position.prototype.set = function (l, t)
  {
    this.left_ = l;
    this.top_ = t;
  };


  /**
   * @class
   * */
  this.Size = Size;
  function Size(w, h)
  {
    if(arguments.length === 2) this.set(w, h);
    else this.set(0, 0);

    this.__defineGetter__("width", function () { return this.width_; } );
    this.__defineGetter__("height", function () { return this.height_; } );

    this.__defineSetter__("width", function (w) { this.width_ = w; } );
    this.__defineSetter__("height", function (h) { this.height_ = h; } );
  }

  Size.prototype.set = function (w, h)
  {
    this.width_ = w;
    this.height_ = h;
  };


  /**
   * @class
   * */
  this.PositionSize = PositionSize;
  function PositionSize(l, t, w, h)
  {
    if(arguments.length === 1) {
      if(!is_obj(l))
        throw "Invalid or no object specified";

      this.set(l.left, l.top, l.width, l.height);
    } else if(arguments.length === 4) this.set(l, t, w, h);
    else this.set(0, 0, 0, 0);

    /* Getters */
    this.__defineGetter__("left", function () { return this.left_; } );
    this.__defineGetter__("top", function () { return this.top_; } );

    this.__defineGetter__("right", function () {
      return this.width_ > 0 ? this.left_ + this.width_ - 1 : this.left_; } );

    this.__defineGetter__("bottom", function () {
      return this.height_ > 0 ? this.top_ + this.height_ - 1 : this.top_; } );

    /* Setters */
    this.__defineGetter__("width", function () { return this.width_; } );
    this.__defineGetter__("height", function () { return this.height_; } );

    this.__defineSetter__("left", function (l) { this.left_ = l; } );
    this.__defineSetter__("top", function (t) { this.top_ = t; } );

    this.__defineSetter__("width", function (w) { this.width_ = w; } );
    this.__defineSetter__("height", function (h) { this.height_ = h; } );
  }

  /* Interface */
  PositionSize.prototype.set = function (l, t, w, h)
  {
    this.left_ = l;
    this.top_ = t;

    this.width_ = w;
    this.height_ = h;
  };

  PositionSize.prototype.toObject = function ()
  {
    return {
      left: this.left_,
      top: this.top_,
      width: this.width_,
      height: this.height_
    };
  };

  return this;
}, this);
