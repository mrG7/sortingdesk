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
  var Embed = function (meta)
  {
    console.log("Initialising embeddable content");
    BackgroundListener.initialise();
    console.info("Initialised embeddable content");
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