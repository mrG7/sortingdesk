var test           = require('selenium-webdriver/testing'),
    assert         = require('assert'),
    webdriver      = require('selenium-webdriver'),
    chrome         = require('selenium-webdriver/chrome'),
    chai           = require('chai'),

    expect         = chai.expect,
    By             = webdriver.By,
    Key            = webdriver.Key,
    until          = webdriver.until;

var pathRoot = __dirname + '/../..',
    browser,
    capabilities = webdriver.Capabilities.chrome(),
    options = new chrome.Options();

var windowExt,
    windowMain;


/* Configure  */
options.addArguments("load-extension=" + pathRoot
                     + '/src/browser/extensions/chrome');

/* Test specs */
test.describe('Sorting Desk -- E2E', function () {

  this.timeout(15000);

  test.beforeEach(function (done) {

    /* Detect main and extension windows. */
    windowMain = windowExt = null;
    browser = new webdriver.Builder().usingServer()
      .withCapabilities(capabilities)
      .setChromeOptions(options)
      .build();

    browser.sleep(500).then(function () {
      var count = 0;

      browser.getAllWindowHandles()
        .then(function (windows) {
          windows.forEach(function (win) {
            ++count;

            browser.switchTo().window(win);
            browser.getTitle().then(function (title) {
              /* Detect windows only once. */
              if(title === 'Sorting Desk') {
                assert.equal(windowExt, null);
                windowExt = win;
              } else {
                assert.equal(windowMain, null);
                windowMain = win;
              }

              if(-- count === 0) {
                assert.notEqual(windowMain, null);
                assert.notEqual(windowExt,  null);
                assert.notEqual(windowMain, windowExt);
                done();
              }
            } );
          } );
        } );
    } );
  } );

  test.afterEach(function () {
    browser.quit();
  } );

/*   test.it('extension window opens', function () { */
/*     return browser.switchTo().window(windowExt); */
/*   } ); */

  test.it('test', function () {
    browser.switchTo().window(windowMain);
    browser.get('http://www.bbc.co.uk/news/world-asia-25034461');

    browser.findElement(By.tagName("h1")).then(function (el) {
      console.log("executing");
      browser.actions()
        .mouseMove(el, { x: 0, y: 0 })
        .mouseDown(el)
        .mouseMove(el, { x: 500, y: 500 })
        .mouseUp(el)
        .perform();

      console.log("sleeping");
      browser.sleep(3500);
    } );
  } );

} );


 /* Helper methods */