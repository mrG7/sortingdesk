/**
 * @file Module responsible for the extension's UI configuration.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */


/*global chrome, $, Config */


var Options = (function (window, $, std, undefined) {

  var urls_;

  var initialise_ = function ()
  {
    load_(function () {
      /* Save state when the `save´ button is clicked on. */
      $('#save').click(function () {
        Config.save( {
          dossierUrls: $('#dossier-urls').val(),
          activeUrl: $('#active-url').val(),
          active: $('#active').is(':checked'),
          startPosition: $('#start-position').val()
        } );

        /* Force reload of options as some may have acquired default state. */
        load_();
      } );
    } );

    $('#dossier-urls').on('blur', function () {
      urls_ = Config.stringToUrls(this.value);

      var str = Config.urlsToString(urls_);
      if(str !== this.value)
        this.value = str;
    } );

    $(".dropdown-menu").on('click', 'li a', function() {
      var $this = $(this),
          $parent = $this.parent();

      if(!$parent.hasClass('disabled'))
        setDropdownValue_($this.parents('ul').prev().prev(), $parent);
    } );

    console.info("Initialised options page");
  };

  var setDropdownValue_ = function (el, val, def)
  {
    var elv;

    if(std.$.is(val)) {
      elv = val;
      val = elv.data('value');
    } else
      elv = getDropdownCollection(el).find('li[data-value="' + val + '"]');

    if(elv.length === 0) {
      if(def !== undefined)
        setDropdownValue_(el, def);
    } else {
      el.val(val);
      var ch = el.children().clone();
      el.text(elv.text()).append(ch);
    }
  };

  var addDropdownItem_ = function (el, val, html)
  {
    getDropdownCollection(el)
      .append($('<li />').attr('data-value', val)
              .append($('<a/>').attr('href', '#').html(html)));
  };

  var getDropdownCollection = function (el)
  {
    el = el.next();
    if(el.get(0).nodeName.toLowerCase() === 'ul')
      return el;
    return el.next();
  };

  var load_ = function (callback)
  {
    Config.load(function (state) {
      var elc = $("#dossier-urls"),
          ela = $('#active-url');

      urls_ = Config.stringToUrls(state.dossierUrls);
      getDropdownCollection(ela).children().remove();

      for(var k in urls_)
        addDropdownItem_(ela, k, k.bold() + ': ' + urls_[k]);

      elc.val(state.dossierUrls);
      $('#active').prop('checked', state.active);
      setDropdownValue_($('#start-position'), state.startPosition, 0);
      setDropdownValue_(ela, state.activeUrl);

      if(std.is_fn(callback))
        callback();
    } );
  };


  /* Initialize options page controller. */
  $(function () {
    initialise_();
  } );
})(window, $, SortingCommon);