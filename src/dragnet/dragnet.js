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

  dn.Dragnet.prototype.create = function ()
  {
    var self = this;

    if(this.vis) throw "Visualisation instance exists";

    this.events.trigger("loadbegin");
    return this.api.getClasses().then(function (classes) {
      return self.api.computeWeights(classes);
    } ).then(function (classes) {
      self.vis = new dn.Visualisation(self.options);
      self.vis.create(new dn.Dataset(classes));
      self.events.trigger("loadend");
    } );
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