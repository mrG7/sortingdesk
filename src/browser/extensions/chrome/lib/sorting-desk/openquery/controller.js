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
    delays: {
      interval: 2000,
      end: 5000
    }
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
      options:    { value: $.extend(true, { }, defaults_, options) }
    } );

    this.subfolder = null;
    this.status = null;
  };

  openquery.Controller.prototype.initialise = function ()
  {
    var self = this;
    this.options.button.on("click", this.onClick_.bind(this));

    console.info("OpenQuery controller initialised");
  };

  openquery.Controller.prototype.reset = function ()
  {
    this.options.button.off();

    if(this.subfolder !== null) {
      if(this.subfolder.status === this.status)
        this.subfolder.setStatus(null);
      this.subfolder = this.status = null;
    }

    this.explorer = this.options = null;

    console.info("OpenQuery controller reset");
  };

  /* Private interface */
  openquery.Controller.prototype.onClick_ = function ()
  {
    var sel = this.explorer.selected;

    if(this.subfolder !== null) return;
    else if(!std.instanceany(sel, sd.explorer.Subfolder, sd.explorer.Item)) {
      window.alert(
        'Please select a subfolder or item to conduct "OpenQuery" on.'
      );
      return;
    }

    this.options.button.addClass("disabled");

    if(sel instanceof sd.explorer.Item) sel = sel.owner;

    this.subfolder = sel;
    this.status = new sd.explorer.Status("WAIT");
    sel.setStatus(this.status);

    this.processor = new openquery.Processor(
      this.api, sel.owner.data, sel.data, this.options.delays.interval
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

  openquery.Controller.prototype.cleanup_ = function (result)
  {
    var sf = this.subfolder, st = this.status;
    window.setTimeout(function () {
      if(sf.status === st) sf.setStatus(null);
    }, this.options.delays.end);

    this.status.setContent(result && result.state.toUpperCase() || "FAIL");
    this.subfolder = this.status = null;
    this.options.button.removeClass("disabled");
  };


  return sd;

})(this,
   this.$,
   this.DossierJs,
   this.SortingCommon,
   this.SortingDesk);