describe('Interface', function () {
  setup();

  it('initialises without the bins container', function (done) {
    run($.extend(true, { }, g_options, { nodes: { bins: null } }),
        g_callbacks,
        function () {
          expect(g_sortingDesk.isInitialised()).toBe(true);
        },
        done);
  } );

  it('initialises without the delete button', function (done) {
    run($.extend(true, { }, g_options, { nodes: { binDelete: null } }),
        g_callbacks,
        function () {
          expect(g_sortingDesk.isInitialised()).toBe(true);
        },
        done);
  } );

  it('initialises without both the bins container and the delete button',
     function (done) {
       run($.extend(true, { }, g_options, {
         nodes: {
           bins: null,
           binDelete: null
         } } ),
           g_callbacks,
           function () {
             expect(g_sortingDesk.isInitialised()).toBe(true);
           },
           done);
     } );

  it("fails to initialise without an `items' node", function (done) {
    runNoInstantiation(
      function () {
        expect(function () {
          SortingDesk.instantiate($.extend(true, { }, g_options,
                                           { nodes: { items: null } }),
                                  g_callbacks);
        } ).toThrow("Missing `items' nodes option");
      },
      done);
  } );

  it('initialises with expected number of items', function (done) {
    var items = $('<div />');
    
    run($.extend(true, { }, g_options, { nodes: { items: items } }),
        g_callbacks,
        function () {
          window.setTimeout(function () {
            items.children().each(function () { console.log(this.tagName); } );
            expect(items.children().length).toBe(g_options.visibleItems);
            done();
          }, DELAY_ITEMS);
        } );
  } );
  
  
} );