# Testing

# Approach taken

Tests can be run by either invoking `make test` or `sh/run-tests` from the
project's root directory. The makefile actually runs the script `run-tests` so
it doesn't matter which is used.

Unfortunately, due to limitations with the
[FirefoxDriver](https://code.google.com/p/selenium/wiki/FirefoxDriver), it
is currently not possible to test the Firefox and TorBrowser versions of the
Sorting Desk extension. Chrome is therefore the only version of the extension
that is tested presently.

# Dependencies

Since Sorting Desk is a Javascript project it seemed only logical that the
platform used for testing was also Javascript-based. The tests thus use Node.js
and its npm package manager, in addition to a few Node.js packages. To set up
the packages invoke `npm install`. The packages depended upon are:

-   [mocha](http://mochajs.org/): test framework
-   [chai](http://chaijs.com/): assertion library
-   [selenium-webdriver](http://www.seleniumhq.org/docs/03_webdriver.jsp): the
    official Webdriver Javascript bindings from the Selenium project

# `run-tests`

This script sets the environment up for testing. Depending on certain
conditions, three forms of testing are supported; these are, in order of
precedence:

-   Remote Selenium server
-   Sauce Labs
-   Local

Each test mode uses a specific `config.js` especially crafted for the purpose.
The `config.js` file alluded to is the one found in `./src/js/extension`,
from the Chrome extension subtree. As part of its initialisation sequence,
`run-tests` saves a copy of the standard `config.js` and replaces it with the
test-specific config file. Once the tests finish or the script's execution is
aborted, the standard `config.js` is restored.

Either the Google Chrome or the Chromium browser binaries **must** be present,
irrespective of the test mode, since the extension needs to be packaged and
a `crx` file emitted, or the Chrome driver will refuse to run the tests. A
private key file, `chrome-testing.pem`, exists solely for the purpose of
packaging the extension used during testing; it has no other use and thus can
safely be contained in the repository.

## Remote Selenium server

This test mode is engaged if the `SELENIUM_SERVER_URL` environment variable
is found to be defined. It is expected to contain a valid URL of a running
Selenium server instance, which can be running locally. Example of a valid URL:
`http://localhost:4444/wd/hub`.

The Chrome config used is `config.remote`. This test mode requires a remote
Dossier stack instance to be up and running.

## Sauce Labs

This test mode requires the `SAUCE_USERNAME` and `SAUCE_ACCESS_KEY` environment
variables to be set, which must contain the Sauce Labs' account credentials
to use for testing. Optionally, `PLATFORM` may also be set and is expected to
contain a valid [Operating System platform](https://saucelabs.com/platforms/)
identifier. Use Sauce Labs [platform
configurator](https://docs.saucelabs.com/reference/platforms-configurator/), if
in doubt. `PLATFORM` defaults to `Linux` if not defined.

The Chrome config used is `config.saucelabs`. This test mode requires a remote
Dossier stack instance to be up and running.

## Local

This is the default test mode and is automatically engaged if the conditions
for the preceding tests are not met.

The Chrome config used is `config.local`. Presently, this test mode attempts
to create a local Dossier stack instance that uses the pre-created database
snapshot found at `./test/db/soft-selectors.db`.

# Chrome testing

Once the environment is set up, the testing proper begins when the Mocha test
runner is executed. The very first thing it does is determine the test mode
(see above) so that the browser may be instantiated correctly when needed.

The test itself is composed of several sections, each focusing on different
aspects of the extension.

## Functionality

This section mostly focuses on general functionality. Aspects such as loading
of folders, subfolders and items are tested, as is creation of folders, adding
and activation of items. Other aspects are also tested including refreshing of
each pane's contents, dismissing items and soft selectors.

**Each** test in this section creates a new browser instance.

## Renaming/removing

A separate section exists for the sole purpose of testing renaming and removing
of folders, subfolders and items. A subsequent revision of the tests should
probably focus on either merging this section with "Functionality" above
**or** breaking up the latter in smaller sections with each section grouping
similar test types. It doesn't really make much sense for this section to exist
separate of "Functionality".

**Each** test in this section creates a new browser instance.

## Toolbars

The state of the folder explorer and search result toolbars are tested under
different circumstances. They are tested when a folder, subfolder or item are
the selected entities in the folder explorer. Further tests are conducted for
expected differences in toolbar state depending on whether a subfolder is
expanded or not. A final test is conducted once all folders, subfolders and
items have been removed.

Only **one** browser instance is created per section.

# Brief technical discussion

## Browser instantiation

When a browser instance is created, it is immediately attempted to identify
the main browser and extension's windows. The process of window identification
times out at 5s and, if concluded, leads to the test sequence proceeding.

## Deferred command execution

The Javascript version of Webdriver employs a deferred execution model whereby
each command is only sent to the browser after the previous command, if
applicable, has finished executing. The following code block,

    driver.get('http://www.google.com').then(function () {
      driver.findElement(By.name('q')).then(function () {
        sendKeys('webdriver').then(function () {
          driver.findElement(By.name('btnG')).then(function (el) {
            el.click();
          } );
        } );
      } );
    } );

is therefore equivalent to:

    driver.get('http://www.google.com');
    driver.findElement(By.name('q')).sendKeys('webdriver');
    driver.findElement(By.name('btnG')).click();

## Data set

A test data set is created at initialisation time. This is composed of an
array of folders and subfolders, with each subfolder also containing an array
of items. Folders are contained in the variable `folders` and subfolders in
`subfolders`.

At the time of writing, one of the folders ("Soft selectors") is required to
exist in the test database and it is expected to contain two subfolders, each
containing between one and two items. This is so the tests are able to reliably
test the soft selector feature. The remaining folders, subfolders and items are
all created by the test.

Folders, subfolders and items are referred internally by their respective
index in the array. In addition, referring to an item requires also specifying
its subfolder index. Thus, the 1st folder refers to `folders[0]`, the 3rd
subfolder refers to `subfolders[2]` and the 1st item of the 2nd subfolder would
be `subfolders[2].items[0]`.

A major flaw with the structure of the current data set is that there is no
relationship between a given subfolder and its parent folder, making that
aspect of foldering untestable at present. Regardless, the structure of the
data set will have to be improved soon when the folder explorer is revamped to
support foldering similar to that found in computer filesystems.

## Asynchronous tests

Since all tests are asynchronous, this would *normally* mean that the test
specification would require receiving a callback that it would invoke upon
conclusion of the test. For instance:

    test.it("performs an async task", function (done) {
      driver.get('http://www.google.com');
      driver.findElement(By.name('q')).sendKeys('webdriver');
      driver.findElement(By.name('btnG')).click().then(function () {
        done();   // test finishes here
      } );
    } );

Mocha, however, offers a very convenient mechanism of handling asynchronous
test specifications whereby one only has to return the last promise in the test
sequence. Mocha automatically detects the returned value to be a promise and
hooks up the appropriate handlers to it and handles its result accordingly.
Example:

    test.it("performs an async task", function (done) {
      driver.get('http://www.google.com');
      driver.findElement(By.name('q')).sendKeys('webdriver');
      return driver.findElement(By.name('btnG')).click();
    } );

## Helper functions

Several helper functions were crafted to aid in the development of test
specifications. Each helper function serves a very specific purpose and has
very clearly defined contracts. In addition, they all return the result of the
last WebDriver operation, making them suitable to be the last statement in a
test specification.

A brief overview of each follows.

### `instantiateBrowser`

Creates a browser instance. Performs detection of the browser and extension
main windows. Times out if unable to find one or both windows and fails if a
window was found more than once.

### `destroyBrowser`

Important to always call whenever the browser instance created with
`instantiateBrowser` isn't needed anymore. If this function isn't invoked,
the browser instance will **not** be destroyed by the server. Destruction of
browser instances is explicit.

### `getElement`

Attempts to locate one and **only** one element via `XPath`. Fails if element
not found or more than one element found.

### `getLoader`

Locates the (AJAX) loader element of a given pane given by the variable `pane`.
`pane` can either be `PANE_EXPLORER` or `PANE_QUEUE`. Uses `getElement`.

### `getButton`

Locates a button given by a specified scope. Scope here refers to the HTML
attribute `data-sd-scope`. Uses `getElement`.

### `getInput`

Finds the HTML `input` element in the folder explorer, which is shown when a
folder is created or renaming is taking place. Uses `getElement`.

### `getFolder`

Retrieves the `li` element that contains a given folder. The folder is
specified by its index in the `folders` array.

### `getSubfolder`

Retrieves the `li` element that contains a given subfolder. The subfolder is
specified by its index in the `subfolders` array.

### `getItem`

Locates the nth item contained by a given subfolder. The item is specified by
its index in the `subfolders.items` array. (see the function `newSubfolder`)

### `getSearchResult`

Looks for a particular search result given by its index and returns it.

### `getSuggestionBox`

Retrieves the suggestion box present in the search results queue, if one
exists.

### `getSuggestionAddButton`

Retrieves the 'add' button of the suggestion box present in the search results
queue, if one exists.

### `getDismissalButton`

Locates the dismissal button of a particular search result given by its index.

### `getFolders`

Returns an array containing all folders. Array will be empty if no folders
found.

### `getSubfolders`

Returns an array containing all the subfolders of a specified folder. Folder is
given by its index.

### `getSearchResults`

Returns an array containing all the search result items. May be empty if no
search results found.

### `buttonEnabled`

Asserts whether a given button is enabled or not. The button is specified by
its scope (see `getButton`) and a flag, `enabled`, determines its expected
state. `enabled` is assumed to be true if **not** false.

### `createFolder`

Simulates the user clicking on the folder add button and typing the folder name
given by its descriptor in the `folders` array.

### `createSubfolder`

First selects the folder given by `fid` and then simulates the user clicking on
the contextual add button and typing the subfolder name given by its descriptor
in the `subfolders` array.

### `selectFolder`

Simulates the user clicking on a folder in the folder explorer. Verifies that
the folder is actually selected.

### `selectSubfolder`

Same as `selectFolder` for a given subfolder.

### `selectItem`

Same as `selectSubfolder` for a given item contained by a specified subfolder.

### `activateItem`

After selecting a given item, simulates the user moving the mouse over to the
item and double clicking on it to make it the active search query.

### `expandFolder`

Expands a given folder by double clicking on it. At the moment it does **not**
check to ensure that the folder isn't already expanded so may result in the
folder actually collapsing if already expanded.

### `expandSubfolder`

Expands a given subfolder by double clicking on it. At the moment it does
**not** check to ensure that the subfolder isn't already expanded so may result
in the subfolder actually collapsing if already expanded.

### `selectText`

Switches to the main browser window and selects the first `H1` element found
on the page of the active tab. Switches back to the extension window upon
completion. Text is selected by executing the script `inj.selectText` on the
browser.

### `dropInFolder`

Simulates a drop event on a given folder. This is done by executing the script
`inj.dropInFolder` on the browser that creates a `drop` event on the folder
element.

### `dropInSubfolder`

Simulates a drop event on a given subfolder. This is done by executing the
script `inj.dropInSubfolder` on the browser that creates a `drop` event on the
subfolder element.

### `waitUntilRequestsFinished`

Holds execution until AJAX requests finish. This is done by looking at elements
in the folder explorer containing the `jstree-loading` CSS class and holding
execution while elements exist.

### `waitUntilInputVisible`

Holds execution until an HTML `input` element is visible and available in the
folder explorer.

### `verifyFolders`

Ensures that only the folders specified by the array `coll` are presently
loaded. `coll` is expected to contain the indice(s) of each folder.

### `verifyItemsInSubfolder`

Similarly to `verifyFolders`, this function makes sure a specified subfolder
contains a given set of items. Items are specified by passing an array
containing indices.

### `verifyItemsInQueue`

Makes sure that the search results queue contains a given number of items.

### `verifySelected`

Ensures that the currently selected folder, subfolder or item's title matches a
given expectation.

### `renameFolder`

Selects a given folder and attempts to rename it to a specified name. Updates
the internal `folders` array.

### `renameSubfolder`

Selects a given subfolder and attempts to rename it to a specified name.
Updates the internal `subfolders` array.

### `renameItem`

Selects a given item and attempts to rename it to a specified name. Updates the
internal `subfolders.items` array.

### `removeFolder`

Removes a given folder, specified by its index.

### `removeSubfolder`

Removes a given subfolder, specified by its index.

### `removeItem`

Removes a given item, specified by its subfolder and item indices.

### `refreshExplorer`

Refreshes the contents of the folder explorer.

### `refreshSearchResults`

Refreshes the contents of the search results pane.

# TODO

-   Triggering of drop event on folder of an **image**
-   Triggering of drop event on subfolder of an **image**
-   Triggering of drop event on folder but no selection
-   Triggering of drop event on subfolder but no selection
