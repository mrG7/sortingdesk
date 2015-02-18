/**
 * @file Initialisation and handling of the SortingDesk Google Chrome
 * extension user interface.
 *
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingDesk' and shared `DraggableImageMonitor´ components.
 *
 */


/*global chrome */
/*jshint laxbreak:true */


var Embeddable = (function ($, std, DraggableImageMonitor, undefined) {

  /* Variables */
  var embed_;

  var fetchImage = function (url, callback)
  {
    /* Code borrowed from the following Stack Overflow page:
     * http://stackoverflow.com/a/17682424 */
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function() {
      if (this.readyState === 4) {
        if (this.status === 200)
          callback(this.response);
        else {
          console.error('Failed to fetch image: status='
                        + this.status
                        + ': text=' + this.statusText);
          callback();
        }
      }
    };

    xhr.onerror = function () {
      console.error('Failed to fetch image: ', url);
      callback();
    };

    xhr.open('GET', url);
    xhr.responseType = 'blob';

    xhr.send(null);
  };


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

      /* We can't yet generate a content_id so we just attached the page's
       * URL for now. */
      result.href = window.location.href;
      result.document = window.document.documentElement.outerHTML;

      if(active && active.length > 0) {
        /* Retrieve image's src and clear active drop. */
        active = active.get(0);
        val = active.src;
        embed_.monitor.clear();
        console.log("Image selection:", result);

        if(val) {
          result.id = result.content = val;
          result.caption = active.alt || active.title;
          result.type = "image";

          /* Don't get image data if the image was loaded via a data URI. */
          if(/^data:/.test(val)) {
            result.data = val;
            callback(result);
            return;
          }

          /* Image was loaded via a URI.  Fetch it and convert its data blob to
           * base64. */
          fetchImage(val, function (blob) {
            var reader = new window.FileReader();

            /* If a blob is available, convert it to base64. */
            if(!blob)
              callback(result);
            else {
              reader.onload = function () {
                result.data = reader.result;
                callback(result);
              };

              reader.onerror = function () {
                console.error('Conversion of image data from blob to data'
                              + ' failed.');
                callback(result);
              };

              reader.readAsDataURL(blob);
            }
          } );

          return true;
        } else
          console.error("Unable to retrieve valid `src´ attribute");
      } else {
        var sel = window.getSelection();

        if(sel && sel.anchorNode) {
          val = sel.toString();

          /* Craft a unique id for this text snippet based on its content,
           * Xpath representation, offset from selection start and length. This
           * id is subsequently used to generate a unique and collision free
           * unique subtopic id. */
          result.xpath = std.Html.getXpathSimple(sel.anchorNode);
          result.id = [ val,
                        result.xpath,
                        sel.anchorOffset,
                        val.length ].join('|');

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

    var onGetPageMeta_ = function (request, sender, callback)
    {
      if(!std.is_fn(callback)) return;

      callback( {
        href: window.location.href,
        document: window.document.documentElement.outerHTML
      } );
    };


    /* Map message operations to handlers. */
    var methods_ = {
      "get-selection": onGetSelection_,
      "get-page-meta": onGetPageMeta_
    };

    /* Interface */

    /* Require initialisation because the extension may not be active. If that
     * is the case, it is of no interest to be listening to messages from
     * background. */
    var initialise = function () {
      /* Handle messages whose `operation´ is defined above in `methods_´. */
      chrome.runtime.onMessage.addListener(
        function (req, sen, cb) {
          if(methods_.hasOwnProperty(req.operation)) {
            console.log("Invoking message handler [type="
                        + req.operation + "]");

            /* Invoke handler. */
            if(methods_[req.operation].call(window, req, sen, cb) === true)
              return true;
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
    this.monitor_ = new DraggableImageMonitor();

    chrome.runtime.sendMessage({ operation: "embeddable-active" });

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
    if(!result.config.active || !window.location.href)
      console.info("Skipping activation: inactive or unsupported");
    else
      embed_ = new Embed(result);
  } );

})($, SortingCommon, DraggableImageMonitor);