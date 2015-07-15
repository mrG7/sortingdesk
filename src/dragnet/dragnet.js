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
    this.vis = null;
    this.events = new std.Events(this, [ "loadbegin", "loadend" ]);

    this.options.container = $(
      document.getElementById(this.options.container)
    );

    console.info("Dragnet instantiated");
  };

  dn.Dragnet.prototype.create = function (Vis)
  {
    if(this.vis) throw "Visualisation instance exists";
    if(!std.is_fn(Vis)) Vis = dn.vis[DEFAULT_VISUALISATION];
    return this.switch(Vis);
  };

  dn.Dragnet.prototype.switch = function (Vis)
  {
    var self = this;

    if(!std.is_fn(Vis)) throw "Invalid visualisation constructor";
    if(this.vis) this.vis.destroy();

    var end = function () { self.events.trigger("loadend"); };

    this.events.trigger("loadbegin");
    return this.api.getClasses().then(function (classes) {
      return self.api.computeWeights(classes);
    }, end).then(function (classes) {
      self.vis = new Vis(self.options);
      self.vis.create(new dn.Dataset(classes));
      end();
    }, end);
  };

  dn.Dragnet.prototype.destroy = function ()
  {
    if(!this.vis) throw "No visualization instance";
    this.vis.destroy();
    this.options = this.api = this.vis = null;
  };


  return dn;

} )(this,
    this.$,
    this.SortingCommon,
    this.Dragnet);