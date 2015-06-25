/**
 * @file Sorting Desk: openquery component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingCommon´ component.
 *
 */

this.SortingDesk = (function (window, $, djs, std, sd, undefined) {

  /**
   * @namespace
   * */
  sd = sd || { };
  var openquery = sd.openquery = sd.openquery || { };


  /* Default options */
  var defaults_ = {
    button:   null,
    interval: 15000
  };


  /**
   * @class
   * */
  openquery.Controller = function (explorer, api, options)
  {
    std.Controller.call(this, { });

    Object.defineProperties(this, {
      explorer:   { value: explorer },
      api:        { value: api },
      options:    { value: $.extend(true, { }, defaults_, options) },

      /* Writable */
      processing: { value: null, writable: true }
    } );
  };

  openquery.Controller.prototype.initialise = function ()
  {
    var self = this;
    this.processing = false;
    this.options.button.on("click", this.onClick_.bind(this));

    console.info("OpenQuery controller initialised");
  };

  openquery.Controller.prototype.reset = function ()
  {
    this.options.button.off();
    this.explorer = this.options = this.processing = null;

    console.info("OpenQuery controller reset");
  };

  /* Private interface */
  openquery.Controller.prototype.onClick_ = function ()
  {
    var sel = this.explorer.selected;

    if(this.processing) return;
    else if(!std.instanceany(sel, sd.explorer.Subfolder, sd.explorer.Item)) {
      window.alert(
        'Please select a subfolder or item to conduct "OpenQuery" on.'
      );
      return;
    }

    this.options.button.addClass("disabled");

    if(sel instanceof sd.explorer.Item) sel = sel.owner;
    this.processor = new openquery.Processor(
      this.api, sel.owner.data, sel.data, this.options.interval
    );

    var self = this;
    this.processor.on( {
      failed: function () {
        window.alert("Unfortunately the OpenQuery request failed.\n\n"
                     + "Please try again or contact the support team.");
        self.cleanup_();
      },
      done: this.cleanup_.bind(this)
    } );
  };

  openquery.Controller.prototype.cleanup_ = function ()
  {
    this.processing = false;
    this.options.button.removeClass("disabled");
  };


  return sd;

})(this,
   this.$,
   this.DossierJs,
   this.SortingCommon,
   this.SortingDesk);