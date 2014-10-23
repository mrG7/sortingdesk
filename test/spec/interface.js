/**
 * @file Test specification: interface.
 * @copyright 2014 Diffeo
 * @author Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 * 
 */

/*global SortingDesk, Api, DraggingEvent, g_sortingDesk, setup, run,
 *global runNoInstantiation, runAfterItemsRendered, reset, result
 *global DELAY_ITEMS, DELAY_ITEM_DELETED, DELAY_BUTTON_ADD, DELAY_ITEM_DRAGGED,
 *global DELAY_ITEM_DROPPED, DELAY_BIN_DRAGGED, DELAY_BIN_DROPPED
 *global g_options, g_callbacks, g_secondaryContentIds
 *global describe, it, expect */
/*jshint laxbreak:true */


describe('Interface', function () {
  setup();

  it('initialises without the bins container', function (done) {
    run($.extend(true, { }, g_options, { nodes: { bins: null } }),
        g_callbacks,
        function () {
          expect(g_sortingDesk.initialised).toBe(true);
        },
        done);
  } );

  it('initialises without the dismissal button', function (done) {
    run($.extend(true, { }, g_options, { nodes: { buttonDismiss: null } }),
        g_callbacks,
        function () {
          expect(g_sortingDesk.initialised).toBe(true);
        },
        done);
  } );

  it('initialises without both the bins container and the dismissal button',
     function (done) {
       run($.extend(true, { }, g_options, {
         nodes: {
           bins: null,
           buttonDismiss: null
         } } ),
           g_callbacks,
           function () {
             expect(g_sortingDesk.initialised).toBe(true);
           },
           done);
     } );

  it("fails to initialise without an `items' node", function (done) {
    runNoInstantiation(
      function () {
        expect(function () {
          new SortingDesk.Instance($.extend(true, { }, g_options,
                                            { nodes: { items: null } }),
                                   g_callbacks);
        } ).toThrow("Missing `items' nodes option");
      },
      done);
  } );

  it('initialises with expected number of text items', function (done) {
    runAfterItemsRendered(g_options, g_callbacks, function () {
      expect(g_options.nodes.items.children().length)
        .toBe(g_options.visibleItems);
      done();
    } );
  } );

  it('initialises with expected number of top level bins', function (done) {
    run(g_options, g_callbacks, function () {
      expect(g_options.bins instanceof Array).toBe(true);

      if(g_options.bins instanceof Array) {
        expect(g_options.nodes.bins.children('.sd-bin').length)
          .toBe(g_options.bins.length);
      }
      
      done();
    } );
  } );
  
  it("creates a top level bin when add button clicked on", function (done) {
    var caption = "Foo bar baz primary";
    
    run(g_options,
        g_callbacks,
        function () {
          g_options.nodes.bins.find('.sd-button-add:nth(0)').click();
          
          window.setTimeout(function () {
            g_options.nodes.bins.find('.sd-bin INPUT')
              .val(caption)
              .blur();

            window.setTimeout(function () {
              expect(g_options.nodes.bins.find('.sd-bin').last().text())
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
             g_options.nodes.items.find('>DIV:nth(0) .sd-text-item-close')
               .click();

             window.setTimeout(function () {
               expect(g_options.nodes.items.children().length)
                 .toBe(g_options.visibleItems * 2 - 1);
               done();
             }, DELAY_ITEMS);
           } );
     } );

  it('bin text item dismiss button is displayed when text item is dragged',
     function (done) {
       runAfterItemsRendered(g_options,
           g_callbacks,
           function () {
             var node = g_options.nodes.items.find('DIV:nth(0)');

             new DraggingEvent(node).trigger();
             
             window.setTimeout(function () {
               expect(g_options.nodes.buttonDismiss.css('display'))
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
               dragging.drop(g_options.nodes.buttonDismiss);

               window.setTimeout(function () {
                 expect(g_options.nodes.items.children().length)
                   .toBe(g_options.visibleItems * 2 - 1);
                 
                 done();
               }, DELAY_ITEM_DROPPED);
             }, DELAY_ITEM_DRAGGED);
           } );
     } );

  it('top level bin is deleted when dropped on to dismissal button',
     function (done) {
       runAfterItemsRendered(
         g_options,
         g_callbacks,
         function () {
           var children = g_options.nodes.bins.children('.sd-bin');
           
           /* Expect there to be at lease one top level bin. */
           expect(children.length).not.toBe(0);

           var count = children.length,
               dragging = new DraggingEvent(children.first());

           dragging.trigger();

           window.setTimeout(function () {
             dragging.drop(g_options.nodes.buttonDismiss);

             window.setTimeout(function () {
               expect(g_options.nodes.bins.children('.sd-bin').length)
                 .toBe(count - 1);
               
               done();
             }, DELAY_BIN_DROPPED);
           }, DELAY_BIN_DRAGGED);
         } );
     } );

  it("top level bin is not deleted when dropped on to element other than "
     + " dismissal button",
     function (done) {
       runAfterItemsRendered(
         g_options,
         g_callbacks,
         function () {
           var children = g_options.nodes.bins.children('.sd-bin');
           
           /* Expect there to be at lease one top level bin. */
           expect(children.length).not.toBe(0);

           var count = children.length,
               dragging = new DraggingEvent(children.first());

           dragging.trigger();

           window.setTimeout(function () {
             dragging.drop($('body'));

             window.setTimeout(function () {
               expect(g_options.nodes.bins.children('.sd-bin').length).toBe(count);
               
               done();
             }, DELAY_BIN_DROPPED);
           }, DELAY_BIN_DRAGGED);
         } );
     } );

  it('sub bin is deleted when dropped on to delete button',
     function (done) {
       runAfterItemsRendered(
         g_options,
         g_callbacks,
         function () {
           var parent = g_options.nodes.bins.children().first()
                 .find('.sd-children'),
               children = parent.children();
           
           /* Expect there to be at lease one sub-bin in the first top-level bin. */
           expect(children.length).not.toBe(0);

           var count = children.length,
               dragging = new DraggingEvent(children.first());

           dragging.trigger();

           window.setTimeout(function () {
             dragging.drop(g_options.nodes.buttonDismiss);

             window.setTimeout(function () {
               expect(parent.children().length).toBe(count - 1);
               
               done();
             }, DELAY_BIN_DROPPED);
           }, DELAY_BIN_DRAGGED);
         } );
     } );

  it("sub bin is not deleted when dropped on to element other than "
     + "dismissal button",
     function (done) {
       runAfterItemsRendered(
         g_options,
         g_callbacks,
         function () {
           var parent = g_options.nodes.bins.children().first()
                 .find('.sd-children'),
               children = parent.children();
           
           /* Expect there to be at lease one sub-bin in the first top-level bin. */
           expect(children.length).not.toBe(0);

           var count = children.length,
               dragging = new DraggingEvent($('body'));

           dragging.trigger();

           window.setTimeout(function () {
             dragging.drop(g_options.nodes.buttonDismiss);

             window.setTimeout(function () {
               expect(parent.children().length).toBe(count);
               
               done();
             }, DELAY_BIN_DROPPED);
           }, DELAY_BIN_DRAGGED);
         } );
     } );

} );