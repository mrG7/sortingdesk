describe('Callbacks', function () {
  var result = false;

  setup();

  it("invokes `getBinData' correctly whilst initialising", function (done) {
    run(g_options,
        $.extend(true, { }, g_callbacks, {
          getBinData: function (ids) {
            result = ids.length == g_secondaryContentIds.length + 1;
            return Api.getBinData(ids);
          }
        } ),
        function () {
          expect(result).toBe(true);
        },
        done);
  } );

  it("invokes `moreTexts' to retrieve list of items", function (done) {
    run(g_options,
        $.extend(true, { }, g_callbacks, {
          moreTexts: function (num) {
            result = num == g_options.visibleItems;
            return Api.moreTexts(num);
          }
        } ),
        function () {
          expect(result).toBe(true);
        },
        done);
  } );

} );