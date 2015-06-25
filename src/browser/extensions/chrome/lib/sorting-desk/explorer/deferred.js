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
  explorer.DeferredProcessing = function (ctrl, obj)
  {
    if(!obj) throw "Object not specified";
    std.Owned.call(this, ctrl);

    Object.defineProperties(this, {
      api:    { value: ctrl.owner.api },
      obj:    { value: obj }
    } );
  };

  explorer.DeferredProcessing.prototype = Object.create(std.Owned.prototype);
  explorer.DeferredProcessing.prototype.reset = function () { };


  /**
   * @class
   * */
  explorer.DeferredRename = function (ctrl, node)
  {
    explorer.DeferredProcessing.call(this, ctrl, node);
    node = ctrl.tree.get_node(node.id);
    Object.defineProperty(this, 'old', { value: node.text } );
    ctrl.tree.edit(node);
  };

  explorer.DeferredRename.prototype = Object.create(
    explorer.DeferredProcessing.prototype
  );

  explorer.DeferredRename.prototype.do = function (name)
  {
    var self = this,
        deferred = this.obj.rename(name);

    if(deferred !== null) {
      this.owner_.updateToolbar();
      deferred
        .fail(function () {
          self.owner.tree.rename_node(self.obj.id, self.old);
        } )
        .always(function () {
          self.owner_.updateToolbar();
        } );
    }
  };


  /**
   * @class
   * */
  explorer.DeferredCreation = function (ctrl, parent, obj)
  {
    explorer.DeferredProcessing.call(this, ctrl, obj);
    Object.defineProperty(this, "parent", { value: parent });
  };

  explorer.DeferredCreation.prototype = Object.create(
    explorer.DeferredProcessing.prototype
  );

  explorer.DeferredCreation.prototype.reset = function ()
  {
    if(this.obj !== null) this.obj.reset();
  };


  /**
   * @class
   * */
  explorer.DeferredCreationFolder = function (owner, folder)
  {
    explorer.DeferredCreation.call(this, owner, null, folder);
  };

  explorer.DeferredCreationFolder.prototype = Object.create(
    explorer.DeferredCreation.prototype
  );

  explorer.DeferredCreationFolder.prototype.do = function (name)
  {
    if(name === this.owner.owner.options.folderNewCaption)
      return;

    var self = this,
        f = new explorer.Folder(this.owner,
                                this.api.foldering.folderFromName(name));

    this.owner.folders_.push(f);
    f.loading(true);

    this.api.foldering.addFolder(f.data)
      .fail(function () {
        self.owner.owner.networkFailure.incident(
          sd.ui.NetworkFailure.types.folder.add, f.data);
      } )
      .always(function () { f.loading(false); } );

    if(this.owner.folders_.length === 1)
      this.owner.tree_.select_node(f.id);
  };


  /**
   * @class
   * */
  explorer.DeferredCreationSubfolder = function (
    ctrl, parent, subfolder, descriptor)
  {
    if(!parent)
      throw "Parent not specified";

    explorer.DeferredCreation.call(this, ctrl, parent, subfolder);
    Object.defineProperty(this, "descriptor", { value: descriptor || null } );
  };

  explorer.DeferredCreationSubfolder.prototype = Object.create(
    explorer.DeferredCreation.prototype
  );

  explorer.DeferredCreationSubfolder.prototype.do = function (name)
  {
    if(name === this.owner.owner.options.folderNewCaption)
      return;

    var f = new this.api.foldering.subfolderFromName(this.parent.data, name);
    f = this.parent.add(f);
    if(this.descriptor !== null)
      f.add(this.descriptor);
  };


  /**
   * @class
   * */
  explorer.DeferredCreationItem = function (ctrl, parent, item)
  {
    if(!parent)
      throw "Parent not specified";

    explorer.DeferredCreation.call(this, ctrl, parent, item);
  };

  explorer.DeferredCreationItem.prototype = Object.create(
    explorer.DeferredCreation.prototype
  );

  explorer.DeferredCreationItem.prototype.do = function (name)
  {
    var self = this;

    this.owner.owner.callbacks.invoke('createManualItem', name)
      .done(function (descriptor) {
        descriptor.subtopic_id = self.owner.generate_subtopic_id_(descriptor);
        if(descriptor.subtopic_id !== null)
          self.parent.add(descriptor);
      } );
  };


  return sd;

})(this,
   this.$,
   this.SortingCommon,
   this.SortingDesk);