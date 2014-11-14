(function(window, $) {
    var API_VERSION = 1;

    // Create a new Dossier API, which can be used to issue requests
    // against a running instance of dossier.web.
    //
    // `url` is the URL prefix of the dossier.web instance. If an API end
    // point is at `http://example.com/a/b/c/dossier/v1/search_engines,
    // then `url` should be `http://example.com/a/b/c` with NO trailing slash.
    //
    // `version` is the version of the dossier.web API. It is optional.
    // If left blank, it defaults to the current version of the API recognized
    // by this library. `version` should be an integer.
    var API = function(url, version) {
        this.version = 'v' + (version || API_VERSION).toString();
        this.prefix = url;
    };

    // Constructs a URL given a service (e.g., `dossier` or `streamcorpus`),
    // an endpoint (e.g., `feature-collection/<content_id>`) and an object
    // of query parameters.
    API.prototype._url = function(service, endpoint, params) {
        params = params || {};
        var base = [this.prefix, service, this.version, endpoint].join('/');
        return base + '?' + $.param(params, true);
    };

    /* API.prototype. */

    if (typeof define == "function" && define.amd) {
        define(function() {
            return {
                DossierAPI: API,
                FeatureCollection: FC,
            };
        });
    } else {
        window.DossierAPI = API;
        window.FeatureCollection = FC;
    }
})(typeof window == "undefined" ? this : window, jQuery)

