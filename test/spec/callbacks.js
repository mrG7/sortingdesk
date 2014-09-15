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
  
  it("invokes `renderPrimaryBin' to render one primary bin", function (done) {
    result = 0;
    
    run(g_options,
        $.extend(true, { }, g_callbacks, {
          renderPrimaryBin: function (bin) {
            ++result ;
            return Api.renderPrimaryBin(bin);
          }
        } ),
        function () {
          expect(result).toBe(1);
        },
        done);
  } );

  /* TODO: not testing initialisation of primary sub bins since there are
   * none at initialisation time. */
  it("invokes `renderPrimarySubBin' when initialising to render zero primary"
     + " sub-bins",
     function (done) {
       result = 0;
       
       run(g_options,
           $.extend(true, { }, g_callbacks, {
             renderPrimarySubBin: function (bin) {
               ++result ;
               return Api.renderPrimarySubBin(bin);
             }
           } ),
           function () {
             expect(result).toBe(0);
           },
           done);
     } );
  
  it("invokes `renderSecondaryBin' when initialising to render correct number of"
     + " secondary bins",
     function (done) {
       result = 0;
       
       run(g_options,
           $.extend(true, { }, g_callbacks, {
             renderSecondaryBin: function (bin) {
               ++result ;
               return Api.renderSecondaryBin(bin);
             }
           } ),
           function () {
             expect(result).toBe(g_secondaryContentIds.length);
           },
           done);
     } );

} );