/**
 * @file Test specification: interface.
 * @copyright 2014 Diffeo
 * @author Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 * 
 */


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
    runAfterItemsRendered(g_options, g_callbacks, function () {
      expect(g_options.nodes.items.children().length)
        .toBe(g_options.visibleItems);
      done();
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
            }, DELAY_BUTTON_ADD);
          }, DELAY_BUTTON_ADD);
        } );
  } );
  
  it("creates a secondary bin when add button clicked on", function (done) {
    var caption = "Foo bar baz secondary";
    
    run(g_options,
        g_callbacks,
        function () {
          g_options.nodes.bins.find('.button-add:nth(1)').click();
          
          window.setTimeout(function () {
            g_options.nodes.bins.find('.bin-secondary INPUT')
              .val(caption)
              .blur();

            window.setTimeout(function () {
              expect(g_options.nodes.bins.find('.bin-secondary').last().text())
                .toBe(caption);
              done();
            }, DELAY_BUTTON_ADD);
          }, DELAY_BUTTON_ADD);
        } );
  } );

  it('correctly deletes a text item when its close button is clicked on',
     function (done) {
       runAfterItemsRendered(g_options,
           g_callbacks,
           function () {
             g_options.nodes.items.find('>DIV:nth(0) .text-item-close')
               .click();

             window.setTimeout(function () {
               expect(g_options.nodes.items.children().length)
                 .toBe(g_options.visibleItems * 2 - 1);
               done();
             }, DELAY_ITEM_DELETED);
           } );
     } );

  it('bin delete/text item dismiss button is displayed when text item is'
     + ' dragged',
     function (done) {
       runAfterItemsRendered(g_options,
           g_callbacks,
           function () {
             var node = g_options.nodes.items.find('DIV:nth(0)');

             new DraggingEvent(node).trigger();
             
             window.setTimeout(function () {
               expect(g_options.nodes.binDelete.css('display'))
                 .toBe('block');
               done();
             }, DELAY_ITEM_DRAGGED);
           } );
     } );

  it('text item is dismissed when dropped on to dismissal button',
     function (done) {
       runAfterItemsRendered(g_options,
           g_callbacks,
           function () {
             var dragging = new DraggingEvent(
               g_options.nodes.items.find('DIV:nth(0)'));

             dragging.trigger();

             window.setTimeout(function () {
               dragging.drop(g_options.nodes.binDelete);

               window.setTimeout(function () {
                 expect(g_options.nodes.items.children().length)
                   .toBe(g_options.visibleItems * 2 - 1);
                 
                 done();
               }, DELAY_ITEM_DROPPED);
             }, DELAY_ITEM_DRAGGED);
           } );
     } );

  it('primary sub bin is deleted when dropped on to delete button',
     function (done) {
       var caption = "Foo bar baz primary";
    
       runAfterItemsRendered(
         g_options,
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

               var dragging = new DraggingEvent(
                 g_options.nodes.bins.find('.bin-primary-sub').last());

               dragging.trigger();

               window.setTimeout(function () {
                 dragging.drop(g_options.nodes.binDelete);

                 window.setTimeout(function () {
                   expect(g_options.nodes.bins.find('.bin-primary-sub').length)
                     .toBe(0);
                   
                   done();
                 }, DELAY_BIN_DROPPED);
               }, DELAY_BIN_DRAGGED);
             }, DELAY_BUTTON_ADD);
           }, DELAY_BUTTON_ADD);
           
         } );
     } );

  it('secondary bin is deleted when dropped on to delete button',
     function (done) {
       runAfterItemsRendered(g_options,
           g_callbacks,
           function () {
             var node = g_options.nodes.bins.find('.bin-secondary').last(),
                 dragging = new DraggingEvent(node);

             dragging.trigger();

             window.setTimeout(function () {
               dragging.drop(g_options.nodes.binDelete);

               window.setTimeout(function () {
                 expect(g_options.nodes.bins.find('.bin-secondary').length)
                   .toBe(g_secondaryContentIds.length - 1);
                 
                 done();
               }, DELAY_BIN_DROPPED);
             }, DELAY_BIN_DRAGGED);
           } );
     } );

} );