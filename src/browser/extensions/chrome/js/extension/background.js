/**
 * @file Google Chrome extension employing the Sorting Desk component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */


/*global chrome, Config */
/*jshint laxbreak:true */


var Background = function (window, chrome, $, std, undefined)
{
  /* Constants */
  var TIMEOUT_SAVE = 1000,
      DEFAULT_EXTENSION_WIDTH = 350;

  /* Attributes */
  var handlerTabs_;

  
  var initialize_ = function ()
  {
    handlerTabs_ = MessageHandlerTabs;

    chrome.windows.getCurrent(function (current) {
      var screen = new std.Size(window.screen.width, window.screen.height),
          win = new std.PositionSize(current.left, current.top,
                                     current.width, current.height),
          ext = new std.PositionSize(win.right + 1, win.top,
                                     DEFAULT_EXTENSION_WIDTH, win.height),
          diff = ext.right - screen.width;

      if(diff > 0) {
        console.log(diff, win.left);
        if(diff > win.left) {
          win.left = 0;
          win.width = screen.width - DEFAULT_EXTENSION_WIDTH;
          ext.left = win.right + 1;
        } else {
          win.left = win.left - diff - 1;
          ext.left = ext.left - diff;
        }

        console.info("Updating window's position/size:", win.toObject());
        chrome.windows.update(current.id, win.toObject());
      }

      console.info("Creating Sorting Desk's window:", ext.toObject());
      chrome.windows.create( $.extend( {
        url: chrome.runtime.getURL("/html/main.html"),
        focused: false,
        type: "popup"
      }, ext.toObject() ) );
    } );
  };

  
  /**
   * @class
   * */
  var MessageHandler = (function () {

    var onReadFile_ = function (request, sender, callback)
    {
      $.ajax( {
        url: chrome.extension.getURL(request.identifier),
        dataType: "html",
        success: function () {
          console.log("Successfully read file: " + request.identifier);
          callback.apply(null, arguments);
        }
      } );
    };

    var onGetMeta_ = function (request, sender, callback)
    {
      if(!std.is_fn(callback)) return;
      
      Config.load(function (options) {
        callback( {
          config: options,
          tab: sender.tab
        } );
      } );
    };

    var onGetImageBase64_ = function (request, sender, callback)
    {
      if(!request.hasOwnProperty('entity'))
        throw "`entity´ attribute missing in request";
      else if(std.is_fn(callback)) {
        std.Html.imageToBase64(request.entity)
          .done(function (data) { callback(data); } )
          .fail(function ()     { callback(false); } );
      }
    };


    var self = this,
        methods = {
          "read-file": onReadFile_,
          "get-meta": onGetMeta_,
          "get-image-base64": onGetImageBase64_
        };
    
    /* Handler of messages originating in content scripts. */
    chrome.runtime.onMessage.addListener(
      function (request, sender, callback) {
        if(methods.hasOwnProperty(request.operation)) {
          console.log("Invoking message handler [type="
                      + request.operation + "]");
          
          methods[request.operation].call(self, request, sender, callback);
        } else
          console.error("Invalid request received:", request);

        return true;
      }
    );


    /* Public interface */
    return { };
  })();


  /**
   * @class
   * */
  var MessageHandlerTabs = (function () {
    return {
      broadcast: function (data, excludeTabId)
      {
        /* Send `data´ to every tab in every window. */
        chrome.windows.getAll(function (windows) {
          /* All windows: */
          windows.forEach(function (window) {
            /* All tabs: */
            chrome.tabs.getAllInWindow(window.id, function (tabs) {
              tabs.forEach(function (tab) {
                /* This particular tab iteration: */
                if(!excludeTabId || tab.id !== excludeTabId)
                  chrome.tabs.sendMessage(tab.id, data);
              } );
            } );
          } );
        } );
      }
    };
  }) ();

  
  /* Initialise instance. */
  initialize_();
  
}(window, chrome, $, SortingCommon);
