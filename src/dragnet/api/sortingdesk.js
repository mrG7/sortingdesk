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
    maxItems: 100
  };


  /**
   * @class
   * */
  api.SortingDesk = function (options)
  {
    this.options = $.extend(true, { }, options, defaults);
    this.api = new Api(options.dossierUrl);
  };

  api.SortingDesk.prototype.getClasses = function ()
  {
    var self = this,
        api = this.api.foldering,
        classes = [ ];

    return $.Deferred(function (deferred) {
      var fail = function () { deferred.reject(); };

      /* For each folder, retrieve list of subfolders. */
      api.listFolders().then(function (folders) {
        var nextFolder = function (fi) {
          if(fi >= folders.length) {
            console.info("Classes loaded", classes);
            deferred.resolve(classes);
            return;
          }

          var cl = [ ];

          /* For each subfolder, save reference and retrieve a random item from
           * its collection.*/
          api.listSubfolders(folders[fi]).then(function (subfolders) {
            var nextSubfolder = function (si) {
              if(si >= subfolders.length) {
                classes.push(cl);
                nextFolder(++fi);
                return;
              }

              api.listItems(subfolders[si]).then(function (items) {
                var sc = subfolders[si];

                if(!std.is_arr(items) || items.length === 0)
                  console.warn("Skipping subfolder: invalid or no items", sc);
                else {
                  /* Save class descriptor. */
                  cl.push( {
                    name: sc.name,
                    item: items[Math.floor(Math.random() * items.length)]
                  } );
                }

                nextSubfolder(++si);
              }, fail);
            };

            nextSubfolder(0);
          }, fail);
        };

        nextFolder(0);
      }, fail);
    } ).promise();
  };

  api.SortingDesk.prototype.computeWeights = function (classes)
  {
    var self = this,
        api = this.api.qitems;

    if(!std.is_arr(classes) || classes.length === 0)
      throw "Invalid dataset";

    return $.Deferred(function (deferred) {
      var fail = function () { deferred.reject(); };

      var next = function (ci, si) {
        if(ci >= classes.length) {
          console.info("Weights calculated", classes);
          deferred.resolve(classes);
          return;
        }

        var cl = classes[ci];
        if(si >= cl.length) {
          next(++ci, 0);
          return;
        }

        var sc = cl[si];
        if(!std.is_obj(sc.item)) {
          console.warn("Skipping class: invalid or no item", cl);
          sc.weight = 0;
          next(ci, ++si);
          return;
        }

        api.setQueryContentId(sc.item.content_id);
        api.getCallbacks().moreTexts(self.options.maxItems)
          .then(function (data) {
            sc.weight = data.results.length;
            console.log(sc);
            next(ci, ++si);
          }, fail);
      };

      next(0, 0);
    } ).promise();
  };


  /* Register with factory. */
  api.register("sorting-desk", api.SortingDesk);

  return dn;

} )(this,
    this.$,
    this.SortingCommon,
    this.Api,
    this.Dragnet);