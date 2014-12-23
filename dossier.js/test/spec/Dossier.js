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
var lab = new DossierJS.Label('a', 'b', 'tester',
                              DossierJS.COREF_VALUE_POSITIVE);

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
        api.addLabel(lab.cid1, lab.cid2, lab.annotator_id, lab.coref_value)
            .fail(function() { failed(done); })
            .done(function() { labelExists(api, lab, done); });
    });

    it('adds a label 2', function(done) {
        api.addLabel(lab)
            .fail(function() { failed(done); })
            .done(function() { labelExists(api, lab, done); });
    });

    it('adds a negative label', function(done) {
        var lab = new DossierJS.Label('a', 'b', 'tester',
                                      DossierJS.COREF_VALUE_NEGATIVE);
        api.addLabel(lab)
            .fail(function() { failed(done); })
            .done(function() { labelExists(api, lab, done); });
    });

    it('adds a negative label and is inferred', function(done) {
        var lab = new DossierJS.Label('a', 'b', 'tester',
                                      DossierJS.COREF_VALUE_NEGATIVE);
        var fetcher = function(f) { return f.which('negative'); };
        api.addLabel(lab)
            .fail(function() { failed(done); })
            .done(function() { labelExists(api, lab, done, fetcher); });
    });

    it('adds a negative label and is not part of positives', function(done) {
        var lab = new DossierJS.Label('x', 'y', 'tester',
                                      DossierJS.COREF_VALUE_NEGATIVE);
        var fetcher = function(f) { return f.which('positive'); };
        api.addLabel(lab)
            .fail(function() { failed(done); })
            .done(function() { labelExists(api, lab, done, fetcher, true); });
    });

    it('adds labels with subtopics', function(done) {
        var lab = new DossierJS.Label('s', 't', 'tester',
                                      DossierJS.COREF_VALUE_POSITIVE,
                                      'subs', 'subt');
        api.addLabel(lab)
            .fail(function() { failed(done); })
            .done(function() { labelExists(api, lab, done); });
    });

    it('adds labels with subtopics that are part of an expansion',
       function(done) {
        var lab = new DossierJS.Label('m', 'n', 'tester',
                                      DossierJS.COREF_VALUE_POSITIVE,
                                      'subm', 'subn');
        var fetcher = function(f) {
            return f.which('positive').method('expanded');
        };
        api.addLabel(lab)
            .fail(function() { failed(done); })
            .done(function() { labelExists(api, lab, done); });
    });

    it('paginates labels', function(done) {
        var lab1 = new DossierJS.Label('p', 'a', 'tester',
                                      DossierJS.COREF_VALUE_POSITIVE);
        var lab2 = new DossierJS.Label('p', 'b', 'tester',
                                      DossierJS.COREF_VALUE_POSITIVE);
        var fetcher = function(f) { return f.perpage(1).next(); };
        api.addLabel(lab1)
            .fail(function() { failed(done); })
            .done(function() {
                api.addLabel(lab2)
                    .fail(function() { failed(done); })
                    .done(function() {
                        labelExists(api, lab1, done, fetcher, true);
                        labelExists(api, lab2, done, fetcher);
                    });
            });
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

function labelExists(api, label, done, fetcher, invert) {
    if (typeof fetcher === 'undefined') {
        fetcher = function(v) { return v; };
    }
    fetcher(new DossierJS.LabelFetcher(api).cid(label.cid1)).get()
        .fail(function() { failed(done); })
        .done(function(labels) {
            for (var i = 0; i < labels.length; i++) {
                if (labels[i].equals(label)) {
                    if (invert) { failed(done); } else { passed(done); }
                    return;
                }
            }
            if (invert) { passed(done); } else { failed(done); }
        });
}
