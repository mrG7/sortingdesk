/* var DEBUG = { id: 0 }; */

var PANE_EXPLORER = "sd-folder-explorer",
    PANE_QUEUE    = "sd-queue";

var TIMEOUT_POLL         = 100,
    TIMEOUT_POLL_WINDOWS = 5000,
    TIMEOUT_RUNNER       = 80000,     /* account for slow VMs */
    TIMEOUT_LOADER       = 40000,
    TIMEOUT_LOADER_SHOW  = 1000,
    TIMEOUT_QUEUE_ITEMS  = 1000,
    TIMEOUT_WAITREQUESTS = 50000,
    TIMEOUT_STALE        = 1000,
    TIMEOUT_BUTTON       = 1000,
    TIMEOUT_ALERT        = 500,
    TIMEOUT_ANIMATIONS   = 250;

var DISMISSAL_IGNORE    = 0,
    DISMISSAL_REDUNDANT = 1,
    DISMISSAL_WRONG     = 2;

var XPATH_TREE  = "//*[@id='sd-folder-explorer']/div/div/div",
    XPATH_QUEUE = "//*[@id='sd-queue']/div/div";

var TEST_LOCAL     = 0,
    TEST_SAUCELABS = 1,
    TEST_REMOTE    = 2;

var DEFAULT_PLATFORM = "Linux";

var test           = require("selenium-webdriver/testing"),
//    assert         = require("assert"),
    webdriver      = require("selenium-webdriver"),
    chrome         = require("selenium-webdriver/chrome"),
    firefox        = require("selenium-webdriver/firefox"),
    chai           = require("chai"),
    fs             = require("fs"),

    assert         = chai.assert,
    By             = webdriver.By,
    Key            = webdriver.Key,
    until          = webdriver.until;

var pathRoot     = __dirname + "/../..";

var browser, testType, testUrl,
    options = new chrome.Options();

var windowExt, windowMain;

var folders = [ newFolder(), newFolder(), newFolder('Soft selectors') ],
    subfolders = [
      newSubfolder([
        newItem("http://www.bbc.co.uk/news/world-asia-25034461",
                "Nepal's Maoists digest impending electoral wipe-out")]),
      newSubfolder([
        newItem("http://www.bbc.co.uk/news/world-asia-24059900",
                "Nepal strike shuts down capital Kathmandu")]),
      newSubfolder([
        newItem("http://en.wikipedia.org/wiki/Himalayas",
                "Himalayas")]),
      newSubfolder([
        newItem(null, "LOTS OF LEG0"),
        newItem(null, "LEGO minifigure")], "Lego"),
      newSubfolder([newItem(null, "Vintage~Star~Wars")], "Star Wars")
    ];

if(!fs.existsSync(pathRoot + "/out/sortingdesk.crx")) {
  console.error("Sorting Desk extension package not found");
  throw new Error("Sorting Desk extension package not found");
} else if(process.env.SELENIUM_SERVER_URL) {
  console.info("Testing on remote server");
  testType = TEST_REMOTE;
  testUrl = process.env.SELENIUM_SERVER_URL;
} else if(process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY){
  console.info("Testing on Sauce Labs");
  testType = TEST_SAUCELABS;
  testUrl = "http://ondemand.saucelabs.com:80/wd/hub";
} else {
  console.info("Testing locally");
  testType = TEST_LOCAL;
}

/* Configure  */
options.addExtensions(pathRoot + "/out/sortingdesk.crx");

