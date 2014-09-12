describe('Callbacks', function () {
  var result = false;

  beforeEach(function () {
    result = false;
  } );

  afterEach(function () {
    g_sortingDesk.reset();
  } );

  it("invokes `getBinData' correctly whilst initialising", function (done) {
    g_sortingDesk = SortingDesk.instantiate(
      g_options,
      $.extend(true, { }, g_callbacks, {
        getBinData: function (ids) {
          result = ids.length == g_secondaryContentIds.length + 1;
          return $.Deferred().promise();
        }
      } ) );
    
    setTimeout(function () {
      expect(result).toBe(true);
      done();
    }, DELAY);
  } );

  it("invokes `moreTexts' to retrieve list of items", function (done) {
    g_sortingDesk = SortingDesk.instantiate(
      g_options,
      $.extend(true, { }, g_callbacks, {
        moreTexts: function (num) {
          result = num > 0;
          return $.Deferred().promise();
        }
      } ) );
    
    setTimeout(function () {
      expect(result).toBe(true);
      done();
    }, DELAY);
  } );
} );