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
  TEXT_CONDENSED_CHARS: 100,
  TEXT_HIGHLIGHTS_CHARS: 150,
  
  endpoints: {
    multipleNodes:
    'http://dev5.diffeo.com:10982/namespaces/miguel_sorting_desk/s2/',
    singleNode:
    'http://dev5.diffeo.com:10982/namespaces/miguel_sorting_desk/nodes/'
  },

  processing: { },
    

  /* The following method is in contravention of the specs. It returns the
   * text items inside of a possibly illegal attribute (`result'). */
  moreTexts: function (num) {
    if(Api.processing.moreTexts) {
      console.log("moreTexts: request ongoing: ignoring new request");
      return null;
    }

    Api.processing.moreTexts = true;
    
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

        deferred.resolve(result); } )
      .always(function () {
        Api.processing.moreTexts = false;
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
    if(Api.processing.getBinData) {
      console.log("moreTexts: request ongoing: ignoring new request");
      return null;
    }

    Api.processing.getBinData = true;
    
    var deferred = $.Deferred(),
        received = 0,
        result = { };

    /* Following function is a hack given that we're "loading" bin data both
     * from our local fake data store and diffeo's RESTful API service. */
    function onLoaded_(data) {
      /* Before removing this hack-function, remember to copy this line into
       * the `done' callback below. */
      result[data.node_id] = { name: Object.firstKey(data.features.NAME) };
      
      if(++received == ids.length) {
        deferred.resolve(result);

        /* TODO: stick this line inside the `always' callback when removing this
         * block. */
        Api.processing.getBinData = false;
      }
    };
    
    ids.forEach(function (id) {
      /* TODO: we are checking to see if the id is in our local bin
       * repository. MUST remove this time wasting crap ASAP. */
      var found = false;

      for(var bid in ApiData.bins) {
        if(bid != id)
          continue;

        var bin = ApiData.bins[bid],
            name = { };
        
        name[bin.name] = 0;
        onLoaded_( { node_id: bid, features: { NAME: name } } );
        found = true;
        
        break;
      }

      if(found)                 /* TODO: remove with block above */
        return false;

      /* Issue request to diffeo's RESTful API service. */
      $.getJSON(Api.endpoints.singleNode + id + '?format=jsonp&callback=?')
        .fail(function () {
          console.log("getBinData: request failed:", id);
          deferred.reject();
        } )
        .done(function (data) {
          onLoaded_(data);
        } );
    } );
    
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
    return Api.renderText_(
      item,
      new TextItemSnippet(item.text).condense(Api.TEXT_CONDENSED_CHARS),
      Api.TEXT_VIEW_CONDENSED,
      false);
  },

  renderTextHighlights: function (item) {
    return Api.renderText_(
      item,
      new TextItemSnippet(item.text).highlights(
        Api.TEXT_HIGHLIGHTS_CHARS,
        Api.TEXT_HIGHLIGHTS_CHARS),
      Api.TEXT_VIEW_HIGHLIGHTS,
      false);
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
  lastId: 102                  /* So we may assign ids to secondary bins when
                                * creating them. */
};


var TextItemSnippet = function (text)
{
  this.text = text;
};

TextItemSnippet.prototype = {
  text: null,
  
  highlights: function (left, right) {
    var re = /<\s*[bB]\s*[^>]*>/g,
        matcho = re.exec(this.text),
        matchc,
        i, j,
        highlight,
        result;

    if(!matcho)
      return this.condense(left + right);
    
    /* We (perhaps dangerously) assume that a stranded closing tag </B> will not
     * exist before the first opening tag <b>. */
    matchc = /<\s*\/[bB]\s*>/.exec(this.text);
    i = matcho.index + matcho[0].length;
    highlight = '<b>' + this.text.substr(
      i,
      matchc.index - i) + '</b>';

    i = this.indexOfWordLeft(matcho.index - left);

    /* Prepend ellipsis at beginning of result if index not at beginning of
     * string. */
    result = (i > 0 ? "[...]&nbsp;" : '')
      + this.text.substr(i < 0 ? 0 : i, matcho.index - i) + highlight;

    i = matchc.index + matchc[0].length;
    j = this.indexOfWordRight(i + right);

    result += this.text.substr(i, j - i);

    /* Append ellipsis at end of result if index not at end of string. */
    if(j < this.text.length - 1)
      result += "&nbsp;[...]";

    return result;
  },

  condense: function (right) {
    var i = this.indexOfWordRight(right),
        result = this.text.substring(0, i);

    if(i < this.text.length - 1)
      result += '&nbsp;[...]';

    return result;
  },

  indexOfWordLeft: function (ndx) {
    while(ndx >= 0) {
      if(this.text.charAt(ndx) == ' ')
        return ndx + 1;
      
      --ndx;
    }

    return 0;
  },

  indexOfWordRight: function (ndx) {
    while(ndx < this.text.length && this.text.charAt(ndx) != ' ')
      ++ndx;

    return ndx;
  }
};