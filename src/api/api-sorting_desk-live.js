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


var _Api = function(window, $, DossierJS) {
    // This initialization is highly suspect.
    var api = new DossierJS.API('http://54.173.159.137:8080'),
        qitems = new DossierJS.SortingQueueItems(
            api, 'index_scan', 'p|kb|Jeremy_Hammond', 'unknown');

    
    var getFirstKey_ = function (obj) {
        if(obj) {
            if(typeof obj == 'string')
                return obj;

            for(var k in obj)
                return k;
        }
        
        return '';
    };

    var getRandomItem = function() {
        return api.fcRandomGet().then(function(cobj) {
            var fc = cobj[1];
            
            return {
                content_id: cobj[0],
                fc: fc,
                node_id: cobj.content_id,
                name: fc.value('NAME') || '',
                text: fc.value('sentences')
                    || (fc.value('NAME') + ' (profile)'),
                url: fc.value('abs_url')
            };
        });
    };

    var setQueryContentId = function (id) {
        if(!id)
            throw "Invalid engine content id";
        
        qitems.query_content_id = id;
    };

    var itemDismissed = function (item) {
        /* Translate `item' used by Sorting Queue into an object the API can
         * use. */
        qitems.callbacks().itemDismissed(item.content);
    };

    var itemDroppedInBin = function (item, bin) {
        api.addLabel(bin.id, item.id, qitems.annotator, 1);
    };

    return $.extend({}, qitems.callbacks(), {
        getRandomItem: getRandomItem,
        setQueryContentId: setQueryContentId,
        itemDismissed: itemDismissed,
        itemDroppedInBin: itemDroppedInBin
    });
};

if(typeof define === "function" && define.amd) {
    define("API-SortingDesk", ["jquery", "DossierJS"], function($, DossierJS) {
        return _Api(window, $, DossierJS);
    });
} else {
    var Api = _Api(window, $, DossierJS);
}
