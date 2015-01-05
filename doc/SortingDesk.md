Drag-and-Drop sorting desk UI
=============================
The main purpose of this interface is to enable a user to sort an unending 
stream of short texts into visual bins on the page. Some of these bins are
"primary," which are distinguished from other bins on the page by its bigger 
size and the presence of sub-bins *inside* of it. All other bins are smaller 
and contain no visual sub-bins. These are called secondary bins.

The interface should include an element that allows users to add new sub-bins 
and new secondary sub-bins to the page.

Here are a few user stories that should motivate the design of the UI:

**User Story 1:** User has a never-ending list of short texts (similar to
tweets) and needs to sort them into bins by dragging-and-dropping the
items out of the list and into visual areas on the screen. This process should
be fast, and so should be supported by keyboard shortcuts in addition to the 
drag-and-drop interface. As the user advances through the list, it should 
scroll automatically.  The top item in the list should be highlighted, so 
the user can simply click any of the visible bins or sub-bins to put the 
item there and advance to the next in the list.  

**User Story 2:** Primary bins have a second level of bins inside
them, and the user needs to select a primary bin and then select a sub-bin
in order to sort an item into that bin.  If the user selects only a top 
level bin, then the item is not in a sub-bin.  If the user drags an item 
into bin and then into a sub-bin, it gets removed from the bin and added 
to the sub-bin.  (A simple initial version of this library can assume that 
items are only in one bin or sub-bin.)

**User Story 3:** The user may wish to scroll back to previous items and
change their bin assignments. The user interface displays a note next to
an item indicating which bin the item is currently assigned to, and allows the
user to drag the item to another bin to change its assignment.

**User Story 4:** When the user assigns an item to a bin, the visual
display of the bin can change to show more information about the bin's
current state, such as number of items that have been sorted into the
bin.  This might require querying a server, since multiple people may
be sorting into the same bin at the same time. (Note that the first version
does not have to support showing the results from multiple editors in the
interface.)

**User Story 5:** A user may want to add sub-bins to a primary bin.

**User Story 6:** A user may want to add secondary bins to the page. Adding a 
secondary bin may require contacting a server.

**User Story 7:** A user may want to put an item into *more than one*
bin, or more than one sub-bin.  This requires the UI to allow the user
to see which bins (or sub-bins) an item has been put, and add/remove
from each bin/sub-bin.


Overall Visual Design
---------------------
As illustrated in the attached figure, the sorting tool consists of
simple rectangular drop regions surrounding a single list area that
shows a list of items.

On the left side of the list is the primary target bin called target0,
which is a two-tiered bin with sub-bins inside of it.  The list of
sub-bins includes a special drop area that *creates* a new sub-bin.

On the right side of the list is a grid of several alternative
secondary bins, called target1, target2, ..., targetN.  These are simple
bins that do not show any sub-bins.

While the user stories support having multiple primary bins, a first version of 
this UI could assume there is exactly one primary bin.


Programmatic Interface
----------------------
We want a simple pure JavaScript library (compatible with RequireJS) that 
provides the following classes and methods. Note that this first version of the 
interface does not support all user stories (like having multiple primary 
bins).

`SortingDesk(node, options, callbacks)`:
**Constructor** that renders the UI in the DOM node given. The parameters will 
provide callback functions that the UI can use to read and write data.

The `options` parameter is an object with the following keys:

- *primaryContentId* - An identifier that represents the primary bin. This will 
  not change throughout the lifetime of a page.
- *secondaryContentIds* - An array of identifiers that represents all secondary 
  bins. This array may be expanded by the user (see the `addSecondaryBin` 
  callback below).

The `callbacks` parameter is an object that defines callbacks provided by 
clients of `SortingDesk` that will handle data storage access. Since data 
storage access is typically done asynchronously, most callbacks will return a
[jQuery Deferred Promise](http://api.jquery.com/deferred.promise/) object. The 
UI's callbacks can then be registered with this promise using [jQuery's 
Deferred object API](http://api.jquery.com/category/deferred-object/).

**Note**: A `content_id` can describe a *bin* or a *text*.

An implementation of `SortingDesk` may assume that *all* of the following 
functions are defined and their contracts fulfilled.

- **moreTexts**
  - Type: `function(num)`
  - Returns a promise that is resolved with an array of *at most* `num` texts,
    where each text is an object with *at least* the keys `content_id` and 
    `text` (whose values are strings). This will scroll through texts available 
    and never produce duplicates (with respect to `content_id`). Therefore, a 
    history of texts must be stored within `SortingDesk` to support **User 
    Story 3**.
- **getBinData**
  - Type: `function(content_ids)`
  - Returns a promise that is resolved with an array of objects with *at least* 
    the keys `name`, `content_id` and `bins`. `name` maps to a string with a 
    name for the corresponding `bin.` `content_id` also maps to a string that
    uniquely identifies the bin. `bins` maps to an object that maps 
    strings to objects.  The keys in this map are called `statement_id` and the 
    values are objects with at least one key: `statement_text`, which should be 
    displayed in the drop area for that sub-bin. Note that this function does 
    **not** return the content ids of text objects that have been attached to a 
    bin. This may change in a future version. (The implication here is that if 
    a user refreshes the page, then they will lose visual progress with respect 
    to assigning their text objects to bins. However, the sub-bins they 
    created, along with associated statement text, should still be shown in the 
    primary bin.)

    For now, assume that this functions always succeeds and that the size of
    the array of `content_ids` given is always equivalent to the size of the
    array of bin data returned (and that they are in correspondence). In code:

    ```javascript
    binData = [...];
    for (var i = 0; i < content_ids.length; i++)
      assert(content_ids[i] == binData[i].content_id)
    ```
- **upsertBinData**
  - Type: `function(bin_content_id, statement_id, statement_text, text_content_id)`
  - Only the `bin_content_id` is required.
    Let me lay out a first approximation of the case analysis:
    
    If given only the content_id of the bin: the operation adds a new
    sub-bin with no texts. The `upsert` operation here should return a
    statement id to you. If `statement_text` is given, then it is used as
    the initial text for the sub-bin, otherwise it is blank.
    
    If given only the content_id of the bin and the statement_id of a
    sub-bin: `statement_text` is updated with whatever is given.
    
    If given only the content_id of the bin and the content_id of the text
    object: add the text object to the bin itself (it is NOT part of any
    sub-bin). If `statement_text` is given, it is ignored.
    
    If given bin content_id, statement_id and content_id of text object,
    add the text object to the sub-bin. (Maybe also update
    `statement_text` if present.)
    
    I think `remove` has a similar case analysis, although I don't think
    it should support removing entire bins (so giving only the content_id
    of the bin would be invalid). But I'm not sure about that. Probably
    `remove` ignores `statement_text`.
    
    N.B. If you think it's easier to combine these operations back into a
    single `save`, then I think that's OK. (Maybe you pass a `remove` flag
    or something.)
- **removeBinData**
  - Type: `function(bin_content_id, statement_id, text_content_id)`
  - This is just like `upsertBinData`, except it removes the text object 
    indicated by `text_content_id` and/or removes the sub-bin indicated by
    `statement_id`. This function will not remove entire bins.
- **addSecondaryBin**
  - Type: `function()`
  - Returns a promise that is resolved with an object of a form equivalent to 
    that returned in `getBinData` (this now includes a `content_id`).
    The promise will not be resolved until some user action completes that 
    selects a new secondary bin to add. (This may include a new UI component 
    separate from the `SortingDesk`.)
- **removeSecondaryBin**
  - Type: `function(content_id)`
  - Returns `undefined`.

The following callbacks are *optional*. As such, an implementation of 
`SortingDesk` should provide default implementations for each. The default 
implementation should be used when the corresponding key is not set. For the 
most part, these optional callbacks control the rendering of various objects in 
the interface. This allows for extra data to be added to the interface 
unobtrusively.

