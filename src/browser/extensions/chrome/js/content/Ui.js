/**
 * @file Initialisation and handling of the SortingDossier Google Chrome
 * extension user interface.
 * 
 * @copyright 2014 Diffeo
 *
 * @author Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 * Uses the `SortingDossier' component.
 *
 */


/*global chrome, $, SortingDossier, SortingQueue, Api, DossierJS */
/*jshint laxbreak:true */


var ChromeExtensionUi = (function () {

  /* Variables */
  var ui_;

  var Ui = function ()
  {
    var self = this,
        requests = 0;

    this.nodes_ = { };

    chrome.runtime.sendMessage(
      { operation: "get-meta" },
      function (result)
      {
        /* Do not instantiate Sorting Dossier if not currently enabled or
         * current tab not active. */
        if(!result.config.active || !result.tab.active)
          return;
        
        /* Load container HTML. */
        chrome.runtime.sendMessage( {
          operation: "read-file",
          identifier: "html/container.html"
        }, function (html) {
          /* TODO: domain is hardcoded. */
          /* Set current domain. */
          Api.setDomain("mydomain");
          
          $('body').append(html);

          self.nodes_ = {
            container: $('#sdw-container'),
            sorter: $('#sdw-sorter'),
            activator: $('#sdw-activator'),
            loading: $('#sdw-load'),
            empty: $('#sdw-empty')
          };
          
          self.activator_ = new Activator(self);
          self.positioner_ = new Positioner(self);
          
          self.center('loading');
          self.center('empty');
          
          /* Initialise API and instantiate `SortingDossier´ class. */
          self.sortingDossier_ = new SortingDossier.Sorter( {
            nodes: {
              items: $('#sdw-queue'),
              bins: $('#sdw-bins'),
              add: $('#sdw-button-add'),
              buttonDismiss: $("#sdw-button-dismiss")
            },
            constructors: {
              Item: ItemLinkify
            },
            visibleItems: 10,
            itemsDraggable: false,
            activeBinId: result.activeBinId
          }, $.extend(true, $.extend({},  Api), {
            onRequestStart: function () {
              if(!requests++) self.nodes_.loading.stop().fadeIn(); },
            
            onRequestStop: function () {
              if(!--requests) self.nodes_.loading.stop().fadeOut(); },
            
            moreTexts: function (n) {
              return Api.moreTexts(n)
                .done(function (items) {
                  if(!items || !(items instanceof Array) || items.length === 0)
                    self.nodes_.empty.fadeIn('slow');
                  else
                    self.nodes_.empty.fadeOut(100);
                } )
                .fail(function () {
                  self.nodes_.empty.show();
                } );
            }
          } ) );
        } );
      } );
  };
  
  Ui.prototype = {
    /* Class instances */
    activator_: null,
    positioner_: null,
    /* Nodes */
    nodes_: null,

    get activator() { return this.activator_; },
    get positioner() { return this.positioner_; },
    get nodes() { return this.nodes_; },
    node: function (key) { return this.nodes_[key]; },

    center: function (node)
    {
      if((node = this.nodes_[node])) {
        node.css('left',
                 ((this.nodes_.sorter.width() - node.outerWidth()) / 2) + 'px');
      }
    }
  };


  /**
   * @class
   * */
  var Activator = function (ui) {
    var nodes = ui.nodes,
        width = nodes.activator.width();
    
    nodes.activator.click(function () {
      if(nodes.container.hasClass('sdw-active')) {
        nodes.sorter
          .stop(true, true)
          .fadeOut( { duration: 200, queue: false } );
        
        nodes.activator
          .animate( { width: width + 'px' }, 150, function () {
            $(this).html(self.html_);
          } );
        
        nodes.container.removeClass('sdw-active');
      } else {
        nodes.container.addClass('sdw-active');
        
        self.html_ = nodes.activator.html();
        nodes.activator
          .html('Sorting Dossier')
          .animate( { width: '105px' }, 150);
        
        nodes.sorter
          .stop(true, true)
          .fadeIn( { duration: 100, queue: false } );
      }
      
      return false;
    } );
  };

  Activator.prototype = {
    html_: null
  };


  /**
   * @class
   * */
  var Positioner = function (ui, startPosition) {
    this.ui_ = ui;
    this.current_ = null;

    this.position(startPosition || Positioner.TOP_RIGHT);
  };

  /* Enumerations */
  Positioner.TOP_LEFT     = 1;
  Positioner.TOP_RIGHT    = 2;
  Positioner.BOTTOM_LEFT  = 3;
  Positioner.BOTTOM_RIGHT = 4;
  Positioner.TARGET_CLASSES = [
    'sdw-top-left',
    'sdw-top-right',
    'sdw-bottom-left',
    'sdw-bottom-right'
  ];

  Positioner.prototype = {
    ui_: null,
    current_: null,

    position: function (target)
    {
      var nodes = this.ui_.nodes;
      
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
  var MessageHandler = function () {
    var self = this,
        methods = {
        };
    
    /* Handler of messages. */
    chrome.runtime.onMessage.addListener(
      function (request, sender, callback) {
        if(methods.hasOwnProperty(request.operation)) {
          console.log("Invoking message handler [type="
                      + request.operation + "]");
          
          methods[request.operation].call(self, request, sender, callback);
        }
      }
    );
  };

  MessageHandler.prototype = {
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