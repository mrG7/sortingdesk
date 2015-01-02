/** api-sorting-bins-example-mock.js --- Mock API
 *
 * Copyright (C) 2014 Diffeo
 *
 * Comments:
 *
 * 
 */


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("API", [ "jquery", "API-Data" ], function() {
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

  descriptor: null,
  bins: null,

  items: null,
  lastBinId: null,    /* So we may assign ids to bins when creating them. */
  lastItemId: null,
  processing: null,

  initialise: function (descriptor) {
    Api.lastBinId = 0;
    Api.lastItemId = 0;
    Api.processing = { };
    
    Api.bins = [ ];
    Api.items = descriptor.items;
    Api.descriptor = descriptor;
  },

  /* Resolves:
   * {
   *   label: String
   * }
   *
   * Rejects:
   * {
   *   error: String
   * }
   */
  getRandomItem: function () {
    var deferred = $.Deferred();
    
    if(Api.processing.getRandomItem)
      return Api.denyRequest_(deferred, "getRandomItem");
    
    Api.processing.getRandomItem = true;

    window.setTimeout(function () {
      if(Api.items.length) {
        var item = Api.items[ Math.rand(0, Api.items.length - 1) ];

        deferred.resolve( {
          id: item.id,
          text: item.text
        } );
      } else
        deferred.reject( { error: "No items exist" } );

      Api.processing.getRandomItem = false;
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));
    
    return deferred.promise();
  },

  /* Resolves: null
   *
   * Rejects:
   * {
   *   error: String
   * }
   */
  removeBin: function (id) {
    var deferred = $.Deferred();

    if(Api.processing.removeBin)
      return Api.denyRequest_(deferred, "removeBin");

    Api.processing.removeBin = true;

    window.setTimeout(function () {
      var bin = Api.getBinById_(id);

      if(!bin)
        deferred.reject( { error: "Bin not found" } );
      else {
        Api.bins.slice(Api.bins.indexOf(bin), 1);
        deferred.resolve();
      }

      Api.processing.removeBin = false;
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));

    return deferred.promise();
  },

  /* Resolves:
   * {
   *   [ {
   *       raw: Variant
   *       id: String
   *       text: String
   *     } ]
   * }
   *
   * Rejects:
   * {
   *   error: String
   * } */
  moreTexts: function (num) {
    var deferred = $.Deferred();
    
    if(num <= 0)
      throw "Specified invalid number of items to retrieve";
    else if(!Api.items || !Api.items.length)
      throw "Items container is empty";

    if(Api.processing.moreTexts)
      return Api.denyRequest_(deferred, "moreTexts");

    Api.processing.moreTexts = true;

    window.setTimeout(function () {
      var result = [ ];

      while(num-- > 0) {
        if(Api.lastItemId >= Api.items.length)
          Api.lastItemId = 0;
        
        var node = { },
            item = Api.items[Api.lastItemId],
            label;
        
        node.raw = item;
        
        node.node_id = item.id;
        node.text = item.text;
        
        node.name = '';
        node.url = '#';

        ++ Api.lastItemId;

        result.push(node);
      }

      deferred.resolve(result);
      
      Api.processing.moreTexts = false;
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));

    return deferred.promise();
  },

  itemDismissed: function(item) {},
  itemDroppedInBin: function(item, bin) {},

  /* Private methods */
  getBinById_: function (id) {
    var result;

    Api.bins.some(function (bin) {
      if(bin.id == id) {
        result = bin;
        return true;
      }
    } );

    return result || null;
  },

  denyRequest_: function (deferred, /* optional */ name) {
    if(name)
      console.log(name + ": request ongoing: rejecting");

    window.setTimeout(function () {
      deferred.reject( { error: "Request ongoing" } );
    } );

    return deferred.promise();
  }
};