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
  var self = this;
  
  this.options = jQuery.extend(true, {}, options);
  this.callbacks = callbacks;

  /* This is cumbersome.
   *
   * Instead of being given primary and secondary bin ids, there should be an
   * API function we could call to retrieve ALL bin descriptors in one go.  As
   * it stands, we are forced to make a call for every bin id.
   *
   * In my view, it needs to be redesigned. */
  callbacks.getBinData(options.primaryContentId)
    .done(function(bin) { self.initialisePrimaryBin(bin); });
};

SortingDesk.prototype = {
  callbacks: null,
  options: null,

  initialise: function ()
  {
    console.log("Sorting Desk UI instantiated");
  },

  initialisePrimaryBin: function (bin)
  {
    var self = this;
    
    if(bin.error) {
      console.log("Failed to retrieve contents of primary bin");
      return;
    }

    if(this.options.secondaryContentIds.length > 0) {
      this.callbacks.getBinData(this.options.secondaryContentIds[0])
        .done(function (bin) { self.initialiseSecondaryBin(0, bin); });
    }
  },

  initialiseSecondaryBin: function (index, bin)
  {
    var self = this;
    
    if(bin.error) {
      console.log("Failed to retrieve contents of secondary bin: ",
                  this.options.secondaryContentIds[index]);
      return;
    }

    if(++index < this.options.secondaryContentIds.length) {
      this.callbacks.getBinData(this.options.secondaryContentIds[index])
        .done(function (bin) { self.initialiseSecondaryBin(index, bin); });
    } else
      this.initialise();
  }
};