- **renderText**
  - Type: `function(textObj)`
  - Returns HTML for showing a text in the text stream. `textObj` should have 
    *at least* the keys `content_id` and `text` defined. If the text belongs to 
    a particular bin, then `textObj` should also contain `bin_content_id` and 
    `bin_name`.  `textObj` should contain any other keys returned by 
    `moreTexts`.
- **renderPrimaryBin**
  - Type: `function(binData)`
  - Returns HTML for showing a primary bin. `binData` should be the same object 
    returned by `getBinData`, including any unspecified keys. This function is 
    responsible for calling `renderPrimarySubBin`.
- **renderPrimarySubBin**
  - Type: `function(subBinData)`
  - Returns HTML for showing a sub-bin inside of a primary bin. `binData` 
    should be an array of texts, including any unspecified keys.
- **renderSecondaryBin**
  - Type: `function(binData)`
  - Returns HTML for showing a secondary bin. `binData` should be the same 
    object returned by `getBinData`, including any unspecified keys.

There are other elements of the UI whose HTML is not specified here, such as 
adding new sub bins, adding new secondary bins and the overall structure of the 
page. These UI elements should be fixed regardless of the underlying data.


Some examples of using the callback functions
---------------------------------------------
Here are some examples of how an implementation of `SortingDesk` might use the 
provided callback functions.

Here's how the state might be initialized:

```
function SortingDesk(node, options, callbacks) {
  this.node = node;
  this.options = options;
  this.callbacks = callbacks;
}
```

To retrieve more texts for the stream:

```
// When SortingDesk decides it needs more texts...
SortingDesk.prototype.showMoreTexts = function() {
  var self = this;

  self.callbacks.moreTexts(20).done(function(data) {
    data.forEach(function(txtObj) {
      // Note that `renderText` is optional, so you should define your own
      // default implementation and set it in the constructor.
      self.$node.find('#text-streams').html(self.callbacks.renderText(txtObj));
    });
  });
}
```

To retrieve bin data:

```
// This is probably only called once at initialization in the first version.
//
// You will need another function like this that shows secondary bins.
//
// `binNode` is a jQuery node corresponding to the bin.
SortingDesk.prototype.initShowPrimaryBin = function(binNode) {
  var self = this;

  // Note that both primary and secondary bins have sub-bins.
  // The distinction between them is purely in the UI: only the primary
  // bin is expanded to show its sub-bins.
  self.callbacks.getBinData(self.options.primaryContentId).done(function(bin) {
    // Most of this HTML munging should be contained in the `render`
    // functions, but it's expanded here for clarity.
    binNode.find('.sd-bin-title').text(bin.name);
    for (statement_id in bin.bins) {
      // Add child node for each sub-bin.
      // You'll probably want to make this look nicer than a HTML input,
      // but it's a start.
      //
      // Note that SortingDesk will probably add another `data-content-ids`
      // to each of these sub-bins to track which texts the user has added
      // to them.
      var child = '<input type="text" data-statement-id="' + statement_id + '"' +
                  ' value="' + bin.bins[statement_id].statement_text + '">';
      binNode.find('.sd-bin-subs').append(child);
    }
  });
};
```

To save bin data:

```
// This should probably be called whenever the user changes something
// in the UI. Whether it be adding a new sub-bin or changing something in
// a sub-bin.
SortingDesk.prototype.saveBin = function(content_id, binNode) {
  var self = this;

  // Build the user data from the bin's HTML.
  var bins = {}  // statement_id |--> {statement_text :: string, items :: [content_id]}
  binNode.find('.sd-bin-subs input').each(function() {
    var $subbin = $(this);
    bins[$subbin.data('statement-id')] = {
      statement_text: $subbin.val(),
      items: $subbin.data('content-ids')
    };
  });

  self.callbacks.saveBinData(content_id, bins).done(function(data) {
    if (data.error === null) {
      // success!
      return;
    }
    // show an error to the user.
    window.alert('Save failed: ' + data.error);
    // (don't use alerts)
  });
};
```


jQuery Deferred Promises
------------------------

http://api.jquery.com/category/deferred-object/

To stub out the functions, you can create your own promise objects. For example:

    // Consumer of Promise object
    somePromise.done(function(data) {
        // do something with `data`
    });

    // Producer of Deferred object
    var dfd = $.Deferred();
    // Make some async request and resolve
    // the promise when done
    $.get('url', function(data) {
        dfd.resolve(data);
    });
    // only give the client the promise
    client(dfd.promise());

The producer example can be stubbed out using `window.setTimeout` to
simulate an asynchronous request.

There are examples in the jQuery documentation for `promise`:
http://api.jquery.com/deferred.promise/

The first example shows how we might write functions like `moreTexts`
(create a deferred and return its promise, resolve with the results of
an asynchronous request).


Incomplete REST interface
=========================
1) This does not necessarily correspond to the Javascript callback API above.

2) It seems like I've given `upsertBinData` a contract that is too complex. It
   should be simplified by turning it into more functions with simpler
   contracts.

3) The API requires POST/PUT/DELETE requests for creating/updating data, so
JSONP cannot be used when testing locally. Instead, we have a Python proxy that
will serve a local client Javascript application and proxy AJAX requests for
you (bypassing the "same-origin policy"). Instructions on how to use it are 
below.


API
---
Primary and secondary bins correspond to "bins."

Sub-bins in the primary bin correspond to "statements."

A "coref assertion" is the state resulting from dragging and dropping a text
item onto a bin or statement. You can think of a coref assertion as data that
declares a relationship between *exactly* two content items.

Currently, this API does not actually save anything. It will return dummy data,
although you may rely on generated identifiers being unique (limited to server
restarts).

All URLs below should be prefixed with:

    http://dev5.diffeo.com:10982/namespaces/xyz_sorting_desk


### Create a new bin
    curl -s -X POST '/bins/' -d 'name=the bin name'

Data returned (HTTP status = 201):

    {"content_id": 2, "name": "the bin name", "bins": []}

The `name` field is optional. If it isn't present, the name is set to an empty
string.


### Update a bin
    curl -s -X PUT '/bins/{content_id}' -d 'name=new bin name'

No data returned (HTTP status = 204).


### Delete a bin
    curl -s -X DELETE '/bins/{content_id}'

No data returned (HTTP status = 204).


### Create a new statement (sub-bin of the primary bin)
    curl -s -X POST '/bins/{content_id}/statements/'

Data returned (HTTP status = 201):

    {"statement_id": 2}


### Update a statement
    curl -s -X PUT '/bins/{content_id}/statements/{statement_id}'

No data returned (HTTP status = 204).


### Delete a statement
    curl -s -X DELETE '/bins/{content_id}/statements/{statement_id}'

No data returned (HTTP status = 204).


### Create a coref assertion
    curl -s -X POST '/assertions/' \
      -d 'content_id1={content_id}&content_id2={content_id}&value={coref value}'

No data returned (HTTP status = 204).

Note that this is the only operation available for coref assertions as it is
an append-only store. They cannot be modified or deleted once created.

Every time the user drops a text item on a bin, *at least* one coref assertion
should be added. To keep things simple, we'll declare one rule for now: every
time a user drops a text item on a bin (for primary, this includes dropping it
on a sub-bin), then an assertion should be created where one content id is the
text item that was dropped and the other content id is the bin that it was
dropped on. In this case, always use `{coref value} = 1`.


The proxy
---------
In the root of the `sortingdesk` repository, there is a file called `proxy.py`.
It can be run with:

    python proxy.py

(I've only testing it on Python 2, although I could get it working with
Python 3 ifneedbe.)

It should start listening on `localhost:8080`. If you ran it in the repository
root, then you should be able to see the `SortingDesk` UI by opening the
following URL in your browser:

    http://localhost:8080/test/

To test and make sure the proxy is working, try going to the following URL in
your browser:

    http://localhost:8080/proxy/http://www.python.org

