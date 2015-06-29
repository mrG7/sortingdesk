/**
 * @file Sorting Desk: ui component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */

this.SortingDesk = (function (window, sd, undefined) {

  /**
   * @namespace
   * */
  sd = sd || { };
  var ui = sd.ui = sd.ui || { };


  /* Css classes */
  ui.Css = {
    clear: 'sd-clear',
    active: 'sd-active',
    disabled: 'sd-disabled',
    droppable: {
      hover: 'sd-droppable-hover'
    },
    close: 'sd-close',
    preview: 'sd-preview',
    loading: 'sd-loading'
  };


  return sd;

})(this,
   this.SortingDesk);