/* Test specs */
test.describe("Sorting Desk -- E2E", function () {

  this.timeout(TIMEOUT_RUNNER);

  test.describe("Functionality", function () {

    test.beforeEach(function (done) {
      instantiateBrowser(done);
    } );

    test.afterEach(function () {
      destroyBrowser();
    } );

    test.it("loads one folder", function () {
      return verifyFolders( [ 2 ] );
    } );

    test.it("creates a folder", function () {
      return createFolder(0);
    } );

    test.it("disallows creation of duplicate folders", function () {
      createFolder(0);
      return selectFolder(0);
    } );

    test.it("loads two folders", function () {
      return verifyFolders( [ 0, 2 ] );
    } );

    test.it("creates a (manual) subfolder", function () {
      createSubfolder(0, 0);
      return selectSubfolder(0);
    } );

    test.it("adds a snippet of text via drag and drop", function () {
      createSubfolder(0, 0);
      selectSubfolder(0);

      browser.switchTo().window(windowMain);
      browser.get(subfolders[0].items[0].url);
      selectText('h1');
      browser.switchTo().window(windowExt);
      dropInSubfolder(0);
      return verifyItemsInSubfolder(0, [ 0 ]);
    } );

    test.it("adds a snippet of text manually", function () {
      createFolder(1);
      createSubfolder(1, 1);
      selectSubfolder(1);

      browser.switchTo().window(windowMain);
      browser.get(subfolders[1].items[0].url);
      selectText('h1');
      browser.switchTo().window(windowExt);
      dropInSubfolder(1);
      return verifyItemsInSubfolder(1, [ 0 ]);
    } );

    test.it("creates a subfolder and adds an item", function () {
      browser.switchTo().window(windowMain);
      browser.get(subfolders[2].items[0].url);
      selectText('h1');
      browser.switchTo().window(windowExt);
      dropInFolder(0);
      waitUntilInputVisible();
      return getInput().then(function (i) {
        i.sendKeys(subfolders[2].title, Key.ENTER);
        verifyItemsInSubfolder(2, [ 0 ]);
      } );
    } );

    test.it("loads three folders", function () {
      return verifyFolders( [ 0, 1, 2 ] );
    } );

    test.it("doesn't load any items", function () {
      verifyItemsInSubfolder(0, []);
      verifyItemsInSubfolder(1, []);
      verifyItemsInSubfolder(2, []);
      verifyItemsInSubfolder(3, []);
      return verifyItemsInSubfolder(4, []);
    } );

    test.it("loads expected items when first subfolder expanded", function () {
      expandSubfolder(0);
      return verifyItemsInSubfolder(0, [0]);
    } );

    test.it("loads expected items when second subfolder expanded", function () {
      expandSubfolder(0);
      expandSubfolder(1);
      verifyItemsInSubfolder(0, [0]);
      return verifyItemsInSubfolder(1, [0]);
    } );

    test.it("loads expected items when third subfolder expanded", function () {
      expandSubfolder(0);
      expandSubfolder(1);
      expandSubfolder(2);
      verifyItemsInSubfolder(0, [0]);
      verifyItemsInSubfolder(1, [0]);
      return verifyItemsInSubfolder(2, [0]);
    } );

    test.it("doesn't load search results on load", function () {
      return verifyItemsInQueue(0);
    } );

    test.it("loads search results when subfolder expanded", function () {
      expandSubfolder(0);
      return verifyItemsInQueue(5);
    } );

    test.it("selects item", function () {
      expandSubfolder(0);
      expandSubfolder(1);
      selectItem(1, 0);
      return verifyItemsInQueue(5, false);
    } );

    test.it("selects two items sequentially", function () {
      expandSubfolder(0);
      expandSubfolder(1);
      selectItem(1, 0);
      expandSubfolder(2);
      selectItem(2, 0);
      return verifyItemsInQueue(5, false);
    } );

    test.it("manually activates an item", function () {
      expandSubfolder(0);       /* this folder's item is made active */
      expandSubfolder(1);
      verifyItemsInQueue(5);
      return getSearchResult(0).then(function (i) {
        activateItem(1, 0);
        browser.wait(until.stalenessOf(i), TIMEOUT_STALE);
        verifyItemsInQueue(4);
      } );
    } );

    test.it("manually activates two items sequentially", function () {
      expandSubfolder(0);
      expandSubfolder(1);
      expandSubfolder(2);
      verifyItemsInQueue(5, false);
      return getSearchResult(0).then(function (i) {
        activateItem(1, 0);
        browser.wait(until.stalenessOf(i), TIMEOUT_STALE);
        verifyItemsInQueue(4);

        return getSearchResult(1).then(function (j) {
          activateItem(2, 0);
          browser.wait(until.stalenessOf(j), TIMEOUT_STALE);
          verifyItemsInQueue(4);
        } );
      } );
    } );

    test.it("refreshes the folder explorer", function () {
      expandSubfolder(0);
      verifyItemsInQueue(5);
      refreshExplorer();
      verifyItemsInQueue(0);
      expandSubfolder(0);
      return verifyItemsInQueue(5);
    } );

    test.it("refreshes the search results", function () {
      expandSubfolder(0);
      verifyItemsInQueue(5);
      return getSearchResults().then(function (c) {
        getButton("sorting-desk-toolbar-refresh-search").then(function (b) {
          b.click();
          c.forEach(function (r) {
            browser.wait(until.stalenessOf(r), TIMEOUT_STALE);
          } );

          verifyItemsInQueue(5, false);
        } );
      } );
    } );

    test.it("shows the suggestion box", function () {
      expandSubfolder(4);
      verifyItemsInQueue(4);
      return getSuggestionBox();
    } );

    test.it("shows the suggestion box's add button on hover", function () {
      expandSubfolder(4);
      verifyItemsInQueue(4);
      return getSuggestionAddButton();
    } );

    test.it("does not add soft selectors if folder not selected", function () {
      expandSubfolder(4);
      verifyItemsInQueue(4);
      getSuggestionAddButton().then(function (b) { b.click(); } );
      return browser.wait(until.alertIsPresent(), TIMEOUT_ALERT);
    } );

    test.it("adds the soft selectors when folder selected", function () {
      expandSubfolder(4);
      verifyItemsInQueue(4);
      selectFolder(1);
      return getSuggestionAddButton().then(function (b) {
        b.click();
        waitUntilRequestsFinished();
        getSubfolders(1).then(function (i) {
          assert.equal(i.length, 2);
        } );
      } );
    } );

    test.it("shows a search result's dismissal button on hover", function () {
      expandSubfolder(4);
      verifyItemsInQueue(4);
      return getDismissalButton(0);
    } );

    test.it("dismisses item -- ignore", function () {
      expandSubfolder(4);
      verifyItemsInQueue(4);

      return getSearchResult(0).then(function(i) {
        getDismissalButton(0).then(function (b) {
          b.click();
          browser.sleep(TIMEOUT_ANIMATIONS);
          b.click();
          browser.sleep(TIMEOUT_ANIMATIONS);
          browser.wait(until.stalenessOf(i), TIMEOUT_STALE);
          verifyItemsInQueue(3);
        } );
      } );
    } );

    test.it("dismisses item -- wrong", function () {
      expandSubfolder(4);
      verifyItemsInQueue(3);

      return getSearchResult(0).then(function (i) {
        getDismissalButton(0).then(function (b) {
          b.click();
          browser.sleep(TIMEOUT_ANIMATIONS);

          getDismissalButton(0, DISMISSAL_REDUNDANT).then(function (b2) {
            b2.click();
            browser.sleep(TIMEOUT_ANIMATIONS);
            browser.wait(until.stalenessOf(i), TIMEOUT_STALE);
            verifyItemsInQueue(2);
          } );
        } );
      } );
    } );

    test.it("dismisses item -- duplicate", function () {
      expandSubfolder(4);
      verifyItemsInQueue(2);

      return getSearchResult(0).then(function (i) {
        getDismissalButton(0).then(function (b) {
          b.click();
          browser.sleep(TIMEOUT_ANIMATIONS);

          getDismissalButton(0, DISMISSAL_REDUNDANT).then(function (b2) {
            b2.click();
            browser.sleep(TIMEOUT_ANIMATIONS);
            browser.wait(until.stalenessOf(i), TIMEOUT_STALE);
            verifyItemsInQueue(1);
          } );
        } );
      } );
    } );

  } );

  test.describe("Toolbar -- state", function () {

    test.before(function (done) {
      instantiateBrowser(done);
    } );

    test.after(function () {
      destroyBrowser();
    } );

    test.describe("folder", function () {

      test.before(function () {
        return selectFolder(0);
      } );

      test.it("add is enabled", function () {
        return buttonEnabled('sorting-desk-toolbar-add');
      } );

      test.it("report is enabled", function () {
        return buttonEnabled('sorting-desk-toolbar-report');
      } );

      test.it("sub-add is enabled", function () {
        return buttonEnabled('sorting-desk-toolbar-add-contextual');
      } );

      test.it("rename is enabled", function () {
        return buttonEnabled('sorting-desk-toolbar-rename');
      } );

      test.it("remove is enabled", function () {
        return buttonEnabled('sorting-desk-toolbar-remove');
      } );

      test.it("navigate is disabled", function () {
        return buttonEnabled('sorting-desk-toolbar-jump', false);
      } );

      test.it("explorer refresh is enabled", function () {
        return buttonEnabled('sorting-desk-toolbar-refresh-explorer');
      } );

      test.it("queue refresh is disabled", function () {
        return buttonEnabled('sorting-desk-toolbar-refresh-search', false);
      } );
    } );

    test.describe("subfolder", function () {

      test.describe("expanded", function () {

        test.before(function () {
          expandSubfolder(0);
          return verifyItemsInQueue(5);
        } );

        test.it("add is enabled", function () {
          return buttonEnabled('sorting-desk-toolbar-add');
        } );

        test.it("report is disabled", function () {
          return buttonEnabled('sorting-desk-toolbar-report', false);
        } );

        test.it("sub-add is enabled", function () {
          return buttonEnabled('sorting-desk-toolbar-add-contextual');
        } );

        test.it("rename is enabled", function () {
          return buttonEnabled('sorting-desk-toolbar-rename');
        } );

        test.it("remove is enabled", function () {
          return buttonEnabled('sorting-desk-toolbar-remove');
        } );

        test.it("navigate is disabled", function () {
          return buttonEnabled('sorting-desk-toolbar-jump', false);
        } );

        test.it("explorer refresh is enabled", function () {
          return buttonEnabled('sorting-desk-toolbar-refresh-explorer');
        } );

        test.it("queue refresh is enabled", function () {
          return buttonEnabled('sorting-desk-toolbar-refresh-search');
        } );
      } );

      test.describe("not expanded", function () {

        test.before(function () {
          return selectSubfolder(1);
        } );

        test.it("add is enabled", function () {
          return buttonEnabled('sorting-desk-toolbar-add');
        } );

        test.it("report is disabled", function () {
          return buttonEnabled('sorting-desk-toolbar-report', false);
        } );

        test.it("sub-add is disabled", function () {
          return buttonEnabled('sorting-desk-toolbar-add-contextual', false);
        } );

        test.it("rename is disabled", function () {
          return buttonEnabled('sorting-desk-toolbar-rename', false);
        } );

        test.it("remove is disabled", function () {
          return buttonEnabled('sorting-desk-toolbar-remove', false);
        } );

        test.it("navigate is disabled", function () {
          return buttonEnabled('sorting-desk-toolbar-jump', false);
        } );

        test.it("explorer refresh is enabled", function () {
          return buttonEnabled('sorting-desk-toolbar-refresh-explorer');
        } );

        test.it("queue refresh is enabled", function () {
          return buttonEnabled('sorting-desk-toolbar-refresh-search');
        } );
      } );

    } );

    test.describe("item", function () {

      test.before(function () {
        expandSubfolder(1);
        return selectItem(1, 0);
      } );

      test.it("add is enabled", function () {
        return buttonEnabled('sorting-desk-toolbar-add');
      } );

      test.it("report is disabled", function () {
        return buttonEnabled('sorting-desk-toolbar-report', false);
      } );

      test.it("sub-add is disabled", function () {
        return buttonEnabled('sorting-desk-toolbar-add-contextual', false);
      } );

      test.it("rename is enabled", function () {
        return buttonEnabled('sorting-desk-toolbar-rename');
      } );

      test.it("remove is enabled", function () {
        return buttonEnabled('sorting-desk-toolbar-remove');
      } );

      test.it("navigate is enabled", function () {
        return buttonEnabled('sorting-desk-toolbar-jump');
      } );

      test.it("explorer refresh is enabled", function () {
        return buttonEnabled('sorting-desk-toolbar-refresh-explorer');
      } );

      test.it("queue refresh is enabled", function () {
        return buttonEnabled('sorting-desk-toolbar-refresh-search');
      } );
    } );

  } );

  test.describe("renaming/removing", function () {

    test.beforeEach(function (done) {
      instantiateBrowser(done);
    } );

    test.afterEach(function () {
      destroyBrowser();
    } );

    test.it("renames a folder", function () {
      renameFolder(0, 'RENAMED-' + folders[0].title);
      refreshExplorer();
      return getFolder(0);
    } );

    test.it("renames a subfolder", function () {
      renameSubfolder(0, 'RENAMED-' + subfolders[0].title);
      refreshExplorer();
      return getSubfolder(0);
    } );

    test.it("renames an item", function () {
      renameItem(2, 0, 'RENAMED-' + subfolders[2].items[0].title);
      refreshExplorer();
      expandSubfolder(2);
      return getItem(2, 0);
    } );

    test.it("removes an item", function () {
      removeItem(2, 0);
      refreshExplorer();
      return getItem(2, 0).then(function () { throw "Item should not exist"; },
                                function () { });
    } );

    test.it("removes a subfolder", function () {
      removeSubfolder(2);
      refreshExplorer();
      return getSubfolder(2).then(
        function () { throw "Subfolder should not exist"; },
        function () { }
      );
    } );

    test.it("removes a folder", function () {
      removeFolder(0);
      refreshExplorer();
      return getFolder(0).then(
        function () { throw "Folder should not exist"; },
        function () { }
      );
    } );

  } );

  test.describe("Toolbar -- blank state", function () {

    test.before(function (done) {
      instantiateBrowser(done);

      /* Remove remaining folders. */
      removeFolder(1);
      removeFolder(2);
    } );

    test.after(function () {
      destroyBrowser();
    } );

    test.it("add is enabled", function () {
      return buttonEnabled('sorting-desk-toolbar-add');
    } );

    test.it("report is disabled", function () {
      return buttonEnabled('sorting-desk-toolbar-report', false);
    } );

    test.it("sub-add is disabled", function () {
      return buttonEnabled('sorting-desk-toolbar-add-contextual', false);
    } );

    test.it("rename is disabled", function () {
      return buttonEnabled('sorting-desk-toolbar-rename', false);
    } );

    test.it("remove is disabled", function () {
      return buttonEnabled('sorting-desk-toolbar-remove', false);
    } );

    test.it("navigate is disabled", function () {
      return buttonEnabled('sorting-desk-toolbar-jump', false);
    } );

    test.it("explorer refresh is enabled", function () {
      return buttonEnabled('sorting-desk-toolbar-refresh-explorer');
    } );

    test.it("queue refresh is disabled", function () {
      return buttonEnabled('sorting-desk-toolbar-refresh-search', false);
    } );
  } );

} );

