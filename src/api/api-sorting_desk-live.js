/** api-sorting_desk-live.js --- Sorting Desk's live API
 *
 * Copyright (C) 2014 Diffeo
 *
 * Author: Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 * 
 */


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("API-SortingDesk", [ "jQuery" ], function() {
    return Api;
  } );
}


if(typeof Api !== 'undefined')
  throw "Symbol API already defined";
  

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
   for(var id in obj)
     return id;
   return null;
};


/* Class containing only static methods and attributes.
 * Cannot be instantiated.*/
var Api = {
  DELAY_MIN: 200,
  DELAY_MAX: 750,
  MULTIPLE_NODES_LIMIT: 10,
  SCHEME: '//',
  BASE: 'demo.diffeo.com:8080',
  NAMESPACE: 'miguel_sorting_desk',
  RANKER: 'similar',

  TEXT_VIEW_HIGHLIGHTS: 1,
  TEXT_VIEW_UNRESTRICTED: 2,
  TEXT_CONDENSED_CHARS: 100,
  TEXT_HIGHLIGHTS_CHARS: 150,
  
  lastId: 0,                   /* So we may assign ids to secondary bins when
                                * creating them. */

  processing: { },

  initialise: function (bins)
  {
    var ids = [ ];

    Api.bins = { };

    bins.forEach(function (bin) {
      ids.push(bin.node_id);
      Api.bins[bin.node_id] = {
        name: Object.firstKey(bin.features.NAME)
      };

      if(typeof bin.node_id == 'number' && Api.lastId < bin.node_id)
        Api.lastId = bin.node_id;
    } );

    return ids;
  },

  // Given the name of an endpoint (e.g., 's2' or 'nodes'), a dictionary of
  // query parameters and an optional boolean `jsonp` (to craft a JSONP URL),
  // returns a properly encoded URL.
  //
  // Note that this uses jQuery "traditional" style, so with array data, you'll
  // get `key=a&key=b` instead of `key[]=a&key[]=b`.
  url: function(endpoint, params, jsonp) {
    params = params || {};
    var url = this.SCHEME + this.BASE + '/namespaces/';

    /* Prepend protocol if using SortingDesk locally. */
    if(!/^http[s]*:/.test(window.location.protocol))
      url = 'http:' + url;
    
    url += encodeURIComponent(this.NAMESPACE);
    url += '/' + encodeURIComponent(endpoint) + '/?';
    if (jsonp) {
      url += 'callback=?&format=jsonp&';
    }
    return url + $.param(params, true);
  },

  moreTexts: function (num) {
    if(Api.processing.moreTexts) {
      console.log("moreTexts: request ongoing: ignoring new request");
      return null;
    }

    Api.processing.moreTexts = true;
    
    var deferred = $.Deferred();

    if(num <= 0)
      throw "Specified invalid number of items to retrieve";

    var params = {
      noprof: '1', label: true, order: Api.RANKER,
      limit: Api.MULTIPLE_NODES_LIMIT,
      node_id: Api.primaryContentId,
    };
    
    $.getJSON(Api.url('s2', params, true))
      .fail(function () {
        console.log("moreTexts: request failed");
        deferred.reject();
      } )
      .done(function (data) {
        var result = [ ];

        data.forEach(function (item) {
          var node = { };

          try {
            node.raw = item;
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
      console.log("getBinData: request ongoing: ignoring new request");
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

      for(var bid in Api.bins) {
        if(bid != id)
          continue;

        var bin = Api.bins[bid],
            name = { };
        
        name[bin.name] = 0;
        onLoaded_( { node_id: bid, features: { NAME: name } } );
        found = true;
        
        break;
      }

      if(found)                 /* TODO: remove with block above */
        return false;

      /* Issue request to diffeo's RESTful API service. */
      $.getJSON(Api.url('nodes/' + id, {}, true))
        .fail(function () {
          console.log("getBinData: request failed:", id);
          Api.processing.getBinData = false;
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
   *   name: string,
   *   bins: []
   * }
   */
  addBin: function (name) {
    var deferred = $.Deferred();

    window.setTimeout(function () {
      ++Api.lastId;
      
      Api.bins[Api.lastId] = {
        name: name,
        bins: { }
      };

      var result = { };
      result[Api.lastId] = Api.bins[Api.lastId];
      
      deferred.resolve(result);
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX) );

    return deferred.promise();
  },

  /* Returns:
   * {
   *   error: error_string
   * }
   *   ||
   * statement_id: {
   *   statement_text: string
   * }
   */
  addSubBin: function (contentId, text) {
    var deferred = $.Deferred();

    window.setTimeout(function () {
      if(! (contentId in Api.bins)) {
        deferred.reject( {
          error: "Non-existent parent content id given"
        } );

        return;
      }
      
      ++Api.lastId;
      
      Api.bins[contentId].bins[Api.lastId] = {
        name: text
      };

      var result = { };
      result[Api.lastId] = Api.bins[contentId].bins[Api.lastId];
      
      deferred.resolve(result);
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
  removeBin: function (id) {
    var deferred = $.Deferred();

    window.setTimeout(function () {
      var found = false;
      
      /* Ensure bin exists. */
      for(var i in Api.bins) {
        var bin = Api.bins[i];

        if(i == id) {
          delete Api.bins[j];
          deferred.resolve( { error: null } );
          break;
        }
        
        for(var j in bin.bins) {
          if(j == id) {
            delete bin.bins[j];
            deferred.resolve( { error: null } );
            break;
          }
        }
      }

      if(!found)
        deferred.reject( { error: "Not a bin" } );
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));

    return deferred.promise();
  },

  textDismissed: function(item) {},
  textDroppedInBin: function(item, bin) {},

  /* Initially I thought we might be implementing several views, in which case
   * we would need either a `switch' (like the one below) or a lookup table to
   * direct execution to the appropriate function . I believe now two view modes
   * should be enough and that the `switch' below can be removed. */
  renderText: function (item, view) {
    switch(view || Api.TEXT_VIEW_HIGHLIGHT) {
    case Api.TEXT_VIEW_UNRESTRICTED:
      return Api.renderTextUnrestricted(item);
    case Api.TEXT_VIEW_HIGHLIGHTS:
    default:
      return Api.renderTextHighlights(item);
    }      
  },

  renderText_: function (item, text, view, less) {
    var node = $('<div class="text-item view-' + view + '"/>'),
        content = $('<div class="text-item-content"/>'),
        anchor = item.name;

    /* Append title if existent. */
    if(item.title)
      anchor += '&ndash; ' + item.title;

    node.append('<a class="text-item-title" target="_blank" '
                + 'href="' + item.url + '">'
                + anchor + '</a>');

    node.append('<a class="text-item-close" href="#">x</a>');

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
    return Api.renderText_(
      item,
      item.text,
      Api.TEXT_VIEW_UNRESTRICTED,
      new TextItemSnippet(item.text).canTextBeReduced(
        Api.TEXT_HIGHLIGHTS_CHARS,
        Api.TEXT_HIGHLIGHTS_CHARS)
        ? true : null);
  },

  renderBin: function (bin) {
    /* Wrap bin name inside a DIV. */
    return $('<div class="sd-bin"><div class="sd-bin-shortcut"/>'
             + bin.name + '</div>');
  },

  renderSubBin: function (bin) {
    /* Wrap bin statement_text inside a DIV. */
    return $('<div class="sd-bin-sub"><div class="sd-bin-shortcut"/>'
             + bin.name + '</div>');
  },

  renderAddButton: function (caption) {
    return $('<div><span>' + caption + '</span></div>');
  }
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
        i, j, skip,
        highlight,
        result;

    if(!matcho)
      return this.condense(left + right);
    
    /* We (perhaps dangerously) assume that a stranded closing tag </B> will not
     * exist before the first opening tag <b>. */
    matchc = /<\s*\/[bB]\s*>/.exec(this.text); /* find end of B tag */

    /* Skip tag, position and extract actual text inside B tag. Use semantic
     * STRONG rather than B tag. */
    i = matcho.index + matcho[0].length;
    highlight = '<STRONG>' + this.text.substr(
      i,
      matchc.index - i) + '</STRONG>';

    /* Move `left' chars to the left of current position and align to word
     * boundary.
     *
     * Note: the assumption is that the browser will be smart enough (and modern
     * ones are) to drop any closed but unopened tags between `i' and
     * `matcho.index'. */
    i = this.indexOfWordLeft(matcho.index - left);

    /* Prepend ellipsis at beginning of result if index not at beginning of
     * string and add text to left of highlight as well as highlight itself.. */
    result = (i > 0 ? "[...]&nbsp;" : '')
      + this.text.substr(i < 0 ? 0 : i, matcho.index - i) + highlight;

    /* Set index to the right of the closing B tag and skip at most `right'
     * chars, taking care not to count chars that are part of any HTML tags
     * towards the `right' chars limit. Align to word boundary and add text. */
    i = matchc.index + matchc[0].length;
    skip = this.skip(i, right);
    j = this.indexOfWordRight(skip.index);
    
    result += this.text.substr(i, j - i);

    /* Close stranded opened tags.
     *
     * Note: probably not necessary but since we know about the non-closed tags,
     * why not close them anyway? */
    j = skip.tags.length;
    
    while(j--)
      result += '</' + skip.tags[j] + '>';
    
    /* Append ellipsis at end of result if index not at end of string. */
    if(j < this.text.length - 1)
      result += "&nbsp;[...]";

    /* And Bob's your uncle. */
    return result;
  },

  condense: function (right) {
    var i = this.indexOfWordRight(right),
        result = this.text.substring(0, i);

    if(i < this.text.length - 1)
      result += '&nbsp;[...]';

    return result;
  },

  skip: function (ndx, count) {
    var tags = [ ];

    while(ndx < this.text.length && count) {
      var ch = this.text.charAt(ndx);

      if(ch == '<') {
        var result = this.extractTag(ndx);

        ndx = result.index;

        if(result.tag)
          tags.push(result.tag);
        else
          tags.pop();
      } else {
        ++ndx;
        --count;
      }
    }

    return { index: ndx, tags: tags };
  },

  extractTag: function (ndx) {
    var match = /<\s*(\/)?\s*([a-zA-Z]+)\s*[^>]*>/.exec(this.text.substr(ndx));

    if(match) {
      return { index: match.index + ndx + match[0].length,
               tag: match[1] ? null : match[2] };
    }
    
    return { index: ndx };
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
  },

  canTextBeReduced: function (left, right) {
    var reduced = this.highlights(left, right);
    return reduced.length < this.text.length;
  }
};
