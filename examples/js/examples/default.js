/**
 * @file Example: instantiation with default options.
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


define("example-default", [ ], ExampleDefault);

var ExampleDefault = (function () {
  var run = function (options, callbacks) {
    return new SortingDesk.Instance(
      options,
      callbacks);
  };

  Examples.register("default", "Default", run);
})();