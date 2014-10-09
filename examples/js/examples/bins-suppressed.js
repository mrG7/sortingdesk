/**
 * @file Example: bin container suppressed.
 * @copyright 2014 Diffeo
 * 
 * @author Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 * 
 */


/*global $, define, Examples, SortingDesk */
/*jshint laxbreak:true */


define("example-bins-suppressed", [ ], ExampleBinsSuppressed);

var ExampleBinsSuppressed = (function () {
  var run = function (options, callbacks) {
    /* Suppress bin container. */
    options.nodes.bins = null;
    
    return new SortingDesk.Instance(options, callbacks);
  };

  Examples.register("no-bins", "Bin container suppressed", run);
})();