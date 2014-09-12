describe('Instance', function () {
  setup();
  
  it('should initialise itself', function (done) {
    run(g_options, g_callbacks, function () {
      expect(g_sortingDesk.isInitialised()).toBe(true);
    }, done);
  } );

  it('should initialise only once', function (done) {
    run(g_options, g_callbacks, function () {
      expect(function () {
        SortingDesk.instantiate( g_options, g_callbacks);
      } ).toThrow("Sorting Desk has already been instantiated");
    }, done);
  } );

  it('should reset itself correctly', function (done) {
    run(g_options, g_callbacks, function () {
      g_sortingDesk.reset()
        .done(function () {
          expect(g_sortingDesk.isInitialised()).toBe(false);
          done();
        } );
    } );
  } );
  
  describe('Public methods', function () {
    /* Even though we clearly wouldn't need to use `setTimeout', we need to wrap
     * tests in this section inside setTimeout because we're making use of it in
     * the preceding tests; tests are executed out of order otherwise. */
    it("shouldn't attempt to process `remove' when not initialised",
       function (done) {
         runNoInstantiation(function () {
           expect(function () { g_sortingDesk.remove(1); })
             .toThrow("Sorting Desk not initialised");
         }, done);
       } );

    it("shouldn't attempt to process `getById' when not initialised",
       function (done) {
         runNoInstantiation(function () {
           expect(function () { g_sortingDesk.getById(1); })
             .toThrow("Sorting Desk not initialised");
         }, done);
       } );
  } );
} );
