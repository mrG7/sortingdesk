(function() {

var urlBuilder = function() {
    var diffeo = '//demo.diffeo.com:8080/';
    var namespace = 'miguel_sorting_desk';
    
    var build = function build(suffix) {
        return diffeo + 'namespaces/' + namespace + '/' + suffix;
    };
    return {
        build: build
    };
};

var makeEntity = function makeEntity(name, profileId) {
    var _name = ko.observable(name);
    var _profileId = ko.observable(profileId);
    var _profile = ko.observable(null);

    var _wpUrl = ko.pureComputed(function wpUrl() {
        // TODO: Is there a good way to get a Wikipedia article
        // from the profile, assuming it exists?  Data has slots
        // like PER_WEBSITE but these aren't necessarily as useful.
        var name = _name();
        return 'https://en.wikipedia.org/wiki/Special:Search/' + name;
    });
    var _contentId = ko.pureComputed(function contentId() {
        return 'kb_' + _profileId();
    });

    return {
        name: _name,
        profileId: _profileId,
        profile: _profile,

        wpUrl: _wpUrl,
        contentId: _contentId,
    };
};

var nestedImage = function nestedImage(json) {
    if (!json) {
        return null;
    }

    var _base64Value = json.base64_value;
    var _mimeType = json.mimeType;

    var dataUrl = ko.pureComputed(function dataUrl() {
        return 'data:' + _mimeType + ';base64,' + _base64Value;
    });

    return {
        url: dataUrl,
    };
};

var searchResult = function searchResult(json) {
    var _targetId = json.target_id;
    var _profileId = json.profile_id;
    var _canonicalName = json.canonical_name;
    var _image = nestedImage(json.image);

    var _makeEntity = function() {
        var e = makeEntity(_canonicalName, _profileId);
        var builder = urlBuilder();
        var url = builder.build('profiles/' + _profileId);
        $.ajax(url)
            .done(function(data) {
                e.profile(data);
            })
            .fail(function(xhr, status, err) {
                   console.error(xhr, status, err);
            });
        return e;
    };

    return {
        targetId: _targetId,
        profileId: _profileId,
        canonicalName: _canonicalName,
        image: _image,

        makeEntity: _makeEntity,
    };
};

var entitySearch = function entitySearch(cb) {
    var _text = ko.observable('');
    var _results = ko.observableArray();
    var _currentXhr = null;

    var doSearch = function(text) {
        var builder = urlBuilder();
        var url = builder.build('profile_search');
        _currentXhr = $.ajax(url, { data: { q: text, perpage: 100 }})
               .done(function(data, status, xhr) {
                   if (xhr !== _currentXhr) {
                       return;
                   }
                   _currentXhr = null;
                   _results(data.map(searchResult));
               })
               .fail(function(xhr, status, err) {
                   console.error(xhr, status, err);
                   if (xhr === _currentXhr) {
                       _currentXhr = null;
                   }
               });
    };
    _text.subscribe(doSearch);
    // limit searches to 1 per 1000 ms
    _text.extend({rateLimit: 1000});

    var select = function select(e) {
        cb(e.makeEntity());
    };
    var selectOther = function selectOther() {
        // TODO: round-trip to server to create the profile
        var e = makeEntity(_text(), '');
        cb(e);
    };

    return {
        text: _text,
        results: _results,

        select: select,
        selectOther: selectOther,
    };
};

var makeModel = function makeModel() {
    var _entity = ko.observable(null);
    var _search = ko.observable(null);

    var _secondaryContentIds = null;
    var _sortingDesk = null;

    var selectEntity = function selectEntity(e) {
        _entity(e);
        _search(null);

        // This turns on SortingDesk
        var secondaryBins = [
            { node_id: 1, features: { NAME: { "Vital": 0 } } },
            { node_id: 2, features: { NAME: { "Coreferent": 0 } } },
            { node_id: 3, features: { NAME: { "Unknown": 0 } } },
            { node_id: 4, features: { NAME: { "Not Coreferent": 0 } } },
        ];
        _secondaryContentIds = Api.initialise(e.contentId(), secondaryBins);
        var promise;
        if (_sortingDesk) {
            promise = _sortingDesk.reset();
        } else {
            promise = $.Deferred();
            promise.resolve();
        }
        promise.done(function() {
            _sortingDesk = new SortingDesk({
                nodes: {
                    items: $('#items'),
                    bins: $('#bins'),
                    binDelete: $('#button-delete'),
                },
                css: {
                    primaryBinOuterWrapper: 'panel panel-default',
                    primaryBinInnerWrapper: 'panel-body',
                    secondaryBinInnerWrapper: 'btn-group btn-group-justified',
                    itemSelected: 'panel-primary',
                    droppableHover: 'active',
                },
                primaryContentId: e.contentId(),
                secondaryContentIds: _secondaryContentIds,
                visibleItems: 15,
            }, Api);
        });
    };
    var deselectEntity = function deselectEntity() {
        _entity(null);
        _search(entitySearch(selectEntity));

        _secondaryContentIds = null;
        if (_sortingDesk) {
            _sortingDesk.reset();
        }
        _sortingDesk = null;
    };

    deselectEntity();
    return {
        entity: _entity,
        search: _search,

        selectEntity: selectEntity,
        deselectEntity: deselectEntity
    };
};

var m = makeModel();

ko.applyBindings(m);
})();
