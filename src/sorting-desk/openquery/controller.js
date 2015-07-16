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

    if(this.subfolder !== null) {
      if(this.subfolder.status === this.status)
        this.subfolder.setStatus(null);
      this.subfolder = this.status = null;
    }

    this.explorer = this.options = null;

    console.info("OpenQuery controller reset");
  };

  openquery.Controller.prototype.process = function (subfolder)
  {
    if(this.subfolder !== null) return std.instareject();

    this.subfolder = subfolder;
    this.status = new sd.explorer.Status("WAIT");
    subfolder.setStatus(this.status);

    this.processor = new openquery.Processor(
      this.api,
      subfolder.owner.data,
      subfolder.data,
      this.options.delays.interval
    );

    this.options.button.addClass("disabled");

    var self = this;
    return $.Deferred(function (d) {
      self.processor.on( {
        done: function (result) {
          self.cleanup_(result);
          d.resolve(result);
        },
        failed: function () {
          self.cleanup_();
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

    if(this.subfolder !== null) return;
    else if(!std.instanceany(sel, sd.explorer.Subfolder, sd.explorer.Item)) {
      window.alert(
        'Please select a subfolder or item to conduct "OpenQuery" on.'
      );
      return;
    }

    if(sel instanceof sd.explorer.Item) sel = sel.owner;
    this.process(sel);
  };

  openquery.Controller.prototype.cleanup_ = function (result)
  {
    var sf = this.subfolder, st = this.status;
    window.setTimeout(function () {
      if(sf.status === st) sf.setStatus(null);
    }, this.options.delays.end);

    this.status.setContent(result && result.state.toUpperCase() || "FAIL");
    this.processor = this.subfolder = this.status = null;
    this.options.button.removeClass("disabled");
  };


  return sd;

})(this,
   this.$,
   this.DossierJs,
   this.SortingCommon,
   this.SortingDesk);