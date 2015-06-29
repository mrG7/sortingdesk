/**
 * @file Sorting Desk: facets component.
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
  var facets = sd.facets = sd.facets || { };


  /**
   * @class
   * */
  facets.Controller = function (owner, nodes)
  {
    std.Controller.call(this, owner);

    this.container = null;
    this.active = false;
    this.facets = null;
    this.timer = null;
  };

  facets.Controller.prototype = Object.create(std.Controller.prototype);

  facets.Controller.prototype.initialise = function ()
  {
    var self = this,
        nodes = this.owner.nodes.facets;

    this.container = nodes.container;
    this.ul = this.container.find('UL');

    this.active = this.container.is(':visible');
    this.owner.nodes.toolbar.filter
      .toggleClass('active', this.active)
      .click(function () { self.toggle(); } );

    nodes.all.click( function () { self.checkAll(true); } );
    nodes.none.click(function () { self.checkAll(false); } );

    this.owner.sortingQueue.on('loading-begin', function () {
      self.clear(true);
    } );
    this.owner.explorer.on('refresh-begin', this.hide.bind(this));
    this.clear();
  };

  facets.Controller.prototype.reset = function ()
  {
    var nodes = this.owner.nodes.facets;

    this.clear();
    nodes.all.off(); nodes.none.off();

    /* TODO: dettach events for `sortingQueue` and `explorer` (see initialise
     * above). */
  };

  facets.Controller.prototype.assign = function (data)
  {
    var self = this,
        nodes = this.owner.nodes.facets,
        sf = [ ];

    if(!std.is_obj(data) || !std.is_obj(data.facets)) {
      $.each(nodes, function (k, n) { n.addClass('disabled'); } );
      this.facets = null;
      return;
    }

    $.each(nodes, function (k, n) { n.removeClass('disabled'); } );
    this.facets = data.facets;

    /* Sort facets by count before updating the user interface. */
    for(var k in data.facets) sf.push({ label: k,
                                        count: data.facets[k].length });
    sf.sort(function (l, r) {
      /* Note that we're sorting the facets in reverse order. */
      if(l.count < r.count)       return 1;
      else if(l.count > r.count)  return -1;
      return l.label === r.label ? 0 : (l.label < r.label ? 1 : -1);
    } );

    sf.forEach(function (k) {
      self.ul.append($('<li><label><input type="checkbox" value="'
                       + k.label + '" checked>'
                       + '<span>' + k.count + '</span>'
                       + k.label + '</label>'
                       + '<a href="#">(only)</a></li>'));
    } );

    this.ul.find('LI')
      .click(function (ev) {
        var target = ev.originalEvent.target.nodeName.toLowerCase(),
            $inp = $('INPUT', this);

        if(target === 'a')
          self.exclude($inp);
        else
          self.schedule();
      } );


    this.owner.nodes.facets.empty.fadeOut(function () { self.ul.fadeIn(); } );
  };

  facets.Controller.prototype.exclude = function (input)
  {
    this.checkAll(false);
    input.prop('checked', true);
  };

  facets.Controller.prototype.checkAll = function (state)
  {
    this.container.find('UL INPUT').prop('checked', state);
    this.schedule();
  };

  facets.Controller.prototype.clear = function (now)
  {
    var self = this;

    this.ul
      .fadeOut(now === true ? 0 : "fast",
               function () { self.owner.nodes.facets.empty.fadeIn(); } )
      .empty();
  };

  facets.Controller.prototype.schedule = function ()
  {
    var self = this;

    this.cancel();
    this.timer = window.setTimeout(function () {
      self.timer = null;
      self.update();
    }, this.owner.options.delays.facets);
  };

  facets.Controller.prototype.cancel = function ()
  {
    if(this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  };

  facets.Controller.prototype.update = function ()
  {
    if(this.facets === null) {
      console.error("Facets unavailable");
      return;
    }

    var self = this,
        ids = { };

    this.cancel();

    this.ul.find('INPUT:checked').each(function () {
      self.facets[this.value].forEach(function (cid) {
        if(ids[cid] !== true)
          ids[cid] = true;
      } );
    } );

    this.owner.sortingQueue.items.filter(function (item) {
      return item.content_id in ids;
    } );
  };

  facets.Controller.prototype.toggle = function ()
  {
    if(this.active) this.hide();
    else            this.show();
  };

  facets.Controller.prototype.show = function ()
  {
    this.owner.nodes.toolbar.filter.toggleClass('active', this.active = true);
    this.container.slideDown('fast', function () {
      $(this).css('visibility', 'visible').fadeIn("fast");
    } );
  };

  facets.Controller.prototype.hide = function ()
  {
    this.owner.nodes.toolbar.filter.toggleClass('active', this.active = false);
    this.container.fadeOut('fast', function () {
      $(this).slideUp("fast");
    } );
  };


  return sd;

})(this,
   this.$,
   this.SortingCommon,
   this.SortingDesk);