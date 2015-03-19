
var SortingQueueCustomisations = (function (window, $, std, sq) {

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
    var self = this;

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
      var info = raw.intermediate_model_results,
          els = $('<p/>')
            .append(this.create_score_('Score:', raw.probability))
            .addClass(css.score);

      content.append(els);

      if(std.is_arr(info)) {
        var cloud = [];
        css = css.dict;

        for(var i = 0, l = info.length; i < l; ++i) {
          var j = info[i],
              values = j.common_feature_values;

          if(std.is_arr(values) && values.length > 0) {
            var descr = { },
                a, b;

            a = descr.title = j.feature1;
            descr.is_image = a === 'image_url';
            a = descr.kernel_value = std.is_num(j.kernel_value) ?
              j.kernel_value : 0;
            b = descr.weight = std.is_num(j.weight) ? j.weight : 0;
            a = descr.score = a * b;
            descr.values = values;

            /* `b´ refers to index in `cloud´ where to place this descriptor.
             * `a´ refers to score, computed by multiplying kernel_value and
             *     weight. */
            b = 0;
            if(cloud.some(function (ci, ndx) {
              if(a > ci.score) {
                b = ndx;
                return true;
              } } ) === true)
              cloud.splice(b, 0, descr);
            else
              cloud.push(descr);
          }
        }

        if(cloud.length > 0) {
          var container = $('<div/>').addClass(css.container),
              el = $('<div/>').addClass(css.values),
              elul = $('<ul/>');

          cloud.forEach(function (i) {
            var score = Math.max(0, i.score);

            if(i.is_image) {
              i.values.forEach(function (v) {
                var n = $('<img/>')
                      .attr('src', v)
                      .css('height', score * 20 + 5);

                self.set_value_attributes_(n, i);
                elul.append($('<li/>').append(n));
              } );
            } else {
              i.values.forEach(function (v) {
                var n = $('<span/>').text(v)
                      .css( {
                        'font-size': Math.min(score * 200 + 60, 290) + '%',
                        'font-weight': Math.min(Math.ceil(score*9)*100, 900)
                      } );

                self.set_value_attributes_(n, i);
                elul.append($('<li/>').append(n));
              } );
            }
          } );

          container.append(el.append(elul));
          new ItemMoreHandler(els);
          content.append(container);
        }
      }
    }

    node.append(content);
    return node;
  };

  Item.prototype.set_value_attributes_ = function (el, descriptor)
  {
    el.attr('title',
            [ descriptor.title, ' | ',
              'Kernel: ', descriptor.kernel_value.toFixed(4), ' | ',
              'Weight: ', descriptor.weight.toFixed(4), ' | ',
              'Score: ', descriptor.score.toFixed(4) ].join(''));
  };

  Item.prototype.create_score_ = function (caption, weight, css)
  {
    var elc = $('<span/>').addClass(css || Css.item.dict.score),
        els = $('<span/>');

    elc.append($('<span/>').html(caption))
      .append($('<span/>').text(weight.toFixed(4)));

    var ns = Math.round(weight / 0.2),
        nc = 5 - ns;

    while(ns-- > 0)
      els.append($('<span/>').addClass('glyphicon glyphicon-star'));

    while(nc-- > 0)
      els.append($('<span/>').addClass('glyphicon glyphicon-star-empty'));

    return elc.append(els);
  };


  /**
   * @class */
  var ItemMoreHandler = function (container)
  {
    var el = $('<span/>')
          .addClass(Css.item.dict.more)
          .append($('<span/>').addClass(Css.item.dict.moreIcon));

    el.append($('<a/>')
              .attr('href', '#')
              .click(ItemMoreHandler.onClickMore));

    container.prepend(el);

    /* Attributes */
    this.timeout = null;
  };

  ItemMoreHandler.onClickMore = function (ev)
  {
    var self = this,
        more = $(ev.target).parent(),
        el = more.parent().next();

    if(el.length === 0) {
      console.error("Failed to retrieve dict container element");
      return;
    }

    var active = !el.hasClass(Css.active);
    el.toggleClass(Css.active, active);
    more.toggleClass(Css.active, active);

    if(this.timeout !== null)
      window.clearTimeout(this.timeout);

    /* This is a workaround to prevent a visual artifact from occurring which
     * can be observed when the number of items in the dict container is too
     * small and results in a momentary flicker when the user clicks to expand
     * the container.  To work around this, we set the vertical overflow
     * property manually *after* the animation has finished, if the container
     * is set to active; otherwise, the overflow is set to hidden immediately.
     * */
    if(active) {
      this.timeout = window.setTimeout(function () {
        el.css('overflow-y', 'auto');
        self.timeout = null;
      }, 250);
    } else
      el.css('overflow-y', 'hidden');
  };


  var Css = {
    clear: 'sd-clear',
    active: 'sd-active',
    inactive: 'sd-inactive',
    item: {
      title: 'sd-text-item-title',
      description: 'sd-text-item-description',
      url: 'sd-text-item-url',
      score: 'sd-text-item-score',
      dict: {
        container: 'sd-dict-container',
        score: 'sd-dict-score',
        values: 'sd-dict-values',
        more: 'sd-dict-more',
        moreIcon: 'sd-dict-more-icon'
      }
    }
  };

  /* Module public API */
  return {
    Item: Item
  };

})(window, $, SortingCommon, SortingQueue);