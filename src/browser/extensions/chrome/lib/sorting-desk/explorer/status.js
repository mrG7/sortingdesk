/**
 * @file Sorting Desk: explorer component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingCommon´ component.
 *
 */

this.SortingDesk = (function (window, $, std, sd, undefined) {

  var Css = {
    container: "sd-status"
  };


  /**
   * @namespace
   * */
  sd = sd || { };
  var explorer = sd.explorer = sd.explorer || { };


  /**
   * @class
   * */
  explorer.Status = function (html)
  {
    this.node = null;
    this.html = html || null;
  };

  explorer.Status.prototype.setContent = function (html)
  {
    if(this.node !== null) this.node.html(html);
    this.html = html;
  };

  explorer.Status.prototype.attach = function (parent)
  {
    if(this.html === null)     throw "Null content";
    else if(!std.$.is(parent)) throw "Invalid parent node";
    else if(parent.get(0).nodeName.toLowerCase() !== 'li')
      throw "Invalid parent node";

    if(this.node !== null) this.dettach();

    var $to = parent.find(">a.jstree-anchor");
    if($to.length !== 1) throw "Failed to locate single anchor element";

    this.node = $("<div/>")
      .addClass(Css.container)
      .html(this.html)
      .hide();

    $to.append(this.node.fadeIn("fast"));
  };

  explorer.Status.prototype.dettach = function ()
  {
    if(this.node === null) throw "Not presently attached";
    this.node.fadeOut("fast", function () { $(this).remove(); } );
    this.node = null;
    this.html = null;
  };


  return sd;

})(this,
   this.$,
   this.SortingCommon,
   this.SortingDesk);