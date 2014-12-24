
/* ------------------------------------------------------------
 * Load modules and respective dependencies.                    */
require( [ "sorting-bins-example", "SortingQueue", "API" ], function (SortingBinsExample, SortingQueue) {
           
  var loading = $("#loading"),
      nitems = $("#items"),
      nbins = $("#bins"),
      windowHeight = $(window).height(),
      requests = 0;

  $(".wrapper").fadeIn();
  nitems.height(windowHeight / 3);
  nbins.height(windowHeight - 40); /* 40 = vertical padding and margin estimate */ 

  /* ------------------------------------------------------------
   * Specialise SortingBinsExample classes.
   * --
   * ControllerBinSpawner <-- ProtarchBinSpawner */
  var ProtarchBinSpawner = function (owner, fnRender, fnAdd)
  {
    SortingBinsExample.ControllerBinSpawner.call(this, owner, fnRender, fnAdd);
  };

  ProtarchBinSpawner.prototype =
    Object.create(SortingBinsExample.ControllerBinSpawner.prototype);

  ProtarchBinSpawner.prototype.initialise = function ()
  {
    var self = this;
    
    /* Install custom handler for instantiation of new bins. Specifically, a
     * bin is created when the user drops an item anywhere on the page. */
    new SortingQueue.Droppable($("body"), {
      classHover: this.owner_.owner.options.css.droppableHover,
      scopes: [ 'text-item' ],

      drop: function (e, id) {
        var item = self.owner_.owner.sortingQueue.items.getById(id);
        self.add(decodeURIComponent(id));
      }
    } );
  };

  ProtarchBinSpawner.prototype.reset = function ()
  {
    /* Invoke base class method. */
    SortingBinsExample.ControllerBinSpawner.prototype.reset.call(this);
  };

  
  /* ------------------------------------------------------------
   * Initialise API and instantiate SortingBinsExample. */
  Api.initialise(g_descriptor);
  new SortingBinsExample.Sorter( {
    nodes: {
      items: nitems,
      bins: nbins,
      buttonDismiss: $("#button-dismiss")
    },
    constructors: {
      ControllerBinSpawner: ProtarchBinSpawner
    },
    visibleItems: 15
  }, $.extend(Api, {
    onRequestStart: function () { if(!requests++) loading.stop().fadeIn(); },
    onRequestStop: function () { if(!--requests) loading.stop().fadeOut(); }
  } ) );
});

