describe('Interface', function () {
  afterEach(function () {
    g_sortingDesk.reset();
  } );
  
  it('should initialise without the bins container', function (done) {
    g_sortingDesk = SortingDesk.instantiate(
      $.extend(true, { }, g_options, { nodes: { bins: null } }),
      g_callbacks);
    
    setTimeout(function () {
      expect(g_sortingDesk.isInitialised()).toBe(true);
      done();
    }, DELAY);
  } );

  it('should initialise without the delete button', function (done) {
    g_sortingDesk = SortingDesk.instantiate(
      $.extend(true, { }, g_options, { nodes: { binDelete: null } }),
      g_callbacks);
    
    setTimeout(function () {
      expect(g_sortingDesk.isInitialised()).toBe(true);
      done();
    }, DELAY);
  } );

  it('should initialise without both the bins container and the delete button',
     function (done) {
       g_sortingDesk = SortingDesk.instantiate(
         $.extend(true, { }, g_options, { nodes: {
           bins: null,
           binDelete: null
         } } ),
         g_callbacks);
       
       setTimeout(function () {
         expect(g_sortingDesk.isInitialised()).toBe(true);
         done();
       }, DELAY);
     } );
} );