You should see the Python home page without any CSS, images or Javascript. (The
proxy is very basic and won't work with all web sites.)

You can now execute cross-domain AJAX in SortingDesk by prepending URLs with
`http://localhost:8080/proxy/`. For example, you could create a new statement
with:

    curl -s -X POST \
      'http://localhost:8080/proxy/http://dev5.diffeo.com:10983/namespaces/xyz_sorting_desk/bins/123/statements/'
    # Output: {"statement_id": 3}


Fake Data
---------

Below is a JSON string excerpted from the Google Custom Search API for
the query [cars].  You can use this as fake data for the list of
results to be sorted into bins.  Your code should use this data in a
test function that resolves the deferred promise for moreText.  Each
time the user moves an item out of the list and into a bin, the list
should shift up to continue showing 10 new items.  Your code should
keep a buffer of results ready to push into the bottom of the list, so
it never runs out.  When your buffer is low, your code should create
another deferred to refill the buffer.

Your test function for resolving the promise can simply return this
entire list each time.


    [
        {
            "cacheId": "H75rMPosXksJ", 
            "displayLink": "www.cars.com", 
            "formattedUrl": "www.cars.com/", 
            "htmlFormattedUrl": "www.<b>cars</b>.com/", 
            "htmlSnippet": "Use <b>Cars</b>.com to search 2.6 million new &amp; used <b>car</b> listings or get a dealer quote. <br>\nOur easy-to-use online tools put you a step ahead in your next vehicle&nbsp;...", 
            "htmlTitle": "New <b>Cars</b>, Used <b>Cars</b>, <b>Car</b> Reviews | <b>Cars</b>.com", 
            "kind": "customsearch#result", 
            "link": "http://www.cars.com/", 
            "snippet": "Use Cars.com to search 2.6 million new & used car listings or get a dealer quote. \nOur easy-to-use online tools put you a step ahead in your next vehicle\u00a0...", 
            "title": "New Cars, Used Cars, Car Reviews | Cars.com"
        }, 
        {
            "cacheId": "-xdXy-yX2fMJ", 
            "displayLink": "www.imdb.com", 
            "formattedUrl": "www.imdb.com/title/tt0317219/", 
            "htmlFormattedUrl": "www.imdb.com/title/tt0317219/", 
            "htmlSnippet": "A hot-shot race-<b>car</b> named Lightning McQueen gets waylaid in Radiator Springs, <br>\nwhere he finds the true meaning of friendship and family.", 
            "htmlTitle": "<b>Cars</b> (2006) - IMDb", 
            "kind": "customsearch#result", 
            "link": "http://www.imdb.com/title/tt0317219/", 
            "snippet": "A hot-shot race-car named Lightning McQueen gets waylaid in Radiator Springs, \nwhere he finds the true meaning of friendship and family.", 
            "title": "Cars (2006) - IMDb"
        }, 
        {
            "cacheId": "1BoR6M9fXwcJ", 
            "displayLink": "cars.disney.com", 
            "formattedUrl": "cars.disney.com/", 
            "htmlFormattedUrl": "<b>cars</b>.disney.com/", 
            "htmlSnippet": "Welcome to the Disney <b>Cars</b> homepage. Browse movies, watch videos, play <br>\ngames, and meet the characters from Disney&#39;s World of <b>Cars</b>.", 
            "htmlTitle": "Disney <b>Cars</b>", 
            "kind": "customsearch#result", 
            "link": "http://cars.disney.com/", 
            "snippet": "Welcome to the Disney Cars homepage. Browse movies, watch videos, play \ngames, and meet the characters from Disney's World of Cars.", 
            "title": "Disney Cars"
        }, 
        {
            "cacheId": "Na8wWAUN5LIJ", 
            "displayLink": "www.cnet.com", 
            "formattedUrl": "www.cnet.com/topics/car-tech/", 
            "htmlFormattedUrl": "www.cnet.com/topics/<b>car</b>-tech/", 
            "htmlSnippet": "<b>Car</b> Tech reviews and ratings, video reviews, user reviews, <b>Car</b> Tech buying <br>\nguides, prices, and comparisons from CNET.", 
            "htmlTitle": "<b>Car</b> Tech - CNET", 
            "kind": "customsearch#result", 
            "link": "http://www.cnet.com/topics/car-tech/", 
            "snippet": "Car Tech reviews and ratings, video reviews, user reviews, Car Tech buying \nguides, prices, and comparisons from CNET.", 
            "title": "Car Tech - CNET"
        }, 
        {
            "cacheId": "iflPmNl879sJ", 
            "displayLink": "en.wikipedia.org", 
            "formattedUrl": "en.wikipedia.org/wiki/Cars_(film)", 
            "htmlFormattedUrl": "en.wikipedia.org/wiki/<b>Cars</b>_(film)", 
            "htmlSnippet": "<b>Cars</b> is a 2006 American computer-animated comedy-adventure sports film <br>\nproduced by Pixar Animation Studios, and directed and co-written by John <br>\nLasseter&nbsp;...", 
            "htmlTitle": "<b>Cars</b> (film) - Wikipedia, the free encyclopedia", 
            "kind": "customsearch#result", 
            "link": "http://en.wikipedia.org/wiki/Cars_(film)", 
            "snippet": "Cars is a 2006 American computer-animated comedy-adventure sports film \nproduced by Pixar Animation Studios, and directed and co-written by John \nLasseter\u00a0...", 
            "title": "Cars (film) - Wikipedia, the free encyclopedia"
        }, 
        {
            "cacheId": "MGjy33JqBtkJ", 
            "displayLink": "www.caranddriver.com", 
            "formattedUrl": "www.caranddriver.com/", 
            "htmlFormattedUrl": "www.<b>car</b>anddriver.com/", 
            "htmlSnippet": "Research 2014 and 2015 <b>cars</b> on <b>Car</b> and Driver. Our new <b>car</b> reviews and <b>car</b> <br>\nbuying resources help you make informed decisions. <b>Car</b> and Driver <b>car</b> reviews<br>\n&nbsp;...", 
            "htmlTitle": "<b>Car</b> Reviews - New <b>Cars</b> for 2014 and 2015 at <b>Car</b> and Driver", 
            "kind": "customsearch#result", 
            "link": "http://www.caranddriver.com/", 
            "snippet": "Research 2014 and 2015 cars on Car and Driver. Our new car reviews and car \nbuying resources help you make informed decisions. Car and Driver car reviews\n\u00a0...", 
            "title": "Car Reviews - New Cars for 2014 and 2015 at Car and Driver"
        }, 
        {
            "cacheId": "QJoGPmN8z8UJ", 
            "displayLink": "en.wikipedia.org", 
            "formattedUrl": "en.wikipedia.org/wiki/Automobile", 
            "htmlFormattedUrl": "en.wikipedia.org/wiki/Automobile", 
            "htmlSnippet": "An automobile, autocar, motor <b>car</b> or <b>car</b> is a wheeled motor vehicle used for <br>\ntransporting passengers, which also carries its own engine or motor.", 
            "htmlTitle": "Automobile - Wikipedia, the free encyclopedia", 
            "kind": "customsearch#result", 
            "link": "http://en.wikipedia.org/wiki/Automobile", 
            "snippet": "An automobile, autocar, motor car or car is a wheeled motor vehicle used for \ntransporting passengers, which also carries its own engine or motor.", 
            "title": "Automobile - Wikipedia, the free encyclopedia"
        }, 
        {
            "cacheId": "grA1uty9HdAJ", 
            "displayLink": "cars.sfgate.com", 
            "formattedUrl": "cars.sfgate.com/", 
            "htmlFormattedUrl": "<b>cars</b>.sfgate.com/", 
            "htmlSnippet": "Find new and used <b>cars</b> in San Francisco, San Jose, San Mateo, Oakland, and <br>\nthe rest of the Bay Area, <b>car</b> news and research and The San Francisco Auto&nbsp;...", 
            "htmlTitle": "SFGate Local Marketplace | New and Used <b>Cars</b> in San Francisco <b>...</b>", 
            "kind": "customsearch#result", 
            "link": "http://cars.sfgate.com/", 
            "snippet": "Find new and used cars in San Francisco, San Jose, San Mateo, Oakland, and \nthe rest of the Bay Area, car news and research and The San Francisco Auto\u00a0...", 
            "title": "SFGate Local Marketplace | New and Used Cars in San Francisco ..."
        }, 
        {
            "cacheId": "8Qk0stVn32QJ", 
            "displayLink": "en.wikipedia.org", 
            "formattedUrl": "en.wikipedia.org/wiki/Cars_(song)", 
            "htmlFormattedUrl": "en.wikipedia.org/wiki/<b>Cars</b>_(song)", 
            "htmlSnippet": "&quot;<b>Cars</b>&quot; is a 1979 song by UK artist Gary Numan, and was released as a single <br>\nfrom the album The Pleasure Principle. It reached the top of the charts in several<br>\n&nbsp;...", 
            "htmlTitle": "<b>Cars</b> (song) - Wikipedia, the free encyclopedia", 
            "kind": "customsearch#result", 
            "link": "http://en.wikipedia.org/wiki/Cars_(song)", 
            "snippet": "\"Cars\" is a 1979 song by UK artist Gary Numan, and was released as a single \nfrom the album The Pleasure Principle. It reached the top of the charts in several\n\u00a0...", 
            "title": "Cars (song) - Wikipedia, the free encyclopedia"
        }, 
        {
            "cacheId": "SOIY5N3zyOUJ", 
            "displayLink": "trailers.apple.com", 
            "formattedUrl": "trailers.apple.com/trailers/disney/cars/", 
            "htmlFormattedUrl": "trailers.apple.com/trailers/disney/<b>cars</b>/", 
            "htmlSnippet": "Lightning McQueen, a hotshot rookie race <b>car</b> driven to succeed, discovers that <br>\nlife is about the journey, not the finish line, when he finds himself unexpectedly&nbsp;...", 
            "htmlTitle": "<b>Cars</b> - Movie Trailers - iTunes", 
            "kind": "customsearch#result", 
            "link": "http://trailers.apple.com/trailers/disney/cars/", 
            "snippet": "Lightning McQueen, a hotshot rookie race car driven to succeed, discovers that \nlife is about the journey, not the finish line, when he finds himself unexpectedly\u00a0...", 
            "title": "Cars - Movie Trailers - iTunes"
        },
        {
            "cacheId": "H75rMPosXksJ", 
            "displayLink": "www.cars.com", 
            "formattedUrl": "www.cars.com/", 
            "htmlFormattedUrl": "www.<b>cars</b>.com/", 
            "htmlSnippet": "Use <b>Cars</b>.com to search 2.6 million new &amp; used <b>car</b> listings or get a dealer quote. <br>\nOur easy-to-use online tools put you a step ahead in your next vehicle&nbsp;...", 
            "htmlTitle": "New <b>Cars</b>, Used <b>Cars</b>, <b>Car</b> Reviews | <b>Cars</b>.com", 
            "kind": "customsearch#result", 
            "link": "http://www.cars.com/", 
            "snippet": "Use Cars.com to search 2.6 million new & used car listings or get a dealer quote. \nOur easy-to-use online tools put you a step ahead in your next vehicle\u00a0...", 
            "title": "New Cars, Used Cars, Car Reviews | Cars.com"
        }, 
        {
            "cacheId": "-xdXy-yX2fMJ", 
            "displayLink": "www.imdb.com", 
            "formattedUrl": "www.imdb.com/title/tt0317219/", 
            "htmlFormattedUrl": "www.imdb.com/title/tt0317219/", 
            "htmlSnippet": "A hot-shot race-<b>car</b> named Lightning McQueen gets waylaid in Radiator Springs, <br>\nwhere he finds the true meaning of friendship and family.", 
            "htmlTitle": "<b>Cars</b> (2006) - IMDb", 
            "kind": "customsearch#result", 
            "link": "http://www.imdb.com/title/tt0317219/", 
            "snippet": "A hot-shot race-car named Lightning McQueen gets waylaid in Radiator Springs, \nwhere he finds the true meaning of friendship and family.", 
            "title": "Cars (2006) - IMDb"
        }, 
        {
            "cacheId": "1BoR6M9fXwcJ", 
            "displayLink": "cars.disney.com", 
            "formattedUrl": "cars.disney.com/", 
            "htmlFormattedUrl": "<b>cars</b>.disney.com/", 
            "htmlSnippet": "Welcome to the Disney <b>Cars</b> homepage. Browse movies, watch videos, play <br>\ngames, and meet the characters from Disney&#39;s World of <b>Cars</b>.", 
            "htmlTitle": "Disney <b>Cars</b>", 
            "kind": "customsearch#result", 
            "link": "http://cars.disney.com/", 
            "snippet": "Welcome to the Disney Cars homepage. Browse movies, watch videos, play \ngames, and meet the characters from Disney's World of Cars.", 
            "title": "Disney Cars"
        }, 
        {
            "cacheId": "Na8wWAUN5LIJ", 
            "displayLink": "www.cnet.com", 
            "formattedUrl": "www.cnet.com/topics/car-tech/", 
            "htmlFormattedUrl": "www.cnet.com/topics/<b>car</b>-tech/", 
            "htmlSnippet": "<b>Car</b> Tech reviews and ratings, video reviews, user reviews, <b>Car</b> Tech buying <br>\nguides, prices, and comparisons from CNET.", 
            "htmlTitle": "<b>Car</b> Tech - CNET", 
            "kind": "customsearch#result", 
            "link": "http://www.cnet.com/topics/car-tech/", 
            "snippet": "Car Tech reviews and ratings, video reviews, user reviews, Car Tech buying \nguides, prices, and comparisons from CNET.", 
            "title": "Car Tech - CNET"
        }, 
        {
            "cacheId": "iflPmNl879sJ", 
            "displayLink": "en.wikipedia.org", 
            "formattedUrl": "en.wikipedia.org/wiki/Cars_(film)", 
            "htmlFormattedUrl": "en.wikipedia.org/wiki/<b>Cars</b>_(film)", 
            "htmlSnippet": "<b>Cars</b> is a 2006 American computer-animated comedy-adventure sports film <br>\nproduced by Pixar Animation Studios, and directed and co-written by John <br>\nLasseter&nbsp;...", 
            "htmlTitle": "<b>Cars</b> (film) - Wikipedia, the free encyclopedia", 
            "kind": "customsearch#result", 
            "link": "http://en.wikipedia.org/wiki/Cars_(film)", 
            "snippet": "Cars is a 2006 American computer-animated comedy-adventure sports film \nproduced by Pixar Animation Studios, and directed and co-written by John \nLasseter\u00a0...", 
            "title": "Cars (film) - Wikipedia, the free encyclopedia"
        }, 
        {
            "cacheId": "MGjy33JqBtkJ", 
            "displayLink": "www.caranddriver.com", 
            "formattedUrl": "www.caranddriver.com/", 
            "htmlFormattedUrl": "www.<b>car</b>anddriver.com/", 
            "htmlSnippet": "Research 2014 and 2015 <b>cars</b> on <b>Car</b> and Driver. Our new <b>car</b> reviews and <b>car</b> <br>\nbuying resources help you make informed decisions. <b>Car</b> and Driver <b>car</b> reviews<br>\n&nbsp;...", 
            "htmlTitle": "<b>Car</b> Reviews - New <b>Cars</b> for 2014 and 2015 at <b>Car</b> and Driver", 
            "kind": "customsearch#result", 
            "link": "http://www.caranddriver.com/", 
            "snippet": "Research 2014 and 2015 cars on Car and Driver. Our new car reviews and car \nbuying resources help you make informed decisions. Car and Driver car reviews\n\u00a0...", 
            "title": "Car Reviews - New Cars for 2014 and 2015 at Car and Driver"
        }, 
        {
            "cacheId": "QJoGPmN8z8UJ", 
            "displayLink": "en.wikipedia.org", 
            "formattedUrl": "en.wikipedia.org/wiki/Automobile", 
            "htmlFormattedUrl": "en.wikipedia.org/wiki/Automobile", 
            "htmlSnippet": "An automobile, autocar, motor <b>car</b> or <b>car</b> is a wheeled motor vehicle used for <br>\ntransporting passengers, which also carries its own engine or motor.", 
            "htmlTitle": "Automobile - Wikipedia, the free encyclopedia", 
            "kind": "customsearch#result", 
            "link": "http://en.wikipedia.org/wiki/Automobile", 
            "snippet": "An automobile, autocar, motor car or car is a wheeled motor vehicle used for \ntransporting passengers, which also carries its own engine or motor.", 
            "title": "Automobile - Wikipedia, the free encyclopedia"
        }, 
        {
            "cacheId": "grA1uty9HdAJ", 
            "displayLink": "cars.sfgate.com", 
            "formattedUrl": "cars.sfgate.com/", 
            "htmlFormattedUrl": "<b>cars</b>.sfgate.com/", 
            "htmlSnippet": "Find new and used <b>cars</b> in San Francisco, San Jose, San Mateo, Oakland, and <br>\nthe rest of the Bay Area, <b>car</b> news and research and The San Francisco Auto&nbsp;...", 
            "htmlTitle": "SFGate Local Marketplace | New and Used <b>Cars</b> in San Francisco <b>...</b>", 
            "kind": "customsearch#result", 
            "link": "http://cars.sfgate.com/", 
            "snippet": "Find new and used cars in San Francisco, San Jose, San Mateo, Oakland, and \nthe rest of the Bay Area, car news and research and The San Francisco Auto\u00a0...", 
            "title": "SFGate Local Marketplace | New and Used Cars in San Francisco ..."
        }, 
        {
            "cacheId": "8Qk0stVn32QJ", 
            "displayLink": "en.wikipedia.org", 
            "formattedUrl": "en.wikipedia.org/wiki/Cars_(song)", 
            "htmlFormattedUrl": "en.wikipedia.org/wiki/<b>Cars</b>_(song)", 
            "htmlSnippet": "&quot;<b>Cars</b>&quot; is a 1979 song by UK artist Gary Numan, and was released as a single <br>\nfrom the album The Pleasure Principle. It reached the top of the charts in several<br>\n&nbsp;...", 
            "htmlTitle": "<b>Cars</b> (song) - Wikipedia, the free encyclopedia", 
            "kind": "customsearch#result", 
            "link": "http://en.wikipedia.org/wiki/Cars_(song)", 
            "snippet": "\"Cars\" is a 1979 song by UK artist Gary Numan, and was released as a single \nfrom the album The Pleasure Principle. It reached the top of the charts in several\n\u00a0...", 
            "title": "Cars (song) - Wikipedia, the free encyclopedia"
        }, 
        {
            "cacheId": "SOIY5N3zyOUJ", 
            "displayLink": "trailers.apple.com", 
            "formattedUrl": "trailers.apple.com/trailers/disney/cars/", 
            "htmlFormattedUrl": "trailers.apple.com/trailers/disney/<b>cars</b>/", 
            "htmlSnippet": "Lightning McQueen, a hotshot rookie race <b>car</b> driven to succeed, discovers that <br>\nlife is about the journey, not the finish line, when he finds himself unexpectedly&nbsp;...", 
            "htmlTitle": "<b>Cars</b> - Movie Trailers - iTunes", 
            "kind": "customsearch#result", 
            "link": "http://trailers.apple.com/trailers/disney/cars/", 
            "snippet": "Lightning McQueen, a hotshot rookie race car driven to succeed, discovers that \nlife is about the journey, not the finish line, when he finds himself unexpectedly\u00a0...", 
            "title": "Cars - Movie Trailers - iTunes"
        },
        {
            "cacheId": "H75rMPosXksJ", 
            "displayLink": "www.cars.com", 
            "formattedUrl": "www.cars.com/", 
            "htmlFormattedUrl": "www.<b>cars</b>.com/", 
            "htmlSnippet": "Use <b>Cars</b>.com to search 2.6 million new &amp; used <b>car</b> listings or get a dealer quote. <br>\nOur easy-to-use online tools put you a step ahead in your next vehicle&nbsp;...", 
            "htmlTitle": "New <b>Cars</b>, Used <b>Cars</b>, <b>Car</b> Reviews | <b>Cars</b>.com", 
            "kind": "customsearch#result", 
            "link": "http://www.cars.com/", 
            "snippet": "Use Cars.com to search 2.6 million new & used car listings or get a dealer quote. \nOur easy-to-use online tools put you a step ahead in your next vehicle\u00a0...", 
            "title": "New Cars, Used Cars, Car Reviews | Cars.com"
        }, 
        {
            "cacheId": "-xdXy-yX2fMJ", 
            "displayLink": "www.imdb.com", 
            "formattedUrl": "www.imdb.com/title/tt0317219/", 
            "htmlFormattedUrl": "www.imdb.com/title/tt0317219/", 
            "htmlSnippet": "A hot-shot race-<b>car</b> named Lightning McQueen gets waylaid in Radiator Springs, <br>\nwhere he finds the true meaning of friendship and family.", 
            "htmlTitle": "<b>Cars</b> (2006) - IMDb", 
            "kind": "customsearch#result", 
            "link": "http://www.imdb.com/title/tt0317219/", 
            "snippet": "A hot-shot race-car named Lightning McQueen gets waylaid in Radiator Springs, \nwhere he finds the true meaning of friendship and family.", 
            "title": "Cars (2006) - IMDb"
        }, 
        {
            "cacheId": "1BoR6M9fXwcJ", 
            "displayLink": "cars.disney.com", 
            "formattedUrl": "cars.disney.com/", 
            "htmlFormattedUrl": "<b>cars</b>.disney.com/", 
            "htmlSnippet": "Welcome to the Disney <b>Cars</b> homepage. Browse movies, watch videos, play <br>\ngames, and meet the characters from Disney&#39;s World of <b>Cars</b>.", 
            "htmlTitle": "Disney <b>Cars</b>", 
            "kind": "customsearch#result", 
            "link": "http://cars.disney.com/", 
            "snippet": "Welcome to the Disney Cars homepage. Browse movies, watch videos, play \ngames, and meet the characters from Disney's World of Cars.", 
            "title": "Disney Cars"
        }, 
        {
            "cacheId": "Na8wWAUN5LIJ", 
            "displayLink": "www.cnet.com", 
            "formattedUrl": "www.cnet.com/topics/car-tech/", 
            "htmlFormattedUrl": "www.cnet.com/topics/<b>car</b>-tech/", 
            "htmlSnippet": "<b>Car</b> Tech reviews and ratings, video reviews, user reviews, <b>Car</b> Tech buying <br>\nguides, prices, and comparisons from CNET.", 
            "htmlTitle": "<b>Car</b> Tech - CNET", 
            "kind": "customsearch#result", 
            "link": "http://www.cnet.com/topics/car-tech/", 
            "snippet": "Car Tech reviews and ratings, video reviews, user reviews, Car Tech buying \nguides, prices, and comparisons from CNET.", 
            "title": "Car Tech - CNET"
        }, 
        {
            "cacheId": "iflPmNl879sJ", 
            "displayLink": "en.wikipedia.org", 
            "formattedUrl": "en.wikipedia.org/wiki/Cars_(film)", 
            "htmlFormattedUrl": "en.wikipedia.org/wiki/<b>Cars</b>_(film)", 
            "htmlSnippet": "<b>Cars</b> is a 2006 American computer-animated comedy-adventure sports film <br>\nproduced by Pixar Animation Studios, and directed and co-written by John <br>\nLasseter&nbsp;...", 
            "htmlTitle": "<b>Cars</b> (film) - Wikipedia, the free encyclopedia", 
            "kind": "customsearch#result", 
            "link": "http://en.wikipedia.org/wiki/Cars_(film)", 
            "snippet": "Cars is a 2006 American computer-animated comedy-adventure sports film \nproduced by Pixar Animation Studios, and directed and co-written by John \nLasseter\u00a0...", 
            "title": "Cars (film) - Wikipedia, the free encyclopedia"
        }, 
        {
            "cacheId": "MGjy33JqBtkJ", 
            "displayLink": "www.caranddriver.com", 
            "formattedUrl": "www.caranddriver.com/", 
            "htmlFormattedUrl": "www.<b>car</b>anddriver.com/", 
            "htmlSnippet": "Research 2014 and 2015 <b>cars</b> on <b>Car</b> and Driver. Our new <b>car</b> reviews and <b>car</b> <br>\nbuying resources help you make informed decisions. <b>Car</b> and Driver <b>car</b> reviews<br>\n&nbsp;...", 
            "htmlTitle": "<b>Car</b> Reviews - New <b>Cars</b> for 2014 and 2015 at <b>Car</b> and Driver", 
            "kind": "customsearch#result", 
            "link": "http://www.caranddriver.com/", 
            "snippet": "Research 2014 and 2015 cars on Car and Driver. Our new car reviews and car \nbuying resources help you make informed decisions. Car and Driver car reviews\n\u00a0...", 
            "title": "Car Reviews - New Cars for 2014 and 2015 at Car and Driver"
        }, 
        {
            "cacheId": "QJoGPmN8z8UJ", 
            "displayLink": "en.wikipedia.org", 
            "formattedUrl": "en.wikipedia.org/wiki/Automobile", 
            "htmlFormattedUrl": "en.wikipedia.org/wiki/Automobile", 
            "htmlSnippet": "An automobile, autocar, motor <b>car</b> or <b>car</b> is a wheeled motor vehicle used for <br>\ntransporting passengers, which also carries its own engine or motor.", 
            "htmlTitle": "Automobile - Wikipedia, the free encyclopedia", 
            "kind": "customsearch#result", 
            "link": "http://en.wikipedia.org/wiki/Automobile", 
            "snippet": "An automobile, autocar, motor car or car is a wheeled motor vehicle used for \ntransporting passengers, which also carries its own engine or motor.", 
            "title": "Automobile - Wikipedia, the free encyclopedia"
        }, 
        {
            "cacheId": "grA1uty9HdAJ", 
            "displayLink": "cars.sfgate.com", 
            "formattedUrl": "cars.sfgate.com/", 
            "htmlFormattedUrl": "<b>cars</b>.sfgate.com/", 
            "htmlSnippet": "Find new and used <b>cars</b> in San Francisco, San Jose, San Mateo, Oakland, and <br>\nthe rest of the Bay Area, <b>car</b> news and research and The San Francisco Auto&nbsp;...", 
            "htmlTitle": "SFGate Local Marketplace | New and Used <b>Cars</b> in San Francisco <b>...</b>", 
            "kind": "customsearch#result", 
            "link": "http://cars.sfgate.com/", 
            "snippet": "Find new and used cars in San Francisco, San Jose, San Mateo, Oakland, and \nthe rest of the Bay Area, car news and research and The San Francisco Auto\u00a0...", 
            "title": "SFGate Local Marketplace | New and Used Cars in San Francisco ..."
        }, 
        {
            "cacheId": "8Qk0stVn32QJ", 
            "displayLink": "en.wikipedia.org", 
            "formattedUrl": "en.wikipedia.org/wiki/Cars_(song)", 
            "htmlFormattedUrl": "en.wikipedia.org/wiki/<b>Cars</b>_(song)", 
            "htmlSnippet": "&quot;<b>Cars</b>&quot; is a 1979 song by UK artist Gary Numan, and was released as a single <br>\nfrom the album The Pleasure Principle. It reached the top of the charts in several<br>\n&nbsp;...", 
            "htmlTitle": "<b>Cars</b> (song) - Wikipedia, the free encyclopedia", 
            "kind": "customsearch#result", 
            "link": "http://en.wikipedia.org/wiki/Cars_(song)", 
            "snippet": "\"Cars\" is a 1979 song by UK artist Gary Numan, and was released as a single \nfrom the album The Pleasure Principle. It reached the top of the charts in several\n\u00a0...", 
            "title": "Cars (song) - Wikipedia, the free encyclopedia"
        }, 
        {
            "cacheId": "SOIY5N3zyOUJ", 
            "displayLink": "trailers.apple.com", 
            "formattedUrl": "trailers.apple.com/trailers/disney/cars/", 
            "htmlFormattedUrl": "trailers.apple.com/trailers/disney/<b>cars</b>/", 
            "htmlSnippet": "Lightning McQueen, a hotshot rookie race <b>car</b> driven to succeed, discovers that <br>\nlife is about the journey, not the finish line, when he finds himself unexpectedly&nbsp;...", 
            "htmlTitle": "<b>Cars</b> - Movie Trailers - iTunes", 
            "kind": "customsearch#result", 
            "link": "http://trailers.apple.com/trailers/disney/cars/", 
            "snippet": "Lightning McQueen, a hotshot rookie race car driven to succeed, discovers that \nlife is about the journey, not the finish line, when he finds himself unexpectedly\u00a0...", 
            "title": "Cars - Movie Trailers - iTunes"
        },
        {
            "cacheId": "H75rMPosXksJ", 
            "displayLink": "www.cars.com", 
            "formattedUrl": "www.cars.com/", 
            "htmlFormattedUrl": "www.<b>cars</b>.com/", 
            "htmlSnippet": "Use <b>Cars</b>.com to search 2.6 million new &amp; used <b>car</b> listings or get a dealer quote. <br>\nOur easy-to-use online tools put you a step ahead in your next vehicle&nbsp;...", 
            "htmlTitle": "New <b>Cars</b>, Used <b>Cars</b>, <b>Car</b> Reviews | <b>Cars</b>.com", 
            "kind": "customsearch#result", 
            "link": "http://www.cars.com/", 
            "snippet": "Use Cars.com to search 2.6 million new & used car listings or get a dealer quote. \nOur easy-to-use online tools put you a step ahead in your next vehicle\u00a0...", 
            "title": "New Cars, Used Cars, Car Reviews | Cars.com"
        }, 
        {
            "cacheId": "-xdXy-yX2fMJ", 
            "displayLink": "www.imdb.com", 
            "formattedUrl": "www.imdb.com/title/tt0317219/", 
            "htmlFormattedUrl": "www.imdb.com/title/tt0317219/", 
            "htmlSnippet": "A hot-shot race-<b>car</b> named Lightning McQueen gets waylaid in Radiator Springs, <br>\nwhere he finds the true meaning of friendship and family.", 
            "htmlTitle": "<b>Cars</b> (2006) - IMDb", 
            "kind": "customsearch#result", 
            "link": "http://www.imdb.com/title/tt0317219/", 
            "snippet": "A hot-shot race-car named Lightning McQueen gets waylaid in Radiator Springs, \nwhere he finds the true meaning of friendship and family.", 
            "title": "Cars (2006) - IMDb"
        }, 
        {
            "cacheId": "1BoR6M9fXwcJ", 
            "displayLink": "cars.disney.com", 
            "formattedUrl": "cars.disney.com/", 
            "htmlFormattedUrl": "<b>cars</b>.disney.com/", 
            "htmlSnippet": "Welcome to the Disney <b>Cars</b> homepage. Browse movies, watch videos, play <br>\ngames, and meet the characters from Disney&#39;s World of <b>Cars</b>.", 
            "htmlTitle": "Disney <b>Cars</b>", 
            "kind": "customsearch#result", 
            "link": "http://cars.disney.com/", 
            "snippet": "Welcome to the Disney Cars homepage. Browse movies, watch videos, play \ngames, and meet the characters from Disney's World of Cars.", 
            "title": "Disney Cars"
        }, 
        {
            "cacheId": "Na8wWAUN5LIJ", 
            "displayLink": "www.cnet.com", 
            "formattedUrl": "www.cnet.com/topics/car-tech/", 
            "htmlFormattedUrl": "www.cnet.com/topics/<b>car</b>-tech/", 
            "htmlSnippet": "<b>Car</b> Tech reviews and ratings, video reviews, user reviews, <b>Car</b> Tech buying <br>\nguides, prices, and comparisons from CNET.", 
            "htmlTitle": "<b>Car</b> Tech - CNET", 
            "kind": "customsearch#result", 
            "link": "http://www.cnet.com/topics/car-tech/", 
            "snippet": "Car Tech reviews and ratings, video reviews, user reviews, Car Tech buying \nguides, prices, and comparisons from CNET.", 
            "title": "Car Tech - CNET"
        }, 
        {
            "cacheId": "iflPmNl879sJ", 
            "displayLink": "en.wikipedia.org", 
            "formattedUrl": "en.wikipedia.org/wiki/Cars_(film)", 
            "htmlFormattedUrl": "en.wikipedia.org/wiki/<b>Cars</b>_(film)", 
            "htmlSnippet": "<b>Cars</b> is a 2006 American computer-animated comedy-adventure sports film <br>\nproduced by Pixar Animation Studios, and directed and co-written by John <br>\nLasseter&nbsp;...", 
            "htmlTitle": "<b>Cars</b> (film) - Wikipedia, the free encyclopedia", 
            "kind": "customsearch#result", 
            "link": "http://en.wikipedia.org/wiki/Cars_(film)", 
            "snippet": "Cars is a 2006 American computer-animated comedy-adventure sports film \nproduced by Pixar Animation Studios, and directed and co-written by John \nLasseter\u00a0...", 
            "title": "Cars (film) - Wikipedia, the free encyclopedia"
        }, 
        {
            "cacheId": "MGjy33JqBtkJ", 
            "displayLink": "www.caranddriver.com", 
            "formattedUrl": "www.caranddriver.com/", 
            "htmlFormattedUrl": "www.<b>car</b>anddriver.com/", 
            "htmlSnippet": "Research 2014 and 2015 <b>cars</b> on <b>Car</b> and Driver. Our new <b>car</b> reviews and <b>car</b> <br>\nbuying resources help you make informed decisions. <b>Car</b> and Driver <b>car</b> reviews<br>\n&nbsp;...", 
            "htmlTitle": "<b>Car</b> Reviews - New <b>Cars</b> for 2014 and 2015 at <b>Car</b> and Driver", 
            "kind": "customsearch#result", 
            "link": "http://www.caranddriver.com/", 
            "snippet": "Research 2014 and 2015 cars on Car and Driver. Our new car reviews and car \nbuying resources help you make informed decisions. Car and Driver car reviews\n\u00a0...", 
            "title": "Car Reviews - New Cars for 2014 and 2015 at Car and Driver"
        }, 
        {
            "cacheId": "QJoGPmN8z8UJ", 
            "displayLink": "en.wikipedia.org", 
            "formattedUrl": "en.wikipedia.org/wiki/Automobile", 
            "htmlFormattedUrl": "en.wikipedia.org/wiki/Automobile", 
            "htmlSnippet": "An automobile, autocar, motor <b>car</b> or <b>car</b> is a wheeled motor vehicle used for <br>\ntransporting passengers, which also carries its own engine or motor.", 
            "htmlTitle": "Automobile - Wikipedia, the free encyclopedia", 
            "kind": "customsearch#result", 
            "link": "http://en.wikipedia.org/wiki/Automobile", 
            "snippet": "An automobile, autocar, motor car or car is a wheeled motor vehicle used for \ntransporting passengers, which also carries its own engine or motor.", 
            "title": "Automobile - Wikipedia, the free encyclopedia"
        }, 
        {
            "cacheId": "grA1uty9HdAJ", 
            "displayLink": "cars.sfgate.com", 
            "formattedUrl": "cars.sfgate.com/", 
            "htmlFormattedUrl": "<b>cars</b>.sfgate.com/", 
            "htmlSnippet": "Find new and used <b>cars</b> in San Francisco, San Jose, San Mateo, Oakland, and <br>\nthe rest of the Bay Area, <b>car</b> news and research and The San Francisco Auto&nbsp;...", 
            "htmlTitle": "SFGate Local Marketplace | New and Used <b>Cars</b> in San Francisco <b>...</b>", 
            "kind": "customsearch#result", 
            "link": "http://cars.sfgate.com/", 
            "snippet": "Find new and used cars in San Francisco, San Jose, San Mateo, Oakland, and \nthe rest of the Bay Area, car news and research and The San Francisco Auto\u00a0...", 
            "title": "SFGate Local Marketplace | New and Used Cars in San Francisco ..."
        }, 
        {
            "cacheId": "8Qk0stVn32QJ", 
            "displayLink": "en.wikipedia.org", 
            "formattedUrl": "en.wikipedia.org/wiki/Cars_(song)", 
            "htmlFormattedUrl": "en.wikipedia.org/wiki/<b>Cars</b>_(song)", 
            "htmlSnippet": "&quot;<b>Cars</b>&quot; is a 1979 song by UK artist Gary Numan, and was released as a single <br>\nfrom the album The Pleasure Principle. It reached the top of the charts in several<br>\n&nbsp;...", 
            "htmlTitle": "<b>Cars</b> (song) - Wikipedia, the free encyclopedia", 
            "kind": "customsearch#result", 
            "link": "http://en.wikipedia.org/wiki/Cars_(song)", 
            "snippet": "\"Cars\" is a 1979 song by UK artist Gary Numan, and was released as a single \nfrom the album The Pleasure Principle. It reached the top of the charts in several\n\u00a0...", 
            "title": "Cars (song) - Wikipedia, the free encyclopedia"
        }, 
        {
            "cacheId": "SOIY5N3zyOUJ", 
            "displayLink": "trailers.apple.com", 
            "formattedUrl": "trailers.apple.com/trailers/disney/cars/", 
            "htmlFormattedUrl": "trailers.apple.com/trailers/disney/<b>cars</b>/", 
            "htmlSnippet": "Lightning McQueen, a hotshot rookie race <b>car</b> driven to succeed, discovers that <br>\nlife is about the journey, not the finish line, when he finds himself unexpectedly&nbsp;...", 
            "htmlTitle": "<b>Cars</b> - Movie Trailers - iTunes", 
            "kind": "customsearch#result", 
            "link": "http://trailers.apple.com/trailers/disney/cars/", 
            "snippet": "Lightning McQueen, a hotshot rookie race car driven to succeed, discovers that \nlife is about the journey, not the finish line, when he finds himself unexpectedly\u00a0...", 
            "title": "Cars - Movie Trailers - iTunes"
        },
        {
            "cacheId": "H75rMPosXksJ", 
            "displayLink": "www.cars.com", 
            "formattedUrl": "www.cars.com/", 
            "htmlFormattedUrl": "www.<b>cars</b>.com/", 
            "htmlSnippet": "Use <b>Cars</b>.com to search 2.6 million new &amp; used <b>car</b> listings or get a dealer quote. <br>\nOur easy-to-use online tools put you a step ahead in your next vehicle&nbsp;...", 
            "htmlTitle": "New <b>Cars</b>, Used <b>Cars</b>, <b>Car</b> Reviews | <b>Cars</b>.com", 
            "kind": "customsearch#result", 
            "link": "http://www.cars.com/", 
            "snippet": "Use Cars.com to search 2.6 million new & used car listings or get a dealer quote. \nOur easy-to-use online tools put you a step ahead in your next vehicle\u00a0...", 
            "title": "New Cars, Used Cars, Car Reviews | Cars.com"
        }, 
        {
            "cacheId": "-xdXy-yX2fMJ", 
            "displayLink": "www.imdb.com", 
            "formattedUrl": "www.imdb.com/title/tt0317219/", 
            "htmlFormattedUrl": "www.imdb.com/title/tt0317219/", 
            "htmlSnippet": "A hot-shot race-<b>car</b> named Lightning McQueen gets waylaid in Radiator Springs, <br>\nwhere he finds the true meaning of friendship and family.", 
            "htmlTitle": "<b>Cars</b> (2006) - IMDb", 
            "kind": "customsearch#result", 
            "link": "http://www.imdb.com/title/tt0317219/", 
            "snippet": "A hot-shot race-car named Lightning McQueen gets waylaid in Radiator Springs, \nwhere he finds the true meaning of friendship and family.", 
            "title": "Cars (2006) - IMDb"
        }, 
        {
            "cacheId": "1BoR6M9fXwcJ", 
            "displayLink": "cars.disney.com", 
            "formattedUrl": "cars.disney.com/", 
            "htmlFormattedUrl": "<b>cars</b>.disney.com/", 
            "htmlSnippet": "Welcome to the Disney <b>Cars</b> homepage. Browse movies, watch videos, play <br>\ngames, and meet the characters from Disney&#39;s World of <b>Cars</b>.", 
            "htmlTitle": "Disney <b>Cars</b>", 
            "kind": "customsearch#result", 
            "link": "http://cars.disney.com/", 
            "snippet": "Welcome to the Disney Cars homepage. Browse movies, watch videos, play \ngames, and meet the characters from Disney's World of Cars.", 
            "title": "Disney Cars"
        }, 
        {
            "cacheId": "Na8wWAUN5LIJ", 
            "displayLink": "www.cnet.com", 
            "formattedUrl": "www.cnet.com/topics/car-tech/", 
            "htmlFormattedUrl": "www.cnet.com/topics/<b>car</b>-tech/", 
            "htmlSnippet": "<b>Car</b> Tech reviews and ratings, video reviews, user reviews, <b>Car</b> Tech buying <br>\nguides, prices, and comparisons from CNET.", 
            "htmlTitle": "<b>Car</b> Tech - CNET", 
            "kind": "customsearch#result", 
            "link": "http://www.cnet.com/topics/car-tech/", 
            "snippet": "Car Tech reviews and ratings, video reviews, user reviews, Car Tech buying \nguides, prices, and comparisons from CNET.", 
            "title": "Car Tech - CNET"
        }, 
        {
            "cacheId": "iflPmNl879sJ", 
            "displayLink": "en.wikipedia.org", 
            "formattedUrl": "en.wikipedia.org/wiki/Cars_(film)", 
            "htmlFormattedUrl": "en.wikipedia.org/wiki/<b>Cars</b>_(film)", 
            "htmlSnippet": "<b>Cars</b> is a 2006 American computer-animated comedy-adventure sports film <br>\nproduced by Pixar Animation Studios, and directed and co-written by John <br>\nLasseter&nbsp;...", 
            "htmlTitle": "<b>Cars</b> (film) - Wikipedia, the free encyclopedia", 
            "kind": "customsearch#result", 
            "link": "http://en.wikipedia.org/wiki/Cars_(film)", 
            "snippet": "Cars is a 2006 American computer-animated comedy-adventure sports film \nproduced by Pixar Animation Studios, and directed and co-written by John \nLasseter\u00a0...", 
            "title": "Cars (film) - Wikipedia, the free encyclopedia"
        }, 
        {
            "cacheId": "MGjy33JqBtkJ", 
            "displayLink": "www.caranddriver.com", 
            "formattedUrl": "www.caranddriver.com/", 
            "htmlFormattedUrl": "www.<b>car</b>anddriver.com/", 
            "htmlSnippet": "Research 2014 and 2015 <b>cars</b> on <b>Car</b> and Driver. Our new <b>car</b> reviews and <b>car</b> <br>\nbuying resources help you make informed decisions. <b>Car</b> and Driver <b>car</b> reviews<br>\n&nbsp;...", 
            "htmlTitle": "<b>Car</b> Reviews - New <b>Cars</b> for 2014 and 2015 at <b>Car</b> and Driver", 
            "kind": "customsearch#result", 
            "link": "http://www.caranddriver.com/", 
            "snippet": "Research 2014 and 2015 cars on Car and Driver. Our new car reviews and car \nbuying resources help you make informed decisions. Car and Driver car reviews\n\u00a0...", 
            "title": "Car Reviews - New Cars for 2014 and 2015 at Car and Driver"
        }, 
        {
            "cacheId": "QJoGPmN8z8UJ", 
            "displayLink": "en.wikipedia.org", 
            "formattedUrl": "en.wikipedia.org/wiki/Automobile", 
            "htmlFormattedUrl": "en.wikipedia.org/wiki/Automobile", 
            "htmlSnippet": "An automobile, autocar, motor <b>car</b> or <b>car</b> is a wheeled motor vehicle used for <br>\ntransporting passengers, which also carries its own engine or motor.", 
            "htmlTitle": "Automobile - Wikipedia, the free encyclopedia", 
            "kind": "customsearch#result", 
            "link": "http://en.wikipedia.org/wiki/Automobile", 
            "snippet": "An automobile, autocar, motor car or car is a wheeled motor vehicle used for \ntransporting passengers, which also carries its own engine or motor.", 
            "title": "Automobile - Wikipedia, the free encyclopedia"
        }, 
        {
            "cacheId": "grA1uty9HdAJ", 
            "displayLink": "cars.sfgate.com", 
            "formattedUrl": "cars.sfgate.com/", 
            "htmlFormattedUrl": "<b>cars</b>.sfgate.com/", 
            "htmlSnippet": "Find new and used <b>cars</b> in San Francisco, San Jose, San Mateo, Oakland, and <br>\nthe rest of the Bay Area, <b>car</b> news and research and The San Francisco Auto&nbsp;...", 
            "htmlTitle": "SFGate Local Marketplace | New and Used <b>Cars</b> in San Francisco <b>...</b>", 
            "kind": "customsearch#result", 
            "link": "http://cars.sfgate.com/", 
            "snippet": "Find new and used cars in San Francisco, San Jose, San Mateo, Oakland, and \nthe rest of the Bay Area, car news and research and The San Francisco Auto\u00a0...", 
            "title": "SFGate Local Marketplace | New and Used Cars in San Francisco ..."
        }, 
        {
            "cacheId": "8Qk0stVn32QJ", 
            "displayLink": "en.wikipedia.org", 
            "formattedUrl": "en.wikipedia.org/wiki/Cars_(song)", 
            "htmlFormattedUrl": "en.wikipedia.org/wiki/<b>Cars</b>_(song)", 
            "htmlSnippet": "&quot;<b>Cars</b>&quot; is a 1979 song by UK artist Gary Numan, and was released as a single <br>\nfrom the album The Pleasure Principle. It reached the top of the charts in several<br>\n&nbsp;...", 
            "htmlTitle": "<b>Cars</b> (song) - Wikipedia, the free encyclopedia", 
            "kind": "customsearch#result", 
            "link": "http://en.wikipedia.org/wiki/Cars_(song)", 
            "snippet": "\"Cars\" is a 1979 song by UK artist Gary Numan, and was released as a single \nfrom the album The Pleasure Principle. It reached the top of the charts in several\n\u00a0...", 
            "title": "Cars (song) - Wikipedia, the free encyclopedia"
        }, 
        {
            "cacheId": "SOIY5N3zyOUJ", 
            "displayLink": "trailers.apple.com", 
            "formattedUrl": "trailers.apple.com/trailers/disney/cars/", 
            "htmlFormattedUrl": "trailers.apple.com/trailers/disney/<b>cars</b>/", 
            "htmlSnippet": "Lightning McQueen, a hotshot rookie race <b>car</b> driven to succeed, discovers that <br>\nlife is about the journey, not the finish line, when he finds himself unexpectedly&nbsp;...", 
            "htmlTitle": "<b>Cars</b> - Movie Trailers - iTunes", 
            "kind": "customsearch#result", 
            "link": "http://trailers.apple.com/trailers/disney/cars/", 
            "snippet": "Lightning McQueen, a hotshot rookie race car driven to succeed, discovers that \nlife is about the journey, not the finish line, when he finds himself unexpectedly\u00a0...", 
            "title": "Cars - Movie Trailers - iTunes"
        }
    ]
