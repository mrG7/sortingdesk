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


var Embeddable = (function ($, std, DragDropMonitor, undefined) {

  /* Module variables */
  var monitor;


  /* Message handling */
  self.port.on("initialise", function () {
    initialise();
  } );

  self.port.on("get-selection", function () {
    var result = { },
        val,
        active = monitor.active;

    console.log("getting active selection");

    /* We can't yet generate a content_id so we just attached the page's
     * URL for now. */
    result.href = window.location.href;
    result.document = window.document.documentElement.outerHTML;

    if(active && active.length > 0) {
      /* Retrieve image's src and clear active drop. */
      active = active.get(0);
      val = active.src;

      if(val) {
        result.id = result.content = val;
        result.caption = active.alt || active.title;
        result.type = "image";
      } else
        console.error("Unable to retrieve valid `src´ attribute");
    } else {
      var sel = window.getSelection();

      if(sel && sel.anchorNode)
        val = sel.toString();
      else
        console.error("No text currently selected");

      if(val && val.length > 0) {
        /* Craft a unique id for this text snippet based on its content, Xpath
         * representation, offset from selection start and length. This id is
         * subsequently used to generate a unique and collision free unique
         * subtopic id. */
        result.xpath = std.Html.getXpathSimple(sel.anchorNode);
        result.id = [ val, result.xpath, sel.anchorOffset, val.length ]
          .join('|');

        result.content = val;
        result.type = "text";
      }
    }

    /* Return selection data if `type´ attribute present; null, otherwise. */
    self.port.emit("get-selection", std.is_str(result) ? result : null);
  } );

  self.port.on("check-selection", function () {
    var result;

    if(!monitor.down)
      result = false;
    else {
      var active = monitor.active;

      if(active && active.length > 0)
        result = !!active.get(0).src;
      else {
        active = window.getSelection();
        result = active
                 && active.anchorNode
                 && active.toString().length > 0;
      }
    }

    self.port.emit("check-selection", result);
  } );

  self.port.on("get-page-meta", function () {
    self.port.emit("get-page-meta", {
      href: window.location.href,
      document: window.document.documentElement.outerHTML
    } );
  } );


  /* Module-wide functions */
  var initialise = function () {
    console.log("Initialising embeddable content");
    monitor = new DragDropMonitor();
    console.info("Initialised embeddable content");
  };

})($, SortingCommon, DragDropMonitor);