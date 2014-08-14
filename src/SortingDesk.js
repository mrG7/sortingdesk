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
  
  this.options = jQuery.extend(true, SortingDesk.defaults, options);
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
    primaryBinOuterWrapper: "wrapper-primary-bin-outer",
    primaryBinInnerWrapper: "wrapper-primary-bin-inner",
    secondaryBinsWrapper: "wrapper-secondary-bin",
    leftmostBin: "left",
    binGeneric: 'bin',
    binShortcut: 'bin-shortcut',
    binAnimateAssign: 'assign',
    buttonAdd: 'button-add',
    itemSelected: 'selected',
    itemDragging: 'dragging'
  },
  visibleItems: 20,             /* Arbitrary. */
  marginWhileDragging: 10,      /*  "     "   */
  delayAnimateAssign: 100       /* in milliseconds */
};


SortingDesk.prototype = {
  callbacks: null,
  options: null,
  bins: null,
  list: null,
  over: null,

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
    var count = 0,
        self = this,
        wrapper = $('<div />')
          .addClass(this.options.css.secondaryBinsWrapper);

    this.options.nodes.bins.append(wrapper);
    
    for(var id in bins) {
      var bin = bins[id];

      /* Report error, if applicable, but do not abort. */
      if(bin.error) {
        console.log("Failed to retrieve contents of secondary bin: ", id);
        continue;
      }

      this.bins.push(new BinSecondary(this, id, bin, wrapper));

      /* Apply appropriate CSS class to leftmost bin. */
      if(count % 2 === 0) {
        this.bins[this.bins.length - 1].getNode()
          .addClass(this.options.css.leftmostBin);
      }
      
      ++count;
    }

    this.options.nodes.bins.append('<div style="clear:both"/>')
      .append(
        this.callbacks.renderAddButton('+')
          .attr('id', "add-secondary-bin")
          .addClass(this.options.css.buttonAdd)
          .click(function () {
          } ));
    
    this.list = new ItemsList(this);

    $('body').keyup(function (evt) {
      /* First process alpha key strokes. */
      if(evt.keyCode >= 65 && evt.keyCode <= 90) {
        var bin = self.getBinByShortcut(evt.keyCode);

        if(self.over) {
          if(!bin)
            self.over.setShortcut(evt.keyCode);
        } else {
          if(bin) {
            /* Simulate the effect produced by a mouse click by assigning the
             * CSS class that contains identical styles to the pseudo-class
             * :hover, and removing it after the milliseconds specified in
             * `options.delayAnimateAssign'. */
            bin.getNode().addClass(self.options.css.binAnimateAssign);
            
            window.setTimeout(function () {
              bin.getNode().removeClass(self.options.css.binAnimateAssign);
            }, self.options.delayAnimateAssign);
            
            self.list.remove();
          }
        }
        
        return false;
      }

      /* Not alpha. */
      switch(evt.keyCode) {
      case 38:                    /* up */
        self.list.selectOffset(-1);
        break;
      case 40:                    /* down */
        self.list.selectOffset(1);
        break;
      default:
        return;
      }

      return false;
    } );
    
    console.log("Sorting Desk UI initialised");
  },

  onClick: function (bin)
  {
    this.list.remove();
  },

  onMouseEnter: function (bin)
  {
    this.over = bin;
  },

  onMouseLeave: function ()
  {
    this.over = null;
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

  getBinByShortcut: function (keyCode)
  {
    var result = false;

    function recursive_search (obj) {
      $.each(obj, function (i, item) {
        if(item.getSubbins())
          recursive_search(item.getSubbins());

        if(result)
          return false;
        else if(item.getShortcut() == keyCode) {
          result = item;
          return false;
        }
      } );
    }

    recursive_search(this.bins);
    
    return result;
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
  this.subbins = [ ];
};

Bin.prototype = {
  controller: null,
  owner: null,
  id: null,
  bin: null,
  node: null,
  shortcut: null,
  subbins: null,

  setNode_: function (node, fnOnDrop)
  {
    var self = this;
    
    this.node = node;
    
    node
      .droppable( {
        scope: 'text-items',
        activeClass: 'droppable-highlight',
        hoverClass: 'droppable-hover',
        drop: function (evt, ui) {
          self.controller.getItemsList().remove(
            parseInt(ui.draggable.attr('id').match(/item-(\d+)/)[1]));

          if(fnOnDrop)
            fnOnDrop(evt, ui);
        },
        tolerance: 'pointer' } )
      .mouseenter(function () {
        self.controller.onMouseEnter(self);
      } )
      .mouseleave(function () {
        self.controller.onMouseLeave();
      } )
      .click(function () {
        self.controller.onClick(self);
      } );
  },

  setShortcut: function (keyCode)
  {
    this.shortcut = keyCode;
    this.node.find('.' + this.controller.getOption('css').binShortcut)
      .html(String.fromCharCode(keyCode).toLowerCase());
  },

  getShortcut: function ()
  { return this.shortcut; },

  getNode: function ()
  { return this.node; },

  getController: function ()
  { return this.controller; },
  
  getOwner: function ()
  { return this.owner; },

  getSubbins: function ()
  { return this.subbins; }
};


var BinPrimary = function (controller, id, bin)
{
  Bin.call(this, controller, null, id, bin);
  
  var options = controller.getOptions(),
      wrapper = $('<div/>').addClass(options.css.primaryBinOuterWrapper);

  this.container = $('<div/>');
  
  this.setNode_($(controller.invoke("renderPrimaryBin", bin))
                .attr('id', 'bin-' + id)
                .addClass(options.css.binGeneric));
  
  this.container
    .addClass(options.css.primaryBinInnerWrapper)
    .append(this.node);

  for(var subid in bin.bins) {
    var obj = new BinSub(this, subid, bin.bins[subid]);
    
    if(this.subbins.length % 2 === 0)
      obj.getNode().addClass(options.css.leftmostBin);
    
    this.subbins.push(obj);
  }

  this.container.append('<div style="clear:both"/>');
  wrapper.append(this.container);

  var button = $(controller.invoke("renderAddButton", "+"))
        .attr('id', "add-subbin")
        .addClass(options.css.buttonAdd)
        .click(function () {
        } );
  
  wrapper.append(button);
  options.nodes.bins.append(wrapper);
};

BinPrimary.prototype = Object.create(Bin.prototype);
BinPrimary.prototype.container = null;
BinPrimary.prototype.getContainer = function () {
  return this.container;
};


var BinSub = function (owner, id, bin)
{
  Bin.call(this, owner.getController(), owner, id, bin);

  this.setNode_(this.controller.invoke("renderPrimarySubBin", bin)
                .attr('id', 'bin-' + id)
                .addClass(this.controller.getOption('css').binGeneric));
  
  owner.getContainer().append(this.node);
};

BinSub.prototype = Object.create(Bin.prototype);


var BinSecondary = function (controller, id, bin, wrapper)
{
  Bin.call(this, controller, null, id, bin);

  this.setNode_($(controller.getCallbacks().renderSecondaryBin(bin))
                .attr('id', 'bin-' + id)
                .addClass(this.controller.getOption('css').binGeneric));
  
  wrapper.append(this.node);
};

BinSecondary.prototype = Object.create(Bin.prototype);


var ItemsList = function (controller)
{
  var self = this;
  
  this.controller = controller;
  this.container = controller.getOption("nodes").items;
  this.items = [ ];
  
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
        /* The following logic creates an interesting side effect when the user
         * very quickly sorts items _whilst_ new items (retrieved by a previous
         * call to `check') are _still_ being added to the UI. The side effect
         * is that the user ends up with more than `visibleItems' in the
         * list. Unsure whether to rework this as, perhaps, users who sort items
         * quickly /need/ more items in the list? */
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
    var csel = this.controller.getOption("css").itemSelected;
    
    if(!this.container.children().length)
      return;
    
    if(typeof variant == 'undefined') {
      if(this.container.find('.' + csel).length)
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

    this.container.find('.' + csel).removeClass(csel);
    variant.addClass(csel);

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
    var csel = this.controller.getOption("css").itemSelected,
        index;

    if(!this.container.length)
      return;
    else if(!this.container.find('.' + csel).length) {
      this.select();
      return;
    }

    index = this.container.find('.' + csel).prevAll().length + offset;

    if(index < 0)
      index = 0;
    else if(index > this.container.children().length - 1)
      index = this.container.children().length - 1;

    this.select(index);
  },
  
  remove: function (id)
  {
    if(typeof id == 'undefined') {
      var node = this.container.find(
        '.' + this.controller.getOption("css").itemSelected);

      if(!node.length)
        return;
      
      id = parseInt(node.attr('id').match(/item-(\d+)/)[1]);
    }

    var self = this;
    
    $.each(this.items, function (i, item) {
      if(item.getContent().content_id != id)
        return true;
      
      if(item.isSelected()) {
        if(i < self.items.length - 1)
          self.select(self.items[i + 1]);
        else if(self.items.length)
          self.select(self.items[i - 1]);
        else
          console.log("No more items available");
      }
      
      item.getNode()
        .css('opacity', 0.6)  /* to prevent flicker */
        .animate( { opacity: 0 },
                  200,
                  function () {
                    $(this).slideUp(150, function () {
                      $(this).remove();
                    } );
                  } );

      self.items.splice(i, 1);
      return false;  
    } );
    
    this.check();
  },

  getController: function ()
  { return this.controller; }
};


var TextItem = function (owner, item)
{
  var controller = owner.getController(),
      container = controller.getOption("nodes").items,
      cdragging = controller.getOption("css").itemDragging;

  this.content = item;
  this.node = controller.invoke("renderText", item.snippet)
    .attr('id', 'item-' + item.content_id);

  var self = this;
  this.node.draggable( {
    start: function () {
      self.node.addClass(cdragging);
    },
    stop: function (evt, ui) {
      self.node.removeClass(cdragging);
    },
    helper: function () {
      return self.node.clone()
        .css( {
          width: self.node.width() + 'px',
          height: self.node.height() + 'px',
        } );
    },
    drag: function (evt, ui) {
      var margin = controller.getOption("marginWhileDragging");
            
      if(ui.position.left + ui.helper.outerWidth() >=
         $(window).width() - margin) {
        ui.position.left = $(window).width() - ui.helper.outerWidth() - margin;
      }
      
      if(ui.position.top + ui.helper.outerHeight() >=
         $(window).height() - margin) {
        ui.position.top =  $(window).height() - ui.helper.outerHeight()
          - margin;
      }
    },
    appendTo: 'body',
    scope: 'text-items',
    cursor: 'move',
    opacity: 0.45,
/*     cursorAt: { */
/*       top: 5,   */
/*       left: 5   */
/*     },          */
    scroll: false,
/*     snap: '.bin',     */
/*     snapMode: 'inner' */ } )
    .click(function () {
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
  { return this.node; },

  isSelected: function ()
  { return this.node.hasClass('selected'); }
};