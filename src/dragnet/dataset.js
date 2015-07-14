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
    minRadius: 2,
    maxRadius: 12
  };


  dn.Dataset = function (classes, options)
  {
    if(!std.is_arr(classes) || classes.length === 0)
      throw "Dataset empty";

    options = $.extend(true, { }, options, defaults);
    options.maxRadius -= options.minRadius;

    var clusters = this.clusters = [ ],
        nodes = this.nodes = [ ];

    classes.forEach(function (cl) {
      if(!std.is_arr(cl) || cl.length === 0)
        throw "Invalid class";

      var cluster = clusters.length,
/*           min = cl[0].weight, */
          max = 0;

      /* Find minimum. */
/*       cl.forEach(function (c) { if(c.weight < min) min = c.weight; } ); */

      /* Adjust weights to be 0-based and find maximum. */
      cl.forEach(function (c) {
/*         var w = c.weight -= min; */
        var w = c.weight;
        if(w > max) max = w;
      } );

      /* Add default cluster descriptor. */
      clusters.push( { radius: 0 } );

      /* Ready to normalise weights. */
      cl.forEach(function (c, i) {
        var w = c.weight;
        w = options.maxRadius * w / max + options.minRadius;
        var d = { cluster: cluster, radius: w, name: c.name };

        if(w > clusters[cluster].radius) clusters[cluster] = d;
        nodes.push(d);
      } );
    } );
  };


  return dn;

} )(this,
    this.$,
    this.SortingCommon,
    this.Dragnet);