/* Meta functions */
function generateId(prefix, id)
{
  return id !== undefined ? id
    : typeof DEBUG !== 'undefined'
      ? prefix + '-' + DEBUG.id++
      : generateGuid();
}

function newFolder(id)
{
  id = generateId('folder', id);
  return { id: id, title: id };
}

function newSubfolder(i, id)
{
  id = generateId('subfolder', id);
  return { id: id, title: id, items: i };
}

function newItem(u, t)
{
  return { url: u, title: t };
}

/* From: http://stackoverflow.com/a/105074/3001914 . */
function generateGuid ()  /* Note: function can't be assigned to var. */
{
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-'
    + s4() + s4() + s4();
}

/* Injectable scripts */
var inj = {
  dropInFolder: function (name)
  {
    var ev, t;

    t = document.evaluate(
      "//*[@id='sd-folder-explorer']/div/div/div/ul/li//*[text()[contains(.,'"
        + name + "')]]", document, null, XPathResult.ANY_TYPE, null)
      .iterateNext();
    if(!t) return;

    ev = document.createEvent("MouseEvents");
    ev.initMouseEvent("drop", true, true, window, 0);
    t.dispatchEvent(ev);
  },

  dropInSubfolder: function (name)
  {
    var ev, t;

    t = document.evaluate(
      "//*[@id='sd-folder-explorer']/div/div/div/ul/li/ul/li//*[text()[contains(.,'"
        + name + "')]]", document, null, XPathResult.ANY_TYPE, null)
      .iterateNext();
    if(!t) return;

    ev = document.createEvent("MouseEvents");
    ev.initMouseEvent("drop", true, true, window, 0);
    t.dispatchEvent(ev);
  },

  selectText: function (tag, index)
  {
    var el = document.getElementsByTagName(tag)[index || 0],
        sel = window.getSelection(),
        range = document.createRange();

    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
  }
};

