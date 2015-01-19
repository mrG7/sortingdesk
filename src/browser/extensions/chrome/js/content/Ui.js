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


var ChromeExtensionUi = (function ($, std) {

  /* Variables */
  var ui_;


  /**
   * @class
   * */
  var Ui = function (meta)
  {
    var self = this;

    this.nodes_ = { };

    /* Load custom font */
    ResourceInjector.inject( [ {
      url: 'lib/bootstrap/fonts/glyphicons-halflings-regular.woff',
      family: 'Glyphicons Halflings',
      type: 'font'
    } ] );
    
    /* Load container HTML. */
    chrome.runtime.sendMessage( {
      operation: "read-file",
      identifier: "html/container.html"
    }, function (html) {
      $('body').append(html);

      /* Cache jQuery references to nodes used. */
      self.nodes_ = {
        container: $('#sd-sorting-desk'),
        sorter: $('#sd-sorter'),
        activator: $('#sd-activator')
      };

      self.nodes_.loading = self.nodes_.container.find('.sd-loading');
      self.nodes_.empty = self.nodes_.container.find('.sd-empty');

      /* Instantiate and or initialise class components. */
      self.activator_ = new Activator();
      self.positioner_ = new Positioner();
      BackgroundListener.initialise();

      /* Register for click events on the 'settings' button inside the extension
       * activator button. */
      self.activator_
        .on('click-explorer', self.onClickExplorer_.bind(self))
        .show();

      /* Initialise API and instantiate `SortingDesk´ class. */
      (self.sorter_ = new SortingDesk.Sorter( {
        container: $('#sd-sorter'),
        constructors: {
          createLabelBrowser: function (options) {
            $('[data-sd-scope="label-browser-header-title"]').html("Loading");
            $('[data-sd-scope="label-browser-header-content"]')
              .html("Please wait...");
            
            /* The `options´ map isn't touched *yet*. */
            return (new LabelBrowser.Browser(
              options,
              HandlerCallbacks.callbacks.browser
            ))
              .on( {
                initialised: function (container) {
                  $('.sd-label-browser .sd-empty').hide();
                  $('.sd-label-browser .sd-loading').show();
                  self.positionWindow_(container);
                },
                
                ready: function (count) {
                  $('.sd-label-browser .sd-loading').hide();
                  if(count === 0) $('.sd-label-browser .sd-empty').fadeIn();
                }
              } );
          }
        },
        dossierUrl: meta.config.dossierUrl,
        active: meta.active,
        sortingQueue: {
          container: $('#sd-sorter'),
          visibleItems: 10,
          itemsDraggable: false
        }
      }, $.extend(
        true,
        Api,
        HandlerCallbacks.callbacks.sorter ) )
      ).initialise();

      self.sorter_.sortingQueue.on(LoadingStatus.events);
    } );
  };
  
  Ui.prototype = {
    /* Class instances */
    activator_: null,
    positioner_: null,
    sorter_: null,
    explorer_: null,
    /* Nodes */
    nodes_: null,

    /* Getter methods */
    get sorter() { return this.sorter_; },
    get nodes() { return this.nodes_; },
    node: function (key) { return this.nodes_[key]; },

    /* Private methods */
    onClickExplorer_: function ()
    {
      if(this.explorer_)
        return;

      var self = this;

      if(!this.sorter_)
        throw "Sorting Desk instance not active";

      /* Instantiate the Bin Explorer component and initialise it. */
      (this.explorer_ = new FolderExplorer.Explorer(
        { api: this.sorter_.api },
        HandlerCallbacks.callbacks.explorer
      )
        .on( {
          initialised: function (container) {
            self.positionWindow_(container);
          },
          open: function (folder) {
            self.sorter_.open(folder);
            self.explorer_.hide();
          },
          hide: function () {
            self.explorer_.reset();
            self.explorer_ = null;
          }
        } ) )
        .initialise();
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
        
        container.height(win.height() - (position.top << 1));
        return;
        
      default:
        throw "Current position invalid or not implemented"; 
      }
    }
  };


  /**
   * @class
   * */
  var LoadingStatus = (function () {
    var count_ = 0;

    /* Event handlers */
    var onRequestStart_ = function (id)
    {
      if(count_++ === 0)
        ui_.nodes.loading.stop().fadeIn();
    };
    
    var onRequestStop_ = function (id)
    {
      if(count_ === 0)
        console.log("Internal count clear on request stop: %s", id);
      else if(--count_ === 0)
        ui_.nodes.loading.stop().fadeOut(100);
    };

    /* Public interface */
    return {
      events: {               /* Acts like a getter. */
        'request-start': onRequestStart_,
        'request-stop':  onRequestStop_
      }
    };
  } )();


  /**
   * @class
   * */
  var HandlerCallbacks = (function () {
    
    var moreTexts_ = function (n)
    {
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
    };

    var setActive_ = function (id)
    {
      chrome.runtime.sendMessage( { operation: 'set-active', id: id } );
    };
    
    var load_ = function (id)
    {
      var deferred = $.Deferred();

      chrome.runtime.sendMessage(
        { operation: 'load-folder', id: id },
        function (folder) {
          if(std.is_obj(folder)) deferred.resolve(folder);
          else deferred.reject();
        } );

      return deferred.promise();
    };

    var loadAll_ = function ()
    {
      var deferred = $.Deferred();

      chrome.runtime.sendMessage(
        { operation: 'load-folders' },
        function (folders) { deferred.resolve(folders); } );

      return deferred.promise();
    };

    var save_ = function (folder)
    {
      chrome.runtime.sendMessage( { operation: 'save-folder', folder: folder} );
    };

    var remove_ = function (id)
    {
      chrome.runtime.sendMessage( { operation: 'remove-folder', id: id } );
    };
    
    /* Interface */
    return {
      callbacks: {
        sorter: {
          moreTexts: moreTexts_,
          load: load_,
          save: save_,
          setActive: setActive_
        },
        explorer: {
          load: load_,
          loadAll: loadAll_,
          save: save_,
          remove: remove_
        },
        browser: {
        }
      }
    };

  } )();


  /**
   * @class
   * */
  var BackgroundListener = (function () {

    /* Handlers of messages sent by the extension (background.js). */
    var onFolderRemoved_ = function (request, sender, callback)
    {
      console.log("Folder removed: id=%s", request.id);

      if(ui_.sorter && ui_.sorter.folder
         && ui_.sorter.folder.id === request.id) {
        console.log("Forcing folder closed");
        ui_.sorter.close();
      }
    };

    var onFolderUpdated_ = function (request, sender, callback)
    {
      console.log("Folder updated: id=%s", request.folder.id);

      if(ui_.sorter && ui_.sorter.folder
         && ui_.sorter.folder.id === request.folder.id) {
        console.log("Forcing folder refresh");
        ui_.sorter.open(request.folder);
      }
    };

    /* Map message operations to handlers. */
    var methods_ = {
      "folder-removed": onFolderRemoved_,
      "folder-updated": onFolderUpdated_
    };

    /* Interface */
    
    /* Require initialisation because the extension may not be active. If that
     * is the case, it is of no interest to be listening to messages from
     * background. */
    var initialise = function () {
      /* Handle messages whose `operation´ is defined above in `methods_´. */
      chrome.runtime.onMessage.addListener(
        function (request, sender, callback) {
          if(methods_.hasOwnProperty(request.operation)) {
            console.log("Invoking message handler [type="
                        + request.operation + "]");

            /* Invoke handler. */
            methods_[request.operation].call(window, request, sender, callback);
          }
        }
      );
    };

    /* Public interface */
    return {
      initialise: initialise
    };
    
  } )();


  /**
   * @class
   * */
  var Activator = function ()
  {
    var self = this;

    this.events_ = new std.Events(this, [ 'click-explorer' ] );
    
    ui_.nodes.activator.click(function () {
      self.toggleShow();
      return false;
    } );
  };

  Activator.prototype = {
    html_: null,
    width_: null,
    events_: null,

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
        .html('<DIV id="sd-settings" class="sd-button sd-button-round'
              + ' sd-small"><SPAN class="sd-glyph sd-glyph-folder-open">'
              + '</SPAN></DIV>Sorting Desk')
        .animate( { width: '120px' }, 150);
      
      $('#sd-settings').click(function () {
        self.events_.trigger('click-explorer');
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
  var ResourceInjector = (function () {
    /* Interface */
    var inject = function (urls)
    {
      if(!(urls instanceof Object))
        throw "Invalid urls object given";
      else if(!(urls instanceof Array))
        urls = [ urls ];

      urls.forEach(function (res) {
        switch(res.type.toLowerCase()) {
        case 'font':
          if(!std.is_str(res.family))
            throw "Font family not specified";
          
          injectFont(res.url, res.family);
          break;
          
        default:
          console.log("Invalid resource type: %s", res.type);
          return;
        }

        console.log("Injected resource (%s): %s", res.type, res.url);
      } );
    };
    
    var injectFont = function (url, family)
    {
      var style = document.createElement('style');
      style.type = 'text/css';
      style.textContent = [
        "@font-face {",
        "font-family: '",
        family,
        "';src: url('",
        chrome.extension.getURL(url),
        "'); }" ].join('');
      
      document.head.appendChild(style);
    };

    /* Public interface */
    return {
      inject: inject
    };
  } )();


  /* Attempt to initialize extension class responsible for the UI. */
  chrome.runtime.sendMessage({ operation: "get-meta" }, function (result) {
    /* Do not proceed with UI initialisation if extension not currently enabled,
     * current tab not active or current page's URL is secure (using HTTPS) and
     * extension is set to not be activated on secure pages. */
    if(!result.config.active || !result.tab.active || !window.location.href
       || (/^https:\/\//.test(window.location.href)
           && !result.config.activateHttps))
    {
      console.log("Skipping activation: inactive or unsupported");
    } else
      ui_ = new Ui(result);
  } );

  
})($, SortingCommon);