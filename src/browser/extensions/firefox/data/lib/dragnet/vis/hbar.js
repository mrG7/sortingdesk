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


  /* Default options */
  var defaults = {
    container:      $()
  };


  /**
   * @class
   * */
  var Dataset = function (classes, options)
  {
    if(!std.is_arr(classes) || classes.length === 0)
      throw "Dataset empty";

    options = $.extend(true, { }, options, defaults);
    options.maxRadius -= options.minRadius;

    var self = this,
        weights = this.weights = [ ],
        names = this.names = [ ];

    this.max = 0;
    classes.forEach(function (cl) {
      if(!std.is_arr(cl) || cl.length === 0)
        throw "Invalid class";

      var max = 0;

      /* Find maximum weight. */
      cl.forEach(function (c) {
        var w = c.weight;
        if(w > max) max = w;
      } );

      if(max > self.max) self.max = max;

      cl.forEach(function (c) {
        weights.push(c.weight / max);
        names.push({
          parent: c.parent,
          caption: c.caption
        });
      } );
    } );
  };


  /**
   * @class
   * */
  vis.Hbar = function (data, options)
  {
    vis.Vis.call(this, options, defaults);
    this.dataset = new Dataset(data, options);
  };

  vis.Hbar.prototype = Object.create(vis.Vis.prototype);

  vis.Hbar.prototype.refresh = function ()
  {
    var self = this,
        opts = this.options,
        weights = this.dataset.weights,
        names = this.dataset.names,
        w = opts.container.width();

    var margin = 20;

    var gap = 2, yRangeBand;

    var barHeight = 20,
        leftWidth = 210;

    var format = d3.format(".3f");

    yRangeBand = barHeight + 2 * gap;
    var x = d3.scale.linear()
          .domain([0, 1])
          .range([0, w - leftWidth - margin * 2 - 10]);

    var y = function(i) { return yRangeBand * i; };

    var chart = this.vis = d3.select(opts.container.get(0))
          .append('svg')
          .attr('class', 'hbar')
          .attr('width', w - margin)
          .attr('height', (barHeight + gap * 2) * names.length + 30)
          .append("g")
          .attr("transform", "translate(10, 20)");

    chart.selectAll("line")
      .data(x.ticks(1))
      .enter().append("line")
      .attr("x1", function(d) { return x(d) + leftWidth; })
      .attr("x2", function(d) { return x(d) + leftWidth; })
      .attr("y1", 0)
      .attr("y2", (barHeight + gap * 2) * names.length);

    chart.selectAll(".rule")
      .data(x.ticks(20))
      .enter().append("text")
      .attr("class", "rule")
      .attr("x", function(d) { return x(d) + leftWidth; })
      .attr("y", 0)
      .attr("dy", -6)
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .text(String);

    chart.selectAll("rect.bar")
      .data(weights)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", leftWidth)
      .attr("y", function(d, i) { return y(i) + gap; })
      .attr("width", 0)
      .attr("height", barHeight);

    chart.selectAll("text.score")
      .data(weights)
      .enter().append("text")
      .attr("x", function(d) { return x(d) + leftWidth; })
      .attr("y", function(d, i) { return y(i) + yRangeBand/2;})
      .attr("dx", -5)
      .attr("dy", ".36em")
      .attr("text-anchor", "end")
      .attr('class', 'score')
      .text(format);

    chart.selectAll("text.name")
      .data(names)
      .enter().append("text")
      .attr("y", function(d, i){ return y(i) + yRangeBand/2; } )
      .attr("dy", ".36em")
      .attr('class', 'name')
      .text(function (d) {
        var text = d3.select(this),
            words = d.caption.split(/\s+/);

        do {
          var line = words.join(" ");
          if(text.text(line).node().getComputedTextLength() < leftWidth)
            return line;
        } while(words.pop());
      } )
      .on("click", function (d, i) {
        console.log($.extend({ }, { parent: d.parent }, d));
        self.events.trigger(
          "select",
          $.extend({ }, { weight: weights[i] }, d)
        );
      } );

    chart.selectAll("rect.bar")
			.data(weights)
			.transition()
			.duration(1000)
			.attr("width", x);
  };


  return dn;

} )(this,
    this.$,
    this.SortingCommon,
    this.d3,
    this.Dragnet);