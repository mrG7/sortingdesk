/** SortingDesk.js --- Sorting Desk
 *
 * Copyright (C) 2014 Diffeo
 *
 * Author: Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 * 
 */

var SortingDesk = function(options, callbacks)
{
  this.options_ = jQuery.extend(true, {}, options);
  this.callbacks_ = callbacks;

  console.log("Sorting Desk UI instantiated");
};

SortingDesk.prototype = {
  callbacks_: null,
  options_: null,
};