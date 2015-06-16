/**
 * @file Module responsible for the extension's UI configuration.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */


/*global chrome, $, Config */


var Options = (function (window, $, std, undefined) {

  var urls_,
      defaultActiveUrl_;

  var initialise_ = function ()
  {
    defaultActiveUrl_ = $('#active-url').text();

    load_(function () {
      /* Save state when the `save´ button is clicked on. */
      $('#save').click(function () {
        Config.save( {
          dossierUrls: $('#dossier-urls').val(),
          activeUrl: $('#active-url').val(),
          translation: {
            api: $('#translation-api').val(),
            key: $('#translation-key').val()
          },
          active: $('#active').is(':checked'),
          startPosition: $('#start-position').val()
        } );

        /* Force reload of options as some may have acquired default state. */
        load_();
      } );
    } );

    $('#dossier-urls').on('blur', function () {
      urls_ = Config.stringToUrls(this.value);
      this.value = Config.urlsToString(urls_);
      updateActiveUrl_();
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
      elv = getDropdownCollection_(el).find('li[data-value="' + val + '"]');

    if(elv.length === 0) {
      if(def !== undefined)
        setDropdownValue_(el, def);
    } else {
      el.val(val);
      var ch = el.children().clone();
      el.text(elv.text()).append(ch);
    }
  };

  var clearDropdown_ = function (el, text)
  {
    el.text(text);
  };

  var addDropdownItem_ = function (el, val, html)
  {
    getDropdownCollection_(el)
      .append($('<li />').attr('data-value', val)
              .append($('<a/>').attr('href', '#').html(html)));
  };

  var getDropdownCollection_ = function (el)
  {
    el = el.next();

    if(el.get(0).nodeName.toLowerCase() === 'ul')
      return el;
    return el.next();
  };

  var updateActiveUrl_ = function ()
  {
    var ela = $('#active-url');

    urls_ = Config.stringToUrls($("#dossier-urls").val());
    getDropdownCollection_(ela).children().remove();

    for(var k in urls_)
      addDropdownItem_(ela, k, k.bold() + ': ' + urls_[k]);

    if(!(ela.val() in urls_))
      clearDropdown_(ela, defaultActiveUrl_);
  };

  var load_ = function (callback)
  {
    Config.load(function (state) {
      var elc = $("#dossier-urls");

      elc.val(state.dossierUrls);
      updateActiveUrl_();

      $('#active').prop('checked', state.active);
      setDropdownValue_($('#active-url'), state.activeUrl);
      setDropdownValue_($('#translation-api'), state.translation.api);
      $('#translation-key').val(state.translation.key);
      setDropdownValue_($('#start-position'), state.startPosition, 0);

      if(std.is_fn(callback)) callback();
    } );
  };


  /* Initialize options page controller. */
  $(function () { initialise_(); } );

})(window, $, SortingCommon);