/* Helper methods */
var instantiateBrowser = function (done)
{
  /* Detect main and extension windows. */
  windowMain = windowExt = null;

  var capabilities = webdriver.Capabilities.chrome();
  capabilities.set("name", "Sorting Desk");

  if(testType === TEST_SAUCELABS) {
    capabilities.set("username", process.env.SAUCE_USERNAME);
    capabilities.set("accessKey", process.env.SAUCE_ACCESS_KEY);
    capabilities.set("platform", process.env.PLATFORM || DEFAULT_PLATFORM);
  }

  browser = new webdriver.Builder();
  if(testUrl) browser.usingServer(testUrl);
  browser = browser.withCapabilities(capabilities)
    .setChromeOptions(options)
    .build();

  var iter = 0;
  var poll = function () {
    browser.sleep(TIMEOUT_POLL).then(function () {
      var count = 0;

      if((iter += TIMEOUT_POLL) > TIMEOUT_POLL_WINDOWS)
        throw "Timed out polling for windows";

      browser.getAllWindowHandles().then(function (windows) {
        if(windows.length < 2) {
          poll();
          return;
        }

        windows.forEach(function (win) {
          ++count;

          browser.switchTo().window(win);
          browser.getTitle().then(function (title) {
            /* Detect windows only once. */
            if(title === "Sorting Desk") {
              assert.equal(windowExt, null);
              windowExt = win;
            } else {
              assert.equal(windowMain, null);
              windowMain = win;
            }

            if(--count === 0) {
              assert.notEqual(windowMain, null);
              assert.notEqual(windowExt,  null); /* assert not needed */
              assert.notEqual(windowMain, windowExt);

              browser.switchTo().window(windowExt);
              getLoader(PANE_EXPLORER).then(function (l) {
                browser.wait(until.elementIsNotVisible(l), TIMEOUT_LOADER)
                  .then(function () { done(); },
                        function () { throw "Loader element not found"; } );
              } );
            }
          } );
        } );
      } );
    } );
  };

  poll();
};

