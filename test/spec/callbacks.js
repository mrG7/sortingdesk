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
  
  it("invokes `moreTexts' to retrieve list of items whilst initialising",
     function (done) {
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
 
  it("invokes `moreTexts' to retrieve list of items when number of items below"
     + " `visibleItems'",
     function (done) {
       result = 0;
       
       run(g_options,
           $.extend(true, { }, g_callbacks, {
             moreTexts: function (num) {
               result += num;
               return Api.moreTexts(num);
             }
           } ),
           function () {
             window.setTimeout(function () {
               g_options.nodes.items.find('DIV:nth(0) .text-item-close')
                 .click();

               window.setTimeout(function () {
                 expect(result).toBe(g_options.visibleItems * 2);
                 done();
               }, DELAY_ITEMS);
             }, DELAY_ITEMS);
           } );
     } );
  
  it("doesn't invoke `moreTexts' to retrieve list of items when number of items"
     + " above `visibleItems'",
     function (done) {
       result = 0;
       
       run(g_options,
           $.extend(true, { }, g_callbacks, {
             moreTexts: function (num) {
               var promise = Api.moreTexts(num);

               if(promise)
                 result += num;
               
               return promise;
             }
           } ),
           function () {
             window.setTimeout(function () {
               /* Delete `visibleItems' - 1. This should force only *one*
                * update. */
               for(var i = 0; i < g_options.visibleItems - 1; ++i) {
                 g_options.nodes.items.find('>DIV:nth(' + i + ') .text-item-close')
                   .click();
               }

               window.setTimeout(function () {
                 /* Expect initial `visibleItems' + one forced update.  */
                 expect(result).toBe(g_options.visibleItems * 2);

                 /* Also expect number of items in UI to be consistent. */
                 expect(g_options.nodes.items.children().length)
                   .toBe(g_options.visibleItems * 2 - g_options.visibleItems + 1);
                 done();
               }, DELAY_ITEM_DELETED);
             }, DELAY_ITEMS);
           } );
     } );
  
  it("`moreTexts' doesn't process concurrent requests",
     function (done) {
       result = 0;
       
       run(g_options,
           $.extend(true, { }, g_callbacks, {
             moreTexts: function (num) {
               var promise = Api.moreTexts(num);

               if(promise)
                 ++ result;
               
               return promise;
             }
           } ),
           function () {
             window.setTimeout(function () {
               /* Delete `visibleItems' - 1. This should force only *one*
                * update. */
               for(var i = 0; i < g_options.visibleItems - 1; ++i) {
                 g_options.nodes.items.find('>DIV:nth(' + i + ') .text-item-close')
                   .click();
               }

               window.setTimeout(function () {
                 /* Only two moreTexts requests should have been processed. */
                 expect(result).toBe(2);
                 done();
               }, DELAY_ITEM_DELETED);
             }, DELAY_ITEMS);
           } );
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

  it("invokes `addPrimarySubBin' correctly", function (done) {
    var caption = "Foo bar baz primary";
    
    run(g_options,
        $.extend(true, { }, g_callbacks, {
          addPrimarySubBin: function (text) {
            result = text == caption;
            return Api.addPrimarySubBin(text);
          }
        } ),
        function () {
          g_options.nodes.bins.find('.button-add:nth(0)').click();
          
          window.setTimeout(function () {
            g_options.nodes.bins.find('.bin-primary-sub INPUT')
              .val(caption)
              .blur();

            window.setTimeout(function () {
              expect(result).toBe(true);
              done();
            }, DELAY_BUTTON_ADD);
          }, DELAY_BUTTON_ADD);
        } );
  } );

  it("invokes `addSecondaryBin' correctly", function (done) {
    var caption = "Foo bar baz secondary";
    
    run(g_options,
        $.extend(true, { }, g_callbacks, {
          addSecondaryBin: function (text) {
            result = text == caption;
            return Api.addPrimarySubBin(text);
          }
        } ),
        function () {
          g_options.nodes.bins.find('.button-add:nth(1)').click();
          
          window.setTimeout(function () {
            g_options.nodes.bins.find('.bin-secondary INPUT')
              .val(caption)
              .blur();

            window.setTimeout(function () {
              expect(result).toBe(true);
              done();
            }, DELAY_BUTTON_ADD);
          }, DELAY_BUTTON_ADD);
        } );
  } );

} );