/**
 * @file Sorting Desk: dragnet component.
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
  var dragnet = sd.dragnet = sd.dragnet || { };


  /**
   * @class
   * */
  dragnet.Controller = function (explorer, openquery, api)
  {
    std.Controller.call(this, { });

    this.explorer = explorer;
    this.openquery = openquery;
    this.api = api;
  };

  dragnet.Controller.prototype = Object.create(std.Controller.prototype);

  dragnet.Controller.prototype.initialise = function ()
  {
    console.info("Dragnet controller initialised");
  };

  dragnet.Controller.prototype.reset = function ()
  {
    console.info("Dragnet controller reset");
  };

  dragnet.Controller.prototype.select = function (item)
  {
    if(!std.is_obj(item)) throw "Invalid item";
    else if(!item.parent) {
      console.info("Item is root node: ignoring");
      return false;
    }
    var self = this,
        folder = this.explorer.getAnyByOwnId(item.parent),
        subfolder;

    if(!(folder instanceof sd.explorer.Folder)) {
      console.error("Parent not a folder", item, folder);
      window.alert("Unable to continue since the selected item's parent is"
                   + " NOT a folder.\n\nPlease contact the support team.");
      return false;
    }

    subfolder = this.explorer.getAnyByOwnId(
      this.api.foldering.nameToId(item.caption)
    );

    if(subfolder && !(subfolder instanceof sd.explorer.Subfolder)) {
      console.error("Item exists but is NOT a subfolder", item, subfolder);
      window.alert("Unable to continue since the selected item exists but is"
                   + " NOT a subfolder.\n\nPlease contact the support team.");
      return false;
    } else if(subfolder instanceof sd.explorer.Subfolder) {
      subfolder.open(true);
      return false;
    }

    var sf = new this.api.foldering.subfolderFromName(folder, item.caption);
    sf = folder.add(sf);
    sf.select(true);

    window.setTimeout(function () {
      self.openquery.process(sf).then(function (result) {
        console.log("GOT: ", result);

        if(result.content_ids.length === 0) {
          sf.remove();
          window.alert("Open Query did not return any results.  Removing"
                       + " subfolder");
          return;
        }

        new sd.explorer.BatchInserter(self.explorer, self.api, sf)
          .insert(result.content_ids)
          .fail(function () { sf.remove(); } );
      }, function () { sf.remove(); } );
    }, 250);

    return true;
  };


  return sd;

})(this,
   this.$,
   this.SortingCommon,
   this.SortingDesk);
