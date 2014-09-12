describe('Interface', function () {
  setup();
  
  it('should initialise without the bins container', function (done) {
    run($.extend(true, { }, g_options, { nodes: { bins: null } }),
        g_callbacks,
        function () {
          expect(g_sortingDesk.isInitialised()).toBe(true);
        },
        done);
  } );

  it('should initialise without the delete button', function (done) {
    run($.extend(true, { }, g_options, { nodes: { binDelete: null } }),
        g_callbacks,
        function () {
          expect(g_sortingDesk.isInitialised()).toBe(true);
        },
        done);
  } );

  it('should initialise without both the bins container and the delete button',
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

  it("should fail to initialise without an `items' node", function (done) {
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
} );