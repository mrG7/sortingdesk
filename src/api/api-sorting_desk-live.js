/** api-sorting_desk-live.js --- Sorting Desk's live API
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
  define("API-SortingDesk", [ "jQuery" ], function() {
    return Api;
  } );
}


if(typeof Api !== 'undefined')
  throw "Symbol API already defined";
  

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
  DELAY_MIN: 200,
  DELAY_MAX: 750,
  MULTIPLE_NODES_LIMIT: 10,
  SCHEME: '//',
  BASE: 'demo.diffeo.com:8080',
  NAMESPACE: 'miguel_sorting_desk',
  RANKER: 'similar',
  
  lastId: 0,                   /* So we may assign ids to secondary bins when
                                * creating them. */

  processing: { },

  initialise: function (bins)
  {
    var ids = [ ];

    Api.bins = { };

    bins instanceof Array && bins.forEach(function (bin) {
      ids.push(bin.node_id);
      Api.bins[bin.node_id] = {
        name: Object.firstKey(bin.features.NAME)
      };

      if(typeof bin.node_id == 'number' && Api.lastId < bin.node_id)
        Api.lastId = bin.node_id;
    } );

    return ids;
  },

  // Given the name of an endpoint (e.g., 's2' or 'nodes'), a dictionary of
  // query parameters and an optional boolean `jsonp` (to craft a JSONP URL),
  // returns a properly encoded URL.
  //
  // Note that this uses jQuery "traditional" style, so with array data, you'll
  // get `key=a&key=b` instead of `key[]=a&key[]=b`.
  url: function(endpoint, params, jsonp) {
    params = params || {};
    var url = this.SCHEME + this.BASE + '/namespaces/';

    /* Prepend protocol if using SortingDesk locally. */
    if(!/^http[s]*:/.test(window.location.protocol))
      url = 'http:' + url;
    
    url += encodeURIComponent(this.NAMESPACE);
    url += '/' + encodeURIComponent(endpoint) + '/?';
    if (jsonp) {
      url += 'callback=?&format=jsonp&';
    }
    return url + $.param(params, true);
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

    var params = {
      noprof: '1', label: true, order: Api.RANKER,
      limit: Api.MULTIPLE_NODES_LIMIT,
      node_id: Api.primaryContentId
    };
    
    $.getJSON(Api.url('s2', params, true))
      .fail(function () {
        console.log("moreTexts: request failed");
        deferred.reject();
      } )
      .done(function (data) {
        var result = [ ];

        data.forEach(function (item) {
          var node = { };

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
        } );

        deferred.resolve(result); } )
      .always(function () {
        Api.processing.moreTexts = false;
      } );

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
        received = 0,
        result = { };

    /* Following function is a hack given that we're "loading" bin data both
     * from our local fake data store and diffeo's RESTful API service. */
    function onLoaded_(data) {
      /* Before removing this hack-function, remember to copy this line into
       * the `done' callback below. */
      result[data.node_id] = { name: Object.firstKey(data.features.NAME) };
      
      if(++received == ids.length) {
        deferred.resolve(result);

        /* TODO: stick this line inside the `always' callback when removing this
         * block. */
        Api.processing.getBinData = false;
      }
    };
    
    ids.forEach(function (id) {
      /* TODO: we are checking to see if the id is in our local bin
       * repository. MUST remove this time wasting crap ASAP. */
      var found = false;

      for(var bid in Api.bins) {
        if(bid != id)
          continue;

        var bin = Api.bins[bid],
            name = { };
        
        name[bin.name] = 0;
        onLoaded_( { node_id: bid, features: { NAME: name } } );
        found = true;
        
        break;
      }

      if(found)                 /* TODO: remove with block above */
        return false;

      /* Issue request to diffeo's RESTful API service. */
      $.getJSON(Api.url('nodes/' + id, {}, true))
        .fail(function () {
          console.log("getBinData: request failed:", id);
          Api.processing.getBinData = false;
          deferred.reject();
        } )
        .done(function (data) {
          onLoaded_(data);
        } );
    } );
    
    return deferred.promise();
  },

  /* (Always) returns:
   * {
   *   error: null
   * }
   */
  saveBinData: function (id, bins) {
    var deferred = $.Deferred();
    
    window.setTimeout(function () {
      deferred.resolve( { error: null } );
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
  textDroppedInBin: function(item, bin) {},

  renderBin: function (bin) {
    /* Wrap bin name inside a DIV. */
    return $('<div class="sd-bin"><div class="sd-bin-shortcut"/>'
             + bin.name + '</div>');
  },

  renderSubBin: function (bin) {
    /* Wrap bin statement_text inside a DIV. */
    return $('<div class="sd-bin-sub"><div class="sd-bin-shortcut"/>'
             + bin.name + '</div>');
  },

  renderAddButton: function (caption) {
    return $('<div><span>' + caption + '</span></div>');
  }
};