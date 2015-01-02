/** api-live.js --- Sorting Desk's live API
 *
 * Copyright (C) 2014 Diffeo
 *
 * Comments:
 *
 *
 */


/*global DossierJS, $ */
/*jshint laxbreak:true */


var Api = (function() {
  /* Constants */
  var DEFAULT_DOSSIER_STACK_API_URL = 'http://54.174.195.250:8080';


  /* Attributes */
  var sortingDesk_ = null,
      api_,
      qitems_;


  var initialize = function (sortingDesk_, url)
  {
    sortingDesk_ = sortingDesk_;
    api_ = new DossierJS.API(url || DEFAULT_DOSSIER_STACK_API_URL);
    qitems_ = new DossierJS.SortingQueueItems(api_, 'index_scan', '', 'unknown');

    return {
      getCallbacks: getCallbacks,
      setQueryContentId: setQueryContentId,
      setSearchEngine: setSearchEngine,
      getSearchEngine: getSearchEngine,
      updateQueryFc: updateQueryFc,
      addLabel: addLabel,
      mergeBins: mergeBins,
      generateContentId: generateContentId,
      generateSubtopicId: generateSubtopicId,
      makeId: makeId,
      getClass: getClass,
      getApi: getApi
    };
  };

  var getCallbacks = function ()
  {
    return qitems_.callbacks();
  };

  var setQueryContentId = function (id)
  {
    if(!id)
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

  var addLabel = function (id, bin)
  {
    return api_.addLabel(bin.id, id, qitems_.annotator, 1);
  };

  var mergeBins = function (ibin, jbin)
  {
    return api_.addLabel(ibin.id, jbin.id, qitems_.annotator, 1);
  };

  var updateQueryFc = function (
    content_id, /* the text snippet or image content id */
    data        /* the text snippet text or image URL */ )
  {
    /* NOTE: Why return a promise when `addLabel´ or `mergeBins´
     * don't? */
    var deferred = $.Deferred();

    window.setTimeout(function () {
      console.log("updating query FC:",
                  qitems_.query_content_id,
                  content_id,
                  data);

      deferred.resolve({ });
    }, 0);

    return deferred.promise();
  };

  var generateContentId = function (value)
  {
    if(typeof value !== "string" || value.length === 0)
      return 0;

    var hash = 0;

    for(var i = 0, len = value.length; i < len; i++)
      hash = ((hash << 5) - hash) + value.charCodeAt(i);

    /* Return hash and convert to UINT32. */
    return makeId(hash >>> 0);
  };

  var generateSubtopicId = function ()
  {
  };

  var makeId = function (id)
  {
    return ["web", id].join("|");
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


  /* TODO:
   *
   * Remove the following bypass of
   * DossierJS.SortingQueueItems.prototype._moreTexts . It is here so as to
   * ensure that we receive items in the format expected by
   * SortingQueue. */
  DossierJS.SortingQueueItems.prototype._moreTexts = function() {
    var self = this;

    if (self._processing) {
      var deferred = $.Deferred();

      window.setTimeout(function () {
        console.log('moreTexts in progress, ignoring new request');
        deferred.reject( { error: "Request in progress" } );
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

  
  return {
    initialize: initialize
  };
} )();
