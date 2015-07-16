/**
 * @file Sorting Desk extension dragnet component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */

/*jshint laxbreak:true */


this.Dragnet = (function (window, $, std, dn, undefined) {

  /**
   * @namespace
   * */
  dn = dn || { };


  /* Constants */
  var DEFAULT_VISUALISATION = "Cluster";

  /* Default options */
  var defaults = {
    container: "dn-vis"
  };


  /**
   * @class
   * */
  dn.Dragnet = function (options)
  {
    this.options = $.extend(true, { }, options, defaults);
    this.api = dn.api.construct(this.options.api);
    this.vis = {
      Type: null,
      instance: null
    };
    this.data = null;
    this.events = new std.Events(this, [ "loadbegin", "loadend", "select" ]);

    this.options.container = $(
      document.getElementById(this.options.container)
    );

    console.info("Dragnet instantiated");
  };

  dn.Dragnet.prototype.create = function (nc /* name-or-class */)
  {
    if(this.vis.instance) throw "Visualisation instance exists";
    return this.switch(nc || DEFAULT_VISUALISATION);
  };

  dn.Dragnet.prototype.reload = function ()
  {
    var self = this;

    if(!this.vis.Type) throw "Visualisation type not set";

    this.events.trigger("loadbegin");
    var end = function () { self.events.trigger("loadend"); };

    return this.api.fetch().then(function (data) {
      if(!std.is_arr(data)) console.error("Data invalid", data);
      else {
        self.data = data;
        self.switch(self.vis.Type);
      }

      end();

      return self.data;
    }, end);

  };

  dn.Dragnet.prototype.switch = function (nc)
  {
    var self = this;
    var instantiate = function () {
      return (self.vis.instance = new self.vis.Type(self.data, self.options))
        .on("select", function (c) { self.events.trigger("select", c); } )
        .create();
    };

         if(std.is_str(nc)) nc = dn.vis[nc];
    else if(!std.is_fn(nc)) nc = dn.vis[DEFAULT_VISUALISATION];
    if(!std.is_fn(nc)) throw "Invalid visualisation specified";
    this.vis.Type = nc;

    if(this.vis.instance) this.vis.instance.destroy();
    return this.data ? instantiate() : this.reload();
  };

  dn.Dragnet.prototype.destroy = function ()
  {
    if(!this.vis.instance) throw "No visualization instance";
    this.vis.destroy();
    this.options = this.api = this.vis = null;
  };


  return dn;

} )(this,
    this.$,
    this.SortingCommon,
    this.Dragnet);