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
            api, 'index_scan', 'p|kb|Jeremy_Hammond', 'dossier.models');

    
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
            return { id: cobj[0],
                     text: getFirstKey_(cobj[1].raw.NAME) };
        });
    };

    var addBin = function(id, label) {
        return $.Deferred().then(function () {
            return { id: id,
                     name: label };
        } );
    };

    return $.extend({}, qitems.callbacks(), {
        getRandomItem: getRandomItem,
        addBin: addBin
    });
};

if(typeof define === "function" && define.amd) {
    define("API-SortingDesk", ["jquery", "DossierJS"], function($, DossierJS) {
        return _Api(window, $, DossierJS);
    });
} else {
    var Api = _Api(window, $, DossierJS);
}
