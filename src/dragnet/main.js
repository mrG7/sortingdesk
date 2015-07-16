/**
 * @file Sorting Desk extension dragnet component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */

/*jshint laxbreak:true */


(function (window, $, std, dn, undefined) {

  std.ipc.on("instantiate", function (url) {
    console.log("Instantiating Dragnet (@%s)", url);
    /* Force the SVG visualisation area to take up the visible portion of the
     * window. */
    var $c = $("#dn-vis");
    $c.height($(window).height() - $c.offset().top);

    /* Instantiate dragnet and instruct it to use the Sorting Desk API
     * abstraction. */
    var instance = new dn.Dragnet( {
      api: {
        backend:    "dossier-models",
        dossierUrl: url
      }
    } );

    /* Hook up to `loadbegin` and `loadend` events for the purpose of showing
     * the loading notification, and actually create the component. */
    instance
      .on( {
        loadbegin: function ()  { $("#dn-loading").stop().fadeIn();  },
        loadend:   function ()  { $("#dn-loading").stop().fadeOut(); },
        select:    function (c) { std.ipc.post("select", c);         }
      } )
      .create().then(function () { console.log("READY"); } );

    return "OK1";
  } );

} )(this,
    this.$,
    this.SortingCommon,
    this.Dragnet);
