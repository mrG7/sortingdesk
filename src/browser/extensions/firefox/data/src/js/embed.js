/**
 * @file Content script module.
 *
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingDesk' component.
 *
 */


/*global */
/*jshint lax break:true */


var Embeddable = (function ($, std, undefined) {

  /* Module variables */
  var monitor_;


  /* Message handling */
  self.port.on("initialise", function () {
    initialise();
  } );

  self.port.on("get-selection", function () {
    var result = { },
        val,
        active = monitor_.active;

    console.log("getting active selection");

    /* We can't yet generate a content_id so we just attached the page's
     * URL for now. */
    result.href = window.location.href;
    result.document = window.document.documentElement.outerHTML;

    if(active && active.length > 0) {
      /* Retrieve image's src and clear active drop. */
      active = active.get(0);
      val = active.src;
      monitor_.clear();

      if(val) {
        result.id = result.content = val;
        result.caption = active.alt || active.title;
        result.type = "image";

        console.log("Image selection:", result);
        self.port.emit("get-selection", result);
      } else
        console.error("Unable to retrieve valid `src´ attribute");
    } else {
      var sel = window.getSelection();

      if(sel && sel.anchorNode) {
        val = sel.toString();

        /* Craft a unique id for this text snippet based on its content, Xpath
         * representation, offset from selection start and length. This id is
         * subsequently used to generate a unique and collision free unique
         * subtopic id. */
        result.xpath = std.Html.getXpathSimple(sel.anchorNode);
        result.id = [ val,
                      result.xpath,
                      sel.anchorOffset,
                      val.length ].join('|');

        result.content = val;
        result.type = "text";

/*         console.log("Text selection:", result); */
        self.port.emit("get-selection", result);
      } else
        console.error("No text currently selected");
    }

    /* Retrieval of selection failed. */
    self.port.emit("get-selection", null);
  } );


  /**
   * @class
   * */
  var DraggableImageMonitor = function ()
  {
    /* Define getters. */
    this.__defineGetter__("active",
                          function () { return this.active_; } );

    /* Initialise component. */
    var self = this;

    /* Attach specialised `drag´ event listeners to every image found on the
     * page. */
    $('IMG').each( function () {
      var el = $(this);
      el
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
    } );

  };

  /* Attributes */
  DraggableImageMonitor.prototype.cursor_ = null;
  DraggableImageMonitor.prototype.active_ = null;

  /* Interface */
  DraggableImageMonitor.prototype.clear = function ()
  { this.active_ = null; };


  /* Module-wide functions */
  var initialise = function () {
    monitor_ = new DraggableImageMonitor();
    console.info("Initialised embeddable content");
  };

})($, SortingCommon);