var destroyBrowser = function ()
{
  browser.quit();
  browser = windowMain = windowExt = null;
};

var getElement = function (xpath)
{
  xpath = By.xpath(xpath);
  return browser.findElements(xpath)
    .then(function (c) {
      assert.equal(c.length, 1);
      return c[0];
    });
//    .then(function (c) { assert.notEqual(c.length, 0); });
};

var getLoader = function (pane)
{
  return getElement("//*[@id='" + pane + "']/*[@class='sd-loading']");
};

var getButton = function (scope)
{
  return getElement("//*[@data-sd-scope='" + scope + "']");
};

var getInput = function ()
{
  return getElement("//*[@id='sd-folder-explorer']//input");
};

var getFolder = function (fid)
{
  return getElement(XPATH_TREE + "/ul/li/*[text()[contains(.,'"
                    + folders[fid].title + "')]]");
};

var getSubfolder = function (sid)
{
  return getElement(XPATH_TREE + "/ul/li/ul/li/*[text()[contains(.,'"
                    + subfolders[sid].title + "')]]");
};

var getItem = function (sid, iid)
{
  var sf = subfolders[sid];
  return getElement(XPATH_TREE + "/ul/li/ul/li/*[text()[contains(.,'"
                    + sf.title + "')]]/../ul/li/*[text()[contains(.,'"
                    + sf.items[iid].title + "')]]");
};

