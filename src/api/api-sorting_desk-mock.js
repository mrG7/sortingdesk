/** api-sorting_desk-mock.js --- Sorting Desk's mock API
 *
 * Copyright (C) 2014 Diffeo
 *
 * Author: Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 * 
 */


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("API-SortingDesk", [ "jQuery", "API-Data" ], function() {
    return Api;
  } );
}


if(typeof Api !== 'undefined')
  throw "Symbol `API' already defined";


/* Declare random number generator and assign it to Math static class */
Math.rand = function (min, max)
{
  return Math.floor(Math.random() * (max - min + 1) + min);
};

/* Extend the Object class and add a method that returns the first available
 * key in a given object.
 *
 * Returns: String || null */
Object.firstKey = function (obj)
{
   for(var id in obj)
     return id;
   return null;
};


/* Class containing only static methods and attributes.
 * Cannot be instantiated.*/
var Api = {
  DELAY_MIN: 250,
  DELAY_MAX: 1000,
  MULTIPLE_NODES_LIMIT: 10,

  primaryContentId: null,
  bins: null,
  items: null,
  lastId: null,                /* So we may assign ids to secondary bins when
                                * creating them. */
  lastItemId: null,
  processing: null,

  initialise: function (descriptor, bins) {
    var ids = [ ],
        process = function (bins, parent) {
          bins instanceof Array && bins.forEach(function (bin) {
            if(parent == Api.bins)
              ids.push(bin.node_id);
            
            parent[bin.node_id] = {
              name: Object.firstKey(bin.features.NAME),
              children: { }
            };

            if(typeof bin.node_id == 'number' && Api.lastId < bin.node_id)
              Api.lastId = bin.node_id;

            if(bin.children instanceof Array)
              process(bin.children, parent[bin.node_id].children);
          } );
        };

    Api.lastId = 0;
    Api.lastItemId = 0;
    Api.processing = { };
    Api.bins = { };

    process(bins, Api.bins);
    Api.items = descriptor.items;

    return ids;
  },

  moreTexts: function (num) {
    if(Api.processing.moreTexts) {
      console.log("moreTexts: request ongoing: ignoring new request");
      return null;
    }

    Api.processing.moreTexts = true;
    
    var deferred = $.Deferred();

    if(num <= 0)
      throw "Specified invalid number of items to retrieve";
    else if(!Api.items.length)
      throw "Items container is empty";

    window.setTimeout(function () {
      var result = [ ];

      while(num-- > 0) {
        if(Api.lastItemId >= Api.items.length)
          Api.lastItemId = 0;
        
        var node = { },
            item = Api.items[Api.lastItemId++];
        
        try {
          node.raw = item;
          node.node_id = item.node_id;
          
          item = item.features;
          node.name = Object.firstKey(item.NAME);

          if(item.abs_url)
            node.url = Object.firstKey(item.abs_url);
          
          node.text = Object.firstKey(item.sentences);

          if(item.title)
            node.title = item.title;

          result.push(node);
        } catch(x) {
          console.log("Exception triggered whilst processing node:",
                      x,
                      item);
        }
      };
      
      Api.processing.moreTexts = false;
      deferred.resolve(result);
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));

    return deferred.promise();
  },

  /* Always resolves for the time being.
   * 
   * Returns:
   * {
   *   name: string,
   *   bins: []
   * }
   */
  getBinData: function (ids) {
    if(Api.processing.getBinData) {
      console.log("getBinData: request ongoing: ignoring new request");
      return null;
    }

    Api.processing.getBinData = true;
    
    var deferred = $.Deferred(),
        count = 0,
        result = { };
    
    window.setTimeout(function () {
      ids.some(function (id) {
        if(id in Api.bins) {
          ++count;
          result[id] = $.extend(true, { }, Api.bins[id]);
          
          return false;
        }

        console.log("getBinData: bin id not found: " + id);
        return true;
      } );

      if(count == ids.length)
        deferred.resolve(result);
      else
        deferred.reject();
      
      Api.processing.getBinData = false;
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));
    
    return deferred.promise();
  },

  /* Returns:
   * {
   *   error: error_string    ;; presently never returning an error
   * }
   *   ||
   * statement_id: {
   *   name: string,
   *   bins: []
   * }
   */
  addBin: function (name) {
    var deferred = $.Deferred();

    window.setTimeout(function () {
      ++Api.lastId;
      
      Api.bins[Api.lastId] = {
        name: name,
        bins: { }
      };

      var result = { };
      result[Api.lastId] = Api.bins[Api.lastId];
      
      deferred.resolve(result);
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX) );

    return deferred.promise();
  },

  /* Returns:
   * {
   *   error: error_string
   * }
   *   ||
   * statement_id: {
   *   statement_text: string
   * }
   */
  addSubBin: function (contentId, text) {
    var deferred = $.Deferred();

    window.setTimeout(function () {
      if(! (contentId in Api.bins)) {
        deferred.reject( {
          error: "Non-existent parent content id given"
        } );

        return;
      }
      
      ++Api.lastId;
      
      Api.bins[contentId].bins[Api.lastId] = {
        name: text
      };

      var result = { };
      result[Api.lastId] = Api.bins[contentId].bins[Api.lastId];
      
      deferred.resolve(result);
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX) );

    return deferred.promise();
  },

  /* Resolves:
   * {
   *   error: null
   * }
   *
   * Rejects:
   * {
   *   error: string
   * }
   */
  removeBin: function (id) {
    var deferred = $.Deferred();

    window.setTimeout(function () {
      var found = false;
      
      /* Ensure bin exists. */
      for(var i in Api.bins) {
        var bin = Api.bins[i];

        if(i == id) {
          delete Api.bins[j];
          deferred.resolve( { error: null } );
          break;
        }
        
        for(var j in bin.bins) {
          if(j == id) {
            delete bin.bins[j];
            deferred.resolve( { error: null } );
            break;
          }
        }
      }

      if(!found)
        deferred.reject( { error: "Not a bin" } );
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));

    return deferred.promise();
  },

  textDismissed: function(item) {},
  textDroppedInBin: function(item, bin) {}
};