/**
 * @file Test specifications runner.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 * 
 */

/*global require, jasmine */


var g_tests,
    g_queue;


require.config( {
  baseUrl: '../',
  paths: {
    "SortingQueue": "src/SortingQueue/SortingQueue",
    "API-SortingQueue": "src/api/api-sorting_queue-mock",
    "API-Data": "src/api/data/al_ahram.json?",
    "jquery": "lib/jquery-2.1.1.min",
    "Tests": "test/spec/init"
  }
} );

require( [ "Tests" ], function (Tests) {

  g_tests = Tests;
  g_queue = Tests.getQueue();
  
  require( [ "spec/instance.js", 
             "spec/callbacks.js",
             "spec/interface.js"
           ], function () {
             jasmine.getEnv().execute();
           } );
} );
