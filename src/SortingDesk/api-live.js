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


/* Global constants */
var DOSSIER_STACK_API_URL = 'http://54.174.195.250:8080';
/* var DOSSIER_STACK_API_URL = 'http://localhost:8080'; */


var Api = (function() {
    /* TODO:
     *
     * Remove the following bypass of
     * DossierJS.SortingQueueItems.prototype._moreTexts . It is here so as to
     * ensure that we receive items in the format expected by
     * SortingQueue/Datawake. */
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

    // This initialization is highly suspect.
    var api = new DossierJS.API(DOSSIER_STACK_API_URL),
        qitems = new DossierJS.SortingQueueItems(
            api, 'index_scan', '', 'unknown'),
        domain;

    var setDomain = function (d) {
        domain = d;
    };

    var getDomain = function () {
        return domain;
    };

    var setQueryContentId = function (id) {
        if(!id)
            throw "Invalid engine content id";

        qitems.query_content_id = id;
    };

    var setSearchEngine = function(name) {
        qitems.engine_name = name;
    };

    var getSearchEngine = function(name) {
        return qitems.engine_name;
    };

    var addLabel = function (id, bin) {
        console.log("adding label (1):", id, bin);
        return api.addLabel(bin.id, id, qitems.annotator, 1);
    };

    var mergeBins = function (ibin, jbin) {
        return api.addLabel(ibin.id, jbin.id, qitems.annotator, 1);
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
                        qitems.query_content_id,
                        content_id,
                        data);

            deferred.resolve({ });
        }, 0);

        return deferred.promise();
    };

    /* The following based on the "accepted answer" at:
     * http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
     *
     * The function was slightly improved and a bug fixed (wasn't converting to
     * UINT32).
     */
    var generateId = function (value)
    {
        if(typeof value !== "string" || value.length === 0)
            return 0;

        var hash = 0;

        for(var i = 0, len = value.length; i < len; i++)
            hash = ((hash << 5) - hash) + value.charCodeAt(i);

        /* Return hash and convert to UINT32. */
        return makeId(hash >>> 0);
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
        return api;
    };

    return $.extend({}, qitems.callbacks(), {
        setDomain: setDomain,
        getDomain: getDomain,
        setQueryContentId: setQueryContentId,
        setSearchEngine: setSearchEngine,
        getSearchEngine: getSearchEngine,
        updateQueryFc: updateQueryFc,
        addLabel: addLabel,
        mergeBins: mergeBins,
        generateId: generateId,
        makeId: makeId,
        getClass: getClass,
        getApi: getApi
    });
} )();


/*  Emacs settings     */
/* ------------------- */
/* Local Variables:    */
/* js2-basic-offset: 4 */
/* End:                */
/* ------------------- */
