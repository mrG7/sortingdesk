/**
 * @file Module responsible for the extension's UI configuration.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */


/*global chrome, $, Config */


var Options = (function (window, $, std, undefined) {
  var initialise_ = function () {
    load_(function () {
      /* Save state when the `save´ button is clicked on. */
      $('#save').click(function () {
        Config.save( {
          dossierUrl: $('#dossier-url').val(),
          active: $('#active').is(':checked'),
          startPosition: $('#start-position').val()
        } );

        /* Force reload of options as some may have acquired default state. */
        load_();
      } );
    } );

    $(".dropdown-menu").on('click', 'li a', function() {
      var $this = $(this),
          $parent = $this.parent();

      if(!$parent.hasClass('disabled'))
        setDropdownValue_($this.parents('ul').prev(), $parent);
    } );

    console.info("Initialised options page");
  };

  var setDropdownValue_ = function (el, val, def) {
    var elv;

    if(std.$.is(val)) {
      elv = val;
      val = elv.data('value');
    } else {
      if(!std.is_num(val)) val = def;
      if(!std.is_num(val)) return;

      elv = el.next().find('li[data-value=' + val + ']');
    }

    if(elv.length === 0) {
      if(def !== undefined)
        setDropdownValue_(el, def);
    } else {
      el.val(val);
      var ch = el.children().clone();
      el.text(elv.text()).append(ch);
    }
  };

  var load_ = function (callback) {
    Config.load(function (state) {
      $('#dossier-url').val(state.dossierUrl);
      $('#active').prop('checked', state.active);
      setDropdownValue_($('#start-position'), state.startPosition, 0);

      if(std.is_fn(callback))
        callback();
    } );
  };


  /* Initialize options page controller. */
  $(function () {
    initialise_();
  } );
})(window, $, SortingCommon);