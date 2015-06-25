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
    interval: 15000
  };


  /**
   * @class
   * */
  openquery.Controller = function (explorer, api, options)
  {
    std.Controller.call(this, { });

    this.defineProperties( {
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

    this.processor = new openquery.Processor(
      folder, subfolder, this.options.interval
    );
  };


  openquery.Processor = function (folder, subfolder, interval)
  {
    var events = new std.Events(this, [ "fail", "pending", "done" ]);

    var oq = new djs.OpenQuery(
      this.api.getDossierJs(), folder, subfolder
    ).post().then(function (result) {
      schedule();
    } ).fail(function () {
      events.trigger("fail");
      oq = null;
    } );


    var schedule = function ()
    {
      window.setTimeout(function () { next(); }, interval);
    };

    var next = function ()
    {
      oq.get().then(function (result) {
        if(result.state === "pending") events.trigger("pending");
      } ).fail(function () { events.trigger("fail"); } );
    };
  };


  return sd;

})(this,
   this.$,
   this.DossierJs,
   this.SortingCommon,
   this.SortingDesk);