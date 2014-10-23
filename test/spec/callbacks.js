/**
 * @file Test specification: callbacks.
 * @copyright 2014 Diffeo
 * @author Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 * 
 */

/*global SortingDesk, Api, DraggingEvent, g_sortingDesk, setup, run,
 *global runNoInstantiation, runAfterItemsRendered, reset, result
 *global DELAY_ITEMS, DELAY_ITEM_DELETED, DELAY_BUTTON_ADD, DELAY_ITEM_DRAGGED,
 *global DELAY_ITEM_DROPPED, DELAY_BIN_DRAGGED, DELAY_BIN_DROPPED
 *global g_options, g_callbacks, g_secondaryContentIds
 *global describe, it, expect */
/*jshint laxbreak:true */


describe('Callbacks', function () {
  setup();
  
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
       
       runAfterItemsRendered(
         g_options,
         $.extend(true, { }, g_callbacks, {
           moreTexts: function (num) {
             result += num;
             return Api.moreTexts(num);
           }
         } ),
         function () {
           g_options.nodes.items.find('DIV:nth(0) .sd-text-item-close')
             .click();

           window.setTimeout(function () {
             expect(result).toBe(g_options.visibleItems * 2);
             done();
           }, DELAY_ITEMS);
         } );
     } );
  
  it("doesn't invoke `moreTexts' to retrieve list of items when number of items"
     + " above `visibleItems'",
     function (done) {
       result = 0;

       runAfterItemsRendered(g_options,
           $.extend(true, { }, g_callbacks, {
             moreTexts: function (num) {
               var promise = Api.moreTexts(num);

               if(promise)
                 result += num;
               
               return promise;
             }
           } ),
           function () {
             var count = 0,
                 interval = window.setInterval(function () {
                   /* Delete `visibleItems' - 1. This should force only *one*
                    * update. */
                   g_options.nodes.items
                     .find('>DIV:nth(0) .sd-text-item-close')
                     .click();

                   if(++count < 4)
                     return;

                   window.clearInterval(interval);
                   
                   window.setTimeout(function () {
                     /* Expect initial `visibleItems' + one forced update. */
                     expect(result).toBe(g_options.visibleItems * 2);
                     
                     /* Also expect number of items in UI to be consistent. */
                     expect(g_options.nodes.items.children().length)
                       .toBe(g_options.visibleItems + 1);

                     done();
                   }, DELAY_ITEM_DELETED);
                 }, 25);
           } );
     } );
  
  it("`moreTexts' doesn't process concurrent requests",
     function (done) {
       result = 0;
       
       runAfterItemsRendered(g_options,
           $.extend(true, { }, g_callbacks, {
             moreTexts: function (num) {
               var promise = Api.moreTexts(num);

               if(promise)
                 ++ result;
               
               return promise;
             }
           } ),
           function () {
             /* Delete `visibleItems' - 1. This should force only *one*
              * update. */
             for(var i = 0; i < g_options.visibleItems - 1; ++i) {
               g_options.nodes.items.find('>DIV:nth(' + i + ') .sd-text-item-close')
                 .click();
             }

             window.setTimeout(function () {
               /* Only two moreTexts requests should have been processed. */
               expect(result).toBe(2);
               done();
             }, DELAY_ITEM_DELETED);
           } );
     } );

} );
