/** api-sorting_queue-live.js --- Sorting Queue's live API
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
  define("API-SortingQueue", [ "jquery" ], function() {
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
    Api.lastId = 0;
    Api.lastItemId = 0;
    Api.processing = { };
    Api.bins = bins.slice();
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

    /* Prepend protocol if using SortingQueue locally. */
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
      var bin = {
        id: ++Api.lastId,
        name: name,
        children: [ ]
      };

      Api.bins.push(bin);

      deferred.resolve(bin);
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
      var parents = [ ],
          process = function (bins) {
            return bins.some(function (bin) {
              if(bin.id == id) {
                if(parents.length) {
                  var c = parents[parents.length - 1].children;
                  c.splice(c.indexOf(bin), 1);
                } else
                  Api.bins.splice(Api.bins.indexOf(bin), 1);
                
                return true;
              } else if(bin.children) {
                parents.push(bin);
                
                if(process(bin.children))
                  return true;

                parents.pop();
              }

              return false;
            } );
          };

      if(process(Api.bins))
        deferred.resolve( { error: null } );
      else
        deferred.reject( { error: "Not a bin" } );
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));

    return deferred.promise();
  },
  
  itemDismissed: function(item) {},
  itemDroppedInBin: function(item, bin) {}
};