/**
 * @file Test specifications runner.
 * @copyright 2014 Diffeo
 * @author Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 * 
 */

/*global require, jasmine */


require.config( {
  baseUrl: '../',
  paths: {
    "SortingDesk": "src/main/SortingDesk",
    "API-SortingDesk": "src/api/api-sorting_desk-mock",
    "API-Data": "src/api/data/al_ahram.json?",
    "jQuery": "lib/jquery-2.1.1.min"
  }
} );

require( [ "SortingDesk" ], function () {
  require( [ "spec/init.js" ], function () {
    require( [ "spec/instance.js",
               "spec/callbacks.js",
               "spec/interface.js"
             ], function () {
               jasmine.getEnv().execute();
             } );
  } );
} );
