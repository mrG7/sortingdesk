/**
 * @file Sorting Desk: explorer component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingCommon´ component.
 *
 */

this.SortingDesk = (function (window, $, std, sd, undefined) {

  /**
   * @namespace
   * */
  sd = sd || { };
  var explorer = sd.explorer = sd.explorer || { };


  /**
   * @class
   * */
  explorer.ItemBase = function (owner)
  {
    /* Invoke base class constructor. */
    std.Drawable.call(this, owner);

    /* Getters */
    var def = Object.defineProperty;
    def(this, 'id', { get: function () { return this.id_; } } );
    def(this, 'controller', { get: function () {return this.controller_;}});
    def(this, 'api', { get: function () { return this.controller_.api; } } );
    def(this, 'tree', { get: function () { return this.controller_.tree; } } );
    def(this, 'opening', { get: function () { return this.opening_; } } );
    def(this, 'events', { get: function () { return this.events_; } } );
    def(this, 'loaded', { get: function () { return this.loaded_; } } );
    def(this, 'status', { get: function () { return this.status_; } } );

    def(this, 'node', { get: function () {
      return this.controller.tree.get_node(this.id_, true); } } );

    def(this, 'nodeData', { get: function () {
      return this.controller.tree.get_node(this.id_); } } );

    /* Attributes */
    var ctrl = owner;
    while(ctrl !== null && !(ctrl instanceof explorer.Controller))
      ctrl = ctrl.owner;
    if(ctrl === null) throw "Controller not found";

    this.controller_ = ctrl;
    this.loading_ = 0;
    this.id_ = null;
    this.status_ = null;
    this.opening_ = false;
    this.loaded_ = false;
    this.events_ = new std.Events(
      this,
      [ 'loading-start', 'loading-end', 'ready' ]
    );
    this.processing_ = { };

    this.on( {
      "loading-end": ctrl.updateToolbar.bind(ctrl),
      "loaded":      ctrl.updateToolbar.bind(ctrl)
    } );
  };

  explorer.ItemBase.prototype.select = function (focus /* = false */)
  {
    this.tree.select_node(this.id);
    if(focus === true) this.focus();
  };

  explorer.ItemBase.prototype.open = function (focus /* = false */)
  {
    /* Don't attempt to open if already opening as it will result in a stack
     * overflow error and catastrophic failure. */
    if(!this.opening_) {
      this.opening_ = true;
      this.tree.open_node(this.id_);
    }

    if(this.focus === true) this.select_node(true);
  };

  explorer.ItemBase.prototype.focus = function ()
  {
    this.tree.get_node(this.id, true).children(".jstree-anchor").focus();
  };

  explorer.ItemBase.prototype.onAfterOpen = function ()
  { this.opening_ = false; };

  explorer.ItemBase.prototype.setLoaded = function (state)
  {
    this.loaded_ = state;

    if(state)
      this.events_.trigger('loaded');
  };

  explorer.ItemBase.prototype.loading = function (state /* = true */)
  {
    if(arguments.length === 0)
      return this.loading_ > 0;

    if(state === false) {
      if(this.loading_ <= 0)
        console.error("Loading count is 0");
      else if(--this.loading_ === 0) {
        this.removeClass("jstree-loading");
        this.events_.trigger('loading-end');
      }
    } else if(state === true) {
      if(++this.loading_ === 1)
        this.events_.trigger('loading-begin');
    }

    /* Always force class. */
    if(this.loading_ > 0)
      this.addClass("jstree-loading");
  };

  explorer.ItemBase.prototype.addClass = function (cl)
  {
    var n = this.nodeData.li_attr,
        coll;

    if(n === undefined) return;
    coll = this.get_classes_(n);

    if(coll.indexOf(cl) === -1) {
      coll.push(cl);
      n.class = coll.join(' ');
      this.node.addClass(cl);
    }
  };

  explorer.ItemBase.prototype.removeClass = function (cl)
  {
    if(this.nodeData === undefined) return;

    var n = this.nodeData.li_attr,
        coll, ndx;

    if(n === undefined) return;
    coll = n.class.split(' ');
    ndx = coll.indexOf(cl);

    if(ndx >= 0) {
      coll.splice(ndx, 1);
      n.class = coll.join(' ');
      this.node.removeClass(cl);
    } else
      console.warn("CSS class not found: %s", cl);
  };

  explorer.ItemBase.prototype.setStatus = function (status)
  {
    if(this.status_ !== null)  this.status_.dettach();
    if(status !== null)        status.attach(this.node);

    this.status_ = status;
  };

  explorer.ItemBase.prototype.processing = function (name)
  {
    if(name === undefined) {
      for(var k in this.processing_) return true;
      return false;
    } else if(!std.is_str(name))
      throw "Invalid process name";

    return name in this.processing_;
  };

  explorer.ItemBase.prototype.setProcessing = function (name, instance)
  {
    if(!std.is_str(name)) throw "Invalid process name";
    else if(instance) {
      if(name in this.processing_) throw "Already processing: " + name;
      this.processing_[name] = instance;
    } else
      delete this.processing_[name];
  };

  /* Private interface */
  explorer.ItemBase.prototype.get_classes_ = function (attr)
  {
    if(!std.is_str(attr.class)) {
      attr.class = '';
      return [ ];
    }

    return attr.class.split(' ');
  };


  return sd;

})(this,
   this.$,
   this.SortingCommon,
   this.SortingDesk);