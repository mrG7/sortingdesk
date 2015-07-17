/**
 * @file Sorting Desk extension dragnet component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */

/*jshint laxbreak:true */


this.Dragnet = (function (window, $, std, djs, Api, dn, undefined) {

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

  api.DossierModels.prototype.fetch = function (reload)
  {
    var self = this,
        dn = new djs.Dragnet(this.api.getDossierJs());

    if(reload !== true) {
      return dn.get().then(function (data) {
        if(data && "state" in data) {
          return data.state === "pending"
            ? $.Deferred(function (d) { self.resume_(d, dn); } )
            : self.reload_(dn);
        }

        if(!std.is_obj(data) || !data.hasOwnProperty("clusters")) {
          console.error("Data invalid", data);
          return null;
        }

        return self.normalise_(data);
      } );
    } else
      return this.reload_(dn);
  };

  /* Private interface */
  api.DossierModels.prototype.reload_ = function (dn)
  {
    var self = this;
    return $.Deferred(function (d) {
      dn.post().then(function (result) {
        console.log("POST:", result);
        self.schedule_(d, dn);
      }, function () { d.reject(); });
    } );
  };

  api.DossierModels.prototype.schedule_ = function (d, dn)
  {
    var self = this;
    window.setTimeout(function () {
      self.resume_(d, dn);
    }, 2000);
  };

  api.DossierModels.prototype.resume_ = function (d, dn)
  {
    var self = this;
    dn.get().then(function (result) {
      if(!std.is_obj(result)) throw "Invalid response received";
      console.log("GET:", result);

      if("clusters" in result) {
        d.resolve(self.normalise_(result));
        return;
      }

      self.schedule_(d, dn);
    } );
  };

  api.DossierModels.prototype.normalise_ = function (data)
  {
    return data.clusters.map(function (f) {
      return f.map(function (c) {
        return {
          parent: c.folder_id,
          caption: c.caption,
          weight: c.weight
        };
      } );
    } );
  };


  /* Register with factory. */
  api.register("dossier-models", api.DossierModels);

  return dn;

} )(this,
    this.$,
    this.SortingCommon,
    this.DossierJS,
    this.Api,
    this.Dragnet);