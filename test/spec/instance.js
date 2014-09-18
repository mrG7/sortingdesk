/**
 * @file Test specification: instance.
 * @copyright 2014 Diffeo
 * @author Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 * 
 */


describe('Instance', function () {
  setup();
  
  it('initialises itself', function (done) {
    run(g_options, g_callbacks, function () {
      expect(g_sortingDesk.isInitialised()).toBe(true);
    }, done);
  } );

  it('initialises only once', function (done) {
    run(g_options, g_callbacks, function () {
      expect(function () {
        SortingDesk.instantiate( g_options, g_callbacks);
      } ).toThrow("Sorting Desk has already been instantiated");
    }, done);
  } );

  it('resets itself correctly', function (done) {
    run(g_options, g_callbacks, function () {
      g_sortingDesk.reset()
        .done(function () {
          expect(g_sortingDesk.isInitialised()).toBe(false);
          done();
        } );
    } );
  } );

  it("`reset' rejects promise when no instance active", function (done) {
    runNoInstantiation(function () {
      g_sortingDesk.reset()
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
    it("doesn't process `remove' when not initialised",
       function (done) {
         runNoInstantiation(function () {
           expect(function () { g_sortingDesk.remove(1); })
             .toThrow("Sorting Desk not initialised");
         }, done);
       } );

    it("doesn't process `getById' when not initialised",
       function (done) {
         runNoInstantiation(function () {
           expect(function () { g_sortingDesk.getById(1); })
             .toThrow("Sorting Desk not initialised");
         }, done);
       } );
    
    it("`remove' removes the correct text item",
       function (done) {
         runAfterItemsRendered(g_options, g_callbacks, function () {
           var id = g_options.nodes.items.children().get(1).id;
           
           expect(g_options.nodes.items.find("[id='" + id + "']").length).toBe(1);
           expect(g_sortingDesk.remove(id)).toBe(true);

           window.setTimeout(function () {
             expect(g_options.nodes.items.find("[id='" + id + "']").length).toBe(0);
             done();
           }, DELAY_ITEM_DELETED);
         } );
       } );

  } );
} );
