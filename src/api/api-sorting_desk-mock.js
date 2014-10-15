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
    Api.lastId = 0;
    Api.lastItemId = 0;
    Api.processing = { };
    Api.bins = $.extend(true, { }, bins);
    Api.items = descriptor.items;
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

  getBinById_: function (id)
  {
    var result = null,
        search = function (bins) {
          bins.some(function (bin) {
            if(bin.id == id) {
              result = bin;
              return true;
            } else if(bin.children) {
              if(search(bin.children))
                return true;
            }
          } );

          return result !== null;
        };

    return search(Api.bins);
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
      var removed = false,
          parents = [ ],
          process = function (bins) {
            bins.some(function (bin) {
              if(bin.id == id) {
                if(parents.length) {
                  var c = parents[parents.length - 1].children;
                  c.splice(c.indexOf(bin), 1);
                } else
                  Api.bins.splice(Api.bins.indexOf(bin), 1);
                
                return (removed = true);
              } else if(bin.children) {
                parents.push(bin);
                
                if(process(bin.children))
                  return true;

                parents.pop();
              }

              return false;
            } );

            return removed;
          };

      if(removed)
        deferred.resolve( { error: null } );
      else
        deferred.reject( { error: "Not a bin" } );
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));

    return deferred.promise();
  },

  textDismissed: function(item) {},
  textDroppedInBin: function(item, bin) {}
};