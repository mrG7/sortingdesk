/**
 * @file Sorting Desk extension dragnet component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */

/*jshint laxbreak:true */


(function (window, chrome, $, dn, undefined) {

  chrome.runtime.sendMessage({ operation: "get-meta" }, function (meta) {
    $(function () {
      var $c = $("#dn-vis");
      $c.height($(window).height() - $c.offset().top);

      var instance = new dn.Dragnet( {
        api:        {
          name:       "sorting-desk",
          dossierUrl: meta.config.activeUrl
        }
      } );

      instance
        .on( {
          loadbegin: function () { $("#dn-loading").stop().fadeIn();  },
          loadend  : function () { $("#dn-loading").stop().fadeOut(); }
        } )
        .create().then(function () {
          console.log("READY");
        } );
    } );
  } );

} )(this,
    this.chrome,
    this.$,
    this.Dragnet);
