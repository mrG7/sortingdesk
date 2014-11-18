(function(window, $) {
    var API_VERSION = {
        dossier: 1,
    };
    var COREF_VALUE_POSITIVE = 1,
        COREF_VALUE_UNKNOWN = 0,
        COREF_VALUE_NEGATIVE = -1;

    // Create a new Dossier API, which can be used to issue requests
    // against a running instance of dossier.web.
    //
    // `url` is the URL prefix of the dossier.web instance. If an API end
    // point is at `http://example.com/a/b/c/dossier/v1/search_engines,
    // then `url` should be `http://example.com/a/b/c` with NO trailing slash.
    //
    // `api_versions` is an optional object that maps web services to integer
    // version numbers. By default, this is set to `{dossier: N}` where
    // `N` is the latest version supported by this library.
    var API = function(url_prefix, api_versions) {
        this.api_versions = $.extend(true, {}, API_VERSION,
                                     api_versions || {});
        this.prefix = url_prefix;
    };

    // Constructs a URL given a service (e.g., `dossier` or `streamcorpus`),
    // an endpoint (e.g., `feature-collection/<content_id>`) and an optional
    // object of query parameters.
    //
    // Constructs a URL given an endpoint (e.g.,
    // `feature-collection/<content_id>`) with optional query parameters
    // (default is empty) and a named web service (default is "dossier").
    // The named web service must have a corresponding entry in
    // the `api_versions` passed to the constructor.
    //
    // The API version in the URL is always the latest version of that service
    // supported by this module.
    API.prototype.url = function(endpoint, params, service) {
        params = params || {};
        service = service || 'dossier';
        if (!this.api_versions[service]) {
            throw "Unrecognized service '" + service + "'";
        }

        var version = 'v' + this.api_versions[service].toString();
        var base = [this.prefix, service, version, endpoint].join('/');
        return (base + '?' + $.param(params, true)).replace(/\?$/, '');
    };

    // Performs a search using the given search engine name. The search
    // engine name must correspond to a name returned by the `search_engines`
    // method.
    //
    // `content_id` should identify a feature collection in the database.
    // This feature collection is used as the query of the search engine.
    // If `content_id` has a `serialize` method, then it is called for you.
    // Otherwise, `content_id` is used as is.
    //
    // `params` is an optional parameter that can be used to provide query
    // parameters to the search engine. (e.g., `limit`.)
    //
    // This returns a jQuery promise that resolves to an object with at least
    // a `results` key, which maps to an array of objects that each have
    // two keys: `content_id` and `fc`, which have type `string` and
    // `FeatureCollection`, respectively.
    API.prototype.search = function(engine_name, content_id, params) {
        params = params || {};
        var url = this.url([
            'feature-collection',
            encodeURIComponent(serialize(content_id)),
            'search',
            engine_name,
        ].join('/'), params);
        return $.getJSON(url).promise().then(function(data) {
            for (var i = 0; i < data.results.length; i++) {
                data.results[i].fc = new FeatureCollection(data.results[i].fc);
            }
            return data;
        });
    };

    // Retrieves a list of available search engines.
    //
    // The web service guarantees that there is always at least one search
    // engine.
    //
    // This returns a jQuery promise that resolves to a list of search engine
    // names.
    API.prototype.search_engines = function() {
        return $.getJSON(this.url('search_engines'));
    };

    // Retrieves a feature collection from the database with the given
    // content id.
    //
    // `content_id` should identify a feature collection in the database.
    // If `content_id` has a `serialize` method, then it is called for you.
    // Otherwise, `content_id` is used as is.
    //
    // This returns a jQuery promise which, on success, resolves to
    // an instance of FeatureCollection.
    API.prototype.fc_get = function(content_id) {
        var url = this.url('feature-collection/'
                           + encodeURIComponent(serialize(content_id)));
        return $.getJSON(url).promise().then(function(data) {
            return new FeatureCollection(data);
        });
    };

    // Stores a feature collection in the database with the given content id.
    // If a feature collection with this content id already exists, it is
    // overwritten.
    //
    // If `content_id` has a `serialize` method, then it is called for you.
    // Otherwise, `content_id` is used as is.
    //
    // This returns a jQuery promise which resolves when the web server
    // responds.
    API.prototype.fc_put = function(content_id, fc) {
        var url = this.url('feature-collection/'
                           + encodeURIComponent(serialize(content_id)));
        return $.ajax({
            type: 'PUT',
            contentType: 'application/json',
            url: url,
            data: JSON.stringify(fc.raw),
        }).fail(function() {
            console.log(fc);
            console.log("Could not save feature collection " +
                        "(content id: '" + content_id + "')");
        });
    };

    // Adds a new label to the database, which will be used to support
    // active learning.
    //
    // `cid1` and `cid2` are the content ids corresponding to the content
    // objects participating in the label. They may be supplied in any order.
    // If `cid1` or `cid2` has a `serialize` method, then it is called for
    // you. (Which means you can pass `ProfileContentId` instances directly.)
    //
    // `annotator` is any string identifying the human who created this label.
    //
    // `coref_value` indicates the type of label and it must be integer value
    // of `-1`, `0` or `1`, which stand for "not coreferent", "I don't know"
    // and "are coreferent", respectively.
    //
    // This function returns a jQuery promise that resolves when the web
    // service responds.
    API.prototype.addLabel = function(cid1, cid2, annotator, coref_value) {
        if ([-1, 0, 1].indexOf(coref_value) == -1) {
            throw "Invalid coref value: '" + coref_value + "' " +
                  "(must be an integer in {-1, 0, 1}).";
        }
        var url_cid1 = encodeURIComponent(serialize(cid1));
            url_cid2 = encodeURIComponent(serialize(cid2));
            url_ann = encodeURIComponent(annotator),
            endpoint = ['label', url_cid1, url_cid2, url_ann].join('/');
        return $.ajax({
            type: 'PUT',
            url: this.url(endpoint),
            contentType: 'text/plain',
            data: coref_value.toString(),
        }).fail(function() {
            var label = [cid1.toString(), cid2.toString(),
                         annotator.toString(), coref_value.toString()];
            console.log("Could not add label <" + label.join(", ") + ">");
        }).promise();
    };

    // Constructs a new feature collection.
    //
    // The optional object given initializes the feature collection. If not
    // given, the feature collection will be empty.
    //
    // The format of a feature collection is described in the documentation
    // for the `dossier.fc` Python module. Generally, that format is preserved
    // here.
    //
    // Instances of FeatureCollection have one public attribute: `raw`, which
    // returns the underlying object.
    var FeatureCollection = function(obj) {
        this.raw = obj || {};
    };

    // Returns the feature corresponding to the given name.
    //
    // Equivalent to `fc.raw[name] || null`.
    FeatureCollection.prototype.feature = function(name) {
        return this.raw[name] || null;
    };

    // Arbitrarily return the value of a named feature. (e.g., A Unicode
    // feature or the first key in a StringCounter feature, where "first"
    // is the first element enumerated.)
    //
    // If no such value exists, then `null` is returned.
    FeatureCollection.prototype.value = function(name) {
        var feat = this.feature(name);
        if (typeof feat === 'string') {
            return feat;
        } else {
            for (var k in this.feature(name)) { return k; }
            return null;
        }
    }

    // Constructs a new content id for a profile. `source_id` should be a
    // unique identifier within the knowledge base identified by `source`.
    //
    // Note that `source` is optional. If missing, it defaults to "kb".
    var ProfileContentId = function(source_id, source) {
        this.source = source || 'kb';
        this.source_id = source_id;
    };

    // A method that serializes a content id to its binary form.
    ProfileContentId.prototype.serialize = function() {
        return [
            rfc3986EncodeURIComponent('p'),
            rfc3986EncodeURIComponent(this.source),
            rfc3986EncodeURIComponent(this.source_id),
        ].join('|');
    };

    // SortingQueueItems provides SortingQueue integration with DossierJS.
    // Namely, it provides the following callback functions:
    //
    //   moreTexts - Returns results from a search.
    //   textDismissed - Adds a label between the `query_content_id` and
    //                   the text item that was dismissed. The coref value
    //                   used is `-1`.
    //
    // An instance of `SortingQueueItems` can be used to initialize an
    // instance of `SortingQueue` with the appropriate callbacks. e.g.,
    //
    //   var qitems = new SortingQueueItems(...);
    //   new SortingQueue.Instance(
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
    //   sorting_desk_instance.items.remove_all();
    //
    // Similarly, each instance has an `annotator` attribute, which is set
    // to the value given in the constructor, but may be changed at any time.
    // The value is used whenever a label is created.
    //
    // There is also a `limit` instance attribute, which is set to `5` by
    // default. It can be changed at any time.
    //
    // The `api` parameter should be an instance of `DossierJS.API`.
    //
    // Each instance of `SortingQueueItems` may be used with precisely
    // one instance of `SortingQueue`.
    var SortingQueueItems = function(api, engine_name, query_content_id,
                                     annotator) {
        this.api = api;
        this.engine_name = engine_name;
        this.query_content_id = query_content_id;
        this.annotator = this.annotator;
        this.limit = 5;
        this._processing = false;
    };

    // Returns an object of callbacks that may be given directory to the
    // `SortingQueue` constructor.
    SortingQueueItems.prototype.callbacks = function() {
        return {
            textDismissed:
                SortingQueueItems.prototype._textDismissed.bind(this),
            moreTexts: SortingQueueItems.prototype._moreTexts.bind(this),
        };
    };

    // This is just like `DossierJS.API.addLabel`, except it fixes one of
    // the content ids to the current value of
    // `SortingQueueItems.query_content_id`, and it fixes the value of
    // `annotator` to `SortingQueueItems.annotator`.
    //
    // (It returns the jQuery promise returned by `DossierJS.API.addLabel`.)
    SortingQueueItems.prototype.addLabel = function(cid, coref_value) {
        return this.api.addLabel(this.query_content_id,
                                 cid, this.annotator, coref_value);
    };

    SortingQueueItems.prototype._textDismissed = function(cobj) {
        this.addLabel(cobj.content_id, COREF_VALUE_NEGATIVE);
    };

    SortingQueueItems.prototype._moreTexts = function() {
        var self = this;

        if (self._processing) {
            console.log('moreTexts in progress, ignoring new request');
            return null;
        }
        self._processing = true;

        var p = {limit: self.limit.toString()};
        return self.api.search(self.engine_name, self.query_content_id, p)
            .always(function() {
                self._processing = false;
            })
            .fail(function() {
                console.log("moreTexts: request failed");
            });
    };

    function rfc3986EncodeURIComponent(s) {
        // Taken from: http://goo.gl/kRTxRW
        // (Javascript's default `encodeURIComponent` does not strictly
        // conform to RFC 3986.)
        return encodeURIComponent(s).replace(/[!'()*]/g, function(c) {
            return '%' + c.charCodeAt(0).toString(16);
        });
    }

    function serialize(obj) {
        return typeof obj.serialize === 'function' ? obj.serialize() : obj;
    }

    var module = {
        // constants
        COREF_VALUE_POSITIVE: COREF_VALUE_POSITIVE,
        COREF_VALUE_UNKNOWN: COREF_VALUE_UNKNOWN,
        COREF_VALUE_NEGATIVE: COREF_VALUE_NEGATIVE,

        // classes
        API: API,
        FeatureCollection: FeatureCollection,
        ProfileContentId: ProfileContentId,
        SortingQueueItems: SortingQueueItems,
    };

    if (typeof define == "function" && define.amd) {
        define(function() { return module; });
    } else {
        window.DossierJS = module;
    }
})(typeof window == "undefined" ? this : window, jQuery)

