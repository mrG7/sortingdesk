/**
 * @file Label Browser component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingQueue' component.
 *
 */


/*global define */
/*jshint laxbreak:true */


/**
 * The Label Browser module.
 *
 * @returns an object containing the module's public interface. */
var LabelBrowser_ = function (window, $, std)
{


  /**
   * @class
   * */
  var Browser = function (options, callbacks)
  {
    if(!std.is_obj(options))
      throw "Invalid `options´ object map specified";
    else if(!std.like_obj(options.api))
      throw "Reference to `API´ instance not found";
    else if(!std.is_obj(options.ref_bin))
      throw "Reference bin not found"; /* not validating if valid. */

    /* Attributes */
    this.initialised_ = false;
    this.options_ = options;
    this.callbacks_ = new std.Callbacks(callbacks);
    this.events_ = new std.Events(
      this, [ 'initialised', 'ready', 'show', 'hide' ] );
    this.api_ = options.api;
    this.ref_bin_ = options.ref_bin;

    /* Check for mandatory options. */
    if(!this.ref_bin_)
      throw "Reference bin's descriptor required";

    /* Getters */
    this.__defineGetter__('api', function () { return this.api_; } );
    this.__defineGetter__('nodes', function () { return this.nodes_; } );
    this.__defineGetter__('ref_bin', function () { return this.ref_bin_; } );
    this.__defineGetter__('ref_fc', function () { return this.ref_fc_; } );
    this.__defineGetter__('eqv_fcs', function () { return this.eqv_fcs_; } );
    this.__defineGetter__('subtopics',
                          function () { return this.subtopics_; } );
    this.__defineGetter__('viewType', function () { return this.viewType_; } );
    this.__defineGetter__('view', function () { return this.view_; } );
    this.__defineGetter__('callbacks', function () { return this.callbacks_; } );
  };

  /* Constants
   * --
   * View types */
  Browser.VIEW_LIST     = 0x01;
  Browser.VIEW_GROUPED  = 0x02;
  Browser.VIEW_DEFAULT  = Browser.VIEW_LIST;

  /* Interface */
  Browser.prototype.initialise = function ()
  {
    var self = this,
        finder = new std.NodeFinder(
          'label-browser',
          this.options_.container
            || $('[data-sd-scope="label-browser-view"]')),
        els;

    if(this.initialised_)
      throw "Label Browser component already initialised";

    console.log("Initializing Label Browser component");

    /* Set initial state. */
    els = this.nodes_ = { };
    this.ref_fc_ = null;
    this.eqv_fcs_ = [ ];
    this.subtopics_ = { }; // content id |--> [subtopic id]
    this.view_ = null;
    this.viewType_ = Browser.VIEW_DEFAULT;

    /* Lambda called when initialisation is over, successfully or not. */
    var onEndInitialise = function () {
      if(self.ref_bin_ !== null) {
        console.info("Label Browser component initialized");
        self.events_.trigger('ready', self.eqv_fcs_.length);
      }
    };

    /* Begin set up nodes. */
    els.container = finder.root();
    if(els.container.length === 0)
      throw "Unable to find container element";

    els.buttonClose = finder.find('close')
      .click( function () { self.hide(); } );

    els.toolbar = {
      view: {
        list: finder.find('toolbar-list'),
        group: finder.find('toolbar-group')
      }
    };

    els.header = {
      container: finder.find('header'),
      title: finder.find('header-title'),
      content: finder.find('header-content')
    };

    els.view = finder.find('view');
    els.table = els.view.find('TABLE');
    /* End set up up nodes. */

    /* Retrieve feature collection for the bin's `content_id´. */
    this.api_.getFeatureCollection(this.ref_bin_.data.content_id)
      .done(function (fc) { self.set_header_(fc); } )
      .fail(function ()   { console.warn('Unable to set header');
                            self.set_header_(null); } );

    /* Retrieve all existing labels for the bin's `content_id´. */
    this.api_.getLabelsUniqueById(this.ref_bin_.data.content_id,
                                  this.ref_bin_.data.subtopic_id)
      .then(function (subtopics) {
        console.log("Got labels' subtopic unique ids:", subtopics);

        var cids = [ ];
        self.subtopics_ = { };
        for (var i = 0; i < subtopics.length; i++) {
          var cid = subtopics[i].cid,
              subid = subtopics[i].subid;
          if (cids.indexOf(cid) === -1) {
            cids.push(cid);
          }
          if (std.is_und(self.subtopics_[cid])) 
            self.subtopics_[cid] = [ ];

          self.subtopics_[cid].push(subid);
        }

        self.api_.getAllFeatureCollections(cids)
          .done(function (fcs) {
            console.log(
              "Unique labels' content id collection GET successful:", fcs);

            /* Ensure that the instance hasn't been reset during the time spent
             * loading data. This can be done by inspecting the contents of
             * `ref_bin_´. If it is `null´, it can be safely assumed that the
             * instance has been reset. */
            if(self.ref_bin_ !== null) {
              self.eqv_fcs_ = std.is_arr(fcs) ? fcs : [ ];
              self.render_();
              
              onEndInitialise();
            }
          } )
          .fail(function () {
            console.error('Failed to retrieve all feature collections');
            onEndInitialise();
          } );
      } )
      .fail(function () {
        console.error('Failed to load state');
        onEndInitialise();
      } );

    this.initialised_ = true;
    this.events_.trigger("initialised", els.container);

    return this.show();
  };

  Browser.prototype.reset = function ()
  {
    /* Force hide the window. */
    this.do_hide_();

    /* Remove all children nodes. */
    this.nodes_.header.title.children().remove();
    this.nodes_.header.content.children().remove();

    if(this.view_)
      this.view_.reset();

    /* Detach all events. */
    std.$.alloff(this.nodes_);
    
    this.ref_bin_ = this.view_ = this.nodes_ = null;
    this.ref_fc_ = this.eqv_fcs_ = this.viewType_ = this.api_ = null;
    this.initialised_ = false;

    console.info("Label Browser component reset");
  };

  /* overridable */ Browser.prototype.show = function ()
  {
    var els = this.nodes_;

    this.check_init_();

    els.container.css( {
      transform: 'scale(1,1)',
      opacity: 1
    } );

    /* Set the view's list's height so a scrollbar is shown when it overflows
     * vertically. */
    els.view.css('height', els.container.innerHeight()
                  - els.header.container.outerHeight()
                  - (els.view.outerHeight(true) - els.view.innerHeight()));

    this.events_.trigger('show');
    return this;
  };

  /* overridable */ Browser.prototype.hide = function ()
  {
    this.do_hide_();
    this.events_.trigger('hide');
    return this;
  };

  /* Private methods */
  Browser.prototype.check_init_ = function ()
  {
    if(!this.initialised_)
      throw "Component not yet initialised or already reset";
  };

  Browser.prototype.do_hide_ = function ()
  {
    this.check_init_();
    this.nodes_.container
      .css( {
        transform: 'scale(.2,.2)',
        opacity: 0
      } );
  };

  Browser.prototype.render_ = function ()
  {
    if(this.view_) {
      this.view_.reset();
      this.view_ = null;
    }

    switch(this.viewType_) {
    case Browser.VIEW_LIST:
      this.view_ = new ViewList(this, this.eqv_fcs_, this.subtopics_);
      break;

    default:
      throw "Invalid view type or view unsupported: " + this.viewType_;
    }

    /* Render view. */
    this.view_.render();
  };

  Browser.prototype.set_header_ = function (fc)
  {
    /* Don't set the header if somehow this instance has been reset and is thus
     * not valid anymore. */
    if(!this.ref_bin_)
      return;
    
    this.nodes_.header.title
      .html(std.is_obj(fc)
            && std.is_obj(fc.raw)
            && std.is_str(fc.raw.title)
            && fc.raw.title
            || "&lt;unknown title&gt;");

    /* TODO: using reference bin's own content rather than snippet from
     * retrieved feature collection. */
    this.nodes_.header.content.html(
      this.api_.getSubtopicType(this.ref_bin_.data.subtopic_id) === 'image'
        ? [ '<img src="', this.ref_bin_.data.content, '"/>' ].join('')
        : this.ref_bin_.data.content);
  };


  /**
   * @class
   * */
  var View = function (owner, fcs)
  {
    /* Invoke super constructor. */
    std.View.call(this, owner);

    /* Check `fcs' argument IS an array. */
    if(!std.is_arr(fcs))
      throw "Invalid feature collection array specified";

    /* Attributes */
    this.fcs_ = fcs;

    /* Getters */
    this.__defineGetter__('fcs', function () { return this.fcs_; } );
  };

  View.prototype = Object.create(std.View.prototype);


  /**
   * @class
   * */
  var RowGroup = function (owner, fc)
  {
    /* Invoke super constructor. */
    std.Drawable.call(this, owner);

    /* Attributes */
    this.fc_ = fc;

    /* Getters */
    this.__defineGetter__("fc", function () { return this.fc_; } );
  };

  RowGroup = Object.create(std.Drawable.prototype);


  /**
   * @class
   * */
  var Row = function (owner, subtopic_id, fc)
  {
    /* Invoke super constructor. */
    std.Drawable.call(this, owner);

    var api = owner.owner.api;

    /* Attributes */
    // This code used to "extract" the subtopic id. The problem is, labels
    // are being created with an id of `subtopic|{text,image}|hash` which
    // implies that the *whole* thing *is* the subtopic id. Labels really
    // should be created with just the `hash` as the subtopic id.
    // So I'm going to remove this extraction for now. ---AG
    this.id_ = subtopic_id;
    this.fc_ = fc;
    this.type_ = api.getSubtopicType(subtopic_id);

    /* Getters */
    this.__defineGetter__('id', function () { return this.id_; } );
    this.__defineGetter__('fc', function () { return this.fc_; } );
    this.__defineGetter__('type', function () { return this.type_; } );
  };

  Row.prototype = Object.create(std.Drawable.prototype);

  Row.prototype.htmlizeContent = function ()
  {
    var content = this.fc_.value(this.id_);
    return this.type_ === 'image'
      ? [ '<img src="', content, '" />' ].join('')
      : content;
  };


  /**
   * @class
   * */
  var ViewList = function (owner, fcs, subtopics)
  {
    /* Invoke super constructor. */
    View.call(this, owner, fcs);

    /* Attributes */
    this.rows_ = [ ];
    this.subtopic_fcs_ = { }; // subtopic_id |--> FeatureCollection
    // N.B. The subtopic "content" is at `fc.value(subtopic_id)`. ---AG

    var self = this,
        api = owner.api,
        count = 0;

    /* TODO: below we are merging subtopics from all feature collections to
     * avoid duplicates. Is this really necessary or would it be best to just
     * show them all, regardless? */
    /* We want to show all subtopics explicitly created by the user, which
     * is isomorphic to fetching a unique list of all pairs of
     * (content_id, subtopic_id) from a connected component. ---AG */

    console.log("Feature collections:", fcs);
    console.log("Subtopics", subtopics);
    
    /* Merge subtopics from all feature collections. */
    fcs.forEach(function (fc) {
      if(!std.is_obj(fc.raw)) {
        console.error(
          "Feature collection `raw´ attribute not found or invalid", fc);
        return;
      }

      /* Only show subtopics from this FC that correspond to a label.
       * This FC may contain other subtopics, but they belong in different
       * subfolders. ---AG */
      for (var i = 0; i < subtopics[fc.content_id].length; i++) {
        var subid = subtopics[fc.content_id][i];
        self.subtopic_fcs_[subid] = fc;
        count++;
      }
    } );

    console.log("Merged subtopics from %d feature collection(s): count=%d",
                fcs.length, count);
    console.log("Subtopic FCs", this.subtopic_fcs_);
  };

  ViewList.prototype = Object.create(View.prototype);

  ViewList.prototype.render = function ()
  {
    /* Finally create and render rows. */
    for(var subid in this.subtopic_fcs_) {
      var row = new ViewListRow(this, subid, this.subtopic_fcs_[subid]);
      this.rows_.push(row);
      row.render();
    }
  };

  ViewList.prototype.reset = function ()
  {
    this.owner_.nodes.table.find('TR:not(:first-child)').remove();
    this.rows_ = this.subtopic_fcs_ = null;
  };


  /**
   * @class
   * */
  var ViewListRow = function (owner, subtopic_id, fc)
  {
    /* Invoke super constructor. */
    Row.call(this, owner, subtopic_id, fc);
  };

  ViewListRow.prototype = Object.create(Row.prototype);

  ViewListRow.prototype.render = function ()
  {
    var row = $('<tr></tr>'),
        source = this.fc.value('meta_url');
    if (!source) {
      source = 'unknown';
    } else {
      source = '<a href="' + source + '">' + source + '</a>';
    }

    /* Source */
    $('<td></td>')
      .addClass(Css.view.id)
      .html(source)
      .appendTo(row);

    /* Content */
    $('<td></td>')
      .addClass(Css.view.content)
      .html(this.htmlizeContent())
      .appendTo(row);

    row.insertAfter(this.owner_.owner.nodes.table.find('TR:last-child'));
  };


  /* CSS class names used. */
  var Css = {
    view: {
      id: 'sd-lb-view-id',
      content: 'sd-lb-view-content'
    }
  };


  /* Default options */
  var defaults_ = {
  };


  /* Module public API */
  return {
    Browser: Browser,
    Row: Row,
    RowGroup: RowGroup,
    View: View,
    ViewList: ViewList,
    ViewListRow: ViewListRow
  };

};


/* Compatibility with RequireJs. */
if(typeof define === "function" && define.amd) {
  define("LabelBrowser", [ "jquery", "SortingCommon" ], function ($, std) {
    return LabelBrowser_(window, $, std);
  });
} else
  window.LabelBrowser = LabelBrowser_(window, $, SortingCommon);