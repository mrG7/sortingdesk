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
    delays: {
      interval: 2000,
      end: 5000
    }
  };


  /* Constants */
  var STATES = [ "pending", "failed", "done" ],
      STATUSES = {
        pending: "WAIT",
        failed: "FAIL",
        done: "DONE"
      }


  /**
   * @class
   * */
  openquery.Processor = function (api, subfolder, options)
  {
    options = $.extend(true, { }, defaults_, options);

    if(subfolder.processing("openquery"))
      throw "Already processing OpenQuery request";

    var events = new std.Events(this, STATES.concat([ "finish" ])),
        status = new sd.explorer.Status(STATUSES.pending);

    subfolder.setProcessing("openquery", this);
    subfolder.setStatus(status);

    var oq = new djs.OpenQuery(
      api.getDossierJs(),
      subfolder.owner.data,
      subfolder.data
    );

    oq.post().then( function (result) {
      console.log("POST: got result: ", result);
      schedule_();
    } ).fail(function () {
      events.trigger("failed");
      oq = null;
    } );


    /* Private interface */
    var schedule_ = function ()
    {
      window.setTimeout(function () { next_(); }, options.delays.interval);
    };

    var next_ = function ()
    {
      oq.get().then(function (result) {
        console.log("GET: got result: ", result);

        if(!std.is_str(result.state))
          throw "Invalid or no state in response";
        else if(STATES.indexOf(result.state) === -1)
          throw "Invalid state in response";

        status = new sd.explorer.Status(STATUSES[result.state]);
        subfolder.setStatus(status);
        events.trigger(result.state, result);
        if(result.state === "pending") schedule_();
        else {
          window.setTimeout(function () {
            if(subfolder.status === status) subfolder.setStatus(null);
          }, options.delays.end);

          subfolder.setProcessing("openquery", null);
          events.trigger("finish");
        }
      } ).fail(function () { events.trigger("fail"); } );
    };
  };


  return sd;

})(this,
   this.$,
   this.DossierJS,
   this.SortingCommon,
   this.SortingDesk);