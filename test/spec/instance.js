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
  } );
} );