var getSearchResult = function (index)
{
  return getElement(XPATH_QUEUE + "/*[@data-scope='text-item']["
                    + (index + 1) + "]");
};

var getSuggestionBox = function ()
{
  return getElement(XPATH_QUEUE + "/*[@id='sd-suggestion']");
};

var getSuggestionAddButton = function ()
{
  return getSuggestionBox().then(function (b) {
    browser.actions()
      .mouseMove(b)
      .perform();

    return b.findElement(By.xpath(".//button")).then(function (c) {
      browser.wait(until.elementIsVisible(c), TIMEOUT_BUTTON);
      return c;
    } );
  } );
};

var getDismissalButton = function (rid, did)
{
  return getSearchResult(rid).then(function (r) {
    switch(did || DISMISSAL_IGNORE) {
    case DISMISSAL_IGNORE:
      browser.actions()
        .mouseMove(r)
        .perform();

      return r.findElement(By.className("sd-text-item-close"))
        .then(function (c) {
          browser.wait(until.elementIsVisible(c), TIMEOUT_BUTTON);
          return c;
        } );

    case DISMISSAL_REDUNDANT:
      return r.findElement(By.xpath(".//button[@data-id='redundant']"));

    case DISMISSAL_WRONG:
      return r.findElement(By.xpath(".//button[@data-id='wrong']"));

    default:
      throw "Invalid dismissal button id";
    }
  } );
};

var getFolders = function ()
{
  return browser.findElements(By.xpath(XPATH_TREE + "/ul/li"));
};

var getSubfolders = function (fid)
{
  return browser.findElements(
    By.xpath(XPATH_TREE + "/ul/li/*[text()[contains(.,'"
             + folders[fid].title + "')]]/../ul/li"));
};

var getSearchResults = function ()
{
  return browser.findElements(
    By.xpath(XPATH_QUEUE + "/*[@data-scope='text-item']"));
};

var buttonEnabled = function (scope, enabled)
{
  return getButton(scope).then(function (b) {
    b.getAttribute("className").then(function (value) {
      if(enabled !== false) assert.equal   (value.indexOf(' disabled'), -1);
      else                  assert.notEqual(value.indexOf(' disabled'), -1);
    } );
  } );
};

var createFolder = function (fid)
{
  return getButton('sorting-desk-toolbar-add').then(function (b) {
    b.click();
    getInput().then(function (i) {
      i.sendKeys(folders[fid].title, Key.ENTER);
      return getFolder(fid);
    } );
  } );
};

