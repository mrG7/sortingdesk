/**
 * @file Test specification: interface.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 * 
 */

/*global Api, g_tests, g_queue, describe, it, expect, $ */
/*jshint laxbreak:true */


describe('Interface', function () {

  it('initialises without the bins container', function (done) {
    g_queue.instantiate(
      'Standard',
      function (instance) {
        expect(instance.initialised).toBe(true);
      },
      done,
      $.extend(true, { }, g_queue.defaults.options,
               { nodes: { bins: null } }) );
  } );

  it('initialises without the dismissal button', function (done) {
    g_queue.instantiate(
      'Standard',
      function (instance) {
        expect(instance.initialised).toBe(true);
      },
      done,
      $.extend(true, { }, g_queue.defaults.options,
               { nodes: { buttonDismiss: null } } ) );
  } );

  it('initialises without both the bins container and the dismissal button',
     function (done) {
       g_queue.instantiate(
         'Standard',
         function (instance) {
           expect(instance.initialised).toBe(true);
         },
         done,
         $.extend(true, { }, g_queue.defaults.options, {
           nodes: {
             bins: null,
             buttonDismiss: null
           } } ) );
     } );

  it("fails to initialise without an `items' node", function (done) {
    g_queue.instantiate(
      'NoInstantiation',
      function (instance) {
        expect(function () {
          new g_queue.SortingQueue.Sorter(
            $.extend(true, { }, g_queue.defaults.options,
                     { nodes: { items: null } }),
            g_queue.defaults.callbacks);
        } ).toThrow("Missing `items' nodes option");
      },
      done);
  } );

  it('initialises with expected number of items', function (done) {
    g_queue.instantiate(
      'AfterItemsRendered',
      function (instance) {
        expect(instance.options.nodes.items.children().length)
          .toBe(instance.options.visibleItems);
      }, done);
  } );

  it('deletes an item when its close button is clicked on',
     function (done) {
       g_queue.instantiate(
         'AfterItemsRendered',
         function (instance) {
           instance.options.nodes.items.find('>DIV:nth(0) .sd-text-item-close')
             .click();

           window.setTimeout(function () {
             expect(instance.options.nodes.items.children().length)
               .toBe(instance.options.visibleItems * 2 - 1);
             done();
           }, g_queue.DELAY_ITEMS);
         } );
     } );

  it('dismissal button is displayed when item is dragged',
     function (done) {
       g_queue.instantiate(
         'AfterItemsRendered',
         function (instance) {
           var node = instance.options.nodes.items.find('DIV:nth(0)');

           new g_tests.DraggingEvent(node).trigger();
           
           window.setTimeout(function () {
             expect(instance.options.nodes.buttonDismiss.css('display'))
               .toBe('block');
             done();
           }, g_queue.DELAY_ITEM_DRAGGED);
         } );
     } );

  it('item is dismissed when dropped on to dismissal button',
     function (done) {
       g_queue.instantiate(
         'AfterItemsRendered',
         function (instance) {
           var dragging = new g_tests.DraggingEvent(
             instance.options.nodes.items.find('DIV:nth(0)'));

           dragging.trigger();

           window.setTimeout(function () {
             dragging.drop(instance.options.nodes.buttonDismiss);

             window.setTimeout(function () {
               expect(instance.options.nodes.items.children().length)
                 .toBe(instance.options.visibleItems * 2 - 1);
               
               done();
             }, g_queue.DELAY_ITEM_DROPPED);
           }, g_queue.DELAY_ITEM_DRAGGED);
         } );
     } );

  it('an item is selected by default upon instantiation',
     function (done) {
       g_queue.instantiate(
         'AfterItemsRendered',
         function (instance) {
           var selected = instance.options.nodes.items.find('.sd-selected');
           
           expect(selected.length).toBe(1);
           
           expect(instance.items.selected()).not.toBe(null);
           expect(instance.items.selected().node.length).toBe(1);
           expect(instance.items.selected().node.get(0))
             .toBe(selected.get(0));
         },
         done);
     } );

  it('the item selected by default upon instantiation is top-most',
     function (done) {
       g_queue.instantiate(
         'AfterItemsRendered',
         function (instance) {
           var selected = instance.options.nodes.items.find('.sd-selected');
           
           expect(selected.length).toBe(1);

           if(selected.length === 1)
             expect(selected.get(0).previousSibling).toBe(null);

           expect(instance.items.selected()).not.toBe(null);
           expect(instance.items.selected().node.length).toBe(1);
           expect(instance.items.selected().node.get(0))
             .toBe(selected.get(0));
         },
         done);
     } );

  describe("Keyboard", function () {
    it('DOWN: selects the next item',
       function (done) {
         g_queue.instantiate(
           'AfterItemsRendered',
           function (instance) {
             var selected;

             $('body').trigger($.Event('keyup', { keyCode: 40 } ));

             selected = instance.options.nodes.items.find('.sd-selected');
             expect(selected.length).toBe(1);

             if(selected.length === 1) {
               expect(selected.get(0).previousSibling).not.toBe(null);
               expect(selected.get(0).previousSibling.previousSibling)
                 .toBe(null);
             }
           },
           done);
       } );

    it('UP: selects the previous item',
       function (done) {
         g_queue.instantiate(
           'AfterItemsRendered',
           function (instance) {
             var selected;

             $('body').trigger($.Event('keyup', { keyCode: 40 } ));

             selected = instance.options.nodes.items.find('.sd-selected');
             expect(selected.length).toBe(1);

             if(selected.length === 1) {
               expect(selected.get(0).previousSibling).not.toBe(null);

               if(selected.get(0).previousSibling) {
                 $('body').trigger($.Event('keyup', { keyCode: 38 } ));

                 selected = instance.options.nodes.items.find('.sd-selected');
                 expect(selected.length).toBe(1);

                 if(selected.length === 1)
                   expect(selected.get(0).previousSibling).toBe(null);
               }
             }
           },
           done);
       } );

    it('DEL: deletes currently selected item',
       function (done) {
         g_queue.instantiate(
           'AfterItemsRendered',
           function (instance) {
             var items = instance.options.nodes.items,
                 selected = items.find('.sd-selected');

             expect(selected.length === 1);
             if(selected.length !== 1) {
               done(); return;
             }

             expect(instance.items.selected()).not.toBe(null);
             expect(instance.items.selected().node.length).toBe(1);
             if(!instance.items.selected()
                || instance.items.selected().node.length !== 1) {
               done(); return;
             }

             expect(instance.items.selected().node.get(0))
               .toBe(selected.get(0));
             if(instance.items.selected().node.get(0) !== selected.get(0)) {
               done(); return;
             }

             $('body').trigger($.Event('keyup', { keyCode: 46 } ));

             expect(instance.items.selected().node.get(0))
               .not.toBe(items.find('sd-selected').get(0));

             window.setTimeout(function () {
               expect(instance.options.nodes.items.children().length)
                 .toBe(instance.options.visibleItems * 2 - 1);
               done();
             }, g_queue.DELAY_ITEMS);
           } );
       } );
  } );
} );