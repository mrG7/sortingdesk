/**
 * @file Sorting Desk extension dragnet component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */

/*jshint laxbreak:true */


this.Dragnet = (function (window, $, std, Api, dn, undefined) {

  /**
   * @namespace
   * */
  dn = dn || { };
  var api = dn.api;


  /* Default options */
  var defaults = {
    dossierUrl: null
  };


  /**
   * @class
   * */
  api.DossierModels = function (options)
  {
    this.options = $.extend(true, { }, defaults, options);
    this.api = new Api(options.dossierUrl);

    if(!this.options.dossierUrl)
      throw "Invalid or no dossier models URL specified";
  };

  api.DossierModels.prototype.fetch = function ()
  {
    return this.api.getDossierJs().dragnet().then(function (data) {
      if(!std.is_obj(data) || !data.hasOwnProperty("clusters")) {
        console.error("Data invalid", data);
        return null;
      }

      return data.clusters.map(function (f) {
        return f.map(function (c) {
          return {
            parent: c.folder_id,
            caption: c.caption,
            weight: c.weight
          };
        } );
      } );
    } );
  };

  /* Register with factory. */
  api.register("dossier-models", api.DossierModels);

  return dn;

} )(this,
    this.$,
    this.SortingCommon,
    this.Api,
    this.Dragnet);