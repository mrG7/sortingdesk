/**
 * @file Sorting Desk: explorer component.
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
  var explorer = sd.explorer = sd.explorer || { };


  /**
   * class
   * */
  explorer.DragDropHandler = function (owner)
  {
    std.Owned.call(this, owner);

    /* Attributes */
    this.sd_ = owner.owner;
    this.target_ = null;
    this.timer_ = null;
    this.exit_ = true;
    this.events_ = new std.Events(this, [ 'drop-folder', 'drop-subfolder' ]);

    /* Initialisation sequence */
    var self = this;
    this.sd_.nodes.explorer.on( {
      "dragover":  function (ev){self.on_dragging_enter_(ev);return false;},
      "dragenter": function (ev){self.on_dragging_enter_(ev);return false;},
      "dragleave": function (ev){self.on_dragging_exit_(ev); return false;},
      "drop": function (ev)
      {
        var ent = self.on_dragging_exit_(ev);

        /* Prevent triggering default handler. */
        ev.originalEvent.preventDefault();

        if(ent instanceof explorer.Folder)
          self.events_.trigger('drop-folder', ev, ent);
        else if(ent instanceof explorer.Subfolder)
          self.events_.trigger('drop-subfolder', ev, ent);

        return false;
      }
    } );
  };

  explorer.DragDropHandler.TIMEOUT_CLEAR_TARGET = 250;

  explorer.DragDropHandler.prototype = Object.create(std.Owned.prototype);

  explorer.DragDropHandler.prototype.reset = function ()
  {
    this.sd_.nodes.explorer.off();
    this.target_ = this.sd_ = null;
  };

  explorer.DragDropHandler.prototype.clear_target_ = function (now)
  {
    var self = this;

    if(this.timer_ !== null) {
      this.do_clear_target_();
      window.clearTimeout(this.timer_);
    }

    this.timer_ = window.setTimeout(function () {
      if(self.target_ !== null)
        self.do_clear_target_();

        self.timer_ = null;
    }, now === true ? 0 : explorer.DragDropHandler.TIMEOUT_CLEAR_TARGET);
  };

  explorer.DragDropHandler.prototype.do_clear_target_ = function ()
  {
    if(this.target_ !== null) {
      this.target_.removeClass(sd.ui.Css.droppable.hover);
      this.target_ = null;
    }
  };

  explorer.DragDropHandler.prototype.set_target_ = function (el)
  {
    if(this.target_ !== null && !std.$.same(this.target_, el))
      this.target_.removeClass(sd.ui.Css.droppable.hover);

    this.target_ = el;
  };

  explorer.DragDropHandler.prototype.on_dragging_enter_ = function (ev)
  {
    this.exit_ = false;
    ev = ev.originalEvent;

    var self = this,
        to = ev.toElement || ev.target,
        el = to && to.nodeName.toLowerCase() === 'a' && to || false;

    if(el && el.parentNode && el.parentNode.id) {
      var fl = this.owner_.getAnyById(el.parentNode.id);

      if(std.instanceany(fl, explorer.Folder, explorer.Subfolder)) {
        el = $(el);

        /* Clear target immediately if current target not the same as active
         * element.  If it is the same, return straight away since we already
         * know the selection is valid (see below). */
        if(this.target_ !== null) {
          if(std.$.same(this.target_, el))
            return fl;

          this.clear_target_(true);
        }

        /* Disallow drops when folder/subfolder is in a loading state. */
        if(fl.loading())
          return fl;

        var d = this.sd_.callbacks.invokeMaybe("checkSelection");
        if(d === undefined)
          this.on_selection_queried_(el, true);
        else {
          d.done(function (result) {
            self.on_selection_queried_(el, result);
          } );
        }

        return fl;
      }
    }

    this.clear_target_();
    return null;
  };

  explorer.DragDropHandler.prototype.on_selection_queried_ = function (el, result)
  {
    /* Return straight away if there is a target already active, the
     * drag event terminated meanwhile or the selection check failed.
     * */
    if(this.target_ !== null || this.exit_ || result !== true)
      return;

    el.addClass(sd.ui.Css.droppable.hover);
    this.set_target_(el);
  };

  explorer.DragDropHandler.prototype.on_dragging_exit_ = function (ev)
  {
    this.exit_ = true;
    this.clear_target_(true);
    ev = ev.originalEvent;

    var to = ev.toElement || ev.target,
        el = to && to.nodeName.toLowerCase() === 'a' && to || false;

    if(el && el.parentNode && el.parentNode.id) {
      var fl = this.owner_.getAnyById(el.parentNode.id);

      if(std.instanceany(fl, explorer.Folder, explorer.Subfolder)
         && !fl.loading()) return fl;
    }

    return null;
  };


  return sd;

})(this,
   this.$,
   this.SortingCommon,
   this.SortingDesk);