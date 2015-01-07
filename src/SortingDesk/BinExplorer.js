/**
 * @file Bin Explorer component.
 * @copyright 2014 Diffeo
 *
 * Comments:
 * Uses the `SortingQueue' component.
 *
 */


/*global $, SortingQueue, Api, define */
/*jshint laxbreak:true */


/**
 * The Bin Explorer module.
 *
 * @returns an object containing the module's public interface. */
var BinExplorer_ = function (window, SortingQueue, $)
{


  /**
   * @class
   * */
  var Explorer = function (options, sortingDesk)
  {
  };

  Explorer.prototype = {
    deferred_: null,
    api_: null,
    
    initialise: function ()
    {
      this.deferred_ = $.Deferred();

      return this.deferred_.promise();
    },

    show: function ()
    {
      /* Resolve promise if one still exists. */
      if(this.deferred_)
        this.deferred_.resolve();

      /* Detach all events. */
      this.nodes_.buttonClose.off();

      this.deferred_ = this.api_ = null;

      console.log("Label Browser component reset");
    },
    
    close: function ()
    {
      if(this.deferred_)
        this.deferred_.resolve();

      this.reset();
    }
  };
  

  /* CSS class names used. */
  var Css = {
  };


  /* Default options */
  var defaults_ = {
  };


  /* Module public API */
  return {
    Explorer: Explorer,
  };
  
};


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("BinExplorer", [ "jquery" ], function (SortingQueue, $) {
    return BinExplorer_(window, SortingQueue, $, Api);
  });
} else
  window.BinExplorer = BinExplorer_(window, SortingQueue, $);
