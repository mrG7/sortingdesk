describe('Instance', function () {
  afterEach(function () {
    g_sortingDesk.reset();
    g_sortingDesk = null;
  } );

  it('should initialise itself', function (done) {
    g_sortingDesk = SortingDesk.instantiate(g_options, g_callbacks);
    
    setTimeout(function () {
      expect(function () {
        SortingDesk.instantiate( g_options, g_callbacks);
      } ).toThrow("Sorting Desk has already been instantiated");
      done();
    }, DELAY);
  } );

  it('should initialise only once', function (done) {
    g_sortingDesk = SortingDesk.instantiate(g_options, g_callbacks);
    
    setTimeout(function () {
      expect(function () {
        SortingDesk.instantiate( g_options, g_callbacks);
      } ).toThrow("Sorting Desk has already been instantiated");
      done();
    }, DELAY);
  } );

  it('should reset itself correctly', function (done) {
    g_sortingDesk = SortingDesk.instantiate(g_options, g_callbacks);
    
    setTimeout(function () {
      g_sortingDesk.reset();
      SortingDesk.instantiate(g_options, g_callbacks);

      setTimeout(function () {
        expect(g_sortingDesk.isInitialised()).toBe(true);
        done();
      }, DELAY);
    }, DELAY);
  } );
} );