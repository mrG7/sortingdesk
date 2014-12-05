 /**
 * @file Test specification: instance.
 * @copyright 2014 Diffeo
 * @author Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 * 
 */

/*global Api, g_queue, describe, it, expect */
/*jshint laxbreak:true */


describe('Instance', function () {
  
  it('initialises itself', function (done) {
    g_queue.instantiate('Standard', function () {
      expect(g_queue.instance.initialised).toBe(true);
    }, done);
  } );

  it('initialises more than once', function (done) {
    g_queue.instantiate('Standard', function () {
      var instance = g_queue.instance;
      g_queue.reset = true;
      
      g_queue.instantiate(
        'Standard',
        function () {
          expect(g_queue.instance.initialised).toBe(true);
        },
        function () {
          g_queue.instance.reset();
          g_queue.reset = true;
          g_queue.instance = instance;
          
          done();
        },
        { nodes: { items: $() } });
    });
  } );

  it('resets itself correctly', function (done) {
    g_queue.instantiate('Standard', function () {
      g_queue.instance.reset()
        .done(function () {
          expect(g_queue.instance.initialised).toBe(false);
          done();
        } );
    } );
  } );

  it("`reset' rejects promise when no instance active", function (done) {
    g_queue.instantiate('NoInstantiation', function () {
      g_queue.instance.reset()
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
    it("`remove' removes the correct text item",
       function (done) {
         g_queue.instantiate('AfterItemsRendered', function (instance) {
           var id = instance.options.nodes.items.children().get(1).id,
               options = instance.options;
           
           expect(options.nodes.items.find("[id='" + id + "']").length).toBe(1);
           expect(instance.items.remove(
             instance.items.getById(decodeURIComponent(id)))).toBe(true);

           window.setTimeout(function () {
             expect(options.nodes.items.find("[id='" + id + "']").length).toBe(0);
             done();
           }, g_queue.DELAY_ITEM_DELETED);
         } );
       } );
    
    it("`remove' doesn't remove any items when given invalid id",
       function (done) {
         g_queue.instantiate('AfterItemsRendered', function (instance) {
           var items = instance.items,
               options = instance.options,
               id = options.nodes.items.children().get(1).id + "_";
           
           expect(options.nodes.items.find("[id='" + id + "']").length).toBe(0);
           expect(function () {
             items.remove(items.getById(decodeURIComponent(id)));
           } ).toThrow("Invalid item index: -1");

           window.setTimeout(function () {
             expect(options.nodes.items.find("[id='" + id +
                                               "']").length).toBe(0);
             expect(options.nodes.items.children().length)
               .toBe(options.visibleItems);
             done();
           }, g_queue.DELAY_ITEM_DELETED);
         } );
       } );
    
    it("`getById' returns correct text item",
       function (done) {
         g_queue.instantiate('AfterItemsRendered', function (instance) {
           expect(instance.items.getById(decodeURIComponent(
             instance.options.nodes.items.children().get(1).id)))
               .not.toBe(null);
           done();
         } );
       } );
    
    it("`getById' fails to return a text item from invalid id",
       function (done) {
         g_queue.instantiate('AfterItemsRendered',function (instance) {
           expect(instance.items.getById(decodeURIComponent(
             instance.options.nodes.items.children().get(1).id + '_')))
               .toBe(null);
           done();
         } );
       } );
  } );
} );
