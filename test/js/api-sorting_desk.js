/** api-sorting_desk.js --- Sorting Desk's fake API
 *
 * Copyright (C) 2014 Diffeo
 *
 * Author: Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 * 
 */


/* Declare random number generator and assign it to Math static class */
Math.rand = function (min, max)
{
  return Math.floor(Math.random() * (max - min + 1) + min);
};


/* Class containing only static methods and attributes.
 * Cannot be instantiated.*/
Api = {
  DELAY_MIN: 200,
  DELAY_MAX: 750,
    

  /* The following method is in contravention of the specs. It returns the
   * text items inside of a possibly illegal attribute (`result'). */
  moreTexts: function (num) {
    var deferred = $.Deferred();

    if(num <= 0)
      throw "Specified invalid number of items to retrieve";

    window.setTimeout(function () {
      var result = [ ],
          lengthCollection = ApiData.itemsCollection.length;
      
      while(num-- > 0) {
        /* IMPORTANT: clone the object to prevent unexpected behaviour */
        var item = $.extend(
          {},
          ApiData.itemsCollection[ApiData.lastItem % lengthCollection]);
        
        item.content_id = ApiData.lastItem;

        result.push(item);
        ++ApiData.lastItem;
      }
      
      deferred.resolve(result);
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));

    return deferred.promise();
  },

  /* Always resolves for the time being.
   * 
   * Returns:
   * {
   *   name: string,
   *   bins: []
   * }
   */
  getBinData: function (ids) {
    var deferred = $.Deferred();

    window.setTimeout(function () {
      var result = [ ];

      for(var i = 0, l = ids.length, id; id = ids[i], i < l; ++i) {
        if(id in ApiData.bins) {
          result[id] = ApiData.bins[id];
        } else
          result[id] = { error: "Bin not existent" };
      }

      deferred.resolve(result);
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));

    return deferred.promise();
  },

  /* (Always) returns:
   * {
   *   error: null
   * }
   */
  saveBinData: function (id, bins) {
    var deferred = $.Deferred();
    
    window.setTimeout(function () {
      deferred.resolve( { error: null } );
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));

    return deferred.promise();
  },

  /* Returns:
   * {
   *   error: error_string    ;; presently never returning an error
   * }
   *   ||
   * statement_id: {
   *   name: string,
   *   bins: []
   * }
   */
  addSecondaryBin: function (name) {
    var deferred = $.Deferred();

    window.setTimeout(function () {
      ++ApiData.lastId;
      
      ApiData.bins[ApiData.lastId] = {
        name: name,
        bins: []
      };

      var bin = { };

      bin[ApiData.lastId] = ApiData.bins[ApiData.lastId];
      
      deferred.resolve(bin);
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX) );

    return deferred.promise();
  },

  /* Resolves:
   * {
   *   error: null
   * }
   *
   * Rejects:
   * {
   *   error: string
   * }
   */
  removeSecondaryBin: function (id) {
    var deferred = $.Deferred();

    window.setTimeout(function () {
      /* Ensure bin exists and is _not_ primary. */
      if(id in ApiData.bins) {
        if(id == ApiData.primaryContentId)
          deferred.reject( { error: "Not secondary bin" } );
        else
          deferred.resolve( { error: null } );
      } else
        deferred.resolve( { error: "Secondary bin not existent" } );
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));

    return deferred.promise();
  },

  renderText: function (content) {
    /* Wrap text inside of a SPAN. */
    return $('<div class="text-item">' + content + '</div>');
  },

  renderPrimaryBin: function (bin) {
    /* Wrap bin name inside a DIV. */
    return $('<div class="bin-primary"><div class="bin-shortcut"/>'
             + bin.name + '</div>');
  },

  renderPrimarySubBin: function (bin) {
    /* Wrap bin statement_text inside a DIV. */
    return $('<div class="bin-primary-sub"><div class="bin-shortcut"/>'
             + bin.statement_text + '</div>');
  },

  renderSecondaryBin: function (bin) {
    /* Wrap bin statement_text inside a DIV. */
    return $('<div class="bin-secondary"><div class="bin-shortcut"/>'
             + bin.name + '</div>');
  },

  renderAddButton: function (caption) {
    return $('<div>' + caption + '</div>');
  }
};


/* Class containing only static methods and attributes.
 * Cannot be instantiated. */
var ApiData = {
  primaryContentId: 1,
  secondaryContentIds: [ 100, 101, 102 ],
  bins: {
    1: {
      name: "Primary",
      bins: {
        11: { statement_text: "Interesting" },
        12: { statement_text: "Undecided" },
        13: { statement_text: "Newsworthy" }
      }
    },
    100: {
      name: "Irrelevant",
      bins: [ ]
    },
    101: {
      name: "Rubbish",
      bins: [ ]
    },
    102: {
      name: "Keep",
      bins: [ ]
    }
  },
  lastId: 102,                 /* So we may assign ids to secondary bins when
                                * creating them. */
  lastItem: 0,                 /* So we know the last item sent. */
  items: [
  ],
  itemsCollection: [
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
};