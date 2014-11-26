
/* ------------------------------------------------------------
 * Load modules and respective dependencies.                    */
require(["SortingDesk", "SortingQueue", "API-SortingDesk"],
        function (SortingDesk, SortingQueue, Api) {

  var loading = $("#loading"),
      nitems = $("#items"),
      nbins = $("#bins"),
      windowHeight = $(window).height(),
      requests = 0;

  $(".wrapper").fadeIn();
  nitems.height(windowHeight / 3);
  nbins.height(windowHeight - 40); /* 40 = vertical padding and margin estimate */

  /* ------------------------------------------------------------
   * Specialise SortingDesk classes.
   * --
   * ControllerBinSpawner <-- ProtarchBinSpawner */
  var ProtarchBinSpawner = function (owner, fnRender, fnAdd)
  {
    SortingDesk.ControllerBinSpawner.call(this, owner, fnRender, fnAdd);
  };

  ProtarchBinSpawner.prototype =
    Object.create(SortingDesk.ControllerBinSpawner.prototype);

  ProtarchBinSpawner.prototype.initialise = function ()
  {
    var self = this;

    /* Install custom handler for instantiation of new bins. Specifically, a
     * bin is created when the user drops an item anywhere on the page. */
    new SortingQueue.Droppable($("body"), {
      classHover: this.owner_.owner.options.css.droppableHover,
      scopes: [ 'text-item' ],

      drop: function (e, id) {
        id = decodeURIComponent(id);
        
        self.add(id);
        
        var items = self.owner_.owner.sortingQueue.items;
        items.remove(items.getById(id));
      }
    } );
  };

  ProtarchBinSpawner.prototype.reset = function ()
  {
    /* Invoke base class method. */
    SortingDesk.ControllerBinSpawner.prototype.reset.call(this);
  };


  /* ------------------------------------------------------------
   * Initialise API and instantiate SortingDesk. */
  new SortingDesk.Instance( {
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

