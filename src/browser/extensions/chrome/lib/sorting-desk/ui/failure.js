/**
 * @file Sorting Desk: ui component.
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
  var ui = sd.ui = sd.ui || { };


  /**
   * @class
   * */
  ui.NetworkFailure = function (owner)
  {
    std.Owned.call(this, owner);
  };

  /* Constants */
  ui.NetworkFailure.types = {
    folder: {
      list:    'folder-list',
      add:     'folder-add',
      remove:  'folder-remove',
      rename:  'folder-rename',
      load:    'folder-load'
    },
    subfolder: {
      load:    'subfolder-load',
      add:     'subfolder-add',
      remove:  'subfolder-remove',
      rename:  'subfolder-rename'
    },
    dismissal: 'item-dismissal',
    fc: {
      create:  'fc-create',
      save:    'fc-save',
      remove:  'fc-remove',
      rename:  'fc-rename'
    },
    label:     'label-add'
  };

  ui.NetworkFailure.prototype = Object.create(std.Owned.prototype);

  ui.NetworkFailure.prototype.incident = function (type, data)
  {
    this.owner_.callbacks.invokeMaybe('networkFailure', type, data);
  };


  return sd;

})(this,
   this.$,
   this.SortingCommon,
   this.SortingDesk);