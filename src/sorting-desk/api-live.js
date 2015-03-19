/** api-live.js --- Sorting Desk's live API
 *
 * Copyright (C) 2015 Diffeo
 *
 * Comments:
 *
 *
 */


/*global define, DossierJS, $, CryptoJS */
/*jshint laxbreak:true */


var Api_ = (function (window, $, CryptoJS, DossierJS, undefined) {

  /* Constants */
  var DEFAULT_DOSSIER_STACK_API_URL = 'http://10.3.2.42:9090';


  /* Attributes */
  var sortingDesk_,
      api_,
      qitems_,
      annotator_,
      cacheEnabled_ = null;


  /* Interface */
  var initialize = function (sortingDesk_, url)
  {
    sortingDesk_ = sortingDesk_;
    api_ = new DossierJS.API(url || DEFAULT_DOSSIER_STACK_API_URL);
    annotator_ = 'unknown';

    qitems_ = new DossierJS.SortingQueueItems(
      api_, 'similar', '', annotator_);
    qitems_.limit = 30;

    /* TODO: remove this bypass.  This is just nasty. */
    DossierJS.SortingQueueItems.prototype._itemDismissed = function(cobj) {
      console.log('Adding a negative label between ' + cobj.content_id
                  + ' and ...');
      for (var i = 0; i < sortingDesk_.folder_.bins_.length; i++) {
        var bin = sortingDesk_.folder_.bins_[i];
        (new DossierJS.LabelFetcher(api_))
          .cid(bin.data_.content_id)
          .which('connected')
          .get().done(function(labels) {
            var cids = uniqueContentIdsFromLabels(labels);
            console.log('... these content ids:', cids);

            api_.addLabels(cids.map(function(cid) {
              return new DossierJS.Label(
                cobj.content_id, cid, annotator_,
                DossierJS.COREF_VALUE_NEGATIVE);
            }));
          });
      }
    };

    api_.fcCacheEnabled()
      .done(function (result) {
        console.log("Cache enabled: %b", result);
        cacheEnabled_ = result === true;
      } );


    /* Return module public API -- post initialization */
    return {
      /* Functions */
      cache: cache,
      getFeatureCollection: getFeatureCollection,
      getAllFeatureCollections: getAllFeatureCollections,
      putFeatureCollection: putFeatureCollection,
      createFeatureCollection: createFeatureCollection,
      setFeatureCollectionContent: setFeatureCollectionContent,
      addLabel: addLabel,
      getLabelsUniqueById: getLabelsUniqueById,
      dedupLabelsBySubtopic: dedupLabelsBySubtopic,
      uniqueContentIdsFromLabels: uniqueContentIdsFromLabels,
      setQueryContentId: setQueryContentId,
      getQueryContentId: getQueryContentId,
      getQuerySubtopicId: getQuerySubtopicId,
      setSearchEngine: setSearchEngine,
      getSearchEngine: getSearchEngine,
      generateContentId: generateContentId,
      generateSubtopicId: generateSubtopicId,
      makeRawTextId: makeRawTextId,
      makeRawImageId: makeRawImageId,
      makeRawCustomId: makeRawCustomId,
      makeRawSubId: makeRawSubId,
      isSubtopic: isSubtopic,
      getSubtopicType: getSubtopicType,
      extractSubtopicId: extractSubtopicId,
      mapWordCount: mapWordCount,
      getAnnotator: getAnnotator,
      getClass: getClass,
      getDossierJs: getDossierJs,
      getCallbacks: getCallbacks,
      DossierJS: DossierJS,

      /* Namespaces */
      foldering: foldering(),

      /* Constants */
      COREF_VALUE_POSITIVE: DossierJS.COREF_VALUE_POSITIVE,
      COREF_VALUE_UNKNOWN: DossierJS.COREF_VALUE_UNKNOWN,
      COREF_VALUE_NEGATIVE: DossierJS.COREF_VALUE_NEGATIVE
    };
  };


  /**
   * @class
   * */
  var cache = {
    get enabled () { return cacheEnabled_; },

    url: function (content_id)
    {
      return cacheEnabled_ === true
        ? api_.fcCacheUrl(content_id)
        : null;
    }
  };


  var getFeatureCollection = function (content_id)
  {
    return api_.fcGet(content_id);
  };

  var getAllFeatureCollections = function (ids)
  {
    if(!(ids instanceof Array))
      throw "Invalid ids array container";

    return api_.fcGetAll(ids);
  };

  var putFeatureCollection = function (content_id, fc)
  {
    return api_.fcPut(content_id, fc)
      .then(function () {
        return fc;
      } );
  };

  var createFeatureCollection = function (content_id, html)
  {
    var self = this;
    var url = api_.url('feature-collection/' + encodeURIComponent(content_id));

    return $.ajax({
      type: 'PUT',
      contentType: 'text/html',
      url: url,
      data: html
    }).fail(function() {
      console.error("Could not save feature collection " +
                    "(content id: '" + content_id + "')");
    }).then(function(fc) {
      return new (self.getClass('FeatureCollection'))(content_id, fc);
    });
  };

  var setFeatureCollectionContent = function (fc, subtopic_id, content)
  {
    if(typeof content !== 'string' || content.length === 0)
      throw "Invalid item content";
    else if(typeof subtopic_id !== 'string' || subtopic_id === 0)
      throw "Invalid subtopic id";

    fc.raw[subtopic_id] = content;
  };

  var addLabel = function (label)
  {
    return api_.addLabel(label);
  };

  var getLabelsUniqueById = function (content_id, subtopic_id,
                                      which       /* = "connected" */)
  {
    if(typeof content_id !== 'string' || content_id.length === 0)
      throw "Invalid content id";
    else if(!_opt_arg_good(which) && typeof which !== 'string')
      throw "Invalid type for specified `which´ value";

    var self = this;

    console.log('LabelFetcher GET (id=%s)', content_id);

    return (new DossierJS.LabelFetcher(api_))
      .cid(content_id)
      .subtopic(subtopic_id)
      .which(which || 'connected')
      .get()
      .then(function (labels) {
        console.log('LabelFetcher GET successful:', labels);
        return self.dedupLabelsBySubtopic(labels);
      } );
  };

  var dedupLabelsBySubtopic = function (labels)
  {
    if(!(labels instanceof Array))
      throw "Labels collection not an array";

    var result = [ ],
        seen = { };

    labels.forEach(function (label) {
      var pair1 = [label.cid1, label.subtopic_id1],
          pair2 = [label.cid2, label.subtopic_id2];
      if (!seen[pair1]) {
        result.push({cid: pair1[0], subid: pair1[1]});
        seen[pair1] = true;
      }
      if (!seen[pair2]) {
        result.push({cid: pair2[0], subid: pair2[1]});
        seen[pair2] = true;
      }
    } );
    return result;
  };

  var uniqueContentIdsFromLabels = function(labels)
  {
    var seen = { },
        cids = [ ];
    for (var i = 0; i < labels.length; i++) {
      var cid1 = labels[i].cid1,
          cid2 = labels[i].cid2;
      if (!seen[cid1]) {
        seen[cid1] = true;
        cids.push(cid1);
      }
      if (!seen[cid2]) {
        seen[cid2] = true;
        cids.push(cid2);
      }
    }
    return cids;
  };

  var setQueryContentId = function (id, subid)
  {
    if(id !== null && (typeof id !== 'string' || id.length === 0))
      throw "Invalid query content id";

    qitems_.query_content_id = id;
    if (typeof subid !== 'undefined') {
        qitems_.query_subtopic_id = subid;
    }
  };

  var getQueryContentId = function ()
  {
    return qitems_.query_content_id;
  };

  var getQuerySubtopicId = function ()
  {
    return qitems_.query_subtopic_id;
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

  var makeRawCustomId = function (subtopic_id, prefix)
  {
    return [ 'subtopic', prefix, subtopic_id ].join('|');
  };

  var makeRawSubId = function (subtopic_id, suffix)
  {
    return [ subtopic_id, suffix ].join('|');
  };

  var isSubtopic = function (subtopic_id)
  {
    return typeof subtopic_id === 'string'
      && /^subtopic\|\w+\|.+/.test(subtopic_id);
  };

  var getSubtopicType = function (subtopic_id)
  {
    var type;

    if(typeof subtopic_id !== 'string')
      throw "Invalid subtopic id specified";

    type = subtopic_id.match(/^subtopic\|(\w+)\|.+/);

    if(!type || type.length !== 2)
      throw "Invalid format for subtopic id: " + subtopic_id;

    return type[1];
  };

  var extractSubtopicId = function (subtopic_id)
  {
    var match = typeof subtopic_id === 'string'
          && subtopic_id.match(/^subtopic\|\w+\|(.+)/);

    return match && match[1];
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

  var getDossierJs = function ()
  {
    return api_;
  };

  var getCallbacks = function ()
  {
    return qitems_.callbacks();
  };


  /**
   * @namespace
   * */
  var foldering = function () {

    /* Interface: functions */
    var listFolders = function ()
    {
      return api_.listFolders(annotator_)
        .then(function (collection) {
          return collection.map(function (f) {
            f.exists = true; return f;
          } );
        } );
    };

    var listSubfolders = function (folder)
    {
      return api_.listSubfolders(folder)
        .then(function (collection) {
          return collection.map(function (sf) {
            sf.exists = true; return sf;
          } );
        } );
    };

    var listItems = function (subfolder)
    {
      return api_.listSubfolderItems(subfolder)
        .then(function (collection) {
          return collection.map(function (i) {
            i = new Item(subfolder, { content_id: i[0], subtopic_id: i[1] });
            i.exists = true; return i;
          } );
        } );
    };

    var addItem = function (subfolder, item)
    {
      return api_.addSubfolderItem(subfolder, item.content_id,item.subtopic_id);
    };


    /**
     * @class
     * */
    var Item = function (subfolder, item)
    {
      if(!(subfolder instanceof DossierJS.Subfolder))
        throw "Invalid or no subfolder specified";

      /* Attributes */
      this.subfolder_ = subfolder;
      this.content_id = item.content_id;
      this.subtopic_id = item.subtopic_id;
    };


    /* Public interface */
    return {
      /* Functions */
      listFolders: listFolders,
      listSubfolders: listSubfolders,
      listItems: listItems,
      folderFromName: DossierJS.Folder.from_name,
      subfolderFromName: DossierJS.Subfolder.from_name,
      addFolder: api_.addFolder.bind(api_),
      addItem: addItem,

      /* Classes */
      Item: Item
    };

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
  DossierJS.SortingQueueItems.prototype._moreTexts = function(num) {
    var self = this;

    if(typeof num !== 'number' || num <= 0)
      throw "Invalid number of items specified";

    if (this._processing || !qitems_.query_content_id) {
      var deferred = $.Deferred();

      window.setTimeout(function () {
        if(self._processing) {
          console.warn('moreTexts in progress, ignoring new request');
          deferred.reject( { error: "Request in progress" } );
        } else {
          console.error('Query content id not yet set');
          deferred.reject( { error: "No query content id" } );
        }
      } );

      return deferred.promise();
    }

    this._processing = true;
    var p = $.extend({limit: num.toString()}, this.params);
    if (this.query_subtopic_id !== null)
      p.subtopic_id = this.query_subtopic_id;

    return self.api.search(self.engine_name, self.query_content_id, p)
      .then(function(data) {
        return data.results.map(function(cobj) {
          return {
            raw: cobj,
            content_id: cobj.content_id,
            fc: cobj.fc,
            node_id: cobj.content_id,
            name: '',
            url: cobj.fc.value('meta_url')
          };
        });
      })
      .always(function() { self._processing = false; })
      .fail(function()   { console.error("moreTexts: request failed"); });
  };


  /* return module public API -- pre-initialization */
  return {
    initialize: initialize
  };
} );


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("API", [ "jquery", "CryptoJS", "DossierJS" ], function ($, CryptoJS, DossierJS) {
    return Api_(window, $, CryptoJS, DossierJs);
  });
} else
  window.Api = Api_(window, $, CryptoJS, DossierJS);
