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
   * @class
   * */
  explorer.Folder = function (owner, folder)
  {
    /* Invoke base class constructor. */
    explorer.ItemBase.call(this, owner);

    /* Getters */
    var def = Object.defineProperty;
    def(this, 'data', { get: function () { return this.folder_; } } );
    def(this, 'subfolders', { get: function () { return this.subfolders_; } });

    /* Initialisation sequence. */
    if(!std.is_obj(folder))
      throw "Invalid or no folder descriptor provided";

    /* Attributes */
    this.folder_ = folder;
    this.subfolders_ = [ ];

    var self = this;

    /* Render now. */
    this.render();

    if(folder.exists) {
      this.loading(true);

      /* Retrieve all subfolders for this folder. */
      this.api.foldering.listSubfolders(folder)
        .done(function (coll) {
          coll.forEach(function (sf) {
            self.subfolders_.push(new explorer.Subfolder(self, sf));
          } );
          self.setLoaded(true);
        } )
        .fail(function () {
          self.controller.owner.networkFailure.incident(
            sd.ui.NetworkFailure.types.folder.load, folder);
        } )
        .always(function () {
          self.loading(false);
        } );
    } else
      self.setLoaded(true);
  };

  explorer.Folder.prototype = Object.create(explorer.ItemBase.prototype);

  explorer.Folder.prototype.render = function ()
  {
    this.id_ = this.tree.create_node(
      null, { state: 'open', text: this.folder_.name, type: 'folder'},
      "last");

    if(this.id_ === false)
      throw "Failed to create folder";
  };

  explorer.Folder.prototype.reset = function ()
  {
    this.subfolders_.forEach(function (s) { s.reset(); } );
    this.tree.delete_node(this.tree.get_node(this.id_));

    this.subfolders_ = this.folder_ = this.id_ = null;
  };

  explorer.Folder.prototype.add = function (subfolder)
  {
    var sf = new explorer.Subfolder(this, subfolder);
    this.subfolders_.push(sf);
    return sf;
  };

  explorer.Folder.prototype.remove = function (subfolder)
  {
    var self = this;

    /* Remove self when `subfolder´ not given. */
    if(subfolder === undefined) {
      if(this.loading()) return null;
      this.loading(true);
      return this.api.foldering.deleteFolder(this.folder_)
        .done(function () { self.controller.remove(self); } )
        .fail(function () {
          self.controller.owner.networkFailure.incident(
            sd.ui.NetworkFailure.types.folder.remove, self.folder_
          );
        } )
        .always(function () { self.loading(false); } );
    }

    var index = this.subfolders_.indexOf(subfolder);
    if(index < 0) throw "Subfolder not contained: not removing";

    subfolder.reset();
    self.subfolders_.splice(index, 1);
  };

  explorer.Folder.prototype.rename = function (name)
  {
    if(name === this.folder_.name) {
      console.error("Not renaming: same name");
      return null;
    } else if(this.loading())
      return null;

    var self = this,
        to = this.api.foldering.folderFromName(name);

    this.loading(true);
    return this.api.foldering.renameFolder(this.folder_, to)
      .done(function () { $.extend(true, self.folder_, to); } )
      .fail(function () {
        self.controller.owner.networkFailure.incident(
          sd.ui.NetworkFailure.types.folder.rename, self.folder_
        );
      } )
      .always(function () { self.loading(false); } );
  };


  /**
   * @class
   * */
  explorer.FolderNew = function (owner)
  {
    /* Invoke base class constructor. */
    explorer.Folder.call(
      this, owner,
      owner.owner.api.foldering.folderFromName("<fake>")
    );
  };

  explorer.FolderNew.prototype = Object.create(explorer.Folder.prototype);

  explorer.FolderNew.prototype.render = function ()
  {
    var self = this;

    this.id_ = this.tree.create_node(
      null, { state: 'open', text: "", type: "folder" }, "last"
    );

    if(this.id_ === false) throw "Failed to create folder";

    this.tree.edit(this.tree.get_node(this.id_),
                   this.owner_.owner.options.folderNewCaption);

    /* TODO: remove hardcoded timeout.
     * Scrolling into view has to be on a timeout because JsTree performs a
     * slide down animation. */
    window.setTimeout(function () { self.node.get(0).scrollIntoView(); }, 200);
  };


  return sd;

})(this,
   this.$,
   this.SortingCommon,
   this.SortingDesk);