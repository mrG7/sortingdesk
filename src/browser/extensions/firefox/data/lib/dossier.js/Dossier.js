/** Dossier.js --- Diffeo's dossier.web API
 *
 * Copyright (C) 2014 Diffeo
 *
 * Comments:
 *
 *
 */


var _DossierJS = function(window, $) {
    /* Constants */
    var API_VERSION = {
        dossier: 1
    };

    /* + coreference types */
    var COREF_VALUE_POSITIVE = 1,
        COREF_VALUE_UNKNOWN = 0,
        COREF_VALUE_NEGATIVE = -1;

    // Create a new Dossier API, which can be used to issue requests
    // against a running instance of dossier.web.
    //
    // `url_prefix` is an optional URL prefix of the
    // dossier.web instance. If an API end point is at
    // `http://example.com/a/b/c/dossier/v1/search_engines, then `url_prefix`
    // should be `http://example.com/a/b/c` with NO trailing slash.
    // If `url_prefix` is omitted, then `/` is used as the API.
    //
    // `api_versions` is an optional object that maps web services to integer
    // version numbers. By default, this is set to `{dossier: N}` where
    // `N` is the latest version supported by this library.
    var API = function(url_prefix, api_versions) {
        this.api_versions = $.extend(true, {}, API_VERSION,
                                     api_versions || {});
        this.prefix = url_prefix || '';
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
        return Xhr.getJSON('API.search', url).promise()
            .then(function(data) {
                for (var i = 0; i < data.results.length; i++) {
                    data.results[i].fc = new FeatureCollection(
                        data.results[i].content_id, data.results[i].fc);
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
    API.prototype.searchEngines = function() {
        return Xhr.getJSON('API.searchEngines', this.url('search_engines'));
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
    API.prototype.fcGet = function(content_id) {
        var url = this.url('feature-collection/'
                           + encodeURIComponent(serialize(content_id)));
        return Xhr.getJSON('API.fcGet', url).promise()
            .then(function(data) {
                return new FeatureCollection(content_id, data);
            });
    };

    // Fetch a set of feature collections asynchronously for the given
    // content ids.
    //
    // The returned feature collections may not be in the same order as the
    // content ids given.
    //
    // This returns a promise that never fails. Namely, if one or more feature
    // collections could not be retrieved, then a message is logged to the
    // console and the next id is processed. This implies that if there are
    // errors, the results returned will have fewer entries than the number
    // of content ids given.
    //
    // TODO: An alternate error handling strategy is to fill `null` into the
    // array returned for FCs that could not be retrieved. This would
    // return an array that is always in correspondence with the given content
    // ids. I guess it depends on the common use case. ---AG
    API.prototype.fcGetAll = function(content_ids) {
        var def = $.Deferred(),
            to_resolve = content_ids.length,
            fcs = [];

        if(content_ids.length === 0) {
            console.log("No content ids to fetch");
            window.setTimeout(function () { def.resolve(fcs); } );
        }

        for (var i = 0; i < content_ids.length; i++) {
            var cid = content_ids[i];
            this.fcGet(cid)
                .done(function(fc) {
                    fcs.push(fc);
                })
                .fail(function() {
                    console.log('Could not fetch FC for ' + cid);
                })
                .always(function() {
                    to_resolve -= 1;
                    if (to_resolve === 0) {
                        def.resolve(fcs);
                    }
                });
        }
        return def.promise();
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
    //
    // TODO: This needs to support 'PUT'ing HTML. Or add another method. ---AG
    API.prototype.fcPut = function(content_id, fc) {
        var url = this.url('feature-collection/'
                           + encodeURIComponent(serialize(content_id)));
        return Xhr.ajax('API.fcPut', {
            type: 'PUT',
            contentType: 'application/json',
            url: url,
            data: JSON.stringify(fc.raw)
        }).fail(function() {
            console.log(fc);
            console.log("Could not save feature collection " +
                        "(content id: '" + content_id + "')");
        });
    };

    // Fetches a random feature collection from the database.
    //
    // This returns a jQuery promise which, on success, resolves to an array
    // with exactly two elements. The first is a content id and the second
    // is a `FeatureCollection`.
    API.prototype.fcRandomGet = function() {
        var url = this.url('random/feature-collection');
        return Xhr.getJSON('API.fcRandomGet', url).promise()
            .then(function(data) {
                return [data[0], new FeatureCollection(data[0], data[1])];
            });
    };

    // Adds a new label to the database, which will be used to support
    // active learning.
    //
    // `cid1` and `cid2` are the content ids corresponding to the content
    // objects participating in the label. They may be supplied in any order.
    // If `cid1` or `cid2` has a `serialize` method, then it is called for
    // you.
    //
    // `annotator` is any string identifying the human who created this label.
    //
    // `coref_value` indicates the type of label and it must be integer value
    // of `-1`, `0` or `1`, which stand for "not coreferent", "I don't know"
    // and "are coreferent", respectively.
    //
    // Alternatively, this function can accept a single argument that is an
    // instance of `Label`. (This is the only way to add subtopic labels.)
    //
    // This function returns a jQuery promise that resolves when the web
    // service responds.
    API.prototype.addLabel = function(
        /* <cid1, cid2, annotator, coref_value> | <label> */ )
    {
        var label;
        if (arguments.length == 4) {
            label = new Label(arguments[0], arguments[1],
                              arguments[2], arguments[3]);
        } else {
            label = arguments[0];
        }
        var url_cid1 = encodeURIComponent(serialize(label.cid1)),
            url_cid2 = encodeURIComponent(serialize(label.cid2)),
            url_ann = encodeURIComponent(label.annotator_id),
            endpoint = ['label', url_cid1, url_cid2, url_ann].join('/'),
            params = {};

        if (label.subtopic_id1) params.subtopic_id1 = label.subtopic_id1;
        if (label.subtopic_id2) params.subtopic_id2 = label.subtopic_id2;

        return Xhr.ajax('API.addLabel', {
            type: 'PUT',
            url: this.url(endpoint, params),
            contentType: 'text/plain',
            data: label.coref_value.toString()
        }).fail(function() {
            console.log("Could not add label:", label);
        }).promise();
    };

    // Adds an array of labels asynchronously and returns a promise that is
    // resolved when all labels have been inserted.
    //
    // If a label fails to add, then the promise is rejected with error
    // information.
    API.prototype.addLabels = function(labels) {
        var promises = [],
            def = $.Deferred(),
            to_resolve = labels.length;
        for (var i = 0; i < labels.length; i++) {
            var label = labels[i];
            console.log("adding label:", label);
            promises.push(this.addLabel(label)
                .done(function() {
                    to_resolve -= 1;
                    if (to_resolve === 0) {
                        def.resolve();
                    }
                })
                .fail(function(jqXHR, textStatus, errorThrown) {
                    console.log("Failed to add label: " + label);
                    def.reject(jqXHR, textStatus, errorThrown, label);
                })
            );
        }
        return def.promise();
    };

    // List all folders belonging to a particular user.
    //
    // `annotator` is optional and defaults to `unknown`.
    //
    // This returns a promise that is resolved to a list of `Folder`s.
    API.prototype.listFolders = function(annotator /* optional */) {
        annotator = annotator || 'unknown';

        var params = {annotator_id: annotator},
            url = this.url('folder', params);

        return Xhr.getJSON('API.listFolders', url).promise()
            .then(function(ids) {
                return ids.map(function(id) {
                    return Folder.from_id(id, annotator);
                });
            });
    };

    // Add a new folder.
    //
    // `folder` should be an instance of `Folder`.
    //
    // This returns a promise that is resolved if and only if the folder was
    // added successfully.
    API.prototype.addFolder = function(folder) {
        var params = {annotator_id: folder.annotator},
            url = this.url('folder/' + folder.id, params);
        return Xhr.ajax('API.addFolder', {
            type: 'PUT',
            url: url
        }).fail(function() {
            console.log("Could not add folder:", folder);
        }).promise();
    };

    // List all subfolders belonging to a particular folder.
    //
    // `folder` should be an instance of `Folder`.
    //
    // This returns a promise that is resolved to a list of `Subfolder`s.
    API.prototype.listSubfolders = function(folder) {
        var params = {annotator_id: folder.annotator},
            endpoint = ['folder', folder.id, 'subfolder'].join('/'),
            url = this.url(endpoint, params);
        return Xhr.getJSON('API.listSubfolders', url).promise()
            .then(function(ids) {
                return ids.map(function(id) {
                    return Subfolder.from_id(folder, id);
                });
            });
    };

    // Add an item to a subfolder. If the subfolder does not already exist,
    // it is created.
    //
    // `subfolder` should be an instance of `Subfolder`.
    //
    // `content_id` and `subtopic_id` should correspond to the item being
    // put into the subfolder. These ids do not need to conform to any
    // particular format, although `content_id` should globally identify
    // a topic and `subtopic_id` should locally identify a subtopic within
    // a topic.
    //
    // This returns a promise that is resolved if and only if the item was
    // added to the given subfolder.
    //
    // Note that there is no way to add a subfolder without an item in it.
    // Empty subfolders cannot exist!
    API.prototype.addSubfolderItem = function(subfolder, content_id,
                                              subtopic_id) {
        var params = {annotator_id: subfolder.folder.annotator},
            endpoint = [
                'folder', subfolder.folder.id, 'subfolder', subfolder.id,
                serialize(content_id), serialize(subtopic_id),
            ].join('/'),
            url = this.url(endpoint, params);
        return Xhr.ajax('API.addSubfolderItem', {
            type: 'PUT',
            url: url
        }).fail(function() {
            console.log("Could not add subfolder with item:",
                        subfolder, content_id, subtopic_id);
        }).promise();
    };

    // Lists all of the items in a particular subfolder.
    //
    // `subfolder` should be an instance of `Subfolder`.
    //
    // This returns a promise that is resolved to a list of tuples. The first
    // element in the tuple is a `content_id` and the second element is a
    // `subtopic_id`.
    API.prototype.listSubfolderItems = function(subfolder) {
        var params = {annotator_id: subfolder.folder.annotator},
            endpoint = [
                'folder', subfolder.folder.id, 'subfolder', subfolder.id
            ].join('/'),
            url = this.url(endpoint, params);
        return Xhr.getJSON('API.listSubfolderItems', url).promise();
    };

    API.prototype.stop = function () {
        return Xhr.stop.apply(Xhr, arguments);
    };

    // A convenience class for fetching labels.
    //
    // Since querying labels can be complex, constructing a query follow the
    // "builder" or "method chaining" pattern. For example, to find the 5th
    // page of positive expanded labels, with 10 labels per page for the
    // query content id "abc":
    //
    //   var api = new DossierJS.API(...);
    //   var fetcher = new LabelFetcher(api);
    //   fetcher.cid("abc")
    //          .which("expanded")
    //          .page(5)
    //          .perpage(10)
    //          .get()
    //            .done(function(labels) {
    //               console.log('retrieved ' + labels.length + ' labels');
    //            });
    var LabelFetcher = function(api) {
        this.api = api;
        this._cid = null;
        this._subtopic_id = null;
        this._which = 'direct';
        this._page = 1;
        this._perpage = 30;
        return this;
    };

    // Set the query content id for labels. This is required.
    LabelFetcher.prototype.cid = function(cid) {
        this._cid = cid;
        return this;
    };

    // Set the subtopic id for labels. This is optional.
    //
    // When a subtopic id is set, all label traversals are subtopic
    // traversals.
    LabelFetcher.prototype.subtopic = function(subtopic_id) {
        this._subtopic_id = subtopic_id;
        return this;
    };

    // Indicate the kind of label query you want to do. There are a few
    // choices:
    //
    //  direct             - Finds all directly connected labels to the query.
    //                       This includes positive, negative and unknown
    //                       labels.
    //  connected          - Finds all positive labels via a connected
    //                       component.
    //  expanded           - Finds all positive labels via an expansion of a
    //                       connected component.
    //  negative-inference - Finds all negatively inferred labels.
    LabelFetcher.prototype.which = function(which) {
        this._which = which;
        return this;
    };

    // Move to the next page.
    LabelFetcher.prototype.next = function() {
        this._page += 1;
        return this;
    };

    // Move to the previous page.
    LabelFetcher.prototype.prev = function() {
        this._page = Math.max(1, this._page - 1);
        return this;
    };

    // Explicitly set the page number.
    //
    // It's probably a bad idea to use this method because the backend has
    // no way of reporting how many pages are available. (Our architecture
    // makes this a very expensive operation, so we don't do it.)
    LabelFetcher.prototype.page = function(page) {
        this._page = Math.max(1, page);
        return this;
    };

    // Set the number of labels retrieved per page.
    LabelFetcher.prototype.perpage = function(perpage) {
        this._perpage = perpage;
        return this;
    };

    // Launch a search and return a promise. The promise, on success, resolves
    // to an array of `Label`s.
    LabelFetcher.prototype.get = function() {
        var allowed_search_types = [
            'direct', 'connected', 'expanded', 'negative-inference',
        ];
        if (!this._cid) {
            throw "query content id is not set";
        }
        if (allowed_search_types.indexOf(this._which) === -1) {
            throw "unrecognized web service: " + this._which;
        }
        var cid = encodeURIComponent(serialize(this._cid)),
            endpoint = ['label', cid, this._which].join('/'),
            params = {};

        if (this._subtopic_id !== null) {
            endpoint = [
                'label', cid, 'subtopic', this._subtopic_id, this._which,
            ].join('/');
        }
        if (this._page) params.page = this._page;
        if (this._perpage) params.perpage = this._perpage;
        var url = this.api.url(endpoint, params);
        return Xhr.getJSON('LabelFetcher.get', url).promise()
            .then(function(labels) {
                return labels.map(function(label) {
                    return new Label(label.content_id1, label.content_id2,
                                     label.annotator_id, label.value,
                                     label.subtopic_id1 || undefined,
                                     label.subtopic_id2 || undefined);
                });
            });
    };

    // Constructs a new label.
    //
    // The `subtopic_id1` and `subtopic_id2` parameters are optional. All other
    // parameters are required. Note that a single subtopic_id can be given
    // while leaving the other blank. Since `subtopic_id1` is a sub topic of
    // `cid1` (and similarly for `subtopic_id2` and `cid2`), one must specify
    // `undefined` for `subtopic_id1` when only specifying `subtopic_id2`.
    //
    // For example, to create a label from `a` to `b_2`, set:
    //
    //   cid1 = a, subtopic_id1 = undefined
    //   cid2 = b, subtopic_id2 = 2
    //
    // e.g.,
    //
    //   new Label('a', 'b', '...', COREF_VALUE_POSITIVE,
    //             undefined, '2');
    var Label = function(cid1, cid2, annotator_id, coref_value,
                         subtopic_id1, subtopic_id2) {
        if (und(cid1) || und(cid2) || und(annotator_id) || und(coref_value)) {
            throw "Labels require content ids, annotator id and a " +
                  "coref value.";
        }
        if ([-1, 0, 1].indexOf(coref_value) == -1) {
            throw "Invalid coref value: '" + coref_value + "' " +
                  "(must be an integer in {-1, 0, 1}).";
        }
        this.cid1 = cid1;
        this.cid2 = cid2;
        this.annotator_id = annotator_id;
        this.coref_value = coref_value;
        this.subtopic_id1 = subtopic_id1;
        this.subtopic_id2 = subtopic_id2;
        // It's not useful to define this on the client side.
        this.epoch_ticks = null;
    };

    // Tests equality of two labels using the definition of equality from
    // `dossier.label`.
    Label.prototype.equals = function(lab2) {
        var lab1 = this;
        return lab1.annotator_id === lab2.annotator_id
            && unordered_pair_eq([lab1.cid1, lab1.cid2],
                                 [lab2.cid1, lab2.cid2])
            && unordered_pair_eq([lab1.subtopic_id1, lab1.subtopic_id2],
                                 [lab2.subtopic_id1, lab2.subtopic_id2]);
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
    var FeatureCollection = function(content_id, obj) {
        this.content_id = content_id;
        this.raw = obj || {};
    };

    // Returns the feature corresponding to the given name. This will
    // check for and prefer a "display" version of the feature and return
    // that instead.
    //
    // Equivalent to `fc.raw['#' + name] || fc.raw[name] || null`.
    FeatureCollection.prototype.feature = function(name) {
        var display_name = '#' + name;
        return this.raw[display_name] || this.raw[name] || null;
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
            for (var k in feat) { return k; }
            return null;
        }
    };

    // This is just like the `value` method, except it returns an array
    // of all values. If the feature is empty or non-existent, an empty
    // array is returned;
    FeatureCollection.prototype.values = function(name) {
        var vals = [],
            feat = this.feature(name);
        if (typeof feat === 'string') {
            return [feat];
        } else {
            for (var k in feat) {
                vals.push(k);
            }
        }
        return vals;
    };

    // A folder is a means to organize user annotations.
    //
    // Currently, there are only two levels of folders: folders and subfolders.
    // Folders can contain zero or more subfolders and subfolders contain
    // one or more pieces of content. Folders can be owned by a particular
    // user, although in practice, the same `unknown` annotator is used for
    // everyone. (Therefore, the namespace of folders is shared by all.)
    //
    // Folders use a similar identifier scheme as Wikipedia. Namely, if a
    // folder's name is "John Smith" then its id is "John_Smith". Identifiers
    // cannot contain a ' ' (space) character. A name cannot contain a `/`
    // character (which diverges from Wikipedia). This implies that an
    // identifier also cannot contain a `/` character.
    //
    // A folder has the following instance attributes:
    //
    //     name       The name of the folder. Show this to users!
    //     id         The id of the folder. Hide this from users!
    //     annotator  The name of the user who owns this folder.
    //                This defaults to `unknown`.
    //
    // Note that this particular constructor should not be used. Use the
    // static methods `from_name` or `from_id` instead.
    var Folder = function() { };

    // Create a new folder with the given name.
    //
    // If `annotator` is not specified, it defaults to `unknown`.
    Folder.from_name = function(name, annotator /* optional */) {
        assert_valid_folder_name(name);

        var f = new Folder();
        f.name = name;
        f.id = folder_name_to_id(f.name);
        f.annotator = annotator || 'unknown';
        return f;
    };

    // Create a new folder with the given identifier.
    //
    // If `annotator` is not specified, it defaults to `unknown`.
    Folder.from_id = function(id, annotator /* optional */) {
        assert_valid_folder_id(id);

        var f = new Folder();
        f.id = id;
        f.name = folder_id_to_name(f.id);
        f.annotator = annotator || 'unknown';
        return f;
    };

    // A subfolder is a means to organize user annotations within a topic.
    //
    // Please see the documentation for `Folder` for how the folder hierarchy
    // is structured. Subfolders use the same identifier/name scheme as
    // folders.
    //
    // A subfolder has the following instance attributes:
    //
    //     folder   An instance of `Folder` that this subfolder belongs to.
    //     name     The name of the subfolder. Show this to users!
    //     id       The id of the subfolder. Hide this from users!
    //
    // Note that this particular constructor should not be used. Use the
    // static methods `from_name` or `from_id` instead.
    var Subfolder = function(folder) { this.folder = folder; };

    // Create a new subfolder with the given name.
    //
    // `folder` must be an instance of `Folder`.
    Subfolder.from_name = function(folder, name) {
        assert_valid_folder_name(name);

        var sf = new Subfolder(folder);
        sf.name = name;
        sf.id = folder_name_to_id(sf.name);
        return sf;
    };

    // Create a new subfolder with the given identifier.
    //
    // `folder` must be an instance of `Folder`.
    Subfolder.from_id = function(folder, id) {
        assert_valid_folder_id(id);

        var sf = new Subfolder(folder);
        sf.id = id;
        sf.name = folder_id_to_name(sf.id);
        return sf;
    };

    /* Some helper functions for dealing with folders and their ids/names. */

    function folder_name_to_id(name) {
        return name.replace(/\s/g, '_');
    }

    function folder_id_to_name(name) {
        return name.replace(/_/g, ' ');
    }

    function assert_valid_folder_name(name) {
        var illegal = ['/'];
        if (name.length === 0) {
            throw "Folder names cannot be empty";
        }
        for (var i = 0; i < illegal.length; i++) {
            if (name.indexOf(illegal[i]) !== -1) {
                throw "Illegal character '" + illegal[i] + "' found in "
                      + "folder name '" + name + "'.";
            }
        }
    }

    function assert_valid_folder_id(name) {
        var illegal = ['/', ' '];
        if (name.length === 0) {
            throw "Folder names cannot be empty";
        }
        for (var i = 0; i < illegal.length; i++) {
            if (name.indexOf(illegal[i]) !== -1) {
                throw "Illegal character '" + illegal[i] + "' found in "
                      + "folder name '" + name + "'.";
            }
        }
    }

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
    // Similarly, each instance has an `annotator` attribute, which is set
    // to the value given in the constructor, but may be changed at any time.
    // The value is used whenever a label is created.
    //
    // There are also `limit` and `params` instance attributes. `limit` is set
    // to `5` by default. `params` is empty by default.
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
        this.annotator = annotator;
        this.limit = 5;
        this.params = {};
        this._processing = false;
    };

    // Returns an object of callbacks that may be given directly to the
    // `SortingQueue` constructor.
    SortingQueueItems.prototype.callbacks = function() {
        return {
            itemDismissed:
                SortingQueueItems.prototype._itemDismissed.bind(this),
            moreTexts: SortingQueueItems.prototype._moreTexts.bind(this)
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

    SortingQueueItems.prototype._itemDismissed = function(cobj) {
        this.addLabel(cobj.content_id, COREF_VALUE_NEGATIVE);
    };

    SortingQueueItems.prototype._moreTexts = function() {
        var self = this;

        if (self._processing || !self.query_content_id) {
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
                    items.push($.extend(cobj, {
                        node_id: cobj.content_id,
                        name: cobj.fc.value('NAME') || '',
                        text: cobj.fc.value('sentences')
                              || (cobj.fc.value('NAME') + ' (profile)'),
                        url: cobj.fc.value('abs_url')
                    }));
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

    // Internal XHR handling. Useful for canceling existing requests.
    var Xhr = (function () {
        /* Attributes */
        var requests_ = { };

        /* Interface */
        var ajax = function ()
        {
            return add_(
                get_type_(arguments),
                $.ajax.apply($, Array.prototype.splice.call(arguments, 1)));
        };

        var getJSON = function ()
        {
            return add_(
                get_type_(arguments),
                $.getJSON.apply($, Array.prototype.splice.call(arguments, 1)));
        };

        var stop = function (type)
        {
            if(type === undefined) {
                for(var k in requests_) {
                    requests_[k].forEach(function (r) {
                        r.abort();
                    } );
                }

                requests_ = { };
            } else {
                var reqs = get(type);

                if(reqs !== null) {
                    reqs.forEach(function (r) {
                        r.abort();
                    } );

                    delete requests_[type];
                }
            }
        };

        var get = function (type)
        {
            return requests_[type] || null;
        };

        /* Private interface */
        var add_ = function (type, xhr)
        {
            var reqs = requests_[type];

            /* Create empty array if no requests exist for this type. */
            if(!reqs)
                reqs = requests_[type] = [ ];

            /* Delete request once it completes, ensuring that the request type
             * is also deleted when requests no longer exist. */
            reqs.push(xhr.always(function () {
                if(!reqs.some(function (r, i) {
                    if(r === xhr) {
                        reqs.splice(i, 1);
                        if(reqs.length === 0)
                            delete requests_[type];
                        return true;
                    }
                } ) ) {
                    console.error("Failed to remove request: %s: ", type, xhr);
                } else {
                    /* console.log("Removed request: ", requests_); */
                }
            } ) );

            /* console.log("Added xhr: %s: ", type, requests_); */
            return xhr;
        };

        var get_type_ = function (args)
        {
            if(args.length < 2) {
                throw "Invalid arguments specified. Expect `type´ and arguments"
                    + " for `ajax´ call";
            }

            return args[0];
        };


        /* Public interface */
        return {
            ajax: ajax,
            getJSON: getJSON,
            stop: stop
        };

    } )();

    function serialize(obj) {
        return typeof obj.serialize === 'function' ? obj.serialize() : obj;
    }

    function und(v) { return typeof v === 'undefined'; }

    function unordered_pair_eq(p1, p2) {
        return (p1[0] == p2[0] && p1[1] == p2[1])
            || (p1[0] == p2[1] && p1[1] == p2[0]);
    }

    return {
        // constants
        API_VERSION: API_VERSION,
        COREF_VALUE_POSITIVE: COREF_VALUE_POSITIVE,
        COREF_VALUE_UNKNOWN: COREF_VALUE_UNKNOWN,
        COREF_VALUE_NEGATIVE: COREF_VALUE_NEGATIVE,

        // classes
        API: API,
        FeatureCollection: FeatureCollection,
        Label: Label,
        LabelFetcher: LabelFetcher,
        SortingQueueItems: SortingQueueItems,
        Folder: Folder,
        Subfolder: Subfolder
    };
};

if(typeof define === "function" && define.amd) {
    define("DossierJS", ["jquery"], function($) {
        return _DossierJS(window, $);
    });
} else {
    var DossierJS = _DossierJS(window, $);
}


/*  Emacs settings     */
/* ------------------- */
/* Local Variables:    */
/* js2-basic-offset: 4 */
/* End:                */
/* ------------------- */
