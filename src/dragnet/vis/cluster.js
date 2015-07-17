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
    container:      $(),
    padding:        1.5,        /* between same-cluster circles */
    clusterPadding: 6,          /* between different-cluster circles */
    minRadius:      3,
    maxRadius:      20,
    marginText:     5,
    gravity:        0.02,
    charge:         0
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

    var clusters = this.clusters = [ ],
        nodes = this.nodes = [ ];

    classes.forEach(function (cl) {
      if(!std.is_arr(cl) || cl.length === 0)
        throw "Invalid class";

      var cluster = clusters.length,
          max = 0;

      /* Find maximum weight. */
      cl.forEach(function (c) {
        var w = c.weight;
        if(w > max) max = w;
      } );

      /* Ensure root node has maximum weight at a minimum. */
      cl.some(function (c) {
        if(!c.parent) {
          if(c.weight < max) {
            console.warn("Root node's weight below maximum: fixing");
            c.weight = max;
          }

          return true;
        }
      } );

      /* Add default cluster descriptor. */
      clusters.push( { radius: 0 } );

      /* Ready to normalise weights. */
      cl.forEach(function (c, i) {
        var w = c.weight;
        w = options.maxRadius * w / max + options.minRadius;
        var d = {
          cluster: cluster,
          radius: w,
          data: {
            parent: c.parent,
            caption: c.caption,
            weight: c.weight
          }
        };

        if(w > clusters[cluster].radius) clusters[cluster] = d;
        nodes.push(d);
      } );
    } );
  };


  /**
   * @class
   * */
  vis.Cluster = function (data, options)
  {
    vis.Vis.call(this, options, defaults);
    this.dataset = new Dataset(data, options);
  };

  vis.Cluster.prototype = Object.create(vis.Vis.prototype);

  vis.Cluster.prototype.refresh = function ()
  {
    var self = this,
        opts = this.options,
        dataset = this.dataset,
        w = opts.container.width(),
        h = opts.container.height();

    var force = this.vis = d3.layout.force()
          .nodes(dataset.nodes)
          .size([w, h])
          .gravity(opts.gravity)
          .charge(opts.charge)
          .on("tick", tick)
          .start();

    var color = d3.scale.category20()
          .domain(d3.range(this.dataset.nodes.length));

    var svg = d3.select(opts.container.get(0))
          .append("svg")
          .attr("width", w)
          .attr("height", h);

    var node = svg.selectAll("g.node")
          .data(this.dataset.nodes);

    var enter = node.enter().append("g")
          .sort(function (a, b) { return !!a.data.parent ? -1 : 1; })
          .attr("class", function (d) {
            return !d.data.parent ? "node root show" : "node";
          } )
          .on("mouseover", onMouseOver)
          .on("mouseout", onMouseOut)
          .on("dblclick", onDoubleClick)
          .call(force.drag);

    enter.append("svg:circle")
      .attr("r", function(d) { return d.radius; })
      .style("fill", function(d) { return color(d.cluster); });

    enter.append("text")
      .attr("x", function(d) { return d.radius + opts.marginText; })
	    .attr("dy", ".35em")
	    .text(function(d) { return d.data.caption || "no-name"; });

    function tick(e) {
      node
        .each(cluster(10 * e.alpha * e.alpha))
        .each(collide(.5))
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; });

      node.attr("transform", function (d) {
        return "translate(" + [d.x, d.y] + ")";
      } );
    }

    /* Move `d` to be adjacent to the cluster node. */
    function cluster(alpha) {
      return function(d) {
        var cluster = dataset.clusters[d.cluster];
        if (cluster === d) return;
        var x = d.x - cluster.x,
            y = d.y - cluster.y,
            l = Math.sqrt(x * x + y * y),
            r = d.radius + cluster.radius;
        if (l != r) {
          l = (l - r) / l * alpha;
          d.x -= x *= l;
          d.y -= y *= l;
          cluster.x += x;
          cluster.y += y;
        }
      };
    }

    /* Resolve collisions between `d` and all other nodes. */
    function collide(alpha) {
      var quadtree = d3.geom.quadtree(dataset.nodes);
      return function(d) {
        var r = d.radius + opts.maxRadius
              + Math.max(opts.padding, opts.clusterPadding),
            nx1 = d.x - r,
            nx2 = d.x + r,
            ny1 = d.y - r,
            ny2 = d.y + r;

        quadtree.visit(function(quad, x1, y1, x2, y2) {
          if (quad.point && (quad.point !== d)) {
            var x = d.x - quad.point.x,
                y = d.y - quad.point.y,
                l = Math.sqrt(x * x + y * y),
                r = d.radius + quad.point.radius
                  + (d.cluster === quad.point.cluster
                     ? opts.padding : opts.clusterPadding);

            if (l < r) {
              l = (l - r) / l * alpha;
              d.x -= x *= l;
              d.y -= y *= l;
              quad.point.x += x;
              quad.point.y += y;
            }
          }

          return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        } );
      };
    }

    function onMouseOver(d) {
      node
        .sort(function (a, b) {
               if(a === d)                   return 1;
          else if(b === d && !a.data.parent) return -1;
          return !a.data.parent ? 1 : -1;
        })
        .attr("class", function (e) {
          var c = [ "node" ];
          if(!e.data.parent) c.push("root show");
          if(e === d) c = c.concat(["over", "show"]);
          return c.join(" ");
        } );
    }

    function onMouseOut(d) {
      node.attr("class", function (d) {
        return !d.data.parent ? "node root show" : "node";
      });
    }

    function onDoubleClick(d) {
      console.log(d);
      self.events.trigger("select", $.extend({ }, d.data));
    }
  };


  return dn;

} )(this,
    this.$,
    this.SortingCommon,
    this.d3,
    this.Dragnet);