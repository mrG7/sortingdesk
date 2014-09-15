describe('Callbacks', function () {
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

  it("invokes `renderAddButton' correctly whilst initialising", function (done) {
    result = 0;
    
    run(g_options,
        $.extend(true, { }, g_callbacks, {
          renderAddButton: function (caption) {
            if(caption && caption.length > 0)
              ++result;
            return Api.renderAddButton(caption);
          }
        } ),
        function () {
          expect(result).toBe(2);
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