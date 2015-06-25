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
  openquery.Processor = function (api, folder, subfolder, interval)
  {
    var states = [ "pending", "failed", "done" ];
    var events = new std.Events(this, states);

    var oq = new djs.OpenQuery(api.getDossierJs(), folder, subfolder);
    oq.post().then( function (result) {
      console.log("POST: got result: ", result);
      schedule();
    } ).fail(function () {
      events.trigger("failed");
      oq = null;
    } );


    var schedule = function ()
    {
      window.setTimeout(function () { next(); }, 1 || interval);
    };

    var next = function ()
    {
      oq.get().then(function (result) {
        console.log("GET: got result: ", result);

        if(!std.is_str(result.state))
          throw "Invalid or no state in response";
        else if(states.indexOf(result.state) === -1)
          throw "Invalid state in response";

        events.trigger(result.state, result);
        if(result.state === "pending") schedule();
      } ).fail(function () { events.trigger("fail"); } );
    };
  };


  return sd;

})(this,
   this.$,
   this.DossierJS,
   this.SortingCommon,
   this.SortingDesk);