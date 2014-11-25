var BASE_URL = (function() {
    var re = /host=([^&]+)/.exec(window.location.search),
        host = !!re ? re[1] : 'localhost';
    var re = /port=([0-9]+)/.exec(window.location.search),
        port = !!re ? re[1] : '8001';
    return 'http://' + host + ':' + port;
})();

var passed = function(done) { expect(true).toEqual(true); if (done) done(); }
var failed = function(done) { expect(true).toEqual(false); if (done) done(); }

var content_id = 'abc';
var fc = new DossierJS.FeatureCollection({'NAME': {'foo': 1}});

describe('DossierJS.API', function() {
    var api;

    beforeEach(function(done) {
        api = new DossierJS.API(BASE_URL);
        api.fcPut(content_id, fc).done(function() { done(); });
    });

    it('builds valid URLs', function() {
        var got = api.url('search_engines'),
            expected = [BASE_URL, 'dossier', 'v1', 'search_engines'].join('/');
        expect(got).toEqual(expected);
    });

    it('returns a list of search engines', function(done) {
        api.searchEngines().done(function(engines) {
            expect(engines.length > 0).toBe(true);
            done();
        });
    });

    it('stores and retrieves a feature collection', function(done) {
        api.fcGet('abc').done(function(got) {
            expect(got).toEqual(fc);
            done();
        });
    });

    it('can retrieve a random feature collection', function(done) {
        api.fcRandomGet().done(function(r) {
            expect(r[0]).toEqual(content_id);
            expect(r[1]).toEqual(fc);
            done();
        });
    });

    it('adds a label', function(done) {
        // We have no way to observe whether a label was actually inserted
        // or not (unavailable in the web service), but arguably, that's a
        // test that belongs in dossier.web. ---AG
        api.addLabel('a', 'b', 'tester', DossierJS.COREF_VALUE_POSITIVE)
            .done(function() { passed(done); })
            .fail(function() { failed(done); });
    });

    it('provides basic random searching', function(done) {
        api.search('random', content_id, {limit: '1'}).done(function(r) {
            expect(r.results[0].content_id).toEqual(content_id);
            expect(r.results[0].fc).toEqual(fc);
            done();
        }).fail(function() { failed(done); });
    });
});

describe('DossierJS.FeatureCollection', function() {
    it('returns correct StringCounter values', function() {
        var fc = new DossierJS.FeatureCollection({'NAME': {'foo': 1}});
        expect(fc.value('NAME')).toEqual('foo');
    });

    it('returns correct string values', function() {
        var fc = new DossierJS.FeatureCollection({'NAME': 'foo'});
        expect(fc.value('NAME')).toEqual('foo');
    });

    it('returns null for non-existent features', function() {
        var fc = new DossierJS.FeatureCollection();
        expect(fc.feature('fubar')).toBeNull();
    });

    it('returns null for non-existent values', function() {
        var fc = new DossierJS.FeatureCollection();
        expect(fc.value('fubar')).toBeNull();
    });
});
