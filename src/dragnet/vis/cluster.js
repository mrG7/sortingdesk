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
    minRadius:      2,
    maxRadius:      12,
    marginText:     5,
    gravity:        0.02,
    charge:         0
  };


  /**
   * @class
   * */
  vis.Cluster = function (options)
  {
    vis.Vis.call(this, options, defaults);
  };

  vis.Cluster.prototype = Object.create(vis.Vis.prototype);

  vis.Cluster.prototype.refresh = function ()
  {
    var opts = this.options,
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

    var color = d3.scale.category10()
          .domain(d3.range(1));

    var svg = d3.select(opts.container.get(0)).append("svg")
          .attr("width", w)
          .attr("height", h);

    var node = svg.selectAll("g.node")
          .data(this.dataset.nodes);

    var enter = node.enter().append("g")
          .attr("class", "node")
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
	    .text(function(d) { return d.name || "no-name"; });

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
      node.sort(function (a, b) {
        if(a !== d) return -1;
        return 1;
      } );

      node.attr("class", function (e) {
        var cl = [ "node" ];
        if(e.cluster === d.cluster) cl.push("show");
        if(e === d) cl.push("over");
        return cl.join(" ");
      } );
    }

    function onMouseOut(d) {
      node.attr("class", "node");
    }

    function onDoubleClick(d) {
      console.log("event: double click: ", d);
    }
  };


  return dn;

} )(this,
    this.$,
    this.SortingCommon,
    this.d3,
    this.Dragnet);