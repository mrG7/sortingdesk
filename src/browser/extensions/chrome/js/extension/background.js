/**
 * @file Google Chrome extension employing the Sorting Desk component.
 * @copyright 2014 Diffeo
 *
 * Comments:
 *
 */


/*global chrome, Config */
/*jshint laxbreak:true */


var Background = function (window, chrome, $, std)
{
  /* Constants */
  var TIMEOUT_SAVE = 1000;

  /* Attributes */
  var handlerTabs_,
      active_ = null;           /* active folder Id */

  
  var initialize_ = function ()
  {
    new MessageHandler();
    handlerTabs_ = new MessageHandlerTabs();
  };

  var indexOfFolder_ = function (folders, id)
  {
    var index;
    
    folders.some(function (f, ndx) {
      if(f.id === id) {
        index = ndx;
        return true;
      }
    } );

    return typeof index === 'undefined' ? -1 : index;
  };

  
  /**
   * @class
   * */
  var MessageHandler = function () {
    var self = this,
        methods = {
          "read-file": this.onReadFile_,
          "set-active": this.onSetActive_,
          "get-meta": this.onGetMeta_,
          "load-folders": this.onLoadFolders_,
          "load-folder": this.onLoadFolder_,
          "save-folder": this.onSaveFolder_,
          "save-folders": this.onSaveFolders_,
          "remove-folder": this.onRemoveFolder_
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

    onSetActive_: function (request, sender, callback)
    {
      console.log("Set active folder: id=%s", request.id);
      active_ = request.id;
      if(callback) callback();
    },

    onGetMeta_: function (request, sender, callback)
    {
      if(typeof callback !== 'function')
        return;
      
      Config.load(function (options) {
        callback( {
          config: options,
          tab: sender.tab,
          active: active_
        } );
      } );
    },

    onLoadFolders_: function (request, sender, callback)
    {
      if(typeof callback !== 'function') return;

      /* Load folder state from extension's local storage. */
      chrome.storage.local.get('folders', function (result) {
        if(chrome.runtime.lastError) {
          console.log("Error occurred whilst loading folders: "
                      + chrome.runtime.lastError.message);
        } else
          console.log("Loaded folders successfully", result);
          
        /* TODO: we should be using a map for folders instead of an array. */
        callback(result.hasOwnProperty('folders') ? result.folders : [ ]);
      } );
    },

    onLoadFolder_: function (request, sender, callback)
    {
      if(typeof callback !== 'function')
        return;

      /* Load folder state from extension's local storage. */
      chrome.storage.local.get('folders', function (folders) {
        var index = -1;
        
        if(chrome.runtime.lastError) {
          console.log("Error occurred whilst loading folders: "
                      + chrome.runtime.lastError.message);
        } else {
          /* TODO: we should be using a map for folders instead of an array. */
          folders = folders.hasOwnProperty('folders') ? folders.folders : [ ];
          index = indexOfFolder_(folders, request.id);

          if(index) console.log("Loaded folder: id=%s", request.id);
          else console.log("Folder not found: id=%s", request.id);
        }
        
        callback(index >= 0 ? folders[index] : null);
      } );
    },

    onSaveFolder_: function (request, sender, callback)
    {
      if(!(request.folder instanceof Object)
         || !request.folder.hasOwnProperty('id')) {
        throw "No folder specified or invalid folder descriptor";
      }
      
      /* Load folder state from extension's local storage. */
      chrome.storage.local.get('folders', function (folders) {
        var index = -1;
        
        if(chrome.runtime.lastError) {
          console.log("Error occurred whilst loading folders: "
                      + chrome.runtime.lastError.message);
        } else {
          folders = folders.hasOwnProperty('folders') ? folders.folders : [ ];
          index = indexOfFolder_(folders, request.folder.id);

          /* Replace or add new. */
          if(index >= 0) folders[index] = request.folder;
          else folders.push(request.folder);

          /* Save new state. */
          chrome.storage.local.set( { "folders": folders }, function () {
            console.log("Folder saved: id=%s", request.folder.id);
          } );

          handlerTabs_.broadcast( { operation: 'folder-updated',
                                    folder: request.folder },
                                  sender.tab.id);
        }

        if(typeof callback === 'function')
          callback(index >= 0);
      } );
    },

    onSaveFolders_: function (request, sender, callback)
    {
      if(!(request.folders instanceof Array))
        throw "No folder specified or invalid folder descriptor";

      /* De-select active folder if removed. */
      if(active_ && indexOfFolder_(request.folders, active_) === -1)
        active_ = null;
      
      /* Save new state. */
      chrome.storage.local.set( { "folders": request.folders }, function () {
        console.log("Folders saved");
      } );

      if(typeof callback === 'function')
        callback();
    },

    onRemoveFolder_: function (request, sender, callback)
    {
      if(!request.hasOwnProperty('id'))
        throw "No folder id specified";
      
      /* Load folder state from extension's local storage. */
      chrome.storage.local.get('folders', function (folders) {
        var index = -1;
        
        if(chrome.runtime.lastError) {
          console.log("Error occurred whilst loading folders: "
                      + chrome.runtime.lastError.message);
        } else {
          folders = folders.hasOwnProperty('folders') ? folders.folders : [ ];
          index = indexOfFolder_(folders, request.id);

          /* Replace or add new. */
          if(index >= 0) {
            folders.splice(index, 1);

            /* De-select active folder if removed. */
            if(active_ && active_.id === request.id)
              active_ = null;
            
            /* Save new state. */
            chrome.storage.local.set( { "folders": folders }, function () {
              console.log("Folder removed: id=%s", request.id);
              handlerTabs_.broadcast( { operation: 'folder-removed',
                                        id: request.id } );
            } );
          }
          else
            console.log("Unable to remove folder: not found: id=%s", request.id);
        }

        if(typeof callback === 'function')
          callback(index >= 0);
      } );
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
              if(!excludeTabId || tab.id !== excludeTabId)
                chrome.tabs.sendMessage(tab.id, data);
            } );
          } );
        } );
      } );
    }
  };

  
  /* Initialise instance. */
  initialize_();
  
}(window, chrome, $, SortingCommon);
