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


/*global chrome, $, SortingDesk, LabelBrowser, BinExplorer, SortingQueue, Api */
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
        container: $('#sd-container'),
        sorter: $('#sd-sorter'),
        activator: $('#sd-activator'),
        loading: $('#sd-load'),
        empty: $('#sd-empty')
      };

      /* Instantiate class components. */
      self.activator_ = new Activator();
      self.positioner_ = new Positioner();
      self.requests_ = new Requests();
      self.transceiver_ = new Transceiver();

      /* Register for click events on the 'settings' button inside the extension
       * activator button. */
      self.activator_.register(function () {
        if(self.explorer_)
          return;

        /* Instantiate the Bin Explorer component and initialise it. */
        self.explorer_ = new BinExplorer.Explorer(
          { },
          self.sorter_.api);

        /* Hold on to promise so that we can clean state up once it exits. */
        self.explorer_.initialise()
          .done(function () {
            self.explorer_ = null;
          } );
      } );

      /* Center the `loading´ and `empty´ notifications.
       * 
       * Note that both the main container and the element(s) to be centered
       * MUST be visible or their widths can't be computed and thus
       * centering fails. Even though several elements are shown and hidden
       * in quick succession, no flicker occurs because painting only takes
       * place once the script returns execution to the browser. */
      self.nodes_.sorter.show();
      {
        self.center_('loading');
        self.center_('empty');
      }
      self.nodes_.sorter.hide();

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
          createLabelBrowser: function (options, sorter) {
            /* The `options´ map isn't touched *yet*. */
            return new LabelBrowser.Browser(options, sorter);
          },
          createBinExplorer: function (options, sorter) {
            /* The `options´ map isn't touched *yet*. */
            return new BinExplorer.Explorer(options, sorter);
          }
        },
        visibleItems: 10,
        itemsDraggable: false,
        activeBinId: meta.activeBinId,
        dossierUrl: meta.config.dossierUrl
      }, $.extend(
        true,
        {
          onLabelBrowserInitialised: function (container) {
            var position = self.nodes_.sorter.position(),
                win = $(window);
            
            switch(self.positioner_.current) {
            case Positioner.TOP_RIGHT:
              container.css( {
                top: position.top,
                left: position.top
              } );

              container.width(win.width() - self.nodes_.sorter.outerWidth()
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
        },
        Api,
        self.requests_.callbacks,
        self.transceiver_.callbacks ) );
    },
    
    center_: function (node)
    {
      if((node = this.nodes_[node])) {
        /* Both the node and main container must be visible if the node's width
         * is to be known. */
        node
          .show()
          .css('left',
               ((this.nodes_.sorter.width() - node.outerWidth()) / 2) + 'px')
          .hide();
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
        ui_.nodes.loading.stop().fadeOut();
    },
    
    /* Getter methods */
    get callbacks ()
    {
      return {
        onRequestStart: this.onRequestStart.bind(this),
        onRequestStop: this.onRequestStop.bind(this)
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
          "load-state": this.onLoadState_
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
        moreTexts: this.onMoreTexts_.bind(this),
        getBins: this.onGetBins_.bind(this),
        setBins: this.onSetBins_.bind(this),
        setActiveBin: this.onSetActiveBin_.bind(this)
      };
    },
    
    /* Inbound events initiated by `SortingDesk´ */
    onMoreTexts_: function (n)
    {
      var self = this;
      
      return ui_.sorter.api.getCallbacks().moreTexts(n)
        .done(function (items) {
          if(!items || !(items instanceof Array) || items.length === 0)
            ui_.nodes.empty.fadeIn('slow');
          else
            ui_.nodes.empty.fadeOut(100);
        } )
        .fail(function () {
          ui_.nodes.empty.show();
        } );
    },

    onGetBins_: function ()
    {
      var self = this,
          deferred = $.Deferred();

      chrome.storage.local.get('bins', function (result) {
        if(!result.hasOwnProperty('bins') || !(result.bins instanceof Array)) {
          deferred.resolve( [] );
          return;
        }

        console.log("Loaded state: %d bin(s)", result.bins.length);
        deferred.resolve(result.bins);
      } );

      return deferred.promise();
    },

    onSetBins_: function (state)
    {
      var deferred = $.Deferred();
      
      chrome.runtime.sendMessage( {
        operation: 'save-state',
        state: state
      }, function (result) {
        if(result) {
          deferred.resolve();
        } else {
          console.log("Failed to save state");
          deferred.reject();
        }
      } );

      return deferred.promise();
    },

    onSetActiveBin_: function (id)
    {
      chrome.runtime.sendMessage( {
        operation: 'set-active-bin',
        id: id
      } );
    },

    /* Events initiated by the extension outbound to `SortingDesk´ */
    onLoadState_: function (request, sender, callback)
    {
      console.log("Refreshing state");

      ui_.sorter.load(request.activeBinId);
      if(callback) callback();
    }
  };


  /**
   * @class
   * */
  var Activator = function ()
  {
    var self = this,
        nodes = ui_.nodes,
        width = nodes.activator.width();
    
    nodes.activator.click(function () {
      if(nodes.container.hasClass('sd-active')) {
        nodes.sorter
          .stop(true, true)
          .fadeOut( { duration: 200, queue: false } );
        
        nodes.activator
          .animate( { width: width + 'px' }, 150, function () {
            $(this).html(self.html_);
          } );
        
        nodes.container.removeClass('sd-active');
      } else {
        nodes.container.addClass('sd-active');
        
        self.html_ = nodes.activator.html();
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
      }
      
      return false;
    } );
  };

  Activator.prototype = {
    html_: null,
    callback_: null,

    /* TODO: don't use an adhoc event subscriber. */
    register: function (callback)
    {
      this.callback_ = callback;
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