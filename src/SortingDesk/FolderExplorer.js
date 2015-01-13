/**
 * @file Bin Explorer component.
 * @copyright 2014 Diffeo
 *
 * Comments:
 * Uses the `SortingQueue' component.
 *
 */


/*global $, define */
/*jshint laxbreak:true */


/**
 * The Bin Explorer module.
 *
 * @returns an object containing the module's public interface. */
var FolderExplorer_ = function (window, $, sq)
{

  /* Module-wide function */
  var detachAllEventsIn_ = function (n)
  {
    for(var k in n) {
      var i = n[k];

      if(i instanceof $) i.off();
      else if(typeof i === 'object') detachAllEventsIn_(i);
    }
  };


  /**
   * @class
   * */
  var Explorer = function (options, callbacks)
  {
    if(!options || typeof options !== 'object')
      throw "Invalid options object map specified";
    
    /* Attributes */
    this.options_ = options;
    this.callbacks_ = callbacks;
    this.api_ = options.api;
    this.viewType_ = Explorer.VIEW_ICONIC;
    this.nodes_ = { };

    if(!this.api_ || typeof this.api_ !== 'object')
      throw "Invalid API reference specified";

    this.initialised_ = false;
  };

  /* Constants */
  Explorer.VIEW_ICONIC = 0x01;
  Explorer.VIEW_DEFAULT = Explorer.VIEW_ICONIC;
  Explorer.MODE_FOLDERS = 0x01;
  Explorer.MODE_BINS = 0x02;

  /* Interface */
  Explorer.prototype = {
    initialised_: null,
    deferred_: null,
    api_: null,
    options_: null,
    nodes_: null,
    view_: null,
    viewType_: null,
    mode_: null,
    folders_: null,
    selected_: null,
    
    initialise: function ()
    {
      if(this.initialised_)
        throw "Bin Explorer component already initialised";

      var self = this,
          els = this.nodes_;

      console.log("Initialising Bin Explorer component");

      /* Begin set up nodes. */
      els.container = $('[data-sd-scope="folder-explorer-container"]');

      els.buttonClose = this.find_node_('close')
        .click( function () { self.close(); } );

      els.toolbar = {
        actions: {
          load: this.find_node_('toolbar-load'),
          add: this.find_node_('toolbar-add'),
          remove: this.find_node_('toolbar-remove'),
          rename: this.find_node_('toolbar-rename')
        },
        view: {
          icons: this.find_node_('toolbar-icons'),
          list: this.find_node_('toolbar-list')
        }
      };

      els.header = {
        container: this.find_node_('header-folder'),
        buttonBack: this.find_node_('button-back'),
        title: this.find_node_('folder-title')
      };

      els.view = this.find_node_('view');

      /* Load currently selected item when toolbar button clicked. */
      els.toolbar.actions.load.click(function () {
        if(self.selected_ && self.selected_ instanceof ItemIconicFolder) {
          self.open(self.selected_.item);
          self.select(null);
        }

        return false;
      } );

      /* Deselect currently selected folder when clicked on container. */
      els.container.click(function () { self.select(null); return false; });

      /* Add item when toolbar button clicked. */
      els.toolbar.actions.add.click(function () {
        self.select(null);
        if(self.view_) self.view_.onCreate();
        return false;
      } );
      
      /* Remove item when toolbar button clicked. */
      els.toolbar.actions.remove.click(function () {
        if(self.selected_ && self.selected_ instanceof ItemIconicFolder) {
          var id;
          
          if(self.folders_.some(function (folder, index) {
            if(folder === self.selected_.item) {
              id = folder.id;
              self.folders_.splice(index, 1);
              return true;
            }
          } ) ) {
            self.invoke('remove', id);
            self.refresh();
          } else
            console.log("Failed to remove selected item: ", self.selected_);
        }

        return false;
      } );
      /* End set up up nodes. */

      /* Retrieve all folders. */
      this.invoke("loadAll")
        .done(function (folders) {
          if(!(folders instanceof Array))
            throw "Folders state array invalid";

          self.folders_ = folders;
          console.log("Got folders state successfully", self.folders_);
          
          self.render_();
        } );
      
      this.initialised_ = true;
      console.log("Bin Explorer component initialised");
      
      this.invoke("onInitialised", els.container);
      
      return this.show();
    },

    reset: function ()
    {
      this.check_init_();
      
      /* Close window if still visible. */
      if(this.deferred_) {
        this.close();
        if(!this.initialised_) return;
      }
    
      /* Detach events of all nodes. */
      detachAllEventsIn_(this.nodes_);

      if(this.view_) {
        this.view_.reset();
        this.view_ = null;
      }

      this.api_ = this.options_ = this.nodes_ = null;
      this.initialised_ = false;

      console.log("Bin Explorer component reset");
    },

    select: function (item)
    {
      if(this.selected_)
        this.selected_.node.removeClass(Css.selected);
      
      if(item && item !== this.selected_) {
        this.selected_ = item;
        this.selected_.node.addClass(Css.selected);
      } else
        this.selected_ = null;

      var flag = this.selected_ === null,
          els = this.nodes_.toolbar;
      els.actions.load.toggleClass('sd-disabled', flag);
      els.actions.remove.toggleClass('sd-disabled', flag);
    },
    
    open: function (folder)
    {
      this.invoke('open', folder);
    },

    viewFolder: function (folder)
    {
      this.render_(folder);
    },

    refresh: function ()
    {
      /* Currently resetting to 'folder' mode. */
      this.render_();
      console.log("Refreshed view");
      
    },

    /* overridable */ show: function ()
    {
      var els = this.nodes_;
      
      this.check_init_();
      this.deferred_ = $.Deferred();

      els.container.css( {
        transform: 'scale(1,1)',
        opacity: 1
      } );

      /* Set the items list's height so a scrollbar is shown when it overflows
       * vertically. */
      els.view.css('height', els.container.innerHeight()
                   - this.find_node_('header').outerHeight()
                   - (els.view.outerHeight(true) - els.view.innerHeight()));

      return this.deferred_.promise();
    },
    
    /* overridable */ close: function ()
    {
      this.check_init_();
    
      this.nodes_.container
        .css( {
          transform: 'scale(.2,.2)',
          opacity: 0
        } );
      
      if(this.deferred_) {
        this.deferred_.resolve();
        this.deferred_ = null;
      }
    },

    /* TODO: Needs a callbacks handler BADLY. */
    invoke: function ( /* name, ... */ )
    {
      if(arguments.length < 1)
        throw "Callback name not provided";
      
      var cb = this.callbacks_[arguments[0]];
      
      if(typeof cb !== 'function')
        throw "Callback invalid or not existent: " + arguments[0];

      return cb.apply(null, [].slice.call(arguments, 1));
    },

    /* Events */
    onFolderCreated: function (folder)
    {
      this.folders_.push(folder);
      this.refresh();
      this.invoke('save', folder);
    },

    /* Private methods */
    check_init_: function ()
    {
      if(!this.initialised_)
        throw "Component not yet initialised or already reset";
    },

    find_node_: function (scope, parent /* = container */ )
    {
      var p;

      if(parent instanceof $)
        p = parent;
      else if(typeof parent === 'string')
        p = this.find_node_(parent);
      else
        p = this.nodes_.container;

      return p.find( [ '[data-sd-scope="folder-explorer-', scope, '"]' ]
                     .join(''));
    },

    render_: function (folder)
    {
      var self = this,
          hel = this.nodes_.header;
      
      if(this.view_) {
        this.view_.reset();
        this.view_ = null;
      }

      if(folder instanceof Object) {
        this.mode_ = Explorer.MODE_BINS;
        hel.title.html(folder.name);
        hel.container.fadeIn(200);
        hel.buttonBack.click( function () {
          self.render_();
          hel.buttonBack.off();
        } );
      } else {
        folder = null;
        this.mode_ = Explorer.MODE_FOLDERS;
        hel.container.fadeOut(200);
      }

      switch(this.viewType_) {
      case Explorer.VIEW_ICONIC:
        this.view_ = folder
          ? new ViewIconicBins(this, folder.bins)
          : new ViewIconicFolders(this, this.folders_);
        
        break;

      default:
        throw "Invalid view type or view unsupported: " + this.viewType_;
      }

      /* Render view. */
      this.view_.render();
      this.select(null);
    },

    /* Getters */
    get api() { return this.api_; },
    get options() { return this.options_; },
    get nodes() { return this.nodes_; },
    get mode() { return this.mode_; },
    get view() { return this.view_; },
    get folders() { return this.folders_; },
    get selected() { return this.selected_; }
  };


  /**
   * @class
   * */
  var View = function (owner, collection)
  {
    /* Invoke super constructor. */
    sq.Drawable.call(this, owner);

    /* Check `folders' argument IS an array. */
    if(!(collection instanceof Array))
      throw "Invalid collection array specified";

    /* Attributes */
    this.collection_ = collection;

    /* Clear view HTML subtree. */
    this.owner_.nodes.view.children().remove();

    /* Getters */
    this.__defineGetter__('collection',
                          function () { return this.collection_; } );
  };

  View.prototype = Object.create(sq.Drawable.prototype);

  /* overridable */ View.prototype.render = function ()
  {
    var self = this;
    this.collection_.forEach(function (f) { self.add(f); } );
  };
  
  /* overridable */ View.prototype.add = function (descriptor)
  {
    var self = this,
        item = this.getRowNew().add(descriptor);

    item.node.click(function () {
      self.owner.select(item);
      return false;
    } );
  };

  /* overridable */ View.prototype.create = function (item)
  {
    this.getRowNew().create(item);
  };

  /* overridable */ View.prototype.getRowNew = function ()
  {
    var ri, row;

    if(this.rows_.length > 0)
      row = this.rows_[this.rows_.length - 1];

    if(!row || row.items.length >= this.maxPerRow_) {
      row = new (this.getClassRow())(this);
      this.rows_.push(row);
    }

    return row;
  };


  /**
   * @class
   * */
  var ViewIconic = function (owner, collection)
  {
    /* Invoke super constructor. */
    View.call(this, owner, collection);

    /* Attributes */
    this.maxPerRow_ = null;
    this.rows_ = [ ];

    /* Getters */
    this.__defineGetter__('maxPerRow',
                          function () { return this.maxPerRow_; } );
    
    this.__defineGetter__('rows', function () { return this.rows_; } );
  };

  ViewIconic.prototype = Object.create(View.prototype);

  ViewIconic.prototype.reset = function ()
  {
    this.rows_.forEach(function (row) { row.reset(); } );
    this.collection_ = this.maxPerRow_ = this.rows_ = null;
  };


  /**
   * @class
   * */
  var ViewIconicFolders = function (owner, folders)
  {
    /* Invoke super constructor. */
    ViewIconic.call(this, owner, folders);

    /* Attributes */
    this.maxPerRow_ = Math.floor(
      Math.max(RowIconicFolder.calculateMaxPerRow(owner), 1));
  };

  ViewIconicFolders.prototype = Object.create(ViewIconic.prototype);

  ViewIconicFolders.prototype.getClassRow = function ()
  { return RowIconicFolder; };

  ViewIconicFolders.prototype.onCreate = function ()
  {
    var self = this,
        nf = new ItemIconicFolderNew(self);
    
    this.create(nf);

    nf.getNodeInput()
      .focus()
      .keypress(function (ev) {
        if(ev.keyCode === 13) $(this).trigger('blur');
      } )
      .blur(function() {
        var value = this.value.trim();
        
        if(value.length > 0) {
          self.owner.onFolderCreated( {
            id: nf.item.id,
            name: value,
            bins: [ ]
          } );
        }
        
        nf.node.remove();
        return false;
      } );
  };


  /**
   * @class
   * */
  var ViewIconicBins = function (owner, bins)
  {
    /* Invoke super constructor. */
    ViewIconic.call(this, owner, bins);

    /* Attributes */
    this.maxPerRow_ = Math.floor(
      Math.max(RowIconicBin.calculateMaxPerRow(owner), 1));
  };

  ViewIconicBins.prototype = Object.create(ViewIconic.prototype);

  ViewIconicBins.prototype.getClassRow = function ()
  { return RowIconicBin; };

  
  /**
   * @class
   * */
  var Row = function (owner)
  {
    /* Invoke super constructor. */
    sq.Owned.call(this, owner);

    /* Attributes */
    this.items_ = [ ];
    this.node_ = null;

    /* Getters */
    this.__defineGetter__('node', function () { return this.node_; } );
    this.__defineGetter__('items', function () { return this.items_; } );
  };

  /* Interface */
  Row.prototype = Object.create(sq.Owned.prototype);

  /* overridable */ Row.prototype.add = function (descriptor)
  {
    if(this.items_.length > this.owner.maxPerRow)
      throw "Max folder containment reached";

    var item = new (this.getClassItem())(this, descriptor);
    this.items_.push(item);
    item.render(this.node_);

    return item;
  };

  /* overridable */ Row.prototype.create = function (item)
  {
    if(this.items_.length > this.owner.maxPerRow)
      throw "Max folder containment reached";

    item.render(this.node_);
    this.owner_.owner.nodes.view.animate(
      { scrollTop: item.node.offset().top },
      250 );
  };

  Row.prototype.reset = function ()
  {
    this.items_ = null;

    if(this.node_) {
      this.node_.remove();
      this.node_ = null;
    }
  };


  /**
   * @class
   * */
  var RowIconicFolder = function (owner)
  {
    /* Invoke super constructor. */
    Row.call(this, owner);

    /* Attributes */
    this.node_ = $('<div></div>')
      .addClass([ Css.row, Css.rowFolder ].join(' '))
      .appendTo(this.owner.owner.nodes.view);
  };

  /* Static interface */
  RowIconicFolder.calculateMaxPerRow = function (owner)
  {
    var fake = new ItemIconicFolder(null, { "fake": { name: "fake" } }),
        result;

    fake.render($('body'));
    result = owner.nodes.view.innerWidth() / fake.node.outerWidth(true);
    fake.node.remove();
    
    return result;
  };

  /* Interface */
  RowIconicFolder.prototype = Object.create(Row.prototype);

  RowIconicFolder.prototype.getClassItem = function ()
  { return ItemIconicFolder; };


  /**
   * @class
   * */
  var RowIconicBin = function (owner)
  {
    /* Invoke super constructor. */
    Row.call(this, owner);

    /* Attributes */
    this.node_ = $('<div></div>')
      .addClass([ Css.row, Css.rowBin ].join(' '))
      .appendTo(this.owner.owner.nodes.view);
  };

  /* Static interface */
  RowIconicBin.calculateMaxPerRow = function (owner)
  {
    var fake = new ItemIconicBin(null, { "fake": { name: "fake" } }),
        result;

    fake.render($('body'));
    result = owner.nodes.view.innerWidth() / fake.node.outerWidth(true);
    fake.node.remove();
    
    return result;
  };

  /* Interface */
  RowIconicBin.prototype = Object.create(Row.prototype);

  RowIconicBin.prototype.getClassItem = function ()
  { return ItemIconicBin; };
  

  /**
   * @class
   * */
  var Item = function (owner, item)
  {
    /* Invoke super constructor. */
    sq.Drawable.call(this, owner);

    if(typeof item !== 'object')
      throw "Invalid reference to item object";

    /* Attributes */
    this.node_ = null;
    this.item_ = item;

    console.log("Created iconic item", this.item_);

    /* Getters */
    this.__defineGetter__('node', function () { return this.node_; } );
    this.__defineGetter__('item', function () { return this.item_; } );
  };

  /* Interface */
  Item.prototype = Object.create(sq.Drawable.prototype);
  

  /**
   * @class
   * */
  var ItemIconicFolder = function (owner, folder)
  {
    /* Invoke super constructor. */
    Item.call(this, owner, folder);
  };

  /* Interface */
  ItemIconicFolder.prototype = Object.create(Item.prototype);

  ItemIconicFolder.prototype.render = function (container)
  {
    var self = this;
    
    this.node_ = $('<div></div>')
      .addClass([ Css.icon, Css.iconFolder ].join(' '))
      .html( [ '<div class="',
               Css.iconImage,
               '"></div>',
               '<div class="',
               Css.iconName,
               '">',
               this.item_.name,
               '</div>' ].join('') )
      .dblclick(function () {
        self.owner.owner.owner.open(self.item_);
      } );

    this.node_.appendTo(container);
  };
  

  /**
   * @class
   * */
  var ItemIconicFolderNew = function (owner)
  {
    /* Invoke super constructor. */
    Item.call(this, owner, { id: Date.now(), name: "" } );
  };

  /* Interface */
  ItemIconicFolderNew.prototype = Object.create(Item.prototype);

  ItemIconicFolderNew.prototype.render = function (container)
  {
    var self = this;
    
    this.node_ = $('<div></div>')
      .addClass([ Css.icon, Css.iconFolder, Css.new ].join(' '))
      .html( [ '<div class="',
               Css.iconImage,
               '"></div>',
               '<div class="',
               Css.iconName,
               '"><input class="',
               Css.input,
               '" type="text" placeholder="New folder"/>',
               '</div>' ].join('') );

    this.node_
      .appendTo(container)
      .css('opacity', 0)
      .animate( { 'opacity': 1 }, 100 );
  };

  ItemIconicFolderNew.prototype.getNodeInput = function ()
  { return this.node_.find('INPUT').eq(0); };
  

  /**
   * @class
   * */
  var ItemIconicBin = function (owner, folder)
  {
    /* Invoke super constructor. */
    Item.call(this, owner, folder);
  };

  /* Interface */
  ItemIconicBin.prototype = Object.create(Item.prototype);

  ItemIconicBin.prototype.render = function (container)
  {
    var self = this;
    
    this.node_ = $('<div></div>')
      .addClass([ Css.icon, Css.iconBin ].join(' '))
      .html( [ '<div class="',
               Css.iconImage,
               '"></div>',
               '<div class="',
               Css.iconName,
               '">',
               this.item_.name,
               '</div>' ].join('') );

    this.node_.appendTo(container);
  };
  

  /* CSS class names used. */
  var Css = {
    icon: "sd-fe-icon",
    rowFolder: "sd-fe-row-folder",
    rowBin: "sd-fe-row-bin",
    iconFolder: "sd-fe-icon-folder",
    iconBin: "sd-fe-icon-bin",
    iconImage: "sd-fe-icon-image",
    iconName: "sd-fe-icon-name",
    input: "sd-fe-input",
    selected: "sd-selected",
    new: "sd-new"
  };


  /* Default options */
  var defaults_ = {
  };


  /* Module public API */
  return {
    Explorer: Explorer,
    ViewIconic: ViewIconic,
    ViewIconicFolders: ViewIconicFolders,
    ViewIconicBins: ViewIconicBins,
    Row: Row,
    RowIconicFolder: RowIconicFolder,
    RowIconicBin: RowIconicBin,
    Item: Item,
    ItemIconicFolder: ItemIconicFolder,
    ItemIconicBin: ItemIconicBin
  };
  
};


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("FolderExplorer", [ "jquery", "SortingQueue" ], function ($, sq) {
    return FolderExplorer_(window, $, sq);
  });
} else
  window.FolderExplorer = FolderExplorer_(window, $, SortingQueue);
