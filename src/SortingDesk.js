/** SortingDesk.js --- Sorting Desk
 *
 * Copyright (C) 2014 Diffeo
 *
 * Author: Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 * 
 */

var SortingDesk = function(options, callbacks)
{
  var self = this;

  console.log("Initialising Sorting Desk UI");
  
  this.options = jQuery.extend({}, SortingDesk.defaults, options);
  this.callbacks = callbacks;
  this.bins = [ ];
  
  var height = $(window).height() - 50;
  
  this.options.nodes.items.height(height);
  this.options.nodes.bins.height(height);

  callbacks.getBinData([ options.primaryContentId ]
                       .concat(options.secondaryContentIds))
    .done(function(bins) {
      self.initialise(bins);
    } );
};


/* Do not make the following instantiable. */
SortingDesk.defaults = {
  css: {
    primaryBin: "wrapper-primary-bin",
    leftmostBin: "left"
  },
  visibleItems: 20              /* Arbitrary. */
};


SortingDesk.prototype = {
  callbacks: null,
  options: null,
  bins: null,
  list: null,

  initialise: function (bins)
  {
    /* Firstly process primary bin. */
    if(bins[this.options.primaryContentId].error)
      throw "Failed to retrieve contents of primary bin";
    
    this.bins.push(new BinPrimary(this,
                                  this.options.primaryContentId,
                                  bins[this.options.primaryContentId]));

    /* Delete to avoid repetition below. */
    delete bins[this.options.primaryContentId];

    /* Now, create secondary bins */
    var count = 0;
    
    for(var id in bins) {
      var bin = bins[id];

      /* Report error, if applicable, but do not abort. */
      if(bin.error) {
        console.log("Failed to retrieve contents of secondary bin: ", id);
        continue;
      }

      this.bins.push(new BinSecondary(this, id, bin));

      /* Apply appropriate CSS class to leftmost bin. */
      if(count % 2 === 0) {
        this.bins[this.bins.length - 1].getNode()
          .addClass(this.options.css.leftmostBin);
      }
      
      ++count;
    }
    
    this.list = new ItemsList(this);
    console.log("Sorting Desk UI initialised");
  },

  invoke: function ()
  {
    if(arguments.length < 1)
      throw "Callback name required";
    else if(!(arguments[0] in this.callbacks))
      throw "Callback non existent: " + arguments[0];

    return this.callbacks[arguments[0]]
      .apply(null, [].slice.call(arguments, 1));
  },

  getOption: function (property)
  {
    return property in this.options ? this.options[property] : null;
  },

  getOptions: function ()
  { return this.options; },

  getCallbacks: function ()
  { return this.callbacks; },

  getItemsList: function ()
  { return this.list; }
};


/* Base class of `BinPrimary', `BinSecondary' and `BinSub'.*/
var Bin = function (controller, owner, id, bin)
{
  this.controller = controller;
  this.owner = owner;
  this.id = id;
  this.bin = bin;
};

Bin.prototype = {
  controller: null,
  owner: null,
  id: null,
  bin: null,
  node: null,

  setNode_: function (node, fnOnDrop)
  {
    var self = this;
    
    this.node = node;
    
    node.droppable( {
      scope: 'text-items',
      activeClass: 'droppable-highlight',
      hoverClass: 'droppable-hover',
      drop: function (evt, ui) {
        self.controller.getItemsList().remove(
          parseInt(ui.draggable.attr('id').match(/item-(\d+)/)[1]));

        if(fnOnDrop)
          fnOnDrop(evt, ui);
      },
      tolerance: 'pointer'
    } );
  },

  getNode: function ()
  { return this.node; },

  getController: function ()
  { return this.controller; },
  
  getOwner: function ()
  { return this.owner; }
};


var BinPrimary = function (controller, id, bin)
{
  Bin.call(this, controller, null, id, bin);
  
  this.container = $('<div/>');
  controller.getOption("nodes").bins.append(this.container);
  
  this.setNode_($(controller.invoke("renderPrimaryBin", bin))
                .attr('id', 'bin-' + id)
                .addClass('bin'));
  
  this.container
    .addClass(controller.getOption("css").primaryBin)
    .append(this.node);

  for(var subid in bin.bins) {
    var obj = new BinSub(this, subid, bin.bins[subid]);
    
    if(this.subbins.length % 2 === 0)
      obj.getNode().addClass("left");
    
    this.subbins.push(obj);
  }

  this.container.append('<div style="clear:both"/>');
};

BinPrimary.prototype = Object.create(Bin.prototype);
BinPrimary.prototype.subbins = [ ];
BinPrimary.prototype.container = null;
BinPrimary.prototype.getContainer = function () {
  return this.container;
};


var BinSub = function (owner, id, bin)
{
  Bin.call(this, owner.getController(), owner, id, bin);

  this.setNode_(this.controller.invoke("renderPrimarySubBin", bin)
                .attr('id', 'bin-' + id)
                .addClass('bin'));
  
  owner.getContainer().append(this.node);
};

BinSub.prototype = Object.create(Bin.prototype);


