/** api-live.js --- Sorting Desk's live API
 *
 * Copyright (C) 2015 Diffeo
 *
 * Comments:
 *
 *
 */


/*global define, DossierJS, $, CryptoJS */
/*jshint laxbreak:true, -W057, -W058 */


(function (Module, root) {

  /* Compatibility with RequireJs. */
  if(typeof define === "function" && define.amd) {
    var d = [ "jquery", "CryptoJS", "DossierJS" ];
    define("API", d, function (i, s, o) { return Module(window, i, s, o); });
  } else
    window.Api = Module(window, $, CryptoJS, DossierJS);

} )(function (window, $, CryptoJS, DossierJS, undefined) {

  /* Constants */
  var DEFAULT_DOSSIER_STACK_API_URL = 'http://10.3.2.42:9090',
      DEFAULT_ITEMS_LIMIT = 40;


  /* Interface */
  var Api = function (sortingDesk, url)
  {
    var module = this,
        api_ = new DossierJS.API(url || DEFAULT_DOSSIER_STACK_API_URL),
        annotator_ = 'unknown';


    /* Constants: */
    this.consts = {
      coref: {
        POSITIVE: DossierJS.COREF_VALUE_POSITIVE,
        UNKNOWN: DossierJS.COREF_VALUE_UNKNOWN,
        NEGATIVE: DossierJS.COREF_VALUE_NEGATIVE
      }
    };


    /**
     * @class
     *
     * Note: requires instantiation, unlike `foldering´ below. */
    this.cache = new (function ()
    {
      var enabled_ = null;

      /* Initialisation sequence */
      api_.fcCacheEnabled()
        .done(function (r) { enabled_ = r === true; } )
        .fail(function () {
          enabled_ = false;
          console.warn("Unable to determine cache enabled: assuming not");
        } );

      this.enabled = function () { return enabled_; };

      this.url = function (content_id)
      { return enabled_ === true ? api_.fcCacheUrl(content_id) : null; };
    })();


    /**
     * @class
     * */
    this.fc = new (function () {

      this.get = get;
      function get(content_id)
      {
        return api_.fcGet(content_id);
      }

      this.getAll = getAll;
      function getAll(ids)
      {
        if(!(ids instanceof Array))
          throw "Invalid ids array container";

        return api_.fcGetAll(ids);
      }

      this.put = put;
      function put(content_id, fc)
      {
        return api_.fcPut(content_id, fc)
          .then(function () {
            return fc;
          } );
      }

      this.create = create;
      function create(content_id, html)
      {
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
          return new (getClass('FeatureCollection'))(content_id, fc);
        });
      }

      this.setContent = setContent;
      function setContent(fc, id, content)
      {
        if(typeof content !== 'string' || content.length === 0)
          throw "Invalid item content";
        else if(typeof id !== 'string' || id === 0)
          throw "Invalid id";

        fc.raw[id] = content;
      }

      this.exists = exists;
      function exists(fc, id)
      {
        if(typeof id !== 'string' || id === 0) throw "Invalid id";
        return id in fc.raw;
      }
    })();


    /**
     * @class
     * */
    this.label = new (function () {

      this.add = add;
      function add(label)
      { return api_.addLabel(label); }

      this.get = get;
      function get(content_id, subtopic_id, which /* = "connected" */)
      {
        if(typeof content_id !== 'string' || content_id.length === 0)
          throw "Invalid content id";
        else if(!_opt_arg_good(which) && typeof which !== 'string')
          throw "Invalid type for specified `which´ value";

        console.log('LabelFetcher GET (id=%s)', content_id);

        return (new DossierJS.LabelFetcher(api_))
          .cid(content_id)
          .subtopic(subtopic_id)
          .which(which || 'connected')
          .get()
          .then(function (labels) {
            console.log('LabelFetcher GET successful:', labels);
            return dedup(labels);
          } );
      }

      this.dedup = dedup;
      function dedup(labels)
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
      }

      this.ids = ids;
      function ids(labels)
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
      }
    })();


    this.generateContentId = generateContentId;
    function generateContentId(content)
    {
      if(typeof content !== "string" || content.length === 0)
        throw "Invalid content specified";

      return [ 'web', CryptoJS.MD5(content).toString() ].join('|');
    }

    this.generateSubtopicId = generateSubtopicId;
    function generateSubtopicId(content)
    {
      return CryptoJS.MD5(content).toString();
    }

    this.makeRawTextId = makeRawTextId;
    function makeRawTextId(subtopic_id)
    {
      return [ 'subtopic', 'text', subtopic_id ].join('|');
    }

    this.makeRawImageId = makeRawImageId;
    function makeRawImageId(subtopic_id)
    {
      return [ 'subtopic', 'image', subtopic_id ].join('|');
    }

    this.makeRawCustomId = makeRawCustomId;
    function makeRawCustomId(subtopic_id, prefix)
    {
      return [ 'subtopic', prefix, subtopic_id ].join('|');
    }

    this.makeRawSubId = makeRawSubId;
    function makeRawSubId(subtopic_id, suffix)
    {
      return [ subtopic_id, suffix ].join('|');
    }

    this.isSubtopic = isSubtopic;
    function isSubtopic(subtopic_id)
    {
      return typeof subtopic_id === 'string'
        && /^subtopic\|\w+\|.+/.test(subtopic_id);
    }

    this.getSubtopicType = getSubtopicType;
    function getSubtopicType(subtopic_id)
    {
      var type;

      if(typeof subtopic_id !== 'string')
        throw "Invalid subtopic id specified";

      type = subtopic_id.match(/^subtopic\|(\w+)\|.+/);

      if(!type || type.length !== 2)
        throw "Invalid format for subtopic id: " + subtopic_id;

      return type[1];
    }

    this.extractSubtopicId = extractSubtopicId;
    function extractSubtopicId(subtopic_id)
    {
      var match = typeof subtopic_id === 'string'
            && subtopic_id.match(/^subtopic\|\w+\|(.+)/);

      return match && match[1];
    }

    this.mapWordCount = mapWordCount;
    function mapWordCount(string)
    {
      if(typeof string !== "string")
        throw "Invalid string specified";

      var words = string.toLowerCase().trim().match(/\S+/g),
          map = { };

      /* Create a map of every word, where each key is a word in `string´ that
       * maps to the count said word occurs in `string´.
       *
       * This method is O(n). */
      words.forEach(function (word) {
        /* Ignore word if it has been processed. */
        if(map.hasOwnProperty(word))
          ++map[word];
        else
          map[word] = 1;
      } );

      return map;
    }

    this.getClass = getClass;
    function getClass(cl)
    {
      return DossierJS.hasOwnProperty(cl)
        && typeof DossierJS[cl] === 'function'
        ? DossierJS[cl]
        : null;
    }

    this.getDossierJs = getDossierJs;
    function getDossierJs()
    {
      return api_;
    }

    this.makeReportUrl = makeReportUrl;
    function makeReportUrl(id)
    {
      return api_.reportUrl(id);
    }


    /**
     * @namespace
     * */
    this.foldering = new (function () {

      /* Interface: functions */
      this.listFolders = listFolders;
      function listFolders()
      {
        return api_.listFolders(annotator_)
          .then(function (collection) {
            return collection.map(function (f) {
              f.exists = true; return f;
            } );
          } );
      }

      this.listSubfolders = listSubfolders;
      function listSubfolders(folder)
      {
        return api_.listSubfolders(folder)
          .then(function (collection) {
            return collection.map(function (sf) {
              sf.exists = true; return sf;
            } );
          } );
      }

      this.listItems = listItems;
      function listItems(subfolder)
      {
        return api_.listSubfolderItems(subfolder)
          .then(function (collection) {
            return collection.map(function (i) {
              i = new Item(subfolder, { content_id: i[0], subtopic_id: i[1] });
              i.exists = true; return i;
            } );
          } );
      }

      this.addItem = addItem;
      function addItem(subfolder, item)
      {
        return api_.addSubfolderItem(subfolder, item.content_id,item.subtopic_id);
      }

      this.deleteFolder = api_.deleteFolder.bind(api_);
      this.deleteSubfolder = api_.deleteSubfolder.bind(api_);
      this.deleteSubfolderItem = api_.deleteSubfolderItem.bind(api_);
      this.renameFolder = api_.renameFolder.bind(api_);
      this.renameSubfolder = api_.renameSubfolder.bind(api_);


      /**
       * @class
       * */
      this.Item = Item;
      function Item(subfolder, item)
      {
        if(!(subfolder instanceof DossierJS.Subfolder))
          throw "Invalid or no subfolder specified";

        /* Attributes */
        this.subfolder_ = subfolder;
        this.content_id = item.content_id;
        this.subtopic_id = item.subtopic_id;
      }

      this.folderFromName = DossierJS.Folder.from_name;
      this.subfolderFromName = DossierJS.Subfolder.from_name;
      this.addFolder = api_.addFolder.bind(api_);
    })();



    // SortingQueueItems provides SortingQueue integration with DossierJS.
    // Namely, it provides the following callback functions:
    //
    //   moreTexts - Returns results from a search.
    //   itemDismissed - Adds a label between the `query_content_id` and
    //                   the text item that was dismissed. The coref value
    //                   used is `-1`.
    //
    // An instance of `SortingQueueItems` can be used to initialize an
    // instance of `SortingQueue` with the appropriate callbacks. e.g.,
    //
    //   var qitems = new SortingQueueItems(...);
    //   new SortingQueue.Sorter(
    //     config, $.extend(qitems.callbacks(), yourCallbacks));
    //
    // The query and search engine can be changed by modifying the contents
    // of the `query_content_id` and `engine_name` instance attributes,
    // respectively. When an attribute is modified, no changes will occur
    // visually. To cause the queue to be refreshed with the new settings,
    // you can forcefully empty it, which will cause SortingQueue to refill
    // it with the new settings:
    //
    //   qitems.engine_name = '<engine name>';
    //   qitems.query_content_id = '<content id>';
    //   sorting_desk_instance.items.removeAll();
    //
    // There are a number of attributes that can be set on an instance of
    // `SortingQueueItems` that affect search engine behavior:
    //
    //   annotator   - Used whenever a label is created.
    //   limit       - Limits the number of results returned to the user.
    //                 Defaults to `5`.
    //   query_subtopic_id - Causes a search engine to use subtopic querying.
    //                       This only works if the search engine supports it!
    //   params      - Pass arbitrary query parameters to the search engine.
    //
    // The `api` parameter should be an instance of `DossierJS.API`.
    //
    // Each instance of `SortingQueueItems` may be used with precisely
    // one instance of `SortingQueue`.
    this.qitems = new (function (engine_name, query_content_id, annotator) {

      /* NOTE: the constructor's arguments `engine_name´, `query_content_id´
       * and `annotator´ are also used as instance attributes. */
      var query_subtopic_id = null,
          limit = DEFAULT_ITEMS_LIMIT,
          params = {},
          _processing = false;


      this.setQueryContentId = setQueryContentId;
      function setQueryContentId (id, subid)
      {
        if(id !== null && (typeof id !== 'string' || id.length === 0))
          throw "Invalid query content id";

        query_content_id = id;
        if (typeof subid !== 'undefined') query_subtopic_id = subid;
      }

      this.getQueryContentId = getQueryContentId;
      function getQueryContentId()
      { return query_content_id; }

      this.getQuerySubtopicId = getQuerySubtopicId;
      function getQuerySubtopicId()
      { return query_subtopic_id; }

      this.setSearchEngine = setSearchEngine;
      function setSearchEngine(name)
      { engine_name = name; }

      this.getSearchEngine = getSearchEngine;
      function getSearchEngine(name)
      { return engine_name; }

      this.getAnnotator = getAnnotator;
      function getAnnotator()
      { return annotator; }

      // Returns an object of callbacks that may be given directly to the
      // `SortingQueue` constructor.
      this.getCallbacks = getCallbacks;
      function getCallbacks()
      { return { moreTexts: moreTexts }; }

      // This is just like `DossierJS.API.addLabel`, except it fixes one of
      // the content ids to the current value of
      // `SortingQueueItems.query_content_id`, and it fixes the value of
      // `annotator` to `SortingQueueItems.annotator`.
      //
      // (It returns the jQuery promise returned by `DossierJS.API.addLabel`.)
      this.addLabel = addLabel;
      function addLabel(cid, coref_value)
      {
        return api_.addLabel(query_content_id,
                             cid, annotator, coref_value);
      };

      function moreTexts(num)
      {
        if(typeof num !== 'number' || num <= 0)
          throw "Invalid number of items specified";

        if (_processing || !query_content_id) {
          var deferred = $.Deferred();

          window.setTimeout(function () {
            if(_processing) {
              console.warn('moreTexts in progress, ignoring new request');
              deferred.reject( { error: "Request in progress" } );
            } else {
              console.error('Query content id not yet set');
              deferred.reject( { error: "No query content id" } );
            }
          } );

          return deferred.promise();
        }

        _processing = true;
        var p = $.extend({limit: num.toString()}, params);
        if (query_subtopic_id !== null)
          p.subtopic_id = query_subtopic_id;

        return api_.search(engine_name, query_content_id, p)
          .then(function(data) {
            /* Fault tolerance: */
            if(data === null || typeof data !== 'object')
              data = { };
            if(!(data.results instanceof Array))
              data.results = [ ];

            data.results = data.results.map(function(cobj) {
              return {
                raw: cobj,
                content_id: cobj.content_id,
                fc: cobj.fc,
                node_id: cobj.content_id,
                name: '',
                url: cobj.fc.value('meta_url')
              };
            });

            return data;
          })
          .fail(  function() { console.error("moreTexts: request failed"); })
          .always(function() { _processing = false; });
      }
    })('similar', '', annotator_);

  };

  /* Private interface */
  var _opt_arg_good = function (a)
  {
    /* True (valid) if optional argument `a´ is not given at all or has a value
     * of `null´. */
    return a === null || typeof a === 'undefined';
  };


  /* Return module public API. */
  return Api;

}, this);