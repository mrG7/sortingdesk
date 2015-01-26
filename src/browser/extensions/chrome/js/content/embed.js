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


/*global chrome */
/*jshint laxbreak:true */


var ChromeExtensionUi = (function ($, std, undefined) {

  /* Variables */
  var embed_;


  /**
   * @class
   * */
  var BackgroundListener = (function () {

    /* Events */
    var onGetSelection_ = function (request, sender, callback)
    {
      if(!std.is_fn(callback)) return;
      
      var result = { },
          val,
          active = embed_.monitor.active;

      if(active && active.length > 0) {
        /* Retrieve image's src and clear active drop. */
        val = active.get(0).src;
        embed_.monitor.clear();

        if(val) {
          result.id = result.content = val;
          result.type = "image";

          console.log("Image selection:", result);
          callback(result);
        } else
          console.error("Unable to retrieve valid `src´ attribute");
      } else {
        var sel = window.getSelection();
        
        if(sel && sel.anchorNode) {
          val = sel.toString();

          /* Craft a unique id for this text snippet based on its content,
           * Xpath representation, offset from selection start, length and,
           * just to be sure, current system timestamp. This id is
           * subsequently used to generate a unique and collision free
           * unique subtopic id. */
          result.xpath = std.Html.getXpathSimple(sel.anchorNode);
          result.id = [ val,
                        result.xpath,
                        sel.anchorOffset,
                        val.length,
                        Date.now() ].join('|');

          result.content = val;
          result.type = "text";
          
          console.log("Text selection:", result);
          callback(result);
        } else
          console.error("No text currently selected");
      }

      /* Retrieval of selection failed. */
      callback(null);
    };

    /* Map message operations to handlers. */
    var methods_ = {
      "get-selection": onGetSelection_
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