var BinSecondary = function (controller, id, bin)
{
  Bin.call(this, controller, null, id, bin);

  this.setNode_($(controller.getCallbacks().renderSecondaryBin(bin))
                .attr('id', 'bin-' + id)
                .addClass('bin'));
  
  controller.getOptions().nodes.bins.append(this.node);
};

BinSecondary.prototype = Object.create(Bin.prototype);


var ItemsList = function (controller)
{
  var self = this;
  
  this.controller = controller;
  this.container = controller.getOption("nodes").items;
  this.items = [ ];

  $('body').keyup(function (evt) {
/*     console.log(evt.keyCode); */
    
    switch(evt.keyCode) {
    case 38:                    /* up */
      self.selectOffset(-1);
      break;
    case 40:                    /* down */
      self.selectOffset(1);
      break;
    default:
      return;
    }

    evt.preventDefault();
    evt.stopPropagation();

    return false;
  } );
  
  this.check();
};

ItemsList.prototype = {
  controller: null,
  container: null,
  items: null,

  check: function ()
  {
    var visibleItems = this.controller.getOption("visibleItems");
    
    if(this.items.length >= visibleItems)
      return;
    
    var self = this;
    this.controller.invoke("moreTexts", visibleItems)
      .done(function (items) {
        $.each(items, function (index, item) {
          window.setTimeout( function () {
            self.items.push(new TextItem(self, item));
          }, Math.pow(index, 2) * 1.1);
        } );

        window.setTimeout( function () {
          self.select();
        }, 10);
      } );
  },

  select: function (variant)
  {
    if(!this.container.children().length)
      return;
    
    if(typeof variant == 'undefined') {
      if(this.container.find('.selected').length)
        return;

      variant = this.container.children().eq(0);
    } else if(typeof variant == 'number') {
      if(variant < 0)
        variant = 0;
      else if(variant > this.container.children().length - 1)
        variant = this.container.children().length - 1;

      variant = this.container.children().eq(variant);
    } else if(variant instanceof TextItem)
      variant = variant.getNode();
    
    this.container.find('.selected').removeClass('selected');
    variant.addClass('selected');

    /* Ensure text item is _always_ visible at the bottom and top ends of the
     * containing DIV. */
    var st = this.container.scrollTop(),
        ch = this.container.innerHeight(),
        ipt = variant.position().top,
        ih = st + ipt + variant.outerHeight();

    if(st + ipt < st)           /* top */
      this.container.scrollTop(st + ipt);
    else if(ih > st + ch) {     /* bottom */
      this.container.scrollTop(st + ipt - ch
                               + variant.outerHeight()
                               + parseInt(variant.css('margin')) + 1);
    }
  },

  selectOffset: function (offset)
  {
    var index;

    if(!this.container.length)
      return;
    else if(!this.container.find('DIV.selected').length) {
      this.select();
      return;
    }

    index = this.container.find('.selected').prevAll().length + offset;

    if(index < 0)
      index = 0;
    else if(index > this.container.children().length - 1)
      index = this.container.children().length - 1;

    this.select(index);
  },
  
  remove: function (id)
  {
    for(var i = 0, l = this.items.length; i < l; ++i) {
      if(this.items[i].getContent().content_id == id) {
        if(this.items[i].getNode().hasClass('selected'))
          this.select(i == 0 && 1 || 0);
        
        this.items[i].getNode()
          .css('opacity', 0.6)  /* to prevent flicker */
          .animate( { opacity: 0 },
                   200,
                   function () {
                     $(this).slideUp(150, function () {
                       $(this).remove();
                     } );
                   } );

        this.items.splice(i, 1);
        break;
      }
    }
    
    this.check();
  },

  getController: function ()
  { return this.controller; }
};


var TextItem = function (owner, item)
{
  var controller = owner.getController();
  var container = controller.getOption("nodes").items;

  this.content = item;
  this.node = controller.invoke("renderText", item.snippet)
    .attr('id', 'item-' + item.content_id);

  var self = this;
  this.node.draggable( {
    start: function () {
      self.node.addClass('dragging');
    },
    stop: function (evt, ui) {
      self.node.removeClass('dragging');
    },
    helper: function () {
      return self.node.clone()
        .css('width', self.node.width() + 'px')
        .css('height', self.node.height() + 'px');
    },
    drag: function (evt, ui) {
      if(ui.position.left + ui.helper.outerWidth() >= $(window).width())
        ui.position.left = $(window).width() - ui.helper.outerWidth() - 20;
    },
    scope: 'text-items',
    cursor: 'move',
    opacity: 0.45,
/*     cursorAt: { */
/*       top: 5,   */
/*       left: 5   */
/*     },          */
    scroll: false,
    snap: '.bin',
    snapMode: 'inner' } )
    .click(function() {
      owner.select(self);
    } );
  
  container.append(this.node);
};

TextItem.prototype = {
  content: null,                /* Note: unlike bins, a text item contains its
                                 * own id. (?) */
  node: null,

  getContent: function ()
  { return this.content; },

  getNode: function ()
  { return this.node; }
};