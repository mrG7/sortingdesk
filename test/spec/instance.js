/**
 * @file Test specification: instance.
 * @copyright 2014 Diffeo
 * @author Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 * 
 */

/*global SortingQueue, Api, DraggingEvent, g_sortingQueue, setup, run,
 *global runNoInstantiation, runAfterItemsRendered, reset, result
 *global DELAY_ITEMS, DELAY_ITEM_DELETED, DELAY_BUTTON_ADD, DELAY_ITEM_DRAGGED,
 *global DELAY_ITEM_DROPPED, DELAY_BIN_DRAGGED, DELAY_BIN_DROPPED
 *global g_options, g_callbacks, g_secondaryContentIds
 *global describe, it, expect */
/*jshint laxbreak:true */


describe('Instance', function () {
  setup();
  
  it('initialises itself', function (done) {
    run(g_options, g_callbacks, function () {
      expect(g_sortingQueue.initialised).toBe(true);
    }, done);
  } );

  it('initialises more than once', function (done) {
    run(g_options, g_callbacks, function () {
      var instance = g_sortingQueue;

      reset = true;
      
      run({ nodes: { items: $() } }, g_callbacks,
          function () {
            expect(g_sortingQueue.initialised).toBe(true);
          },
          function () {
            g_sortingQueue.reset();
            g_sortingQueue = instance;
            
            done();
          } );
    });
  } );

  it('resets itself correctly', function (done) {
    run(g_options, g_callbacks, function () {
      g_sortingQueue.reset()
        .done(function () {
          expect(g_sortingQueue.initialised).toBe(false);
          done();
        } );
    } );
  } );

  it("`reset' rejects promise when no instance active", function (done) {
    runNoInstantiation(function () {
      g_sortingQueue.reset()
        .fail(function () {
          expect(true).toBe(true);
          done();
        } )
        .done(function () {
          expect(false).toBe(true);
          done();
        } );
    } );
  } );
  
  describe('Public methods', function () {
    it("`remove' removes the correct text item",
       function (done) {
         runAfterItemsRendered(g_options, g_callbacks, function () {
           var id = g_options.nodes.items.children().get(1).id;
           
           expect(g_options.nodes.items.find("[id='" + id + "']").length).toBe(1);
           expect(g_sortingQueue.items.remove(
             g_sortingQueue.items.getById(decodeURIComponent(id)))).toBe(true);

           window.setTimeout(function () {
             expect(g_options.nodes.items.find("[id='" + id + "']").length).toBe(0);
             done();
           }, DELAY_ITEM_DELETED);
         } );
       } );
    
    it("`remove' doesn't remove any items when given invalid id",
       function (done) {
         runAfterItemsRendered(g_options, g_callbacks, function () {
           var id = g_options.nodes.items.children().get(1).id + "_";
           
           expect(g_options.nodes.items.find("[id='" + id + "']").length).toBe(0);
           expect(function () {
             g_sortingQueue.items.remove(
               g_sortingQueue.items.getById(decodeURIComponent(id)));
           } ).toThrow("Invalid item index");

           window.setTimeout(function () {
             expect(g_options.nodes.items.find("[id='" + id +
                                               "']").length).toBe(0);
             expect(g_options.nodes.items.children().length)
               .toBe(g_options.visibleItems);
             done();
           }, DELAY_ITEM_DELETED);
         } );
       } );
    
    it("`getById' returns correct text item",
       function (done) {
         runAfterItemsRendered(g_options, g_callbacks, function () {
           expect(g_sortingQueue.items.getById(decodeURIComponent(
             g_options.nodes.items.children().get(1).id))).not.toBe(null);
           done();
         } );
       } );
    
    it("`getById' fails to return a text item from invalid id",
       function (done) {
         runAfterItemsRendered(g_options, g_callbacks, function () {
           expect(g_sortingQueue.items.getById(decodeURIComponent(
             g_options.nodes.items.children().get(1).id + '_')))
             .toBe(null);
           done();
         } );
       } );

  } );
} );
