/**
 * @file Initialisation and handling of the SortingDesk Google Chrome
 * extension user interface.
 * 
 * @copyright 2014 Diffeo
 *
 * Comments:
 * Uses the `SortingDesk' component.
 *
 */


/*global chrome, $, SortingDesk, LabelBrowser, FolderExplorer, SortingQueue, Api */
/*jshint laxbreak:true */


var ChromeExtensionUi = (function () {

  /* Variables */
  var ui_;

  var Ui = function ()
  {
    var self = this,
        requests = 0;

    this.nodes_ = { };

    /* Load custom font */
    /* TODO: perhaps create a resource loader? This is just too hacky. */
    {
      var style = document.createElement('style');
      style.type = 'text/css';
      style.textContent = [
        "@font-face {",
        "font-family: 'Glyphicons Halflings';",
        "src: url('",
        chrome.extension.getURL('lib/bootstrap/fonts/glyphicons-halflings-regular.woff'),
        "'); }" ].join('');
      
      document.head.appendChild(style);
    }

    chrome.runtime.sendMessage({ operation: "get-meta" }, function (result) {
      /* Do not instantiate SortingDesk if not currently enabled or
       * current tab not active. */
      if(!result.config.active || !result.tab.active)
        return;
      
      /* Load container HTML. */
      chrome.runtime.sendMessage( {
        operation: "read-file",
        identifier: "html/container.html"
      }, function (html) { self.initialise_(result, html); } );
    } );
  };
  
  Ui.prototype = {
    /* Class instances */
    activator_: null,
    positioner_: null,
    requests_: null,
    transceiver_: null,
    sorter_: null,
    explorer_: null,
    /* Nodes */
    nodes_: null,

    /* Getter methods */
    get activator() { return this.activator_; },
    get positioner() { return this.positioner_; },
    get requests() { return this.requests_; },
    get transceiver() { return this.transceiver_; },
    get sorter() { return this.sorter_; },
    get nodes() { return this.nodes_; },
    node: function (key) { return this.nodes_[key]; },

    /* Private methods */
    initialise_: function (meta, html)
    {
      var self = this;
      
      $('body').append(html);

      /* Cache jQuery references to nodes used. */
      self.nodes_ = {
        container: $('#sd-sorting-desk'),
        sorter: $('#sd-sorter'),
        activator: $('#sd-activator')
      };

      self.nodes_.loading = this.nodes_.container.find('.sd-loading');
      self.nodes_.empty = this.nodes_.container.find('.sd-empty');

      /* Instantiate class components. */
      self.activator_ = new Activator();
      self.positioner_ = new Positioner();
      self.requests_ = new Requests();
      self.transceiver_ = new Transceiver();

      /* Register for click events on the 'settings' button inside the extension
       * activator button. */
      self.activator_.register(this.onClickSettings_.bind(this));
      self.activator_.show();

      /* Initialise API and instantiate `SortingDesk´ class. */
      self.sorter_ = new SortingDesk.Sorter( {
        nodes: {
          items: $('#sd-queue'),
          bins: $('#sd-bins'),
          add: $('#sd-button-add'),
          buttonDismiss: $("#sd-button-dismiss")
        },
        constructors: {
          Item: ItemLinkify,
          createLabelBrowser: function (options) {
            /* The `options´ map isn't touched *yet*. */
            return new LabelBrowser.Browser(
              options,
              self.getLabelBrowserCallbacks_());
          }
        },
        visibleItems: 10,
        itemsDraggable: false,
        dossierUrl: meta.config.dossierUrl,
        active: meta.active
      }, $.extend(
        true,
        Api,
        self.requests_.callbacks.sorter,
        self.transceiver_.callbacks.sorter ) );
    },

    onClickSettings_: function ()
    {
      if(this.explorer_)
        return;

      var self = this;

      if(!this.sorter_)
        throw "Sorting Desk instance not active";

      /* Instantiate the Bin Explorer component and initialise it. */
      this.explorer_ = new FolderExplorer.Explorer(
        { api: this.sorter_.api },
        this.getFolderExplorerCallbacks_() );

      /* Hold on to promise so that we can clean state up once it exits. */
      this.explorer_.initialise()
        .done(function () {
          self.explorer_.reset();
          self.explorer_ = null;
        } );
    },

    getLabelBrowserCallbacks_: function ()
    {
      var self = this;
      
      return {
        onInitialised: function (container) {
          $('.sd-label-browser .sd-empty').hide();
          $('.sd-label-browser .sd-loading').show();
          self.positionWindow_(container);
        },
        onReady: function (count) {
          $('.sd-label-browser .sd-loading').hide();
          
          if(count === 0)
            $('.sd-label-browser .sd-empty').fadeIn();
        }
      };
    },

    getFolderExplorerCallbacks_: function ()
    {
      var self = this;
      
      return $.extend(
        {
          onInitialised: function (container) {
            self.positionWindow_(container);
          },
          open: function (folder) {
            self.sorter_.open(folder);
            self.explorer_.close();
          }
        },
        this.transceiver_.callbacks.explorer );
    },

    positionWindow_: function (container)
    {
      /* Position window given by `container´ correctly, depending on where the
       * extension activator button is. */
      var position = this.nodes_.sorter.position(),
          win = $(window);
      
      switch(this.positioner_.current) {
      case Positioner.TOP_RIGHT:
        container.css( {
          top: position.top,
          left: position.top
        } );

        container.width(win.width() - this.nodes_.sorter.outerWidth()
                        - (position.top << 1)
                        - container.outerWidth()
                        + container.innerWidth());
        container.height(win.height() -
                         (position.top << 1));
        
        return;
        
      default:
        throw "Current position invalid or not implemented"; 
      }
    }
  };


  /**
   * @class
   * */
  var Requests = function ()
  {
    this.count_ = 0;
  };

  Requests.prototype = {
    count_: null,

    /* Events */
    onRequestStart: function ()
    {
      if(this.count_++ === 0)
        ui_.nodes.loading.stop().fadeIn();
    },
    
    onRequestStop: function () {
      if(--this.count_ === 0)
        ui_.nodes.loading.stop().fadeOut(100);
    },
    
    /* Getter methods */
    get callbacks ()
    {
      return {
        sorter: {
          onRequestStart: this.onRequestStart.bind(this),
          onRequestStop: this.onRequestStop.bind(this)
        }
      };
    }
  };


  /**
   * @class
   * */
  var Transceiver = function ()
  {
    var self = this,
        methods = {
          "folder-removed": this.onFolderRemoved_,
          "folder-updated": this.onFolderUpdated_
        };

    /* Handle messages whose `operation´ is defined above in `methods´. */
    chrome.runtime.onMessage.addListener(
      function (request, sender, callback) {
        if(methods.hasOwnProperty(request.operation)) {
          console.log("Invoking message handler [type="
                      + request.operation + "]");

          methods[request.operation].call(
            self, request, sender, callback);
        }
      }
    );
  };

  Transceiver.prototype = {
    /* Getter methods */
    get callbacks ()
    {
      return {
        sorter: {
          moreTexts: this.moreTexts_.bind(this),
          load: this.loadFolder_.bind(this),
          save: this.saveFolder_.bind(this),
          setActive: this.setActive_.bind(this)
        },
        explorer: {
          load: this.loadFolder_.bind(this),
          loadAll: this.loadFolders_.bind(this),
          save: this.saveFolder_.bind(this),
          saveAll: this.saveFolders_.bind(this),
          remove: this.removeFolder_.bind(this)
        }
      };
    },
    
    /* Inbound events initiated by `SortingDesk´ */
    moreTexts_: function (n)
    {
      var self = this;

      /* Hide message just before a new request is initiated. */
      ui_.nodes.empty.stop().fadeOut(100);

      return ui_.sorter.api.getCallbacks().moreTexts(n)
        .done(function (items) {
          if(!items || !(items instanceof Array) || items.length === 0)
            ui_.nodes.empty.stop().fadeIn('slow');
          else
            ui_.nodes.empty.stop().fadeOut(100);
        } )
        .fail(function () {
          ui_.nodes.empty.show();
        } );
    },

    setActive_: function (id)
    {
      chrome.runtime.sendMessage( { operation: 'set-active', id: id } );
    },

    loadFolders_: function ()
    {
      var deferred = $.Deferred();

      chrome.runtime.sendMessage(
        { operation: 'load-folders' },
        function (folders) { deferred.resolve(folders); } );

      return deferred.promise();
    },

    loadFolder_: function (id)
    {
      var deferred = $.Deferred();

      chrome.runtime.sendMessage(
        { operation: 'load-folder',
          id: id },
        function (folder) {
          if(folder && typeof folder === 'object') deferred.resolve(folder);
          else deferred.reject();
        } );

      return deferred.promise();
    },

    saveFolder_: function (folder)
    {
      chrome.runtime.sendMessage( { operation: 'save-folder', folder: folder} );
    },

    saveFolders_: function (folders)
    {
      chrome.runtime.sendMessage( { operation: 'save-folders',
                                    folders: folders} );
    },

    removeFolder_: function (id)
    {
      chrome.runtime.sendMessage( { operation: 'remove-folder',
                                    id: id } );
    },

    /* Events initiated by the extension outbound to `SortingDesk´ */
    onFolderRemoved_: function (request, sender, callback)
    {
      console.log("Folder removed: id=%s", request.id);

      if(ui_.sorter && ui_.sorter.folder
         && ui_.sorter.folder.id === request.id) {
        console.log("Forcing folder closed");
        ui_.sorter.close();
      }
    },

    onFolderUpdated_: function (request, sender, callback)
    {
      console.log("Folder updated: id=%s", request.folder.id);

      if(ui_.sorter && ui_.sorter.folder
         && ui_.sorter.folder.id === request.folder.id) {
        console.log("Forcing folder refresh");
        ui_.sorter.open(request.folder);
      }
    }
  };


  /**
   * @class
   * */
  var Activator = function ()
  {
    var self = this;
    
    ui_.nodes.activator.click(function () {
      self.toggleShow();
      return false;
    } );
  };

  Activator.prototype = {
    html_: null,
    width_: null,
    callback_: null,

    /* TODO: don't use an adhoc event subscriber. */
    register: function (callback)
    {
      this.callback_ = callback;
    },

    toggleShow: function ()
    {
      if(ui_.nodes.container.hasClass('sd-active'))
        this.hide();
      else
        this.show();
    },

    show: function ()
    {
      var self = this,
          nodes = ui_.nodes;
      
      if(nodes.container.hasClass('sd-active'))
        return;
      
      nodes.container.addClass('sd-active');
      
      self.html_ = nodes.activator.html();
      self.width_ = nodes.activator.width();
      nodes.activator
        .html('<DIV id="sd-settings" class="sd-button sd-button-round sd-small"><SPAN class="sd-glyph-wrench"></SPAN></DIV>Sorting Desk')
        .animate( { width: '120px' }, 150);
      
      $('#sd-settings').click(function () {
        if(typeof self.callback_ === 'function')
          self.callback_();
        
        return false;
      } );
        
      nodes.sorter
        .stop(true, true)
        .fadeIn( { duration: 100, queue: false } );
    },

    hide: function ()
    {
      var self = this,
          nodes = ui_.nodes;

      if(!nodes.container.hasClass('sd-active'))
        return;
      
      nodes.sorter
        .stop(true, true)
        .fadeOut( { duration: 200, queue: false } );
      
      nodes.activator
        .animate( { width: self.width_ + 'px' }, 150, function () {
          $(this).html(self.html_);
        } );
      
      nodes.container.removeClass('sd-active');
    }
  };


  /**
   * @class
   * */
  var Positioner = function (startPosition) {
    this.current_ = null;

    this.position(startPosition || Positioner.TOP_RIGHT);
  };

  /* Enumerations */
  Positioner.TOP_LEFT     = 1;
  Positioner.TOP_RIGHT    = 2;
  Positioner.BOTTOM_LEFT  = 3;
  Positioner.BOTTOM_RIGHT = 4;
  Positioner.TARGET_CLASSES = [
    'sd-top-left',
    'sd-top-right',
    'sd-bottom-left',
    'sd-bottom-right'
  ];

  Positioner.prototype = {
    current_: null,

    get current() { return this.current_; },

    position: function (target)
    {
      var nodes = ui_.nodes;
      
      if(target < 1 || target > 4)
        throw "Invalid target position";

      if(this.current_) {
        nodes.container.add(nodes.add)
          .removeClass(Positioner.TARGET_CLASSES[this.current_ - 1]);
      }

      if(!this.current_ || (this.current_ < Positioner.BOTTOM_LEFT
                            && target > Positioner.TOP_RIGHT)) {
        nodes.activator.prependTo(nodes.container);
      } else if(this.current_ > Positioner.TOP_RIGHT
              && target < Positioner.BOTTOM_LEFT) {
        nodes.activator.appendTo(nodes.container);
      }

      nodes.container.add(nodes.add)
        .addClass(Positioner.TARGET_CLASSES[target - 1] );

      /* TODO: two statements below setting height with added hardcoded margin.
       * */
      nodes.sorter.height($(window).height()
                          - nodes.activator.outerHeight()
                          - (nodes.sorter.outerHeight()
                             - nodes.sorter.innerHeight() )
                          - 10);

      /* TODO: addressing node by its Id. */
      $('#sd-queue').height(nodes.sorter.innerHeight()
                            - $('#sd-bins').outerHeight(true)
                            - 10);
      
      this.current_ = target;
    }
  };


  /**
   * @class
   * */
  var ItemLinkify = function (owner, item)
  {
    SortingQueue.Item.call(this, owner, item);
  };

  ItemLinkify.prototype = Object.create(SortingQueue.Item.prototype);

  ItemLinkify.prototype.render = function() {
    var css = this.owner_.owner.options.css,
        node = $('<div class="' + css.item + '"/>'),
        content = $('<div class="' + css.itemContent + '"/>'),
        anchor = this.content_.name;

    node.append('<a class="' + css.itemClose + '" href="#">x</a>');

    /* Append content and remove all CSS classes from children. */
    if(this.content_.url) {
      content.append('<a href="' + decodeURIComponent(this.content_.url)
                     + '">' + this.content_.text + '</a>');
    } else
      content.append(this.content_.text);
    
    content.children().removeClass();
    node.append(content);
    
    return node;
  };


  /* Public interface */
  var getUi = function ()
  { return ui_; };
  

  /* Initialize extension class responsible for the UI. */
  ui_ = new Ui();


  /* Return API. */
  return {
    get ui() { return ui_; }
  };

})();