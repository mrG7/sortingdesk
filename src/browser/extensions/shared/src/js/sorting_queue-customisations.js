
var SortingQueueCustomisations = (function ($, std, sq) {

  /**
   * @class
   * */
  var Item = function(owner, item)
  {
    if(!owner.owner.initialised)
      return;

    sq.Item.call(this, owner, item);
  };

  Item.prototype = Object.create(sq.Item.prototype);

  Item.prototype.render = function(text, view, less)
  {
    /* Nodes */
    var node = $('<div class="' + sq.Css.item.container + '"/>'),
        content = $('<div class="' + sq.Css.item.content + '"/>'),
        css = Css.item;

    /* Data */
    var raw = this.content_.raw,
        fc = this.content_.fc,
        desc = fc.value('meta_clean_visible').trim(),
        url = fc.value('meta_url');

    desc = desc.replace(/\s+/g, ' ').slice(0, 200);

    /* Begin appending data */
    node.append('<a class="' + sq.Css.item.close + '" href="#">x</a>');

    content.append($('<p/>').addClass(css.title)
                   .text(fc.value('title')
                         || (desc.slice(0, 50) + '...')));

    content.append($('<p/>').text(desc + '...')
                   .addClass(css.description));

    content.append($('<p/>').addClass(css.url)
                   .append($('<a/>').attr('href', url).text(url)));

    if(std.is_num(raw.probability)) {
      content.append($('<p/>')
                     .append(this.create_weight_('Score:', raw.probability))
                     .addClass(css.score));

      var info = raw.feature_cmp_info;
      if(std.is_obj(info)) {
        css = css.dict;

        for(var i in info) {
          var j = info[i],
              values = j.common_values;

          if(std.is_arr(values) && values.length > 0) {
            var container = $('<div/>').addClass(css.container),
                hasPhi = std.is_num(j.phi) && j.phi > 0,
                el;

            el = $('<div/>').addClass(css.weight);
            if(hasPhi)
              el.append(this.create_weight_('Score:', 1 - j.phi));

           if(std.is_num(j.weight) && j.weight > 0) {
              if(hasPhi)
                el.append('<br/>');

              el.append(this.create_weight_('Weight:', j.weight));
           }

            container.append(el);
            container.append($('<h1/>').text(i));

            el = $('<div/>').addClass(css.values);

            if(i === 'image_url') {
              values.forEach(function (v) {
                el.append($('<img/>').attr('src', v));
              } );
            } else {
              values.forEach(function (v) {
                el.append($('<span/>').text(v));
              } );
            }

            container.append(el);
            content.append(container);
            content.append($('<div/>').addClass(Css.clear));
          }
        }
      }
    }

    node.append(content);
    return node;
  };

  Item.prototype.create_weight_ = function (caption, weight, css)
  {
    var elc = $('<span/>')
          .addClass(css || Css.item.dict.weight)
          .attr('title', weight.toFixed(4)),
        els = $('<span/>');

    elc.append($('<span/>').text(caption));

    var ns = Math.round(weight / 0.2),
        nc = 5 - ns;

    while(ns-- > 0)
      els.append($('<span/>').addClass('glyphicon glyphicon-star'));

    while(nc-- > 0)
      els.append($('<span/>').addClass('glyphicon glyphicon-star-empty'));

    return elc.append(els);
  };


  var Css = {
    clear: 'sd-clear',
    item: {
      title: 'sd-text-item-title',
      description: 'sd-text-item-description',
      url: 'sd-text-item-url',
      score: 'sd-text-item-score',
      dict: {
        container: 'sd-dict-container',
        weight: 'sd-dict-weight',
        values: 'sd-dict-values'
      }
    }
  };

  /* Module public API */
  return {
    Item: Item
  };

})($, SortingCommon, SortingQueue);