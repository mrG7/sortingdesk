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
    Config.load(function (state) {
      $('#active').prop('checked', state.active);
      
      $('#save').click(function () {
        Config.save( {
          active: $('#active').is(':checked')
        } );
      } );

      console.log("Initialised options page");
    } );
  };

  initialise_();
})(window, $);