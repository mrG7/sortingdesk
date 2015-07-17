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
  };

  openquery.Controller.prototype = Object.create(
    std.Controller.prototype
  );

  openquery.Controller.prototype.initialise = function ()
  {
    var self = this;
    this.options.button.on("click", this.onClick_.bind(this));

    console.info("OpenQuery controller initialised");
  };

  openquery.Controller.prototype.reset = function ()
  {
    this.options.button.off();

    this.explorer = this.options = null;
    console.info("OpenQuery controller reset");
  };

  openquery.Controller.prototype.process = function (subfolder)
  {
    try {
      var processor = new openquery.Processor(
        this.api,
        subfolder,
        this.options.delays
      );
    } catch (x) { return std.instareject(); }

    return $.Deferred(function (d) {
      processor.on( {
        done: function (result) { d.resolve(result); },
        failed: function () {
          window.alert("Unfortunately the OpenQuery request failed.\n\n"
                       + "Please try again or contact the support team.");
          d.reject();
        }
      } );
    } ).promise();
  };

  /* Private interface */
  openquery.Controller.prototype.onClick_ = function ()
  {
    var sel = this.explorer.selected;
    if(!std.instanceany(sel, sd.explorer.Subfolder, sd.explorer.Item)) {
      window.alert(
        'Please select a subfolder or item to conduct "OpenQuery" on.'
      );
      return;
    }

    if(sel instanceof sd.explorer.Item) sel = sel.owner;
    if(sel.processing("openquery")) {
      window.alert("An OpenQuery request is currently running on the selected"
                   + " subfolder.");
    } else
      this.process(sel);
  };


  return sd;

})(this,
   this.$,
   this.DossierJs,
   this.SortingCommon,
   this.SortingDesk);