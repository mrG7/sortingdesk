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
  define("API-SortingDesk", [ "jquery", "API-Data" ], function() {
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
  activeBin: null,

  labels: null,
  items: null,
  lastBinId: null,    /* So we may assign ids to bins when creating them. */
  lastItemId: null,
  processing: null,

  initialise: function (descriptor) {
    Api.lastBinId = 0;
    Api.lastItemId = 0;
    Api.processing = { };
    
    Api.bins = [ ];
    Api.labels = [ ];
    Api.descriptor = descriptor;

    for(var label in descriptor.labels)
      Api.labels.push(label);
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
  getRandomLabel: function () {
    var deferred = $.Deferred();
    
    if(Api.processing.getRandomLabel)
      return Api.denyRequest_(deferred, "getRandomLabel");
    
    Api.processing.getRandomLabel = true;

    window.setTimeout(function () {
      if(Api.labels.length) {
        deferred.resolve( {
          label: Api.labels[ Math.rand(0, Api.labels.length - 1) ]
        } );
      } else
        deferred.reject( { error: "No labels exist" } );

      Api.processing.getRandomLabel = false;
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));
    
    return deferred.promise();
  },

  /* Resolves:  null
   *
   * Rejects:
   * {
   *   error: String
   * }
   */
  setActiveBin: function (id) {
    var deferred = $.Deferred();

    if(Api.processing.setActiveBin)
      return Api.denyRequest_(deferred, "setActiveBin");

    Api.processing.setActiveBin = true;

    window.setTimeout(function () {
      var bin = Api.getBinById_(id);

      if(!bin)
        deferred.reject( { error: "Bin not found" } );
      else {
        Api.setActiveBin_(bin);
        deferred.resolve();
      }
      
      Api.processing.setActiveBin = false;
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));

    return deferred.promise();
  },

  /* Resolves:
   * {
   *   id:   String,
   *   name: String
   * }
   *
   * Rejects:
   * {
   *   error: String
   * }
   */
  addBin: function (name, label, activate) {
    var deferred = $.Deferred();

    if(Api.processing.addBin)
      return Api.denyRequest_(deferred, "addBin");

    Api.processing.addBin = true;
      
    window.setTimeout(function () {
      if(!label || Api.labels.indexOf(label) < 0)
        deferred.reject( { error: "Label not found" } );
      else if(Api.getBinByLabel_(label))
        deferred.reject( { error: "Bin exists for label" } );
      else {
        var bin = {
          id: (++Api.lastBinId).toString(),
          name: name,
          label: label
        };

        Api.bins.push(bin);

        if(activate)
          Api.setActiveBin_(bin);
        
        deferred.resolve(bin);
      }

      Api.processing.addBin = false;
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX) );

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
      if(!Api.activeBin)
        deferred.reject( { error: "No active bin" } );
      else {
        var result = [ ];

        while(num-- > 0) {
          if(Api.lastItemId >= Api.items.length)
            Api.lastItemId = 0;
          
          var node = { },
              item,
              label;

          /* 1 item in 3 will be picked at random. */
          if(Math.rand(0, 100) < 33) {
            label = Api.labels[Math.rand(0, Api.labels.length - 1)];
            var i = Api.descriptor.labels[label].items;
            item = i[Math.rand(0, i.length - 1)];
          } else {
            label = Api.activeBin.label;
            item = Api.items[Api.lastItemId++];
          }
          
          node.raw = item;
          node.raw.label = label;
          
          node.node_id = item.id;
          node.text = item.text;
          
          node.name = label;
          node.url = '#';

          result.push(node);
        }

        deferred.resolve(result);
      }
      
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
  
  getBinByLabel_: function (label) {
    var result;
    
    Api.bins.some(function (bin) {
      if(bin.label == label) {
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
  },

  setActiveBin_: function (bin) {
    if(!bin || Api.bins.indexOf(bin) < 0)
      throw "Null or invalid bin given";
    
    Api.activeBin = bin;
    Api.items = Api.descriptor.labels[bin.label].items;
    Api.lastItemId = 0;
  }
};