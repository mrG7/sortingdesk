/**
 * @file Sorting Desk extension user interface.
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingCommon´, `SortingQueue´ and `SortingDesk´ components.
 *
 */


/*jshint laxbreak:true */

var Main = (function (window, chrome, $, std, SortingDesk, LabelBrowser, Api, undefined) {

  /* Module-wide variables */
  var nodes = { },
      loading,
      sorter;
  

  /**
   * @class
   * */
  var LoadingStatus = function (node)
  {
    this.node_ = node;
    this.count_ = 0;
  };

  LoadingStatus.prototype = {
    get events ()
    {
      return {
        'request-begin': this.onRequestBegin_.bind(this),
        'request-end':  this.onRequestEnd_.bind(this)
      };
    },
    
    onRequestBegin_: function (id)
    {
      if(this.count_++ === 0)
        this.node_.stop().fadeIn();
    },
    
    onRequestEnd_: function (id)
    {
      if(this.count_ === 0)
        console.warn("Internal count clear on request stop: %s", id);
      else if(--this.count_ === 0)
        this.node_.stop().fadeOut(100);
    }
  };


  /**
   * @class
   * */
  var HandlerCallbacks = (function () {

    var setActive_ = function (id)
    {
      chrome.runtime.sendMessage( { operation: 'set-active', id: id }, null);
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
      chrome.runtime.sendMessage( { operation: 'save-folder', folder: folder},
                                  null);
    };

    var remove_ = function (id)
    {
      chrome.runtime.sendMessage( { operation: 'remove-folder', id: id }, null);
    };

    var imageToBase64_ = function (entity)
    {
      var deferred = $.Deferred();
      
      chrome.runtime.sendMessage(
        { operation: 'get-image-base64', entity: entity },
        function (result) {
          if(result === false) deferred.reject();
          else deferred.resolve(result);
        } );

      return deferred.promise();
    };
    
    /* Interface */
    return {
      callbacks: {
        sorter: {
          load: load_,
          save: save_,
          setActive: setActive_,
          imageToBase64: imageToBase64_
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


  /* Startup sequence. */
  $(function () {
    var instantiate_ = function (meta) {
      (sorter = new SortingDesk.Sorter( {
        container: $('#sd-folder-explorer'),
        constructors: {
          createLabelBrowser: function (options) {
            $('[data-sd-scope="label-browser-header-title"]').html("Loading");
            $('[data-sd-scope="label-browser-header-content"]')
              .html("Please wait...");

            return (new LabelBrowser.Browser(
              $.extend(options, { container: $('#sd-label-browser') } ),
              HandlerCallbacks.callbacks.browser
            ) ).on( {
              initialised: function (container) {
                $('.sd-label-browser .sd-empty').hide();
                $('.sd-label-browser .sd-loading').show();
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
          options: {
            container: $('#sd-queue'),
            visibleItems: 10,
            itemsDraggable: false
          }
        }
      }, $.extend(true, Api, HandlerCallbacks.callbacks.sorter ) ) )
        .on(loading.sorter.events)
        .initialise();

      sorter.sortingQueue.on(loading.queue.events);
    };

    /* Initialisation sequence */
    loading = {
      sorter: new LoadingStatus($('#sd-folder-explorer .sd-loading')),
      queue:  new LoadingStatus($('#sd-queue .sd-loading'))
    };
    
    var height = Math.floor(window.innerHeight / 2);
    
    chrome.runtime.sendMessage({ operation: "get-meta" }, function (meta) {
      /* Cache jQuery references to nodes used. */
      nodes.loading = $('#sd-sorting-desk .sd-loading');

      /* Instantiate and or initialise class components. */
      BackgroundListener.initialise();

      /* Initialise tooltips. */
      $('[data-toggle="tooltip"]').tooltip();
      
      /* Set up heights. */
      $("#sd-folder-explorer").height(height);
      $("#sd-queue").height(height - $("#sd-queue > .sd-footer").outerHeight());

      /* Initialise API and instantiate `SortingDesk´ class.
       * --
       * Note: for whatever reason, Chrome is not notifying of any exceptions
       * thrown, which is why instantiation is wrapped inside a try-catch block.
       * */
      try {
        instantiate_(meta);
      } catch(x) {
        std.on_exception(x);
      }
        
      console.info("Initialised Sorting Desk extension");
      console.info("READY");
    } );
  } );
  
} )(window, chrome, jQuery, SortingCommon, SortingDesk, LabelBrowser, Api);