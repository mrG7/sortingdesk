/**
 * @file Example: minimal instantiation.
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


define("example-minimal", [ ], ExampleMinimal);

var ExampleMinimal = (function () {
  var run = function (options, callbacks) {
    return new SortingDesk.Instance(
      options.nodes.items, /* passing only items HTML element */
      callbacks);
  };

  Examples.register("minimal", "Minimal", run);
})();