/**
 * @file Sorting Desk: queue component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingCommon´ component.
 *
 */

this.SortingDesk = (function (window, $, std, sd, undefined) {

  /**
   * @namespace
   * */
  sd = sd || { };
  var queue = sd.queue = sd.queue || { };


  /**
   * @class
   * */
  queue.Renderer = function (sq, explorer, facets, callbacks, options)
  {
    var self = this;

    this.sortingQueue = sq;
    this.explorer = explorer;
    this.facets = facets;
    this.callbacks = callbacks;
    this.options = options;

    this.sortingQueue.on('pre-render', this.onPreRender_.bind(this));
    this.sortingQueue.on('items-updated', function (count) {
      if(count === 0) {
        self.dismiss(true);
        $('#' + options.suggestion).remove();
        $('#' + options.recommendation).remove();
      }
    } );
  };

  queue.Renderer.hints = [
    'Special phrases are longer strings of characters observed frequently in'
      + ' pages similar to the page you selected above, and less frequently'
      + ' observed elsewhere.',

    'Recommendations are pages that have features in common with the page you'
      + ' selected above. SortingDesk orders the recommendations by similarity'
      + ' to prominent features from all of the pages in the subfolder'
      + ' containing the result you selected.' ];

  queue.Renderer.prototype.onPreRender_ = function (data)
  {
    var self = this,
        node = this.sortingQueue.nodes.items,
        container = $('#' + this.options.recommendation),
        sugg = data.suggestions;

    this.facets.assign(data);

    /* Ensure there is a "recommendations" caption.  Create caption if it
     * doesn't exist. */
    if(container.length === 0) {
      container = $('<h1/>').html('Recommendations' + this.hint(1))
        .attr('id', this.options.recommendation);
      this.insert(container, node);
      this.popover(container.find('.' + this.options.hint));
    }

    container = $('#' + this.options.suggestion);

    /* If there are no suggestion data, self-destruct after a fade out
     * animation and get out of here. */
    if(!std.is_arr(sugg)
       || sugg.length === 0
       || !std.is_arr(sugg[0].hits)
       || sugg[0].hits.length === 0)
    {
      self.dismiss();
      return;
    }

    /* Important that we cancel any running animations or the container may
     * be removed (see above). */
    container.stop();
    sugg = sugg[0];

    /* Always re-create the suggestion container. */
    container.remove();
    container = this.callbacks.invoke('createSuggestionContainer');

    container.append($('<a class="' + sd.ui.Css.close + '" href="#">x</a>')
      .click(function () { self.dismiss(); } ));

    container.append(
      $('<h1/>').html('This special phrase links <strong>'
                     + sugg.hits.length + '</strong> '
                     + (sugg.hits.length === 1 ? 'page.' : 'pages.')
                     + this.hint(0))
    );

    container.append($('<h2/>').html('"' + sugg.phrase + '"'));

    var i = $('<div/>');
    i.append($('<span/>').html(
      $('<a class="' + sd.ui.Css.preview + '" href="#"></a>')
        .click(function () { self.expand(sugg.hits); } )));
    i.append(this.callbacks.invoke('renderScore', sugg.score));
    container.append(i);

    container.find('BUTTON').on('click', function () {
      if(self.explorer.setSuggestions(sugg.phrase, sugg.hits))
        self.dismiss();
    } );

    this.insert(container, node);
    $('<hr/>').insertAfter(container);
    this.popover(container.find('.' + this.options.hint));
  };

  queue.Renderer.prototype.dismiss = function (now)
  {
    var id = '#' + this.options.suggestion,
        container = $(id);

    container.fadeOut(now === true ? 0 : 250, function () {
      $(id + '+HR').remove();
      container.remove();
    });
  };

  queue.Renderer.prototype.expand = function (hits)
  {
    var container = $('#' + this.options.suggestion),
        ul = container.find('UL'),
        preview = container.find('.' + sd.ui.Css.preview);

    if(ul.length > 0) {
      preview.toggleClass(sd.ui.Css.active, !ul.is(':visible'));
      ul.slideToggle(100);
      return;
    } else if(preview.hasClass(sd.ui.Css.loading))
      return;

    preview.addClass(sd.ui.Css.loading);

    /* Load feature collections so we may retrieve the URL for each
     * suggestion. */
    var self = this,
        links = [ ],
        count = hits.length;

    hits.forEach(function (i) {
      self.explorer.api.fc.get(i.content_id).done(function (fc) {
        /* Pick first title in the `i.title` map. */
        for(var k in i.title) break;
        links.push( { title: k, url: fc.raw.meta_url } );
      } ).always(function () {
        if(--count === 0) {
          preview.removeClass(sd.ui.Css.loading);
          self.show_(links);
        }
      } );
    } );
  };

  queue.Renderer.prototype.show_ = function (links)
  {
    var container = $('#' + this.options.suggestion),
        ul = $('<ul/>').hide();

    if(links.length === 0)
      ul.append('<li>Unable to preview results</li>');
    else {
      links.forEach(function (i) {
        ul.append('<li><a href="' + i.url + '">' + i.title + '</a></li>');
      } );
    }

    container.append(ul);
    this.expand();
  };

  queue.Renderer.prototype.hint = function (index)
  {
    if(index >= queue.Renderer.hints.length)
      throw "Invalid hint index";

    return '<a class="' + this.options.hint
      + '" data-content="' + queue.Renderer.hints[index]
      + '" data-placement="bottom" data-trigger="hover">'
      + '<span class="glyphicon glyphicon-question-sign"></span></a>';
  };

  queue.Renderer.prototype.insert = function (container, node)
  {
    /* Insert `container` before the top child node of the search results
     * list, given by `node`. */
    if(node.children().length > 0)
      container.insertBefore(node.children().first());
    else
      node.append(container);
  };

  queue.Renderer.prototype.popover = function (node)
  {
    if(std.is_fn($.fn.popover))
      node.popover({ delay: { show: 250, hide: 250 } });
  };


  return sd;

})(this,
   this.$,
   this.SortingCommon,
   this.SortingDesk);