var createSubfolder = function (fid, sid)
{
  selectFolder(fid);
  return getButton('sorting-desk-toolbar-add-contextual').then(function (el) {
    el.getAttribute("className").then(function (value) {
      assert.equal(value.indexOf(' disabled'), -1);
      el.click();
      getInput().then(function (i) {
        i.sendKeys(subfolders[sid].title, Key.ENTER);
        return getSubfolder(sid);
      } );
    } );
  } );
};

var selectFolder = function (fid)
{
  return getFolder(fid).then(function (f) {
    f.click();
    verifySelected(folders[fid].title);
  } );
};

var selectSubfolder = function (sid)
{
  return getSubfolder(sid).then(function (sf) {
    sf.click();
    verifySelected(subfolders[sid].title);
  } );
};

var selectItem = function (sid, iid)
{
  return getItem(sid, iid).then(function (i) {
    i.click();
    verifySelected(subfolders[sid].items[iid].title);
  } );
};

var activateItem = function (sid, iid)
{
  selectItem(sid, iid);
  return getItem(sid, iid).then(function (i) {
    browser.actions()
      .mouseMove(i)
      .doubleClick()
      .perform();
  } );
};

var expandFolder = function (sid)
{
  return getFolder(sid).then(function (f) {
    browser.actions()
      .mouseMove(f[0])
      .doubleClick()
      .perform();
  } );
};

var expandSubfolder = function (sid)
{
  getSubfolder(sid).then(function (f) {
    browser.actions()
      .mouseMove(f)
      .doubleClick()
      .perform();
  } );

  return waitUntilRequestsFinished();
};

var selectText = function (tag)
{
  browser.switchTo().window(windowMain);
  browser.executeScript(inj.selectText, tag);
  return browser.switchTo().window(windowExt);
};

var dropInFolder = function (fid)
{
  return browser.executeScript(inj.dropInFolder, folders[fid].title);
};

var dropInSubfolder = function (sid)
{
  return browser.executeScript(inj.dropInSubfolder, subfolders[sid].title);
};

var waitUntilRequestsFinished = function ()
{
  browser.sleep(100);
  return browser.wait(new until.Condition(
    "Waiting for AJAX requests to finish",
    function (driver) {
      return driver.findElements(
        By.xpath("//*[contains(@class, 'jstree-loading')]"))
        .then(function (els) {
          return els.length === 0;
        } );
    } ), TIMEOUT_WAITREQUESTS);
};

var waitUntilInputVisible = function ()
{
  browser.wait(new until.Condition(
    "Waiting for input element to be visible",
    function (driver) {
      return driver.findElements(
        By.xpath("//*[@id='sd-folder-explorer']//input"))
        .then(function (i) {
          return i.length > 0;
        } );
    } ), TIMEOUT_WAITREQUESTS);

  return getInput().then(function (i) {
    i.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.DELETE);
  } );
};

var verifyFolders = function (coll)
{
  return getFolders().then(function (i) {
    assert.equal(i.length, coll.length);
    i.forEach(function (j) {
      j.findElement(By.xpath("a")).getText().then(function (text) {
        assert.notEqual(coll.length, 0);
        removeByTitle(folders, coll, text);
      } );
    } );
  } ).then(function () {
    assert.equal(coll.length, 0);
  } );
};

var verifyItemsInSubfolder = function (sid, items)
{
  waitUntilRequestsFinished();
  return getSubfolder(sid).then(function (el) {
    el.findElements(By.xpath("../ul/li")).then(function (els) {
      assert.equal(items.length, els.length);
      els.forEach(function (i) {
        i.getText().then(function (text) {
          assert.notEqual(items.length, 0);
          removeByTitle(subfolders[sid].items, items, text);
        } );
      } );
    } );
  } ).then(function () {
    assert.equal(items.length, 0);
  } );
};

var verifyItemsInQueue = function (count, wait)
{
  var check_ = function () {
    waitUntilRequestsFinished();
    return getLoader(PANE_QUEUE).then(function (l) {
      browser.wait(until.elementIsNotVisible(l), TIMEOUT_LOADER);
      if(count > 0) {
        browser.wait(until.elementsLocated(
          By.xpath(XPATH_QUEUE + "/*[@data-scope='text-item'][" +
                   count + "]")), TIMEOUT_QUEUE_ITEMS);
      }

      browser.findElements(
        By.xpath(XPATH_QUEUE + "/*[@data-scope='text-item']"))
        .then(function (i) { assert.equal(i.length, count); } );
    } );
  };


  if(wait !== false) {
    return getLoader(PANE_QUEUE).then(function (l) {
      browser.wait(until.elementIsVisible(l),
                          TIMEOUT_LOADER_SHOW)
        .then(check_,
              function () { assert.equal(0, count); } );
    } );
  }

  return check_();
};

