/**
 * @file Sorting Desk extension dragnet component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */

/*jshint laxbreak:true */


this.Dragnet = (function (window, $, std, d3, dn, undefined) {

  /**
   * @namespace
   * */
  dn = dn || { };


  /**
   * @namespace
   * */
  var vis = dn.vis = dn.vis || { };


  /**
   * @class
   * */
  vis.Vis = function (options, defaults)
  {
    this.options = $.extend(true, { }, defaults, options);
    this.dataset = null;
    this.vis = null;
    this.events = new std.Events(this, [ "select" ]);
  };

  vis.Vis.prototype = Object.create(vis.Vis.prototype);

  vis.Vis.prototype.create = function ()
  {
    if(this.vis) throw "Visualisation instance exists";
    this.refresh();
  };

  vis.Vis.prototype.refresh = std.absm_noti;

  vis.Vis.prototype.destroy = function ()
  {
    if(!this.vis) throw "No visualization instance";
    if(std.is_fn(this.vis.stop)) this.vis.stop();
    this.options.container.empty();
    this.options = this.dataset = this.vis = null;
  };


  return dn;

} )(this,
    this.$,
    this.SortingCommon,
    this.d3,
    this.Dragnet);