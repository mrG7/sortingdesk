/** api-live.js --- Sorting Desk's live API
 *
 * Copyright (C) 2014 Diffeo
 *
 * Comments:
 *
 *
 */


/*global define, DossierJS, $, CryptoJS */
/*jshint laxbreak:true */


var Api_ = (function (window, $, CryptoJS) {
  
  /* Constants */
  var DEFAULT_DOSSIER_STACK_API_URL = 'http://54.174.195.250:8080';


  /* Attributes */
  var sortingDesk_,
      api_,
      qitems_,
      annotator_;


  /* Interface */
  var initialize = function (sortingDesk_, url)
  {
    sortingDesk_ = sortingDesk_;
    api_ = new DossierJS.API(url || DEFAULT_DOSSIER_STACK_API_URL);
    annotator_ = 'unknown';
    
    qitems_ = new DossierJS.SortingQueueItems(
      api_, 'index_scan', '', annotator_);

    /* Return module public API -- post initialization */
    return {
      getFeatureCollection: getFeatureCollection,
      putFeatureCollection: putFeatureCollection,
      setFeatureCollectionContent: setFeatureCollectionContent,
      addLabel: addLabel,
      getLabelsUniqueById: getLabelsUniqueById,
      dedupLabelsById: dedupLabelsById,
      setQueryContentId: setQueryContentId,
      setSearchEngine: setSearchEngine,
      getSearchEngine: getSearchEngine,
      generateContentId: generateContentId,
      generateSubtopicId: generateSubtopicId,
      makeRawTextId: makeRawTextId,
      makeRawImageId: makeRawImageId,
      getSubtopicType: getSubtopicType,
      mapWordCount: mapWordCount,
      getAnnotator: getAnnotator,
      getClass: getClass,
      getApi: getApi,
      getCallbacks: getCallbacks,

      /* Constants */
      COREF_VALUE_POSITIVE: DossierJS.COREF_VALUE_POSITIVE,
      COREF_VALUE_UNKNOWN: DossierJS.COREF_VALUE_UNKNOWN,
      COREF_VALUE_NEGATIVE: DossierJS.COREF_VALUE_NEGATIVE
    };
  };

  var getFeatureCollection = function (content_id)
  {
    return api_.fcGet(content_id);
  };

  var putFeatureCollection = function (content_id, fc)
  {
    return api_.fcPut(content_id, fc);
  };

  var setFeatureCollectionContent = function (fc, subtopic_id, content)
  {
    if(typeof content !== 'string' || content.length === 0)
      throw "Invalid bin content";
    else if(typeof subtopic_id !== 'string' || subtopic_id === 0) {
      throw "Invalid subtopic id";
    }
    
    fc.raw[subtopic_id] = content;
  };

  var addLabel = function (label)
  {
    return api_.addLabel(label);
  };

  var getLabelsUniqueById = function (content_id,
                                      which       /* = "positive" */)
  {
    if(typeof content_id !== 'string' || content_id.length === 0)
      throw "Invalid content id";
    else if(!_opt_arg_good(which) && typeof which !== 'string')
      throw "Invalid type for specified `which´ value";
    
    var self = this;

    console.log('LabelFetcher GET (id=%s)', content_id);
    
    return (new DossierJS.LabelFetcher(api_))
      .cid(content_id)
      .which(which || 'positive')
      .get()
      .then(function (labels) {
        console.log('LabelFetcher GET successful:', labels);
        return self.dedupLabelsById(labels);
      } );
  };

  var dedupLabelsById = function (labels)
  {
    if(!(labels instanceof Array))
      throw "Labels collection not an array";

    var result = [ ];

    labels.forEach(function (label, i) {
      if(result.indexOf(label.cid1) === -1)
        result.push(label.cid1);
    } );

    return result;
  };
  
  var setQueryContentId = function (id)
  {
    if(typeof id !== 'string' || id.length === 0)
      throw "Invalid engine content id";

    qitems_.query_content_id = id;
  };

  var setSearchEngine = function(name)
  {
    qitems_.engine_name = name;
  };

  var getSearchEngine = function(name)
  {
    return qitems_.engine_name;
  };
  
  var generateContentId = function (content)
  {
    if(typeof content !== "string" || content.length === 0)
      throw "Invalid content specified";

    return [ 'web', CryptoJS.MD5(content).toString() ].join('|');
  };

  var generateSubtopicId = function (content)
  {
    return CryptoJS.MD5(content).toString();
  };
  
  var makeRawTextId = function (subtopic_id)
  {
    return [ 'subtopic', 'text', subtopic_id ].join('|');
  };

  var makeRawImageId = function (subtopic_id)
  {
    return [ 'subtopic', 'image', subtopic_id ].join('|');
  };

  var getSubtopicType = function (subtopic_id)
  {
    var type;

    if(typeof subtopic_id !== 'string')
      throw "Invalid subtopic id specified";

    type = subtopic_id.match(/^subtopic\|(\w+)\|.+/);

    if(!type || type.length !== 2)
      throw "Invalid format for subtopic id";
    
    return type[1];
  };

  var mapWordCount = function (string)
  {
    if(typeof string !== "string")
      throw "Invalid string specified";

    var words = string.toLowerCase().trim().match(/\S+/g),
        map = { };

    /* Create a map of every word, where each key is a word in `string´ that
     * maps to the count said word occurs in `string´.
     *
     * This method is O(n^2). */
    words.forEach(function (word) {
      /* Ignore word if it has been processed. */
      if(map.hasOwnProperty(word))
        return;

      /* Count times word occurs. */
      map[word] = (function () {
        var count = 0;

        words.forEach(function (wi) { if(wi === word) ++count; } );

        return count;
      } )();
    } );

    return map;
  };

  var getAnnotator = function ()
  {
    return annotator_;
  };
  
  var getClass = function (cl)
  {
    return DossierJS.hasOwnProperty(cl)
      && typeof DossierJS[cl] === 'function'
      ? DossierJS[cl]
      : null;
  };

  var getApi = function ()
  {
    return api_;
  };

  var getCallbacks = function ()
  {
    return qitems_.callbacks();
  };


  /* Private interface */
  var _opt_arg_good = function (a)
  {
    /* True (valid) if optional argument `a´ is not given at all or has a value
     * of `null´. */
    return a === null || typeof a === 'undefined';
  };


  /* TODO:
   *
   * Remove the following bypass of
   * DossierJS.SortingQueueItems.prototype._moreTexts . It is here so as to
   * ensure that we receive items in the format expected by
   * SortingQueue. */
  DossierJS.SortingQueueItems.prototype._moreTexts = function() {
    var self = this;

    if (self._processing || !qitems_.query_content_id) {
      var deferred = $.Deferred();

      window.setTimeout(function () {
        if(self._processing) {
          console.log('moreTexts in progress, ignoring new request');
          deferred.reject( { error: "Request in progress" } );
        } else {
          console.log('Query content id not yet set');
          deferred.reject( { error: "No query content id" } );
        }
      } );

      return deferred.promise();
    }

    self._processing = true;
    var p = $.extend({limit: self.limit.toString()}, self.params);
    return self.api.search(self.engine_name, self.query_content_id, p)
      .then(function(data) {
        var items = [];
        data.results.forEach(function(cobj) {
          var idparts = cobj.content_id.split("|"),
              url = idparts[idparts.length - 1];
          items.push({
            content_id: cobj.content_id,
            fc: cobj.fc,
            node_id: cobj.content_id,
            name: '',
            text: cobj.fc.value('info') || decodeURIComponent(url),
            url: url
          });
        });
        return items;
      })
      .always(function() {
        self._processing = false;
      })
      .fail(function() {
        console.log("moreTexts: request failed");
      });
  };


  /* return module public API -- pre-initialization*/
  return {
    initialize: initialize
  };
} );


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("API", [ "jquery", "CryptoJS" ], function ($, CryptoJS) {
    return _(window, $, CryptoJS);
  });
} else
  window.Api = Api_(window, $, CryptoJS);