var verifySelected = function (title)
{
  return browser.findElements(
    By.xpath(XPATH_TREE + "//*[@aria-selected='true']/a"))
    .then(function (els) {
      assert.equal(els.length, 1);
      els[0].getText().then(function (text) {
        assert.equal(title, text);
      } );
    } );
};

var removeByTitle = function (cl, cr, title)
{
  var ndx = -1;

  cr.some(function (j, i) {
    if(cl[j].title === title) { ndx = i; return true; }
    return false;
  } );

  assert.notEqual(ndx, -1);
  if(ndx >= 0) cr.splice(ndx, 1);
};

var renameFolder = function (fid, title)
{
  selectFolder(fid);
  getButton('sorting-desk-toolbar-rename').then(function (b) {
    browser.wait(until.elementIsEnabled(b), TIMEOUT_BUTTON);
  } );
  return getButton('sorting-desk-toolbar-rename').then(function (b) {
    b.click();
    folders[fid].title = title;
    getInput().then(function (i) { i.sendKeys(title, Key.ENTER); } );
    waitUntilRequestsFinished();
    return getFolder(fid);
  } );
};

var renameSubfolder = function (sid, title)
{
  expandSubfolder(sid);
  getButton('sorting-desk-toolbar-rename').then(function (b) {
    browser.wait(until.elementIsEnabled(b), TIMEOUT_BUTTON);
  } );
  return getButton('sorting-desk-toolbar-rename').then(function (b) {
    b.click();
    subfolders[sid].title = title;
    getInput().then(function (i) { i.sendKeys(title, Key.ENTER); } );
    waitUntilRequestsFinished();
    return getSubfolder(sid);
  } );
};

var renameItem = function (sid, iid, title)
{
  expandSubfolder(sid);
  selectItem(sid, iid);
  getButton('sorting-desk-toolbar-rename').then(function (b) {
    browser.wait(until.elementIsEnabled(b), TIMEOUT_BUTTON);
  } );
  return getButton('sorting-desk-toolbar-rename').then(function (b) {
    b.click();
    subfolders[sid].items[iid].title = title;
    getInput().then(function (i) { i.sendKeys(title, Key.ENTER); } );
    waitUntilRequestsFinished();
    return getItem(sid, iid);
  } );
};

var removeFolder = function (fid)
{
  selectFolder(fid);
  getButton('sorting-desk-toolbar-remove').then(function (b) {
    browser.wait(until.elementIsEnabled(b), TIMEOUT_BUTTON);
  } );
  return getButton('sorting-desk-toolbar-remove').then(function (b) {
    b.click();
    waitUntilRequestsFinished();
    return getFolder(fid).then(
      function () { throw "Folder should not exist"; },
      function () { }
    );
  } );
};

var removeSubfolder = function (sid)
{
  expandSubfolder(sid);
  getButton('sorting-desk-toolbar-remove').then(function (b) {
    browser.wait(until.elementIsEnabled(b), TIMEOUT_BUTTON);
  } );
  return getButton('sorting-desk-toolbar-remove').then(function (b) {
    b.click();
    waitUntilRequestsFinished();
    return getSubfolder(sid).then(
      function () { throw "Subfolder should not exist"; },
      function () { }
    );
  } );
};

var removeItem = function (sid, iid)
{
  expandSubfolder(sid);
  selectItem(sid, iid);
  getButton('sorting-desk-toolbar-remove').then(function (b) {
    browser.wait(until.elementIsEnabled(b), TIMEOUT_BUTTON);
  } );
  return getButton('sorting-desk-toolbar-remove').then(function (b) {
    b.click();
    waitUntilRequestsFinished();
    return getItem(sid, iid).then(
      function () { throw "Item should not exist"; },
      function () { }
    );
  } );
};

var refreshExplorer = function ()
{
  return getFolders().then(function (c) {
    getButton("sorting-desk-toolbar-refresh-explorer").then(function (b) {
      b.click();
      c.forEach(function (f) {
        browser.wait(until.stalenessOf(f), TIMEOUT_STALE);
      } );
    } );
  } );
};