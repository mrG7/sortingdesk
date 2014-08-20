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

/* Extend the Object class and add a method that returns the first available
 * key in a given object.
 *
 * Returns: String || null */
Object.firstKey = function (obj)
{
  var keys = Object.keys(obj);

  return keys.length ? keys[0] : null;
};


/* Class containing only static methods and attributes.
 * Cannot be instantiated.*/
Api = {
  DELAY_MIN: 200,
  DELAY_MAX: 750,
  MULTIPLE_NODES_LIMIT: 10,

  TEXT_VIEW_HIGHLIGHTS: 1,
  TEXT_VIEW_UNRESTRICTED: 2,
  TEXT_CONDENSED_LIMIT: 100,
  
  endpoints: {
    multipleNodes:
    'http://dev5.diffeo.com:10982/namespaces/miguel_sorting_desk/s2/',
    singleNodes:
    'http://dev5.diffeo.com:10982/namespaces/miguel_sorting_desk/nodes/'
  },
    

  /* The following method is in contravention of the specs. It returns the
   * text items inside of a possibly illegal attribute (`result'). */
  moreTexts: function (num) {
    var deferred = $.Deferred();

    if(num <= 0)
      throw "Specified invalid number of items to retrieve";

    $.getJSON(Api.endpoints.multipleNodes +
              '?noprof=1&format=jsonp&label=true&order=similar'
              + '&limit=' + Api.MULTIPLE_NODES_LIMIT
              + '&node_id=' + encodeURIComponent(ApiData.primaryContentId)
              + '&callback=?')
      .fail(function () {
        console.log("moreTexts: request failed");
        deferred.reject();
      } )
      .done(function (data) {
        var result = [ ];

        data.forEach(function (item) {
          var node = { };

          try {
            node.node_id = item.node_id;
            
            item = item.features;
            node.name = Object.firstKey(item.NAME);

            if(item.abs_url)
              node.url = Object.firstKey(item.abs_url);
            
            node.text = Object.firstKey(item.sentences);

            if(item.title)
              node.title = item.title;

            result.push(node);
          } catch(x) {
            console.log("Exception triggered whilst processing node:",
                        x,
                        item);
          }
        } );

        deferred.resolve(result);
      } );

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
   *   statement_text: string
   * }
   */
  addPrimarySubBin: function (text) {
    var deferred = $.Deferred();

    window.setTimeout(function () {
      ++ApiData.lastId;
      
      ApiData.bins[ApiData.primaryContentId].bins[ApiData.lastId] = {
        statement_text: text
      };

      var bin = { };
      bin[ApiData.lastId] = ApiData.bins[ApiData.primaryContentId]
        .bins[ApiData.lastId];
      
      deferred.resolve(bin);
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX) );

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

  /* Initially I thought we might be implementing several views, in which case
   * we would need either a `switch' (like the one below) or a lookup table to
   * direct execution to the appropriate function . I believe now two view modes
   * should be enough and that the `switch' below can be removed. */
  renderText: function (item, view) {
    if(typeof view == 'undefined')
      view = Api.TEXT_VIEW_HIGHLIGHT;
    
    switch(view) {
    case Api.TEXT_VIEW_UNRESTRICTED:
      return Api.renderTextUnrestricted(item);
    case Api.TEXT_VIEW_HIGHLIGHTS:
    default:
      return Api.renderTextHighlights(item);
    }      
  },

  renderText_: function (item, text, view, less) {
    var node = $('<div class="text-item view-' + view + '"/>'),
        content = $('<div class="text-item-content"/>');

    node.append('<a class="text-item-title" target="_blank" '
                + 'href="' + item.url + '">'
                + item.name + '</a>');

    /* Append content and remove all CSS classes from children. */
    content.append(text);
    content.children().removeClass();

    if(less !== null)
      content.append(Api.renderLessMore(less));

    node.append(content);
    
    return node;
  },

  renderLessMore: function (less) {
    var cl = less && 'less' || 'more';
    return '<div class="less-more ' + cl + '">' + cl + '</div>'
      + '<div style="display: block; clear: both" />';
  },

  renderTextCondensed: function (item) {
    var node = Api.renderText_(
      item,
      item.text.substring(
        0,
        Api.indexOfWordRight(item.text, Api.TEXT_CONDENSED_LIMIT))
        + '&nbsp (...)',
      Api.TEXT_VIEW_CONDENSED,
      false);

    return node;
  },

  indexOfWordLeft: function (string, ndx) {
    while(ndx >= 0) {
      if(string.charAt(ndx) == ' ')
        return ndx + 1;
      
      --ndx;
    }

    return 0;
  },

  indexOfWordRight: function (string, ndx) {
    while(ndx < string.length && string.charAt(ndx) != ' ')
      ++ndx;

    return ndx;
  },

  renderTextHighlights: function (item) {
    var node,
        re = /<\s*[bB]\s*[^>]*>/g,
        content = item.text,
        matcho = re.exec(content),
        matchc,
        i, j,
        text;

    if(!matcho)
      return Api.renderTextCondensed(item);

    /* We (perhaps dangerously) assume that a stranded closing tag </B> will not
     * exist before the first opening tag <b>. */
    matchc = /<\s*\/[bB]\s*>/.exec(content);
    i = matcho.index + matcho[0].length;
    text = '<b>' + content.substr(
      i,
      matchc.index - i) + '</b>';

    i = Api.indexOfWordLeft(content, matcho.index - 150);
    text = "(...)&nbsp;"
      + content.substr(i < 0 ? 0 : i, matcho.index - i) + text;

    i = matchc.index + matchc[0].length;
    j = Api.indexOfWordRight(content, i + 150);
    text += content.substr(i, j - i)
      + "&nbsp;(...)";
    
    node = Api.renderText_(item,
                           text,
                           Api.TEXT_VIEW_HIGHLIGHTS,
                           false);
    
    return node;
  },

  renderTextUnrestricted: function (item) {
    var node = Api.renderText_(item,
                               item.text,
                               Api.TEXT_VIEW_UNRESTRICTED,
                               Api.textCanBeReduced(item.text) ? true : null
                              );
    
    return node;
  },

  /* TODO: following function always returns true but it _might_ be the case
   * that a text item is too short (in the unrestricted view mode) to actually
   * allow for a highlights view mode, in which case the 'less' link should not
   * be displayed. */
  textCanBeReduced: function (content) {
    return true;
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
  primaryContentId: 'kb_aHR0cHM6Ly9rYi5kaWZmZW8uY29tL2FsX2FocmFt',
  secondaryContentIds: [ 100, 101, 102 ],
  bins: {
    1: {
      name: "Primary",
      bins: {
        11: { statement_text: "The quick brown fox. He jumped over the lazy dog." },
        12: { statement_text: "The answer is 42." },
        13: { statement_text: "Maybe, but the king of them all is π." }
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