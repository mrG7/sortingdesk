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
    handlerTabs_ = MessageHandlerTabs;
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

    return std.is_und(index) ? -1 : index;
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

    var onSetActive_ = function (request, sender, callback)
    {
      console.log("Set active folder: id=%s", request.id);
      active_ = request.id;
      if(callback) callback();
    };

    var onGetMeta_ = function (request, sender, callback)
    {
      if(!std.is_fn(callback)) return;
      
      Config.load(function (options) {
        callback( {
          config: options,
          tab: sender.tab,
          active: active_
        } );
      } );
    };

    var onLoadFolders_ = function (request, sender, callback)
    {
      if(!std.is_fn(callback)) return;

      /* Load folder state from extension's local storage. */
      chrome.storage.local.get('folders', function (result) {
        if(chrome.runtime.lastError) {
          console.error("Error occurred whilst loading folders: "
                        + chrome.runtime.lastError.message);
        } else
          console.log("Loaded folders successfully", result);
          
        /* TODO: we should be using a map for folders instead of an array. */
        callback(result.hasOwnProperty('folders') ? result.folders : [ ]);
      } );
    };

    var onLoadFolder_ = function (request, sender, callback)
    {
      if(!std.is_fn(callback)) return;

      /* Load folder state from extension's local storage. */
      chrome.storage.local.get('folders', function (folders) {
        var index = -1;
        
        if(chrome.runtime.lastError) {
          console.error("Error occurred whilst loading folders: "
                        + chrome.runtime.lastError.message);
        } else {
          /* TODO: we should be using a map for folders instead of an array. */
          folders = folders.hasOwnProperty('folders') ? folders.folders : [ ];
          index = indexOfFolder_(folders, request.id);

          if(index) console.log("Loaded folder: id=%s", request.id);
          else console.info("Folder not found: id=%s", request.id);
        }
        
        callback(index >= 0 ? folders[index] : null);
      } );
    };

    var onSaveFolder_ = function (request, sender, callback)
    {
      if(!std.is_obj(request.folder) || !request.folder.hasOwnProperty('id')) {
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

        if(std.is_fn(callback)) callback(index >= 0);
      } );
    };

    var onSaveFolders_ = function (request, sender, callback)
    {
      if(!std.is_arr(request.folders))
        throw "No folder specified or invalid folder descriptor";

      /* De-select active folder if removed. */
      if(active_ && indexOfFolder_(request.folders, active_) === -1)
        active_ = null;
      
      /* Save new state. */
      chrome.storage.local.set( { "folders": request.folders }, function () {
        console.log("Folders saved");
      } );

      if(std.is_fn(callback)) callback();
    };

    var onRemoveFolder_ = function (request, sender, callback)
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
            console.error("Unable to remove folder: not found: id=%s",
                          request.id);
        }

        if(std.is_fn(callback)) callback(index >= 0);
      } );
    };


    var self = this,
        methods = {
          "read-file": onReadFile_,
          "set-active": onSetActive_,
          "get-meta": onGetMeta_,
          "load-folders": onLoadFolders_,
          "load-folder": onLoadFolder_,
          "save-folder": onSaveFolder_,
          "save-folders": onSaveFolders_,
          "remove-folder": onRemoveFolder_
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
