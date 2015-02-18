/**
 * @file Monitor of draggable images
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingCommon´ component.
 *
 */


/*global addon */
/*jshint laxbreak:true */

var DraggableImageMonitor = function ()
{
  /* Define getters. */
  this.__defineGetter__("active",
                        function () { return this.active_; } );


  /* Functions */
  var attach_ = function (el)
  {
    (el = $(el))
      .attr('draggable', 'true')
      .on( {
        mouseenter: function () {
          self.cursor_ = el.css('cursor');
          el.css('cursor', 'copy');
        },

        mouseleave: function () {
          el.css('cursor', self.cursor_);
        },

        mousedown: function (ev) {
          self.active_ = $(ev.target);
        },

        mouseup: function () {
          self.active_ = null;
        }
      } );
  };


  /* Initialise component. */
  var self = this;

  /* Attach specialised `drag´ event listeners to every image found on the
   * page. */
  $('IMG').each( function () { attach_(this); } );

  /* Further attach a mutation observer so that we may attach drag event
   * listeners to any new images that are created. */
  document.addEventListener("DOMNodeInserted", function (ev) {
    if(ev.target.nodeName.toLowerCase() === 'img')
      attach_(ev.target);
  }, false);
};

/* Attributes */
DraggableImageMonitor.prototype.cursor_ = null;
DraggableImageMonitor.prototype.active_ = null;

/* Interface */
DraggableImageMonitor.prototype.clear = function ()
{ this.active_ = null; };
