/**
 * @file Test specification: callbacks.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 * 
 */

/*global Api, g_queue, describe, it, expect */
/*jshint laxbreak:true */


describe('Callbacks', function () {
  
  it("invokes `moreTexts' to retrieve list of items whilst initialising",
     function (done) {
       g_queue.instantiate(
         'Standard',
         function () {
           expect(g_queue.result).toBe(true);
         },
         done,
         null,
         $.extend(true, { }, g_queue.defaults.callbacks, {
           moreTexts: function (num) {
             g_queue.result = num == g_queue.instance.options.visibleItems;
             return Api.moreTexts(num);
           }
         } ));
     } );
 
  it("invokes `moreTexts' to retrieve list of items when number of items below"
     + " `visibleItems'",
     function (done) {
       g_queue.result = 0;
       
       g_queue.instantiate(
         'AfterItemsRendered', 
         function (instance) {
           instance.options.nodes.items.find('DIV:nth(0) .sd-text-item-close')
             .click();

           window.setTimeout(function () {
             expect(g_queue.result).toBe(instance.options.visibleItems * 2);
             done();
           }, g_queue.DELAY_ITEMS);
         },
         null,
         null,
         $.extend(true, { }, g_queue.defaults.callbacks, {
           moreTexts: function (num) {
             g_queue.result += num;
             return Api.moreTexts(num);
           }
         } ));
     } );
  
  it("doesn't invoke `moreTexts' to retrieve list of items when number of items"
     + " above `visibleItems'",
     function (done) {
       g_queue.result = 0;

       g_queue.instantiate(
         'AfterItemsRendered', 
         function (instance) {
           var count = 0;
           var interval = window.setInterval(function () {
             /* Ensure a valid SortingQueue instance still exists, in case a
              * failure of some sort occurs below. */
             if(g_queue.reset) {
               window.clearInterval(interval);
               return;
             }
             
             /* Delete `visibleItems' - 1. This should force only *one*
              * update. */
             instance.options.nodes.items
               .find('>DIV:nth(0) .sd-text-item-close')
               .click();

             if(++count < 4)
               return;

             window.clearInterval(interval);
             
             window.setTimeout(function () {
               /* Expect initial `visibleItems' + one forced update. */
               expect(g_queue.result)
                 .toBe(instance.options.visibleItems * 2);
               
               /* Also expect number of items in UI to be consistent. */
               expect(instance.options.nodes.items.children().length)
                 .toBe(instance.options.visibleItems + 1);

               done();
             }, g_queue.DELAY_ITEM_DELETED);
           }, 25);
         },
         null,
         null,
         $.extend(true, { }, g_queue.defaults.callbacks, {
           moreTexts: function (num) {
             return Api.moreTexts(num)
               .done(function () {
                 g_queue.result += num;
               } );
           }
         } )
       );
     } );
  
  it("`moreTexts' doesn't process concurrent requests",
     function (done) {
       g_queue.result = 0;
       
       g_queue.instantiate(
         'AfterItemsRendered',
           function (instance) {
             /* Delete `visibleItems' - 1. This should force only *one*
              * update. */
             for(var i = 0; i < instance.options.visibleItems - 1; ++i) {
               instance.options.nodes.items
                 .find('>DIV:nth(' + i + ') .sd-text-item-close')
                   .click();
             }

             window.setTimeout(function () {
               /* Only two moreTexts requests should have been processed. */
               expect(g_queue.result).toBe(2);
               done();
             }, g_queue.DELAY_ITEM_DELETED);
           },
         null,
         null,
         $.extend(true, { }, g_queue.defaults.callbacks, {
           moreTexts: function (num) {
             return Api.moreTexts(num)
               .done(function () {
                 ++ g_queue.result;
               } );
           }
         } ) );
     } );

} );
