/**
 * @file Sorting Desk component.
 * @copyright 2014 Diffeo
 *
 * @author Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 *
 */


/*global SortingQueue, jQuery, define */
/*jshint laxbreak:true */


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("SortingDesk", [ "SortingQueue", "jQuery" ],
         function (SortingQueue, $) {
           return SortingDesk;         /* ideally, we would want the module to
                                        * be defined here. */
         } );
}


/**
 * The Sorting Desk module.
 *
 * @returns an object containing class constructors.
 * */
var SortingDesk = (function (window, $) {

  return {
  };
  
} )(typeof window == 'undefined' ? this : window, jQuery);