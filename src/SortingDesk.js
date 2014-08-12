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
  bins: [ ],
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
      }
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
                .attr('id', 'bin-' + id));
  
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
                .attr('id', 'bin-' + id));
  
  owner.getContainer().append(this.node);
};

BinSub.prototype = Object.create(Bin.prototype);


var BinSecondary = function (controller, id, bin)
{
  Bin.call(this, controller, null, id, bin);

  this.setNode_($(controller.getCallbacks().renderSecondaryBin(bin))
                .attr('id', 'bin-' + id));
  
  controller.getOptions().nodes.bins.append(this.node);
};

BinSecondary.prototype = Object.create(Bin.prototype);


var ItemsList = function (controller)
{
  this.controller = controller;
  this.check();
};

ItemsList.prototype = {
  controller: null,
  items: [ ],

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
      } );
  },

  remove: function (id)
  {
    for(var i = 0, l = this.items.length; i < l; ++i) {
      if(this.items[i].getContent().content_id == id) {
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
    scope: 'text-items',
    cursor: 'move',
    opacity: 0.7,
    cursorAt: {
      top: 5,
      left: 5
    }
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