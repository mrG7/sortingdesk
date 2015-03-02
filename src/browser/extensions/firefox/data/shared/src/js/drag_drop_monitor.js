/**
 * @file Drag and drop monitor
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingCommon´ component.
 *
 */


/*global addon */
/*jshint laxbreak:true */

var DragDropMonitor = function ()
{
  /* Define getters. */
  this.__defineGetter__("active",
                        function () { return this.active_; } );

  this.__defineGetter__("down",
                        function () { return this.down_; } );


  /* Initialise component. */
  var self = this;

  $(window).on( {
    mouseenter: function (ev) {
      if(ev.originalEvent.target.nodeName.toLowerCase() === 'img') {
        var el = $(ev.target);
        self.cursor_ = el.css('cursor');
        el.css('cursor', 'copy');
      }
    },

    mouseleave: function (ev) {
      if(self.cursor_ !== null) {
        $(ev.target).css('cursor', self.cursor_);
        self.cursor_ = null;
      }
    },

    mousedown: function (ev) {
      self.down_ = true;

      if(ev.originalEvent.target.nodeName.toLowerCase() === 'img')
        self.active_ = $(ev.target);
    },

    mouseup: function () {
      self.down_ = false;
      self.active_ = null;
    },

    dragend: function () {
      window.setTimeout(function () {
        self.down_ = false;
        self.active_ = null;
      }, DragDropMonitor.TIMEOUT_DRAGEND);
    }
  } );
};

/* Constants */
DragDropMonitor.TIMEOUT_DRAGEND = 250;

/* Attributes */
DragDropMonitor.prototype.cursor_ = null;
DragDropMonitor.prototype.active_ = null;
DragDropMonitor.prototype.down_   = false;