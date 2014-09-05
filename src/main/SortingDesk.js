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

  /* Do not request bin data if a bins HTML container wasn't given. */
  if(this.options.nodes.bins) {
    var promise = callbacks.getBinData(
      [ options.primaryContentId ].concat(options.secondaryContentIds));
    
    promise.done(function(bins) {
      self.initialise(bins);
    });
  } else
    self.initialise();
};


/* Do not make the following instantiable. */
SortingDesk.defaults = {
  css: {
    primaryBinOuterWrapper: "wrapper-primary-bin-outer",
    primaryBinInnerWrapper: "wrapper-primary-bin-inner",
    secondaryBinOuterWrapper: "wrapper-secondary-bin-outer",
    secondaryBinInnerWrapper: "wrapper-secondary-bin-inner",
    leftmostBin: "left",
    binGeneric: 'bin',
    binShortcut: 'bin-shortcut',
    binAnimateAssign: 'assign',
    binAdding: 'adding',
    buttonAdd: 'button-add',
    itemSelected: 'selected',
    itemDragging: 'dragging'
  },
  visibleItems: 20,             /* Arbitrary. */
  delayAnimateAssign: 100,      /* in milliseconds */
  binCharsLeft: 25,
  binCharsRight: 25
};


SortingDesk.prototype = {
  callbacks: null,
  options: null,
  bins: null,
  list: null,
  over: null,

  initialise: function (bins)
  {
    var self = this;
    
    /* Do not create any process any bins if a bin HTML container doesn't
     * exist. */
    if(this.options.nodes.bins) {
      /* Firstly process primary bin. */
      if(!(this.options.primaryContentId in bins)
         || bins[this.options.primaryContentId].error) {
        throw "Failed to retrieve contents of primary bin";
      }
      
      this.bins.push(new BinContainerPrimary(this,
                                             this.options.primaryContentId,
                                             bins[this.options.primaryContentId]));

      /* Delete to avoid repetition below. */
      delete bins[this.options.primaryContentId];

      /* Now create secondary bins */
      
      this.bins.push(new BinContainerSecondary(this, bins));
    }
    
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
    
    this.options.nodes.binDelete.on( {
      dragover: function (e) {
        if(!UiHelper.draggedElementIsScope(e = e.originalEvent,
                                           [ 'bin', 'text-item' ])) {
           return;
        }
        
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      },
      dragenter: function (e) {
        if(UiHelper.draggedElementIsScope(e = e.originalEvent,
                                          [ 'bin', 'text-item' ])) {
          self.options.nodes.binDelete.addClass('droppable-hover');
        }
      },
      dragleave: function (e) {
        if(UiHelper.draggedElementIsScope(e = e.originalEvent,
                                          [ 'bin', 'text-item' ])) {
          self.options.nodes.binDelete.removeClass('droppable-hover');
        }
      },        
      drop: function (e) {
        if(!UiHelper.draggedElementIsScope(e = e.originalEvent,
                                           [ 'bin', 'text-item' ])) {
          return;
        }
        
        e.stopPropagation();
        
        self.options.nodes.binDelete.removeClass('droppable-hover');
        
        var id = e.dataTransfer.getData('text/plain'),
            scope = UiHelper.getDraggedElementScope(e);

        switch(scope) {
        case 'bin':
          self.bins.some(function (container) {
            var bin = container.getBinById(id);

            if(bin) {
              /* It doesn't matter if the API request succeeds or not for the
               * bin is always deleted. The only case (that I am aware of) where
               * the API request would fail is if the bin didn't exist
               * server-side, in which case it should be deleted from the UI
               * too. So, always delete, BUT, if the request fails show the user
               * a notification; for what purpose, I don't know. */
              container.remove(bin);

              var fn = self.callbacks[
                bin.isSecondaryBin()
                  ? 'removeSecondaryBin'
                  : 'removePrimarySubBin'];

              fn(bin.getId())
                .fail(function (result) {
                  console.log("bin-remove:", result.error);
                  /* TODO: notification not implemented yet. */
                } );
              
              return true;
            }

            return false;
          } );

          break;

        case 'text-item':
          self.list.remove(id);
          break;

        default:
          console.log("Unknown scope:", scope);
          break;
        }
      }
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

    $.each(this.bins, function (i, bin) {
      if(result = bin.getBinByShortcut(keyCode))
        return false;
    } );

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


/* Base class of `BinContainerPrimary' and `BinContainerSecondary'. */
var BinContainer = function (controller)
{
  this.controller = controller;
  this.subbins = [ ];
};

BinContainer.prototype = {
  controller: null,
  bin: null,                    /* Applies only to primary bins */
  subbins: null,
  container: null,

  append: function (node)
  {
    var place = this.getNewPlacement();

    place.append(node);

    if(place.children().length < 2)
      node.addClass(this.controller.options.css.leftmostBin);
  },
  
  remove: function (bin)
  {
    var self = this,
        node = bin.getNode();

    /* Remove bin from containment first making sure it isn't primary. */
    if(this.bin == bin)
      throw "Unable to delete primary bin";
    
    this.subbins.some(function (subbin, ndx) {
      if(subbin == bin) {
        self.subbins.splice(ndx, 1);
        return true;
      }

      return false;
    } );
    
    node.fadeOut(100, function () {
      /* Remove node and reorganise bin container. */
      node.remove(); 

      self.container.find('>DIV').each(function (i, node) {
        node = $(node);

        var children = node.children();

        /* Remove empty wrapper. */
        if(!children.length) {
          node.remove();
          return;
        }

        /* At this point, wrapper's children == 1 || 2. Move one bin into
         * wrapper above if there is room for one more bin. Otherwise, ensure
         * bin is leftmost. */
        if(node.prev().length && node.prev().children().length < 2) {
          node.prev().children().addClass('left');
          
          children.eq(0)
            .appendTo(node.prev())
            .removeClass('left');

          /* Re-compute children. */
          node.children().addClass('left');
        } else if(children.length == 1)
          children.addClass('left'); /* Ensure it's leftmost. */
      } );
    } );
  },
  
  getNewPlacement: function ()
  {
    if(!this.container)
      throw "No container defined";

    var last = this.container.children().last();
    
    if(last.children().length == 1)
      return last;

    return this.container.append('<div />').children().last();
  },

  getBinByShortcut: function (keyCode)
  {
    var result = null;

    /* Always first check to see if a primary bin is defined in `this.bin' and,
     * if so, its shortcut. */
    if(this.bin && this.bin.getShortcut() == keyCode)
      return this.bin;

    this.subbins.some(function (bin) {
      if(bin.getShortcut() == keyCode) {
        result = bin;
        return true;
      }

      return false;
    } );

    return result;
  },

  getBinById: function (id)
  {
    var result = null;
    
    /* Primary bins cannot be deleted (or can they?) so don't check
     * `this.bin'. */
    this.subbins.some(function (bin) {
      if(bin.getId() == id) {
        result = bin;
        return true;
      }

      return false;
    } );

    return result;
  },

  getController: function ()
  { return this.controller; },

  getPrimaryBin: function ()
  { return this.bin; },

  hasPrimaryBin: function ()
  { return !!this.bin; },
  
  getSubbins: function ()
  { return this.subbins; },
  
  getContainer: function ()
  { return this.container; }
};


var BinContainerPrimary = function (controller, id, bin)
{
  BinContainer.call(this, controller, null, id, bin);
  
  var options = controller.getOptions(),
      wrapper = $('<div/>').addClass(options.css.primaryBinOuterWrapper),
      self = this;

  this.container = wrapper;
  this.bin = new BinPrimary(this, id, bin);
  
  this.container = $('<div/>')
    .addClass(options.css.primaryBinInnerWrapper);

  for(var subid in bin.bins)
    this.subbins.push(new BinSub(this, subid, bin.bins[subid]));
  
  wrapper
    .append(this.node)
    .append(this.container);

  new BinAddButton(
    this,
    function (input) {
      return Api.renderPrimarySubBin( { statement_text: input } );
    },
    function (id, text) {
      var deferred = $.Deferred();

      controller.invoke('addPrimarySubBin', text)
        .fail(function () {
          /* TODO: show message box and notify user. */
          deferred.reject();
        } )
        .done(function (bin) {
          window.setTimeout(function () {
            /* We rely on the API returning exactly ONE descriptor. */
            var id = Object.firstKey(bin);
            self.subbins.push(new BinSub(self, id, bin[id]));
          }, 0);
          
          deferred.resolve();
        } );

      return deferred.promise();
    } );
  
  options.nodes.bins.append(wrapper);
};

BinContainerPrimary.prototype = Object.create(BinContainer.prototype);


var BinContainerSecondary = function (controller, bins)
{
  BinContainer.call(this, controller);
  
  var self = this,
      options = controller.getOptions(),
      wrapper = $('<div/>').addClass(options.css.secondaryBinOuterWrapper);
  
  this.container = $('<div/>').addClass(options.css.secondaryBinInnerWrapper);

  for(var id in bins) {
    var bin = bins[id];

    /* Report error, if applicable, but do not abort. */
    if(bin.error) {
      console.log("Failed to retrieve contents of secondary bin: ", id);
      continue;
    }

    this.subbins.push(new BinSecondary(this, id, bin));
  }
  
  wrapper.append(this.container);

  new BinAddButton(
    this,
    function (input) {
      return Api.renderSecondaryBin( { name: input } );
    },
    function (id, text) {
      var deferred = $.Deferred();
      
      controller.invoke('addSecondaryBin', text)
        .fail(function () {
          /* TODO: show message box and notify user. */
          deferred.reject();
        } )
        .done(function (bin) {
          window.setTimeout(function () {
            /* We rely on the API returning exactly ONE descriptor. */
            for(var id in bin)
              self.subbins.push(new BinSecondary(self, id, bin[id]));
          }, 0);
          
          deferred.resolve();
        } );

      return deferred.promise();
    } );

  options.nodes.bins.append(wrapper);
};

BinContainerSecondary.prototype = Object.create(BinContainer.prototype);


/* Base class of `BinPrimary', `BinSecondary' and `BinSub'.*/
var Bin = function (owner, id, bin)
{
  this.owner = owner;
  this.id = id;
  this.bin = bin;
};

Bin.prototype = {
  owner: null,
  id: null,
  bin: null,
  node: null,
  shortcut: null,

  setNode_: function (node, fnOnDrop)
  {
    var self = this;
    
    this.node = node;

    node
      .attr('data-scope', 'bin')
      .on( {
        dragover: function (e) {
          if(!UiHelper.draggedElementIsScope(e = e.originalEvent, 'text-item'))
             return;
          
          e.preventDefault();
          e.dropEffect = 'move';
        },
        dragenter: function (e) {
          if(UiHelper.draggedElementIsScope(e, 'text-item'))
            self.node.addClass('droppable-hover');
        },
        dragleave: function (e) {
          if(UiHelper.draggedElementIsScope(e, 'text-item'))
            self.node.removeClass('droppable-hover');
        },
        drop: function (e) {
          if(!UiHelper.draggedElementIsScope(e = e.originalEvent, 'text-item'))
            return;
          
          e.stopPropagation();
          
          self.node.removeClass('droppable-hover');
          self.getController().getItemsList().remove(
            e.dataTransfer.getData('text/plain'));
        },
        mouseenter: function () {
          self.getController().onMouseEnter(self);
        },
        mouseleave: function () {
          self.getController().onMouseLeave();
        },
        click: function () {
          self.getController().onClick(self);
        }
      } );

    /* We must defer initialisation of D'n'D because owning object's `bin'
     * attribute will have not yet been set. */
    window.setTimeout(function () {
      /* Primary bins aren't draggable. */
      if(self == self.owner.getPrimaryBin())
        return;

      node.on( {
        dragstart: function (e) {
          var d = e.originalEvent.dataTransfer;

          self.getController().getOption('nodes').binDelete.fadeIn();
          
          d.setData('text/plain', this.id);
          d.effectAllowed = 'move';
        },
        dragend: function (e) {
          self.getController().getOption('nodes').binDelete.fadeOut();
        }
      } )
      .prop('draggable', true);
    }, 0);
  },
  
  setShortcut: function (keyCode)
  {
    this.shortcut = keyCode;
    this.node.find('.' + this.getController().getOption('css').binShortcut)
      .html(String.fromCharCode(keyCode).toLowerCase());
  },

  getShortcut: function ()
  { return this.shortcut; },

  getId: function ()
  { return this.id; },

  isSecondaryBin: function ()
  { return !this.owner.hasPrimaryBin(); },
  
  getNode: function ()
  { return this.node; },
  
  getOwner: function ()
  { return this.owner; },

  getController: function ()
  { return this.owner.controller; }
};


var BinPrimary = function (owner, id, bin)
{
  var controller = owner.getController();
  
  Bin.call(this, owner, id, bin);
  
  this.setNode_(controller.invoke("renderPrimaryBin", bin)
                .attr('id', id)
                .addClass(controller.getOption('css').binGeneric));
  
  owner.append(this.node);
};

BinPrimary.prototype = Object.create(Bin.prototype);


var BinSub = function (owner, id, bin)
{
  var controller = owner.getController();
  
  Bin.call(this, owner, id, bin);

  this.setNode_(controller.invoke("renderPrimarySubBin", bin)
                .attr('id', id)
                .addClass(controller.getOption('css').binGeneric));

  owner.append(this.node);
};

BinSub.prototype = Object.create(Bin.prototype);


var BinSecondary = function (owner, id, bin)
{
  var controller = owner.getController();
  
  Bin.call(this, owner, id, bin);
  
  this.setNode_($(controller.invoke('renderSecondaryBin', bin))
                .attr('id', id)
                .addClass(controller.getOption('css').binGeneric));
  
  owner.append(this.node);
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
    
    var self = this,
        promise = this.controller.invoke("moreTexts", visibleItems);

    /* Check that our request for more text items hasn't been refused. */
    if(!promise)
      return;
    
    promise.done(function (items) {
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
      variant = this.container.find('.' + csel);

      if(variant.length == 0)
        variant = this.container.children().eq(0);
      else if(variant.length > 1) {
        /* We should never reach here. */
        console.log("WARNING! Multiple text items selected:", variant.length);
        variant.removeClass(csel);

        variant = variant.eq(0);
        variant.addClass(csel);
      }
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
    var st = this.container.scrollTop(),       /* scrolling (position) top */
        ch = this.container.innerHeight(),     /* container height */
        ipt = variant.position().top,          /* item position top */
        ih = st + ipt + variant.outerHeight(); /* item height */

    if(st + ipt < st            /* top */
       || variant.outerHeight() > ch) {
      this.container.scrollTop(st + ipt);
    } else if(ih > st + ch) {   /* bottom */
      this.container.scrollTop(st + ipt - ch
                               + variant.outerHeight()
                               + parseInt(variant.css('marginBottom'))
                               + parseInt(variant.css('paddingBottom')));
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
      
      id = node.attr('id');
    }

    var self = this;
    
    $.each(this.items, function (i, item) {
      if(item.getContent().node_id != id)
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
                      self.select();
                    } );
                  } );

      self.items.splice(i, 1);
      return false;  
    } );
    
    this.check();
  },

  getById: function (id)
  {
    var result = null;
    
    this.items.some(function (item) {
      if(item.getContent().node_id == id) {
        result = item;
        return true;
      }

      return false;
    } );

    return result;
  },

  getController: function ()
  { return this.controller; }
};


var TextItem = function (owner, item)
{
  var controller = owner.getController(),
      cdragging = controller.getOption("css").itemDragging;

  this.owner = owner;
  this.content = item;
  this.node = controller.invoke("renderText",
                                item,
                                Api.TEXT_VIEW_HIGHLIGHTS);

  this.setup_();
  controller.getOption("nodes").items.append(this.node);
};

TextItem.prototype = {
  owner: null,
  content: null,                /* Note: unlike bins, a text item contains its
                                 * own id. (?) */
  node: null,

  setup_: function() {
    var self = this,
        controller = this.owner.getController(),
        cdragging = controller.getOption("css").itemDragging;

    this.node
      .prop('draggable', true)
      .attr( {
        id: this.content.node_id,
        "data-scope": "text-item"
      } )
      .on( {
        dragstart: function (e) {
          var d = e.originalEvent.dataTransfer;
          
          /* Firstly select item being dragged to ensure correct item position
           * in container. */
          self.owner.select(self);
          self.node.addClass(cdragging);

          /* Activate deletion/dismissal button. */
          self.owner.getController().getOption('nodes').binDelete.fadeIn();
          
          d.setData('text/plain', this.id);
          d.effectAllowed = 'move';
        },
        dragend: function () {
          self.node.removeClass(cdragging);

          /* Deactivate deletion/dismissal button. */
          self.owner.getController().getOption('nodes').binDelete.fadeOut();
        },
        click: function () {
          self.owner.select(self);
        }
      } );

    /* Add logic to less/more links. */
    this.node.find('.less').click(function () {
      var t = controller
            .invoke("renderText",
                    self.content,
                    Api.TEXT_VIEW_HIGHLIGHTS);
      self.node.replaceWith(t);
      self.node = t;
      self.setup_();
      self.owner.select(self);
      return false;
    } );

    this.node.find('.more').click(function () {
      var t = controller
            .invoke("renderText",
                    self.content,
                    Api.TEXT_VIEW_UNRESTRICTED);
      self.node.replaceWith(t);
      self.node = t;
      self.setup_();
      self.owner.select(self);
      return false;
    } );
  },    

  getContent: function ()
  { return this.content; },

  getNode: function ()
  { return this.node; },

  isSelected: function ()
  { return this.node.hasClass('selected'); }
};


var BinAddButton = function (owner, fnRender, fnAdd)
{
  this.owner = owner;
  this.fnRender = fnRender;
  this.fnAdd = fnAdd;
  
  var self = this,
      controller = owner.getController(),
      css = controller.getOption('css'),
      button = $(controller.invoke("renderAddButton", "+"))
        .addClass(css.buttonAdd)
        .on( {
          dragover: function (e) {
            if(!UiHelper.draggedElementIsScope(e = e.originalEvent, 'text-item'))
              return;

            e.preventDefault();
            e.dropEffect = 'move';
          },
          dragenter: function (e) {
            if(UiHelper.draggedElementIsScope(e, 'text-item'))
              button.addClass('droppable-hover');
          },
          dragleave: function (e) {
            if(UiHelper.draggedElementIsScope(e, 'text-item'))
              button.removeClass('droppable-hover');
          },
          drop: function (e) {
            if(!UiHelper.draggedElementIsScope(e = e.originalEvent,
                                               'text-item')) {
              return;
            }
            
            self.onAdd(e.dataTransfer.getData('text/plain'));
            button.removeClass('droppable-hover');
          },
          click: function () {
            self.onAdd();
          }
        } );

  owner.getContainer().after(button);
};

BinAddButton.prototype = {
  owner: null,
  fnRender: null,
  fnAdd: null,
  
  onAdd: function (id) {
    var controller = this.owner.controller;
    
    /* Do not allow entering into concurrent `add' states. */
    if(this.owner.getContainer()
       .find('.' + controller.getOption('css').binAdding).length) {
      return;
    }

    var nodeContent = id ? 'Please wait...'
          : ('<input placeholder="Enter bin description" '
             + 'type="text"/>'),
        node = this.fnRender(nodeContent)
          .addClass(controller.getOption('css').binAdding)
          .fadeIn(200);

    this.owner.append(node);
    
    if(!id) {
      this.onAddManual(node);
      return;
    }

    var item = this.owner.getController().getItemsList()
          .getById(id);

    if(!item) {
      node.remove();
      throw "onAdd: failed to retrieve text item: " + id;
    }

    this.fnAdd(id,
               new TextItemSnippet(item.getContent().text)
               .highlights(controller.getOption('binCharsLeft'),
                           controller.getOption('binCharsRight')))
      .always(function () { node.remove(); } );
  },

  onAddManual: function (node, input) {
    var self = this,
        input = node.find('input');

    input
      .focus()
      .blur(function () {
        if(!this.value) {
          node.fadeOut(200, function () { self.owner.remove(node); } );
          return;
        }

        this.disabled = true;

        /* TODO: do not use an `alert'. */
        self.fnAdd(null, this.value)
          .fail(function () { alert("Failed to create a sub-bin."); } )
          .always(function () { node.remove(); } );
      } )
      .keyup(function (evt) {
        if(evt.keyCode == 13)
          this.blur();
        
        /* Do not allow event to propagate. */
        return false;
      } );
  }    
};


var UiHelper = {
  draggedElementIsScope: function (event, scope)
  {
    if(!event.dataTransfer) {
      event = event.originalEvent;

      if(!event.dataTransfer)
        return false;
    }

    var node = document.getElementById(
          event.dataTransfer.getData('text/plain'));
    
    return (scope instanceof Array ? scope : [ scope ]).some(function (sc) {
      return node.getAttribute('data-scope') == sc;
    } );
  },

  getDraggedElementScope: function (event)
  {
    if(!event.dataTransfer)
      event = event.originalEvent;

    return event.dataTransfer
      && document.getElementById(event.dataTransfer.getData('text/plain'))
           .getAttribute('data-scope');
  }
};
