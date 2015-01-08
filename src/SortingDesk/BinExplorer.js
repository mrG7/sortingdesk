/**
 * @file Bin Explorer component.
 * @copyright 2014 Diffeo
 *
 * Comments:
 * Uses the `SortingQueue' component.
 *
 */


/*global $, SortingQueue, Api, define */
/*jshint laxbreak:true */


/**
 * The Bin Explorer module.
 *
 * @returns an object containing the module's public interface. */
var BinExplorer_ = function (window, SortingQueue, $)
{


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
    this.mode_ = null;

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
    
    initialise: function ()
    {
      if(this.initialised_)
        throw "Bin Explorer component already initialised";

      var self = this,
          els = this.nodes_;

      console.log("Initialising Bin Explorer component");

      /* Begin set up nodes. */
      els.container = $('[data-sd-scope="bin-explorer-container"]');

      els.buttonClose = this.find_node_('close')
        .click( function () { self.close(); } );

      els.toolbar = {
        actions: {
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
      /* End set up up nodes. */

      /* Retrieve all folders. */
      this.invoke("loadFolders")
        .done(function (folders) {
          if(!(folders instanceof Array))
            throw "Folders state array invalid";

          self.folders_ = folders;
          console.log("Got folders state successfully", self.folders_);

          /* TODO: DEBUG: remove below */
          var ji = 0;
          self.folders_ = [ ];
          for(var i = 0; i < 20; ++i) {
            var bins = [ ];
            
            for(var j = 0; j < 20; ++j) {
              bins.push( {
                id: ++ji,
                name: "Bin caption " + ji
              } );
            }

            self.folders_.push({ id: i, name: "Massive folder caption " + i, bins: bins });
          }
          
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
    
      /* Detach all events. */
      this.nodes_.buttonClose.off();

      if(this.view_) {
        this.view_.reset();
        this.view_ = null;
      }

      this.api_ = this.options_ = this.nodes_ = null;
      this.initialised_ = false;

      console.log("Bin Explorer component reset");
    },

    viewFolder: function (folder)
    {
      this.render_(folder);
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

      return p.find( [ '[data-sd-scope="bin-explorer-', scope, '"]' ].join(''));
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
        console.log(hel.container.length);        
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
    },

    /* Getters */
    get api() { return this.api_; },
    get options() { return this.options_; },
    get nodes() { return this.nodes_; },
    get mode() { return this.mode_; },
    get view() { return this.view_; },
    get folders() { return this.folders_; }
  };


  /**
   * @class
   * */
  var View = function (owner, collection)
  {
    /* Invoke super constructor. */
    SortingQueue.Drawable.call(this, owner);

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

  View.prototype = Object.create(SortingQueue.Drawable.prototype);

  /* overridable */ View.prototype.render = function ()
  {
    var self = this;
    this.collection_.forEach(function (f) { self.add(f); } );
  };
  
  /* overridable */ View.prototype.add = function (folder)
  {
    var ri, row;

    if(this.rows_.length > 0)
      row = this.rows_[this.rows_.length - 1];

    if(!row || row.items.length >= this.maxPerRow_) {
      row = new (this.getClassRowIconic())(this);
      this.rows_.push(row);
    }

    row.add(folder);
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

  ViewIconicFolders.prototype.getClassRowIconic = function ()
  { return RowIconicFolder; };


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

  ViewIconicBins.prototype.getClassRowIconic = function ()
  { return RowIconicBin; };

  /**
   * @class
   * */
  var RowIconic = function (owner)
  {
    /* Invoke super constructor. */
    SortingQueue.Owned.call(this, owner);

    /* Attributes */
    this.items_ = [ ];
    this.node_ = null;

    /* Getters */
    this.__defineGetter__('node', function () { return this.node_; } );
    this.__defineGetter__('items', function () { return this.items_; } );
  };

  /* Interface */
  RowIconic.prototype = Object.create(SortingQueue.Owned.prototype);

  RowIconic.prototype.add = function (descriptor)
  {
    if(this.items_.length > this.owner.maxPerRow)
      throw "Max folder containment reached";

    var icon = new (this.getClassIconicItem())(this, descriptor);
    this.items_.push(icon);
    icon.render(this.node_);
  };

  RowIconic.prototype.reset = function ()
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
    RowIconic.call(this, owner);

    /* Attributes */
    this.node_ = $('<div></div>')
      .addClass([ Css.row, Css.rowFolder ].join(' '))
      .appendTo(this.owner.owner.nodes.view);
  };

  /* Static interface */
  RowIconicFolder.calculateMaxPerRow = function (owner)
  {
    var fake = new IconicFolder(null, { "fake": { name: "fake" } }),
        result;

    fake.render($('body'));
    result = owner.nodes.view.innerWidth() / fake.node.outerWidth(true);
    fake.node.remove();
    
    return result;
  };

  /* Interface */
  RowIconicFolder.prototype = Object.create(RowIconic.prototype);

  RowIconicFolder.prototype.getClassIconicItem = function ()
  { return IconicFolder; };


  /**
   * @class
   * */
  var RowIconicBin = function (owner)
  {
    /* Invoke super constructor. */
    RowIconic.call(this, owner);

    /* Attributes */
    this.node_ = $('<div></div>')
      .addClass([ Css.row, Css.rowBin ].join(' '))
      .appendTo(this.owner.owner.nodes.view);
  };

  /* Static interface */
  RowIconicBin.calculateMaxPerRow = function (owner)
  {
    var fake = new IconicBin(null, { "fake": { name: "fake" } }),
        result;

    fake.render($('body'));
    result = owner.nodes.view.innerWidth() / fake.node.outerWidth(true);
    fake.node.remove();
    
    return result;
  };

  /* Interface */
  RowIconicBin.prototype = Object.create(RowIconic.prototype);

  RowIconicBin.prototype.getClassIconicItem = function ()
  { return IconicBin; };
  

  /**
   * @class
   * */
  var IconicItem = function (owner, item)
  {
    /* Invoke super constructor. */
    SortingQueue.Drawable.call(this, owner);

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
  IconicItem.prototype = Object.create(SortingQueue.Drawable.prototype);
  

  /**
   * @class
   * */
  var IconicFolder = function (owner, folder)
  {
    /* Invoke super constructor. */
    IconicItem.call(this, owner, folder);
  };

  /* Interface */
  IconicFolder.prototype = Object.create(IconicItem.prototype);

  IconicFolder.prototype.render = function (container)
  {
    var self = this;
    
    this.node_ = $('<div></div>')
      .addClass([ Css.icon, Css.iconFolder ].join(' '))
      .html( [ '<img src="data:image/png;base64,',
               Images.icons.folder,
               '" /><div>',
               this.item_.name,
               '</div>' ].join('') )
      .dblclick(function () {
        self.owner.owner.owner.viewFolder(self.item_);
      } );

    this.node_.appendTo(container);
  };
  

  /**
   * @class
   * */
  var IconicBin = function (owner, folder)
  {
    /* Invoke super constructor. */
    IconicItem.call(this, owner, folder);
  };

  /* Interface */
  IconicBin.prototype = Object.create(IconicItem.prototype);

  IconicBin.prototype.render = function (container)
  {
    var self = this;
    
    this.node_ = $('<div></div>')
      .addClass([ Css.icon, Css.iconBin ].join(' '))
      .html( [ '<img src="data:image/png;base64,',
               Images.icons.bin,
               '" /><div>',
               this.item_.name,
               '</div>' ].join('') );

    this.node_.appendTo(container);
  };
  

  /* CSS class names used. */
  var Css = {
    icon: "sd-be-icon",
    rowFolder: "sd-be-row-folder",
    rowBin: "sd-be-row-bin",
    iconFolder: "sd-be-icon-folder",
    iconBin: "sd-be-icon-bin"
  };

  /* TODO: remove base64-encoded images! */
  var Images = {
    icons: {
      folder:
      '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',
      bin: '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'
    }
  };


  /* Default options */
  var defaults_ = {
  };


  /* Module public API */
  return {
    Explorer: Explorer,
    ViewIconic: ViewIconic,
    ViewIconicFolder: ViewIconicFolders,
    ViewIconicBin: ViewIconicBins,
    RowIconic: RowIconic,
    RowIconicFolder: RowIconicFolder,
    RowIconicBin: RowIconicBin,
    IconicFolder: IconicFolder,
    IconicBin: IconicBin
  };
  
};


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("BinExplorer", [ "jquery" ], function (SortingQueue, $) {
    return BinExplorer_(window, SortingQueue, $, Api);
  });
} else
  window.BinExplorer = BinExplorer_(window, SortingQueue, $);
