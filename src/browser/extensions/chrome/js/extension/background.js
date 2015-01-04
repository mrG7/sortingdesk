/**
 * @file Google Chrome extension employing the Sorting Desk component.
 * @copyright 2014 Diffeo
 *
 * Comments:
 *
 */


/*global chrome, Config */


var Background = function ()
{
  /* Constants */
  var TIMEOUT_SAVE = 1000;

  /* Attributes */
  var handlerTabs_,
      savingState_ = { },
      activeBinId_ = null;

  
  var initialize_ = function ()
  {
    new MessageHandler();
    handlerTabs_ = new MessageHandlerTabs();
  };

  var save_ = function (tabId, state)
  {
    /* Clear timeout if a state is currently scheduled to be saved. */
    if(savingState_)
      window.clearTimeout(savingState_.id);

    /* Create new or replace existing saving state descriptor. */
    savingState_ = {
      timeoutId: window.setTimeout(function () {
        do_save_(savingState_.tabId); }, TIMEOUT_SAVE),
      tabId: tabId,
      state: state
    };

    return true;
  };

  var do_save_ = function (tabId)
  {
    /* Ensure a saving state descriptor exists. */
    if(!savingState_) {
      console.log("No saving state exists: aborting");
      return;
    }

    console.log("Saving state:", savingState_.state);

    /* Save state to extension's local storage. */
    chrome.storage.local.set(savingState_.state, function () {
      if(chrome.runtime.lastError) {
        console.log("Error occurred whilst saving state: "
                    + chrome.runtime.lastError.message);
      } else
        console.log("State saved successfully");
    } );

    /* Finally request all tabs in every window to update their states. */
    handlerTabs_.broadcast( {
      operation: 'load-state',
      activeBinId: activeBinId_
    }, tabId);

    /* Clear saving state descriptor. */
    savingState_ = null;
  };

  
  /**
   * @class
   * */
  var MessageHandler = function () {
    var self = this,
        methods = {
          "read-file": this.onReadFile_,
          "save-state": this.onSaveState_,
          "set-active-bin": this.onSetActiveBin_,
          "get-meta": this.onGetMeta_
        };
    
    /* Handler of messages originating in content scripts. */
    chrome.runtime.onMessage.addListener(
      function (request, sender, callback) {
        if(methods.hasOwnProperty(request.operation)) {
          console.log("Invoking message handler [type="
                      + request.operation + "]");
          
          methods[request.operation].call(self, request, sender, callback);
        }

        return true;
      }
    );
  };

  MessageHandler.prototype = {
    onReadFile_: function (request, sender, callback)
    {
      $.ajax( {
        url: chrome.extension.getURL(request.identifier),
        dataType: "html",
        success: function () {
          console.log("Successfully read file: " + request.identifier);
          callback.apply(null, arguments);
        }
      } );
    },

    onSaveState_: function (request, sender, callback)
    {
      var result = save_(sender.tab.id, request.state);
      if(callback) callback(result);
    },

    onSetActiveBin_: function (request, sender, callback)
    {
      activeBinId_ = request.id;
      if(callback) callback();
    },

    onGetMeta_: function (request, sender, callback)
    {
      if(callback) {
        Config.load(function (options) {
          callback( {
            config: options,
            tab: sender.tab,
            activeBinId: activeBinId_
          } );
        } );
      }
    }
  };


  /**
   * @class
   * */
  var MessageHandlerTabs = function () {
  };

  MessageHandlerTabs.prototype = {
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
              if(excludeTabId && tab.id !== excludeTabId)
                chrome.tabs.sendMessage(tab.id, data);
            } );
          } );
        } );
      } );
    }
  };

  
  /* Initialise instance. */
  initialize_();
}();
