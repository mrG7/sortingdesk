/**
 * @file Sorting Desk component.
 * @copyright 2014 Diffeo
 *
 * Comments:
 *
 * 
 */

/**
 * Main class of the Sorting Desk component. Responsible for initialising the
 * state of the component.
 * 
 * @author Miguel Guedes <miguel@miguelguedes.org>
 * @class
 * */
var SortingDesk = (function () {

  /* ----------------------------------------------------------------------
   *  Protected attributes
   *  Accessible module-wide. Any module or class instance method can access
   *  these attributes.
   *
   *  Note: there are *no* public attributes as such, where, by 'public' it
   *        is meant attributes accessible externally.
   * ---------------------------------------------------------------------- */
  var initialised = false,
      callbacks,
      options,
      bins,
      list;

  /* ----------------------------------------------------------------------
   *  Private attributes
   *  Accessible only to module-scope methods. Class instance methods are
   *  forbidden from accessing these attributes.
   * ---------------------------------------------------------------------- */
  var over_ = null,
      requests_ = [ ];

  /* ----------------------------------------------------------------------
   *  Default options
   *  Private attribute.
   * ----------------------------------------------------------------------
   * 
   * In addition to the properties below, which are obviously optional, the
   * following attributes are also accepted:
   *
   * nodes: {
   *   items: jQuery-element,           ; mandatory
   *   bins: jQuery-element,            ; optional
   *   binDelete: jQuery-element        ; optional
   * },
   * primaryContentId: string,          ; mandatory
   * secondaryContentIds: array<string> ; mandatory
   * 
   */
  var defaults_ = {
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
      itemDragging: 'dragging',
      droppableHover: 'droppable-hover'
    },
    keyboard: {                   /* Contains scan codes. */
      listUp: 38,                 /* up                   */
      listDown: 40,               /* down                 */
      listDismiss: 46             /* delete               */
    },
    visibleItems: 20,             /* Arbitrary.           */
    delayAnimateAssign: 100,      /* milliseconds         */
    binCharsLeft: 25,
    binCharsRight: 25
  };


  /**
   * Base class of `BinContainerPrimary' and `BinContainerSecondary'.
   *
   * @class
   * */
  var BinContainer = function ()
  {
    this.subbins = [ ];
  };

  BinContainer.prototype = {
    bin: null,                    /* Applies only to primary bins */
    subbins: null,
    container: null,

    append: function (node)
    {
      var place = this.getNewPlacement();

      place.append(node);

      if(place.children().length < 2)
        node.addClass(options.css.leftmostBin);
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

    getPrimaryBin: function ()
    { return this.bin; },

    hasPrimaryBin: function ()
    { return !!this.bin; },
    
    getSubbins: function ()
    { return this.subbins; },
    
    getContainer: function ()
    { return this.container; }
  };


  /**
   * @class
   * */
  var BinContainerPrimary = function (id, bin)
  {
    BinContainer.call(this, null, id, bin);
    
    var wrapper = $('<div/>').addClass(options.css.primaryBinOuterWrapper),
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
        return invoke_('renderPrimarySubBin', { statement_text: input } );
      },
      function (id, text) {
        var deferred = $.Deferred();

        invoke_('addPrimarySubBin', text)
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


  /*
   * @class
   * */
  var BinContainerSecondary = function (bins)
  {
    BinContainer.call(this);
    
    var self = this,
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
        return invoke_('renderSecondaryBin', { name: input } );
      },
      function (id, text) {
        var deferred = $.Deferred();
        
        invoke_('addSecondaryBin', text)
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


  /**
   * Base class of `BinPrimary', `BinSecondary' and `BinSub'.
   *
   * @class
   * */
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

    setNode_: function (node)
    {
      var self = this;

      node
        .attr('data-scope', 'bin')
        .on( {
          mouseenter: function () {
            onMouseEnter_(self);
          },
          mouseleave: function () {
            onMouseLeave_();
          },
          click: function () {
            onClick_(self);
          }
        } );

      new Droppable(this.node = node, {
        classHover: options.css.droppableHover,
        scopes: [ 'text-item' ],
        
        drop: function (e) {
          list.remove(e.dataTransfer.getData('Text'));
        }
      } );

      /* We must defer initialisation of D'n'D because owning object's `bin'
       * attribute will have not yet been set. */
      window.setTimeout(function () {
        /* Primary bins aren't draggable. */
        if(self == self.owner.getPrimaryBin())
          return;

        new Draggable(node, {
          dragstart: function (e) {
            options.nodes.binDelete.fadeIn();
          },
          
          dragend: function (e) {
            options.nodes.binDelete.fadeOut();
          }
        } );
      }, 0);
    },
    
    setShortcut: function (keyCode)
    {
      this.shortcut = keyCode;
      this.node.find('.' + options.css.binShortcut)
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
    { return this.owner; }
  };


  /**
   * @class
   * */
  var BinPrimary = function (owner, id, bin)
  {
    Bin.call(this, owner, id, bin);
    
    this.setNode_(invoke_("renderPrimaryBin", bin)
                  .attr('id', id)
                  .addClass(options.css.binGeneric));
    
    owner.append(this.node);
  };

  BinPrimary.prototype = Object.create(Bin.prototype);


  /**
   * @class
   * */
  var BinSub = function (owner, id, bin)
  {
    Bin.call(this, owner, id, bin);

    this.setNode_(invoke_("renderPrimarySubBin", bin)
                  .attr('id', id)
                  .addClass(options.css.binGeneric));

    owner.append(this.node);
  };

  BinSub.prototype = Object.create(Bin.prototype);


  /**
   * @class
   * */
  var BinSecondary = function (owner, id, bin)
  {
    Bin.call(this, owner, id, bin);
    
    this.setNode_($(invoke_('renderSecondaryBin', bin))
                  .attr('id', id)
                  .addClass(options.css.binGeneric));
    
    owner.append(this.node);
  };

  BinSecondary.prototype = Object.create(Bin.prototype);


  /**
   * @class
   * */
  var ItemsList = function ()
  {
    var self = this;
    
    this.container = options.nodes.items;
    this.items = [ ];
    
    this.check();
  };

  ItemsList.prototype = {
    container: null,
    items: null,

    check: function ()
    {
      if(this.items.length >= options.visibleItems)
        return;
      
      var self = this,
          promise = invoke_("moreTexts", options.visibleItems);

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
      /* Fail silently if not initialised anymore. This might happen if, for
       * example, the `reset' method was invoked but the component is still
       * loading text items. */
      if(!initialised)
        return;
      
      var csel = options.css.itemSelected;
      
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
      var csel = options.css.itemSelected,
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
        var node = this.container.find('.' + options.css.itemSelected);

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
    }
  };


  /**
   * @class
   * */
  var TextItem = function (owner, item)
  {
    /* Fail silently if not initialised anymore. This might happen if, for
     * example, the `reset' method was invoked but the component is still
     * loading text items. */
    if(!initialised)
      return;
    
    var cdragging = options.css.itemDragging;

    this.owner = owner;
    this.content = item;

    /* TODO: using property from `Api' namespace that it shouldn't be aware
     * of. */
    this.node = invoke_("renderText", item, Api.TEXT_VIEW_HIGHLIGHTS);

    this.setup_();
    options.nodes.items.append(this.node);
  };

  TextItem.prototype = {
    owner: null,
    content: null,                /* Note: unlike bins, a text item contains its
                                   * own id. (?) */
    node: null,

    setup_: function() {
      var self = this;

      /* TODO: `find' call below expects a `text-item-close' class. */
      this.node
        .attr( {
          id: this.content.node_id,
          "data-scope": "text-item"
        } )
        .click(function () {
          self.owner.select(self);
        } )
        .find('.text-item-close').click(function () {
          self.owner.remove(self.content.node_id);
          return false;
        } );

      new Draggable(this.node, {
        classDragging: options.css.itemDragging,
        
        dragstart: function (e) {
          /* Firstly select item being dragged to ensure correct item position
           * in container. */
          self.owner.select(self);

          /* Activate deletion/dismissal button. */
          options.nodes.binDelete.fadeIn();
        },
        
        dragend: function () {
          /* Deactivate deletion/dismissal button. */
          options.nodes.binDelete.fadeOut();
        }
      } );

      /* Add logic to less/more links. */
      /* TODO: `find' expecting `less' CSS class.
       * TODO: using property from `Api' namespace that it shouldn't be aware
       * of. */
      this.node.find('.less').click(function () {
        var t =invoke_("renderText", self.content, Api.TEXT_VIEW_HIGHLIGHTS);
        
        self.node.replaceWith(t);
        self.node = t;
        self.setup_();
        self.owner.select(self);
        
        return false;
      } );

      /* TODO: `find' expecting `more' CSS class.
       * TODO: using property from `Api' namespace that it shouldn't be aware
       * of. */
      this.node.find('.more').click(function () {
        var t = invoke_("renderText", self.content, Api.TEXT_VIEW_UNRESTRICTED);
        
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


  /**
   * @class
   * */
  var BinAddButton = function (owner, fnRender, fnAdd)
  {
    this.owner = owner;
    this.fnRender = fnRender;
    this.fnAdd = fnAdd;
    
    var self = this,
        button = $(invoke_("renderAddButton", "+"))
          .addClass(options.css.buttonAdd)
          .on( {
            click: function () {
              self.onAdd();
            }
          } );          

    new Droppable(button, {
      classHover: options.css.droppableHover,
      scopes: [ 'text-item' ],
      
      drop: function (e, id) {
        self.onAdd(id);
      }
    } );

    owner.getContainer().after(button);
  };

  BinAddButton.prototype = {
    owner: null,
    fnRender: null,
    fnAdd: null,
    
    onAdd: function (id) {
      /* Do not allow entering into concurrent `add' states. */
      if(this.owner.getContainer()
         .find('.' + options.css.binAdding).length) {
        return;
      }

      var nodeContent = id ? 'Please wait...'
            : ('<input placeholder="Enter bin description" '
               + 'type="text"/>'),
          node = this.fnRender(nodeContent)
            .addClass(options.css.binAdding)
            .fadeIn(200);

      this.owner.append(node);
      
      if(!id) {
        this.onAddManual(node);
        return;
      }

      var item = list.getById(id);

      if(!item) {
        node.remove();
        throw "onAdd: failed to retrieve text item: " + id;
      }

      this.fnAdd(id,
                 new TextItemSnippet(item.getContent().text)
                 .highlights(options.binCharsLeft, options.binCharsRight))
        .always(function () { node.remove(); } );
    },

    onAddManual: function (node, input) {
      var self = this,
          input = node.find('input');

      input
        .focus()
        .blur(function () {
          if(!this.value) {
            node.fadeOut(200, function () { node.remove(); } );
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


  var DragDropManager = {
    activeNode: null,

    onDragStart: function (event) {
      DragDropManager.activeNode = (event.originalEvent || event).target;
    },

    onDragEnd: function (event) {
      if(DragDropManager.activeNode == (event.originalEvent || event).target) {
        DragDropManager.activeNode = null;
      }
    },
    
    isScope: function (event, scopes)
    {
      if(!DragDropManager.activeNode)
        return false;

      return (scopes instanceof Array ? scopes : [ scopes ])
        .some(function (scope) {
          return DragDropManager.activeNode.getAttribute('data-scope') == scope;
        } );
    },

    getScope: function (event)
    {
      return DragDropManager.activeNode
        ? DragDropManager.activeNode.getAttribute('data-scope')
        : null;
    }
  };


  var Draggable = function (node, options)
  {
    var self = this;

    node.on( {
      dragstart: function (e) {
        e = e.originalEvent;
        e.dataTransfer.setData('Text', this.id);

        if(options.classDragging)
          node.addClass(options.classDragging);

        DragDropManager.onDragStart(e);

        if(options.dragstart)
          options.dragstart(e);
      },
      
      dragend: function (e) {
        e = e.originalEvent;
        
        if(options.classDragging)
          node.removeClass(options.classDragging);

        DragDropManager.onDragEnd(e);
        
        if(options.dragend)
          options.dragend(e);
      }
    } ).prop('draggable', true);
  };


  var Droppable = function (node, options)
  {
    var self = this;

    node.on( {
      dragover: function (e) {
        if(DragDropManager.isScope(e = e.originalEvent, options.scopes)) {
          /* Drag and drop has a tendency to suffer from flicker in the sense that
           * the `dragleave' event is fired while the pointer is on a valid drop
           * target but the `dragenter' event ISN'T fired again, causing the
           * element to lose its special styling -- given by `options.classHover'
           * -- and its `dropEffect'. We then need re-set everything in the
           * `dragover' event. */
          if(options.classHover)
            node.addClass(options.classHover);

          e.dropEffect = 'move';
          return false;
        }
      },
      
      dragenter: function (e) {
        /* IE requires the following special measure or the primary bin won't
         * accept text-items drops. INSANE. */
        if(DragDropManager.isScope(e = e.originalEvent, options.scopes)) {
          e.dropEffect = 'move';
          
          return false;
        }
      },
      
      dragleave: function (e) {
        if(DragDropManager.isScope(e = e.originalEvent, options.scopes)) {
          if(options.classHover)
            node.removeClass(options.classHover);

          return false;
        }
      },
      
      drop: function (e) {
        if(!DragDropManager.isScope(e = e.originalEvent, options.scopes))
          return;

        if(options.classHover)
          node.removeClass(options.classHover);

        if(options.drop) {
          options.drop(e,
                       e.dataTransfer.getData('Text'),
                       DragDropManager.getScope());
        }
        
        return false;
      }
    } );
  };

  
  /* ----------------------------------------------------------------------
   *  Public interface
   *  Accessible module-wide and externally.
   * ---------------------------------------------------------------------- */
  
  /**
   * Initialises Sorting Desk.
   * 
   * Note that Sorting Desk is a singleton and thus there can only be one
   * instance of Sorting Desk active at any time.
   *
   * @param   {Object}    opts  Initialisation options (please refer to
   *                            `defaults_' above)
   * @param   {Object}    cbs   Map of all callbacks
   * 
   * @param   cbs.moreText            Retrieve additional text items.
   * @param   cbs.getBinData          Get data about bins.
   * @param   cbs.saveBinData         Save bin state.
   * @param   cbs.addPrimarySubBin    Add a sub bin.
   * @param   cbs.addSecondaryBin     Add a secondary bin.
   * @param   cbs.removePrimarySubBin Process removal of a sub bin.
   * @param   cbs.removeSecondaryBin  Remove a secondary bin.
   * @param   cbs.renderText          Render text inside a text item element or
   *                                  a bin.
   * @param   cbs.renderPrimaryBin    Render a primary bin.
   * @param   cbs.renderPrimarySubBin Render a sub bin.
   * @param   cbs.renderSecondaryBin  Render a secondary bin.
   * @param   cbs.renderAddButton     Render an add button.
   * 
   * @returns {Object}    Returns a map containing available public methods.
   * */
  var instantiate = function (opts, cbs) {
    /* SortingDesk is a singleton; disallow attempts at multiple
     * instantiation. */
    if(options || initialised)
      throw "Sorting Desk has already been instantiated";
    else if(!opts)
      throw "No options given: some are mandatory";
    else if(!opts.nodes)
      throw "No nodes options given: `items' required";
    else if(!opts.nodes.items)
      throw "Missing `items' nodes option";

    console.log("Initialising Sorting Desk UI");
    
    options = $.extend(true, defaults_, opts);
    callbacks = cbs;
    bins = [ ];
    
    /* Do not request bin data if a bins HTML container wasn't given. */
    if(options.nodes.bins) {
      var promise = callbacks.getBinData(
        [ options.primaryContentId ].concat(options.secondaryContentIds));

      if(!promise)
        throw "Another `getBinData' request is ongoing";
      
      promise
        .done(function(resultBins) {
          initialise_(resultBins);
        } ).fail(function () {
          console.log("Failed to initialise Sorting Desk UI");
        } );
    } else
      initialise_();

    return {
      isInitialised: isInitialised,
      reset: reset,
      remove: remove,
      getById: getById
    };
  };

  /**
   * Resets the component to a virgin state. Removes all nodes contained by
   * `options.nodes.items' and `options.nodes.bins', if any.
   *
   * @returns {Boolean}   Returns status of operation: true if succeeded, false
   *                      otherwise.*/
  var reset = function () {
    var deferred = $.Deferred();
    
    if(!options) {
      window.setTimeout(function () {
        deferred.reject();
      } );
    } else {
      if(options.nodes.items)
        options.nodes.items.children().remove();

      if(options.nodes.bins)
        options.nodes.items.children().remove();

      callbacks = bins = list = null;    
      initialised = false;

      var interval = window.setInterval(function () {
        if(!requests_.length) {
          console.log("Hooks cleared");
          
          options = null;
          deferred.resolve();
          
          window.clearInterval(interval);
        }
      }, 10);
    }
    
    return deferred.promise();
  };

  /**
   * Removes a text item from the list of text of items. Requires the id of the
   * text item to remove.
   *
   * @param   {String}    id
   * 
   * @returns {Boolean}   Returns status of operation: true if succeeded, false
   *                      otherwise.
   * */
  var remove = function (id) {
    if(!initialised)
      throw "Sorting Desk not initialised";
    
    return false;
  };

  /**
   * Looks up a text item, given its id, and returns it. Returns null if not
   * found.
   *
   * @param   {String}    id
   * 
   * @return  {TextItem}  Returns the text item if found, or null if not. */
  var getById = function (id) {
    if(!initialised)
      throw "Sorting Desk not initialised";
    
    var item = list.getById(id);

    /* Return the actual data and not our object. */
    return item && item.getContent();
  };

  /**
   * Returns a boolean value indicating whether Sorting Desk has been
   * initialised and is ready to be used.
   *
   * @returns {Boolean}   Returns true if Sorting Desk has been successful
   *                      initialised, false otherwise.
   * */
  var isInitialised = function () {
    return initialised;
  };


  /* ----------------------------------------------------------------------
   *  Private interface
   *  Accessible module-wide but not externally.
   * ---------------------------------------------------------------------- */
  var initialise_ = function (initialiseBins) {
    if(!options.nodes.binDelete)
      options.nodes.binDelete = $();
    
    /* Do not create any process any bins if a bin HTML container doesn't
     * exist. */
    if(options.nodes.bins) {
      /* Firstly process primary bin. */
      if(!(options.primaryContentId in initialiseBins)
         || initialiseBins[options.primaryContentId].error) {
        throw "Failed to retrieve contents of primary bin";
      }
      
      bins.push(new BinContainerPrimary(
        options.primaryContentId,
        initialiseBins[options.primaryContentId]));

      /* Delete to avoid repetition below. */
      delete initialiseBins[options.primaryContentId];

      /* Now create secondary bins */
      
      bins.push(new BinContainerSecondary(initialiseBins));
    }
    
    list = new ItemsList();
    
    $('body').keyup(function (evt) {
      /* First process alpha key strokes. */
      if(evt.keyCode >= 65 && evt.keyCode <= 90) {
        var bin = getBinByShortcut_(evt.keyCode);

        if(over_) {
          if(!bin)
            over_.setShortcut(evt.keyCode);
        } else {
          if(bin) {
            /* Simulate the effect produced by a mouse click by assigning the
             * CSS class that contains identical styles to the pseudo-class
             * :hover, and removing it after the milliseconds specified in
             * `options.delayAnimateAssign'. */
            bin.getNode().addClass(options.css.binAnimateAssign);
            
            window.setTimeout(function () {
              bin.getNode().removeClass(options.css.binAnimateAssign);
            }, options.delayAnimateAssign);
            
            list.remove();
          }
        }
        
        return false;
      }
      
      /* Not alpha. */
      switch(evt.keyCode) {
      case options.keyboard.listUp:
        list.selectOffset(-1);
        break;
      case options.keyboard.listDown:
        list.selectOffset(1);
        break;
      case options.keyboard.listDismiss:
        options.nodes.binDelete.fadeIn(150, function () {
          options.nodes.binDelete.fadeOut(100);
        } );
        
        list.remove();
        break;
        
      default:
        return;
      }

      return false;
    } );
    
    new Droppable(options.nodes.binDelete, {
      classHover: options.css.droppableHover,
      scopes: [ 'bin', 'text-item' ],

      drop: function (e, id, scope) {
        switch(scope) {
        case 'bin':
          bins.some(function (container) {
            var bin = container.getBinById(id);

            if(bin) {
              /* It doesn't matter if the API request succeeds or not for the
               * bin is always deleted. The only case (that I am aware of) where
               * the API request would fail is if the bin didn't exist
               * server-side, in which case it should be deleted from the UI
               * too. So, always delete, BUT, if the request fails show the user
               * a notification; for what purpose, I don't know. */
              container.remove(bin);

              var fn = callbacks[ bin.isSecondaryBin()
                  ? 'removeSecondaryBin'
                  : 'removePrimarySubBin' ];

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
          list.remove(id);
          break;

        default:
          console.log("Unknown scope:", scope);
          break;
        }

        return false;
      }
    } );

    initialised = true;
    console.log("Sorting Desk UI initialised");
  };

  var onClick_ = function (bin) {
    list.remove();
  };

  var onMouseEnter_ = function (bin) {
    over_ = bin;
  };

  var onMouseLeave_ = function () {
    over_ = null;
  };

  var invoke_ = function () {
    if(arguments.length < 1)
      throw "Callback name required";
    else if(!(arguments[0] in callbacks))
      throw "Callback non existent: " + arguments[0];

    var result = callbacks[arguments[0]]
          .apply(null, [].slice.call(arguments, 1));

    if('always' in result) {
      requests_.push(result);
      
      result.always(function () {
        requests_.splice(requests_.indexOf(result), 1);
      } );
    }

    return result;
  };

  var getBinByShortcut_ = function (keyCode) {
    var result = false;

    $.each(bins, function (i, bin) {
      if( (result = bin.getBinByShortcut(keyCode)) )
        return false;
    } );

    return result;
  };
  

  /* ----------------------------------------------------------------------
   *  Module initialisation
   * ---------------------------------------------------------------------- */
  return {
    instantiate: instantiate
  };

} )();