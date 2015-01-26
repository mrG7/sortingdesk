/**
 * @file Initialisation and handling of the SortingDesk Google Chrome
 * extension user interface.
 * 
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingDesk' component.
 *
 */


/*global chrome, $, SortingDesk, LabelBrowser, FolderExplorer, SortingQueue, Api */
/*jshint laxbreak:true */


var ChromeExtensionUi = (function ($, std) {

  /* Variables */
  var embed_;


  /**
   * @class
   * */
  var BackgroundListener = (function () {

    /* Map message operations to handlers. */
    var methods_ = {
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
  var DraggableImageMonitor = function ()
  {
    /* Define getters. */
    this.__defineGetter__("active",
                          function () { return this.active_; } );

    /* Initialise component. */
    var self = this;

    /* Attach specialised `drag´ event listeners to every image found on the
     * page. */
    $('IMG').each( function () {
      var el = $(this);

      el.on( {
        mouseenter: function () {
          self.cursor_ = el.css('cursor');
          el.css('cursor', 'copy');
        },

        mouseleave: function () {
          el.css('cursor', self.cursor_);
        },

        dragstart: function (ev) {
          self.active_ = $(ev.target);
          console.log("Image dragging: start");
        },

        dragend: function () {
          window.setTimeout(function () {
            console.log("Image dragging: end");
            self.active_ = null;
          }, 250);
        }
      } );
    } );
    
  };

  /* Attributes */
  DraggableImageMonitor.prototype.cursor_ = null;
  DraggableImageMonitor.prototype.active_ = null;

  /* Interface */
  DraggableImageMonitor.prototype.clear = function ()
  { this.active_ = null; };


  /**
   * @class
   * */
  var Embed = function (meta)
  {
    console.log("Initialising embeddable content");
    
    BackgroundListener.initialise();
    this.monitor_ = new DraggableImageMonitor();
    
    console.info("Initialised embeddable content");
  };

  Embed.prototype = {
    monitor_: null,

    get monitor () { return this.monitor_; }
  };

  
  /* Attempt to initialize extension class responsible for the UI. */
  chrome.runtime.sendMessage({ operation: "get-meta" }, function (result) {
    /* Do not proceed with UI initialisation if extension not currently enabled,
     * current tab not active or current page's URL is secure (using HTTPS) and
     * extension is set to not be activated on secure pages. */
    if(!result.config.active || !result.tab.active || !window.location.href
       || (/^https:\/\//.test(window.location.href)
           && !result.config.activateHttps))
    {
      console.info("Skipping activation: inactive or unsupported");
    } else
      embed_ = new Embed(result);
  } );

  
})($, SortingCommon);