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
    singleNode:
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
    var deferred = $.Deferred(),
        received = 0,
        result = { };
    
    function onLoaded_(data) {
      result[data.node_id] = { name: Object.firstKey(data.features.NAME) };
      
      if(++received == ids.length)
        deferred.resolve(result);
    };
    
    ids.forEach(function (id) {
      var found = false;
      /* TODO: we are checking to see if the id is in our local bin
       * repository. MUST remove this time wasting crap ASAP. */
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

      if(found)
        return false;
      
      $.getJSON(Api.endpoints.singleNode + id + '?format=jsonp&callback=?')
        .fail(function () {
          console.log("getBinData: request failed");
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