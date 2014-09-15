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
    run(g_options,
        g_callbacks,
        function () {
          window.setTimeout(function () {
            expect(g_options.nodes.items.children().length)
              .toBe(g_options.visibleItems);
            done();
          }, DELAY_ITEMS);
        } );
  } );
  
  it("creates a primary sub bin when add button clicked on", function (done) {
    var caption = "Foo bar baz primary";
    
    run(g_options,
        g_callbacks,
        function () {
          g_options.nodes.bins.find('.button-add:nth(0)').click();
          
          window.setTimeout(function () {
            g_options.nodes.bins.find('.bin-primary-sub INPUT')
              .val(caption)
              .blur();

            window.setTimeout(function () {
              expect(g_options.nodes.bins.find('.bin-primary-sub').last().text())
                .toBe(caption);
              done();
            }, 10);
          }, 10);
        } );
  } );
  
  it("creates a secondary bin when add button clicked on", function (done) {
    var caption = "Foo bar baz secondary";
    
    run(g_options,
        g_callbacks,
        function () {
          g_options.nodes.bins.find('.button-add:nth(1)').click();
          
          window.setTimeout(function () {
            g_options.nodes.bins.find('.bin-secondary:last-child INPUT')
              .val(caption)
              .blur();

            window.setTimeout(function () {
              expect(g_options.nodes.bins.find('.bin-secondary').last().text())
                .toBe(caption);
              done();
            }, 10);
          }, 10);
        } );
  } );

} );