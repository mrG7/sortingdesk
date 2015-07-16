/**
 * @file Sorting Desk: explorer component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingCommon´ component.
 *
 */

this.SortingDesk = (function (window, $, std, sd, undefined) {

  /**
   * @namespace
   * */
  sd = sd || { };
  var explorer = sd.explorer = sd.explorer || { };


  /**
   * @clas
   * */
  explorer.BatchInserter = function (explorer, api, subfolder)
  {
    this.explorer = explorer;
    this.api = api;
    this.subfolder = subfolder;
  };

  explorer.BatchInserter.prototype.insert = function (ids)
  {
    var self = this,
        index = 0;

    return $.Deferred(function (d) {
      self.api.fc.getAll(ids).then(function (fcs) {
        console.log(fcs);

        var next = function () {
          /* Detach listener previously attached below when adding the
           * subfolder. */
          if(std.is_fn(this.off)) this.off('loading-end', next);

          if(index >= fcs.length) {
            d.resolve();
            return;
          }

          var fc = fcs[index];
          for(var title in fc.raw.title) break;
          var s = fcs[index],
              descriptor = {
                id: (window.performance.now()*100000000000).toString(),
                type: 'manual',
                content_id: fc.content_id,
                content: title
              };

          ++index;
          /* TODO: `generate_subtopic_id_` needs to go in a `util` namespace. */
          descriptor.subtopic_id
            = self.explorer.generate_subtopic_id_(descriptor);
          self.subfolder.add(descriptor).on('loading-end', next);
        };
        next();

      }, function () { d.reject(); } );
    } ).promise();
  };


  return sd;

})(this,
   this.$,
   this.SortingCommon,
   this.SortingDesk);
