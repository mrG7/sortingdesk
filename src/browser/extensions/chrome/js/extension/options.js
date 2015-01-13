/**
 * @file Module responsible for the extension's UI configuration.
 * @copyright 2014 Diffeo
 *
 * Comments:
 *
 */


/*global chrome, $, Config */


var Options = (function (window, $) {
  var initialise_ = function () {
    load_()
      .done(function () {
        /* Save state when the `save´ button is clicked on. */
        $('#save').click(function () {
          Config.save( {
            dossierUrl: $('#dossier-url').val(),
            active: $('#active').is(':checked'),
            activateHttps: $('#activate-https').is(':checked')
          } );

          /* Force reload of options as some may have acquired default state. */
          load_();
        } );
      } );
    
    console.log("Initialised options page");
  };

  var load_ = function () {
    var deferred = $.Deferred(); /* always resolves */
    
    Config.load(function (state) {
      $('#dossier-url').val(state.dossierUrl);
      $('#active').prop('checked', state.active);
      $('#activate-https').prop('checked', state.activateHttps);

      deferred.resolve();
    } );

    return deferred.promise();
  };


  /* Initialize options page controller. */
  $(function () {
    initialise_();
  } );
})(window, $);