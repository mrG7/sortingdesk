/**
 * @file Sorting Desk component.
 * @copyright 2014 Diffeo
 * 
 * @author Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 * 
 */


/*global $, define */
/*jshint laxbreak:true */


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("SortingDesk", [ "jQuery", "API-SortingDesk" ], function() {
    return SortingDesk;
  });
}


/**
 * The Sorting Desk module.
 *
 * @returns a "class" constructor that creates a Sorting Desk instance.
 * */
var SortingDesk = (function () {

  /* ----------------------------------------------------------------------
   *  Contants
   * ---------------------------------------------------------------------- */
  var TEXT_VIEW_HIGHLIGHTS = 1,
      TEXT_VIEW_UNRESTRICTED = 2,
      TEXT_CONDENSED_CHARS = 100,
      TEXT_HIGHLIGHTS_CHARS = 150;

  
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
   *   buttonDelete: jQuery-element     ; optional
   * },
   * contentIds: array<string>          ; optional
   * 
   */
  var defaults_ = {
    css: {
      binGeneric: 'sd-bin',
      binShortcut: 'sd-bin-shortcut',
      binAnimateAssign: 'sd-assign',
      binAdding: 'sd-adding',
      buttonAdd: 'sd-button-add',
      itemSelected: 'sd-selected',
      itemDragging: 'sd-dragging',
      droppableHover: 'sd-droppable-hover'
    },
    keyboard: {                 /* Contains scan codes. */
      listUp: 38,               /* up                   */
      listDown: 40,             /* down                 */
      listDismiss: 46           /* delete               */
    },
    delays: {                   /* In milliseconds.     */
      animateAssign: 75,        /* Duration of assignment of text item via
                                 * shortcut. */
      binRemoval: 200,          /* Bin is removed from container. */
      deleteButtonShow: 150,    /* Time taken to fade in delete button. */
      deleteButtonHide: 300,    /* Time to fade out delete button. */
      slideItemUp: 150,         /* Slide up length of deleted text item. */
      addBinShow: 200,          /* Fade in of temporary bin when adding. */
      textItemFade: 100         /* Fade out duration of text item after
                                 * assignment. */
    },
    visibleItems: 20,           /* Arbitrary.           */
    binCharsLeft: 25,
    binCharsRight: 25
  };

  
  /**
   * Constructor responsible for initialising Sorting Desk.
   * 
   * @param   {Object}    opts  Initialisation options (please refer to
   *                            `defaults_' above)
   * @param   {Object}    cbs   Map of all callbacks
   * 
   * @param   cbs.moreText            Retrieve additional text items.
   * @param   cbs.getBinData          Get data about bins.
   * @param   cbs.saveBinData         Save bin state.
   * @param   cbs.addBin              Add a bin.
   * @param   cbs.addSubBin           Add a sub bin.
   * @param   cbs.renderText          Render text inside a text item element or
   *                                  a bin.
   * @param   cbs.renderBin           Render a primary bin.
   * @param   cbs.renderAddButton     Render an add button.
   * */
  var Instance = function (opts, cbs, interface) {

    /* ----------------------------------------------------------------------
     *  Protected attributes
     *  Accessible module-wide. Any module or class instance method can access
     *  these attributes.
     *
     *  Note: there are *no* public attributes as such, where, by 'public' it
     *        is meant attributes accessible externally.
     * ---------------------------------------------------------------------- */
    var initialised = false,
        resetting = false,
        callbacks,
        options,
        container,
        list;

    /* ----------------------------------------------------------------------
     *  Private attributes
     *  Accessible only to module-scope methods. Class instance methods are
     *  forbidden from accessing these attributes.
     * ---------------------------------------------------------------------- */
    var over_ = null,
        requests_ = [ ];


    /**
     * @class
     * */
    var BinContainer = function ()
    {
      var self = this;

      this.bins = [ ];

      new BinAddButton(
        this,
        function (input) {
          return invoke_('renderBin', { name: input } );
        },
        function (id, text) {
          var deferred = $.Deferred();

          invoke_('addBin', text)
            .fail(function () {
              /* TODO: show message box and notify user. */
              console.log("Failed to add bin:", id, text);
              deferred.reject();
            } )
            .done(function (bin) {
              window.setTimeout(function () {
                /* We rely on the API returning exactly ONE descriptor. */
                var id = Object.firstKey(bin);
                new Bin(self, id, bin[id]);
              }, 0);
              
              deferred.resolve();
            } );

          return deferred.promise();
        } );
    };

    BinContainer.prototype = {
      bins: null,

      add: function (bin)
      {
        var id = bin.getId();

        /* Ensure a bin with the same id isn't already contained. */
        this.bins.forEach(function (ib) {
          if(ib.getId() == id)
            throw "Bin is already contained: " + id;
        } );

        /* Contain bin and append its HTML node. */
        this.append(bin.getNode());
        this.bins.push(bin);
      },
      
      append: function (node)
      {
        options.nodes.bins.append(node);
      },
      
      remove: function (bin)
      {
        var self = this,
            node = bin.getNode();

        this.bins.some(function (ib, ndx) {
          if(ib == bin) {
            self.bins.splice(ndx, 1);
            return true;
          }

          return false;
        } );
        
        node.remove(); 
      },

      getBinByShortcut: function (keyCode)
      {
        var result = null;

        this.bins.some(function (bin) {
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
        
        this.bins.some(function (bin) {
          if(bin.getId() == id) {
            result = bin;
            return true;
          }

          return false;
        } );

        return result;
      },
      
      getBins: function ()
      { return this.bins; },

      /* This method is here because it isn't clear at this time whether more
       * than one bin container will exist going forward. Presently that's not
       * the case and hence it simply returns `options.nodes.bins'. */
      getContainer: function ()
      { return options.nodes.bins; }
    };


    /**
     * @class
     * */
    var Bin = function (container, id, bin)
    {
      this.owner = container;
      this.id = id;
      this.bin = bin;
      
      this.setNode_(invoke_("renderBin", bin));
      container.add(this);
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
          .attr( {
            'data-scope': 'bin',
            'id': encodeURIComponent(this.id)
          } )
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
            var id = decodeURIComponent(e.dataTransfer.getData('Text'));
            var item = getById(id);
            invoke_("textDroppedInBin", item, self);
            list.remove(decodeURIComponent(item.node_id));
          }
        } );

        /* We must defer initialisation of D'n'D because owning object's `bin'
         * attribute will have not yet been set. */
        window.setTimeout(function () {
          new Draggable(node, {
            dragstart: function (e) {
              onActivateDeleteButton_();
            },
            
            dragend: function (e) {
              onDeactivateDeleteButton_();
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
      
      getNode: function ()
      { return this.node; },
      
      getOwner: function ()
      { return this.owner; }
    };


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
          onRequestStart_('check-items');

          items.forEach(function (item, index) {
            window.setTimeout( function () {
              self.items.push(new TextItem(self, item));
            }, Math.pow(index, 2) * 1.1);
          } );

          window.setTimeout( function () {
            self.select();
          }, 10);

          /* Ensure event is fired after the last item is added. */
          window.setTimeout( function () {
            onRequestStop_('check-items');
          }, Math.pow(items.length - 1, 2) * 1.1 + 10);

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
            console.log("WARNING! Multiple text items selected:",
                        variant.length);
            
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

        /* Ensure text item is _always_ visible at the bottom and top ends of
         * the containing node. */
        var st = this.container.scrollTop(),       /* scrolling top */
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

      curItem: function() {
        var node = this.container.find('.' + options.css.itemSelected);
        if(!node.length)
          return null;
        var item = this.getById(decodeURIComponent(node.attr('id')));
        if (!item)
          return null;
        return item.content;
      },
      
      remove: function (id)
      {
        if(typeof id == 'undefined') {
          var cur = this.curItem();
          if (!cur) {
            this.check();
            return null;
          }
          id = cur.node_id;
        }

        var self = this,
            result = false;
        
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
                      options.delays.textItemFade,
                      function () {
                        $(this).slideUp(
                          options.delays.slideItemUp,
                          function () {
                            $(this).remove();
                            self.select();
                          } );
                      } );

          self.items.splice(i, 1);
          result = true;
          
          return false;  
        } );
        
        this.check();

        return result;
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

      this.node = invoke_("renderText", item, TEXT_VIEW_HIGHLIGHTS);

      this.setup_();
      options.nodes.items.append(this.node);
    };

    TextItem.prototype = {
      owner: null,
      content: null,                /* Note: unlike bins, a text item contains
                                     * its own id. (?) */
      node: null,

      setup_: function() {
        var self = this;

        /* TODO: `find' call below expects a `text-item-close' class. */
        this.node
          .attr( {
            id: encodeURIComponent(this.content.node_id),
            "data-scope": "text-item"
          } )
          .click(function () {
            self.owner.select(self);
          } )
          .find('.text-item-close').click(function () {
            invoke_("textDismissed", self.content);
            self.owner.remove(decodeURIComponent(self.content.node_id));
            return false;
          } );

        new Draggable(this.node, {
          classDragging: options.css.itemDragging,
          
          dragstart: function (e) {
            /* Firstly select item being dragged to ensure correct item position
             * in container. */
            self.owner.select(self);

            /* Activate deletion/dismissal button. */
            onActivateDeleteButton_();
          },
          
          dragend: function () {
            /* Deactivate deletion/dismissal button. */
            onDeactivateDeleteButton_();
          }
        } );

        /* Add logic to less/more links. */
        /* TODO: `find' expecting `less' CSS class. */
        this.node.find('.less').click(function () {
          var t =invoke_("renderText", self.content, TEXT_VIEW_HIGHLIGHTS);
          
          self.node.replaceWith(t);
          self.node = t;
          self.setup_();
          self.owner.select(self);
          
          return false;
        } );

        /* TODO: `find' expecting `more' CSS class. */
        this.node.find('.more').click(function () {
          var t = invoke_("renderText", self.content, TEXT_VIEW_UNRESTRICTED);
          
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
          self.onAdd(decodeURIComponent(id));
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
              .fadeIn(options.delays.addBinShow);

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

      onAddManual: function (node) {
        var self = this,
            input = node.find('input');

        input
          .focus()
          .blur(function () {
            if(!this.value) {
              node.fadeOut(options.delays.addBinShow,
                           function () { node.remove(); } );
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


    /**
     * @class@
     * */
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


    /**
     * @class@
     * */
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


    /**
     * @class@
     * */
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


    /**
     * @class
     * */
    var TextItemSnippet = function (text)
    {
      this.text = text;
    };

    TextItemSnippet.prototype = {
      text: null,
      
      highlights: function (left, right) {
        var re = /<\s*[bB]\s*[^>]*>/g,
            matcho = re.exec(this.text),
            matchc,
            i, j, skip,
            highlight,
            result;

        if(!matcho)
          return this.condense(left + right);
        
        /* We (perhaps dangerously) assume that a stranded closing tag </B> will
         * not exist before the first opening tag <b>. */
        matchc = /<\s*\/[bB]\s*>/.exec(this.text); /* find end of B tag */

        /* Skip tag, position and extract actual text inside B tag. Use semantic
         * STRONG rather than B tag. */
        i = matcho.index + matcho[0].length;
        highlight = '<STRONG>' + this.text.substr(
          i,
          matchc.index - i) + '</STRONG>';

        /* Move `left' chars to the left of current position and align to word
         * boundary.
         *
         * Note: the assumption is that the browser will be smart enough (and
         * modern ones are) to drop any closed but unopened tags between `i' and
         * `matcho.index'. */
        i = this.indexOfWordLeft(matcho.index - left);

        /* Prepend ellipsis at beginning of result if index not at beginning of
         * string and add text to left of highlight as well as highlight
         * itself.. */
        result = (i > 0 ? "[...]&nbsp;" : '')
          + this.text.substr(i < 0 ? 0 : i, matcho.index - i) + highlight;

        /* Set index to the right of the closing B tag and skip at most `right'
         * chars, taking care not to count chars that are part of any HTML tags
         * towards the `right' chars limit. Align to word boundary and add
         * text. */
        i = matchc.index + matchc[0].length;
        skip = this.skip(i, right);
        j = this.indexOfWordRight(skip.index);
        
        result += this.text.substr(i, j - i);

        /* Close stranded opened tags.
         *
         * Note: probably not necessary but since we know about the non-closed
         * tags, why not close them anyway? */
        j = skip.tags.length;
        
        while(j--)
          result += '</' + skip.tags[j] + '>';
        
        /* Append ellipsis at end of result if index not at end of string. */
        if(j < this.text.length - 1)
          result += "&nbsp;[...]";

        /* And Bob's your uncle. */
        return result;
      },

      condense: function (right) {
        var i = this.indexOfWordRight(right),
            result = this.text.substring(0, i);

        if(i < this.text.length - 1)
          result += '&nbsp;[...]';

        return result;
      },

      skip: function (ndx, count) {
        var tags = [ ];

        while(ndx < this.text.length && count) {
          var ch = this.text.charAt(ndx);

          if(ch == '<') {
            var result = this.extractTag(ndx);

            ndx = result.index;

            if(result.tag)
              tags.push(result.tag);
            else
              tags.pop();
          } else {
            ++ndx;
            --count;
          }
        }

        return { index: ndx, tags: tags };
      },

      extractTag: function (ndx) {
        var match = /<\s*(\/)?\s*([a-zA-Z]+)\s*[^>]*>/.exec(this.text.substr(ndx));

        if(match) {
          return { index: match.index + ndx + match[0].length,
                   tag: match[1] ? null : match[2] };
        }
        
        return { index: ndx };
      },

      indexOfWordLeft: function (ndx) {
        while(ndx >= 0) {
          if(this.text.charAt(ndx) == ' ')
            return ndx + 1;
          
          --ndx;
        }

        return 0;
      },

      indexOfWordRight: function (ndx) {
        while(ndx < this.text.length && this.text.charAt(ndx) != ' ')
          ++ndx;

        return ndx;
      },

      canTextBeReduced: function (left, right) {
        var reduced = this.highlights(left, right);
        return reduced.length < this.text.length;
      }
    };

    
    /**
     * Resets the component to a virgin state. Removes all nodes contained by
     * `options.nodes.items' and `options.nodes.bins', if any.
     *
     * @returns {Boolean}   Returns status of operation: true if succeeded, false
     *                      otherwise.*/
    var reset = function () {
      var deferred = $.Deferred();
      
      if(!options || resetting) {
        window.setTimeout(function () {
          deferred.reject();
        } );
      } else {
        resetting = true;
        
        /* Detach `keyup' event right away. */
        $('body').unbind('keyup', onKeyUp_);
        
        var interval = window.setInterval(function () {
          if(requests_.length)
            return;
          
          if(options.nodes.items)
            options.nodes.items.children().remove();

          if(options.nodes.bins)
            options.nodes.bins.children().remove();

          /* Detach events from bin/text item delete button. */
          if(options.nodes.buttonDelete)
            options.nodes.buttonDelete.off();
          
          options = callbacks = bins = list = null;    
          initialised = false;
          
          window.clearInterval(interval);
          window.setTimeout(function () {
            console.log("Sorting Desk UI reset");
            resetting = false;
            deferred.resolve();
          });
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
      
      return list.remove(id);
    };

    /**
     * Looks up a text item, given its id, and returns it. Returns null if not
     * found.
     *
     * @param   {String}    id
     * 
     * @return  {TextItem}  Returns the text item if found, or null if not. */
    var getTextById = function (id) {
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

    /**
     * Looks up a bin, given its id, and returns it. Returns null if not found.
     *
     * @returns {Boolean}   Returns the bin if found, or null if not.
     * */
    var getBinById = function(id) {
      return container.getBinById(id);
    };


    /* ----------------------------------------------------------------------
     *  Private interface
     *  Accessible module-wide but not externally.
     * ---------------------------------------------------------------------- */
    var initialise_ = function (bins) {
      if(!options.nodes.buttonDelete)
        options.nodes.buttonDelete = $();
      
      /* Do not create bin container or process any bins if a bin HTML container
       * wasn't given OR the bins' data result array wasn't received. */
      if(options.nodes.bins && bins) {
        container = new BinContainer();

        for(var id in bins) {
          var bin = bins[id];
          
          if(bin.error) {
            console.log("Failed to load bin:", id, bin.error);
            continue;
          }

          new Bin(container, id, bin);
        }
      }
      
      list = new ItemsList();
      
      $('body').bind('keyup', onKeyUp_);
      
      new Droppable(options.nodes.buttonDelete, {
        classHover: options.css.droppableHover,
        scopes: [ 'bin', 'text-item' ],

        drop: function (e, id, scope) {
          switch(scope) {
          case 'bin':
            var bin = container.getBinById(decodeURIComponent(id));

            if(bin) {
              /* It doesn't matter if the API request succeeds or not for the
               * bin is always deleted. The only case (that I am aware of) where
               * the API request would fail is if the bin didn't exist
               * server-side, in which case it should be deleted from the UI
               * too. So, always delete, BUT, if the request fails show the user
               * a notification; for what purpose, I don't know. */
              container.remove(bin);

              invoke_('removeBin', bin.getId())
                .fail(function (result) {
                  console.log("bin-remove:", result.error);
                  /* TODO: user notification not implemented yet. */
                } );
            }

            break;

          case 'text-item':
            var item = list.getById(id);
            invoke_("textDismissed", item);
            list.remove(decodeURIComponent(id));
            break;

          default:
            console.log("Unknown scope:", scope);
            break;
          }

          onDeactivateDeleteButton_();

          return false;
        }
      } );

      initialised = true;
      console.log("Sorting Desk UI initialised");
    };

    var onKeyUp_ = function (evt) {
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
             * `options.delay.animateAssign'. */
            bin.getNode().addClass(options.css.binAnimateAssign);
            
            window.setTimeout(function () {
              bin.getNode().removeClass(options.css.binAnimateAssign);
            }, options.delays.animateAssign);
            
            invoke_("textDroppedInBin", list.curItem(), bin);
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
        onActivateDeleteButton_(onDeactivateDeleteButton_);
        invoke_("textDismissed", list.curItem());
        list.remove();
        break;
        
      default:
        return;
      }

      return false;
    };

    var onClick_ = function (bin) {
      invoke_("textDroppedInBin", list.curItem(), bin);
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

      if(result && 'always' in result) {
        onRequestStart_(result);
        
        result.always(function () {
          onRequestStop_(result);
        } );
      }

      return result;
    };

    var onRequestStart_ = function (id) {
      requests_.push(id);
    };

    var onRequestStop_ = function (id) {
      requests_.splice(requests_.indexOf(id), 1);
    };

    var getBinByShortcut_ = function (keyCode) {
      var result;
      return (result = container.getBinByShortcut(keyCode)) ? result : null;
    };
    
    var onActivateDeleteButton_ = function (fn) {
      options.nodes.buttonDelete.fadeIn(options.delays.deleteButtonShow,
                                        typeof fn == 'function' ? fn : null);
    };

    var onDeactivateDeleteButton_ = function () {
      options.nodes.buttonDelete.fadeOut(options.delays.deleteButtonHide);
    };

    var renderTextItem_ = function (item, view) {
      switch(view || TEXT_VIEW_HIGHLIGHTS) {
      case TEXT_VIEW_UNRESTRICTED:
        return renderTextItemUnrestricted_(item);
      case TEXT_VIEW_HIGHLIGHTS:
      default:
        return renderTextItemHighlights_(item);
      }      
    };

    var renderTextItemHtml_ = function (item, text, view, less) {
      var node = $('<div class="text-item view-' + view + '"/>'),
          content = $('<div class="text-item-content"/>'),
          anchor = item.name;

      /* Append title if existent. */
      if(item.title)
        anchor += '&ndash; ' + item.title;

      node.append('<a class="text-item-title" target="_blank" '
                  + 'href="' + item.url + '">'
                  + anchor + '</a>');

      node.append('<a class="text-item-close" href="#">x</a>');

      /* Append content and remove all CSS classes from children. */
      content.append(text);
      content.children().removeClass();

      if(less !== null)
        content.append(renderLessMore_(less));

      node.append(content);
      
      return node;
    };

    var renderLessMore_ = function (less) {
      var cl = less && 'less' || 'more';
      return '<div class="less-more ' + cl + '">' + cl + '</div>'
        + '<div style="display: block; clear: both" />';
    };

    var renderTextItemHighlights_ = function (item) {
      return renderTextItemHtml_(
        item,
        new TextItemSnippet(item.text).highlights(
          TEXT_HIGHLIGHTS_CHARS,
          TEXT_HIGHLIGHTS_CHARS),
        TEXT_VIEW_HIGHLIGHTS,
        false);
    };

    var renderTextItemUnrestricted_ = function (item) {
      return renderTextItemHtml_(
        item,
        item.text,
        TEXT_VIEW_UNRESTRICTED,
        new TextItemSnippet(item.text).canTextBeReduced(
          TEXT_HIGHLIGHTS_CHARS,
          TEXT_HIGHLIGHTS_CHARS)
          ? true : null);
    };
    

    /* ----------------------------------------------------------------------
     * Instantiation logic
     * ---------------------------------------------------------------------- */
    
    /* Allow a jQuery element to be passed in instead of an object containing
     * options. In the case that a jQuery element is detected, it is assumed to
     * be the `nodes.items' element. */
    if(!opts)
      throw "No options given: some are mandatory";
    else if(opts instanceof jQuery) {
      opts = {
        nodes: {
          items: opts
        }
      };
    } else if(!opts.nodes)
      throw "No nodes options given: `items' required";
    else if(!opts.nodes.items)
      throw "Missing `items' nodes option";

    /* Allow a function to be passed in instead of an object containing
     * callbacks. In the case that a function is passed in, it is assumed to be
     * the `moreTexts' callback. */
    if(!cbs)
      throw "No callbacks given: some are mandatory";
    else if(cbs instanceof Function) {
      cbs = {
        moreTexts: cbs
      };
    else if(!cbs.moreTexts)
      throw "Mandatory `moreTexts' callback missing";

    /* Use default implementation of `renderText' if one not specified. */
    if(! ("renderText" in cbs))
      cbs.renderText = renderTextItem_;
    
    console.log("Initialising Sorting Desk UI");
    
    options = $.extend(true, defaults_, opts);
    callbacks = cbs;
    
    /* Do not request bin data if a bins HTML container (`options.nodes.bins')
     * wasn't given OR content ids (`options.nodes.contentIds') were not
     * specified. */
    if(options.nodes.bins && options.contentIds) {
      var promise = callbacks.getBinData(options.contentIds);

      if(!promise)
        throw "Another `getBinData' request is ongoing";
      
      promise
        .done(function(result) {
          initialise_(result);
        } ).fail(function () {
          console.log("Failed to initialise Sorting Desk UI");
        } );
    } else
      initialise_();

    
    /* We can't return anything from within the constructor. The only way to
     * return the public interface to the instance is by requiring a reference
     * to an object which we fill with references to public functions. */
    $.extend(interface, {
      isInitialised: isInitialised,
      reset: reset,
      remove: remove,
      getTextById: getTextById,
      getBinById: getBinById
    } );
  };

  /**
   * Sorting Desk "class" constructor. */
  return function (opts, cbs) {
    var interface = { };

    new Instance(opts, cbs, interface);

    return interface;
  };

} )();
