/** api-sorting_queue-mock.js --- Sorting Queue's mock API
 *
 * Copyright (C) 2014 Diffeo
 *
 * Comments:
 *
 * 
 */


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("API-SortingQueue", [ "jquery", "API-Data" ], function() {
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
  items: null,
  lastId: null,                /* So we may assign ids to secondary bins when
                                * creating them. */
  lastItemId: null,
  processing: null,

  initialise: function (descriptor, bins) {
    Api.lastId = 0;
    Api.lastItemId = 0;
    Api.processing = { };
    Api.items = descriptor.items;
  },

  moreTexts: function (num) {
    var deferred = $.Deferred();
    
    if(Api.processing.moreTexts)
      return Api.denyRequest_(deferred, "moreTexts");

    if(num <= 0)
      throw "Specified invalid number of items to retrieve";
    else if(!Api.items || !Api.items.length)
      throw "Items container is empty";

    Api.processing.moreTexts = true;

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

  itemDismissed: function(item) {},
  itemDroppedInBin: function(item, bin) {},

  /* Private methods */
  denyRequest_: function (deferred, /* optional */ name) {
    if(name)
      console.log(name + ": request ongoing: rejecting");

    window.setTimeout(function () {
      deferred.reject( { error: "Request ongoing" } );
    } );

    return deferred.promise();
  }
};