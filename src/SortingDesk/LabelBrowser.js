/**
 * @file Label Browser component.
 * @copyright 2014 Diffeo
 *
 * Comments:
 * Uses the `SortingQueue' component.
 *
 */


/*global SortingQueue, define */
/*jshint laxbreak:true */


/**
 * The Label Browser module.
 *
 * @returns an object containing the module's public interface. */
var LabelBrowser_ = function (window, SortingQueue, $)
{


  /**
   * @class
   * */
  var Browser = function (sorter, options)
  {
    /* Invoke super-constructor. */
    SortingQueue.Controller.call(this, sorter);

    /* Attributes */
    this.initialised_ = false;
    this.options_ = options;
    this.sorter_ = sorter;
    this.api_ = sorter.api;
    this.deferred_ = null;
    this.nodes_ = { };
    this.ref_bin_ = options.ref_bin;
    this.ref_fc_ = null;
    this.eqv_fcs_ = [ ];
    this.subtopics_ = { }; // content id |--> [subtopic id]
    this.view_ = null;
    this.viewType_ = Browser.VIEW_DEFAULT;

    /* Check for mandatory options. */
    if(!this.ref_bin_)
      throw "Reference bin's descriptor required";

    /* Getters */
    this.__defineGetter__('sorter',
                          function () { return this.sorter_; } );
    this.__defineGetter__('api', function () { return this.api_; } );
    this.__defineGetter__('nodes', function () { return this.nodes_; } );
    this.__defineGetter__('ref_bin', function () { return this.ref_bin_; } );
    this.__defineGetter__('ref_fc', function () { return this.ref_fc_; } );
    this.__defineGetter__('eqv_fcs', function () { return this.eqv_fcs_; } );
    this.__defineGetter__('subtopics',
                          function () { return this.subtopics_; } );
    this.__defineGetter__('viewType', function () { return this.viewType_; } );
    this.__defineGetter__('view', function () { return this.view_; } );
  };

  /* Constants
   * --
   * View types */
  Browser.VIEW_LIST = 0x01;
  Browser.VIEW_GROUPED = 0x02;
  Browser.VIEW_DEFAULT = Browser.VIEW_LIST;

  /* Interface */
  Browser.prototype = Object.create(SortingQueue.Controller.prototype);

  Browser.prototype.initialise = function ()
  {
    var self = this,
        els = this.nodes_;

    if(this.initialised_)
      throw "Label Browser component already initialised";

    console.log("Initializing Label Browser component");

    /* Lambda called when initialisation is over, successfully or not. */
    var onEndInitialise = function () {
      console.log("Label Browser component initialized");
    };

    /* Begin set up nodes. */
    els.container = $('[data-sd-scope="label-browser-container"]');

    els.buttonClose = this.find_node_('close')
      .click( function () { self.close(); } );

    els.toolbar = {
      view: {
        list: this.find_node_('toolbar-list'),
        group: this.find_node_('toolbar-group')
      }
    };

    els.heading = {
      title: this.find_node_('heading-title'),
      content: this.find_node_('heading-content')
    };

    els.items = this.find_node_('items');
    els.table = els.items.find('TABLE');
    /* End set up up nodes. */

    /* Retrieve feature collection for the bin's `content_id´. */
    this.api_.getFeatureCollection(this.ref_bin_.data.content_id)
      .done(function (fc) { self.set_heading_(fc); } )
      .fail(function () { self.set_heading_(null); } );

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
          if (typeof self.subtopics_[cid] === 'undefined') {
            self.subtopics_[cid] = [ ];
          }
          self.subtopics_[cid].push(subid);
        }

        self.api_.getAllFeatureCollections(cids)
          .done(function (fcs) {
            console.log("Unique labels' content id collection GET successful:",
                        fcs);

            self.eqv_fcs_ = fcs instanceof Array ? fcs : [ ];
            self.render_();
          } )
          .fail(function () {
            console.log('Failed to retrieve all feature collections');
            onEndInitialise();
          } );
      } )
      .fail(function () {
        console.log('Failed to load state');
        onEndInitialise();
      } );

    /* TODO: We should NOT be invoking a callback owned by the active Sorting
     * Queue instance. The `LabelBrowser´ component should instead have its own
     * set of callbacks and events that clients can specify and register for. */
    this.owner_.sortingQueue.callbacks.invoke({
      name: "onLabelBrowserInitialised",
      mandatory: false
    }, this.nodes_.container);

    this.initialised_ = true;

    return this.show();
  };

  Browser.prototype.reset = function ()
  {
    this.check_init_();
    
    /* Resolve promise if one still exists. */
    if(this.deferred_)
      this.close();

    /* Remove all children nodes. */
    this.nodes_.heading.title.children().remove();
    this.nodes_.heading.content.children().remove();
    this.nodes_.table.find('TR:not(:first-child)').remove();

    /* Detach all events. */
    this.nodes_.buttonClose.off();

    this.ref_bin_ = this.view_ = this.nodes_ = null;
    this.ref_fc_ = this.eqv_fcs_ = this.viewType_ = this.api_ = null;
    this.initialised_ = false;

    console.log("Label Browser component reset");
  };

  /* overridable */ Browser.prototype.show = function ()
  {
    var els = this.nodes_;

    this.check_init_();

    els.container.css( {
      transform: 'scale(1,1)',
      opacity: 1
    } );

    /* Set the items list's height so a scrollbar is shown when it overflows
     * vertically. */
    els.items.css('height', els.container.innerHeight()
                  - this.find_node_('heading').outerHeight()
                  - (els.items.outerHeight(true) - els.items.innerHeight()));

    this.deferred_ = $.Deferred();

    return this.deferred_.promise();
  };

  /* overridable */ Browser.prototype.close = function ()
  {
    this.check_init_();
    
    this.nodes_.container
      .css( {
        transform: 'scale(.2,.2)',
        opacity: 0
      } );

    if(this.deferred_) {
      this.deferred_.resolve();
      this.deferred_ = null;
    }
  };

  /* Private methods */

    /* Private methods */
  Browser.prototype.check_init_ = function ()
  {
    if(!this.initialised_)
      throw "Component not yet initialised or already reset";
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

  Browser.prototype.set_heading_ = function (fc)
  {
    this.nodes_.heading.title
      .html(fc                  /* WTF: `typeof null´ returns 'object' */
            && typeof fc === 'object'
            && typeof fc.raw === 'object'
            && typeof fc.raw.title === 'string'
            && fc.raw.title
            || "&lt;unknown title&gt;");

    /* TODO: using reference bin's own content rather than snippet from
     * retrieved feature collection. */
    this.nodes_.heading.content.html(
      this.api_.getSubtopicType(this.ref_bin_.data.subtopic_id) === 'image'
        ? [ '<img src="', this.ref_bin_.data.content, '"/>' ].join('')
        : this.ref_bin_.data.content);
  };

  Browser.prototype.find_node_ = function (scope,
                                                parent /* = container */)
  {
    var p;

    if(parent instanceof $)
      p = parent;
    else if(typeof parent === 'string')
      p = this.find_node_(parent);
    else
      p = this.nodes_.container;

    return p.find( [ '[data-sd-scope="label-browser-', scope, '"]' ].join(''));
  };


  /**
   * @class
   * */
  var View = function (owner, fcs)
  {
    /* Invoke super constructor. */
    SortingQueue.Drawable.call(this, owner);

    /* Check `fcs' argument IS an array. */
    if(!(fcs instanceof Array))
      throw "Invalid feature collection array specified";

    /* Attributes */
    this.fcs_ = fcs;

    /* Getters */
    this.__defineGetter__('fcs', function () { return this.fcs_; } );
  };

  View.prototype = Object.create(SortingQueue.Drawable.prototype);


  /**
   * @class
   * */
  var RowGroup = function (owner, fc)
  {
    /* Invoke super constructor. */
    SortingQueue.Drawable.call(this, owner);

    /* Attributes */
    this.fc_ = fc;

    /* Getters */
    this.__defineGetter__("fc", function () { return this.fc_; } );
  };

  RowGroup = Object.create(SortingQueue.Drawable.prototype);


  /**
   * @class
   * */
  var Row = function (owner, subtopic_id, content)
  {
    /* Invoke super constructor. */
    SortingQueue.Drawable.call(this, owner);

    var api = owner.owner.api;

    /* Attributes */
    this.id_ = api.extractSubtopicId(subtopic_id);
    this.content_ = content;
    this.type_ = api.getSubtopicType(subtopic_id);

    /* Getters */
    this.__defineGetter__('id', function () { return this.id_; } );
    this.__defineGetter__('content', function () { return this.content_; } );
    this.__defineGetter__('type', function () { return this.type_; } );
  };

  Row.prototype = Object.create(SortingQueue.Drawable.prototype);

  Row.prototype.htmlizeContent = function ()
  {
    return this.type_ === 'image'
      ? [ '<img src="', this.content_, '" />' ].join('')
      : this.content_;
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
    this.subtopic_content_ = { };

    var self = this,
        api = owner.api,
        count = 0;

    /* TODO: below we are merging subtopics from all feature collections to
     * avoid duplicates. Is this really necessary or would it be best to just
     * show them all, regardless? */
    /* We want to show all subtopics explicitly created by the user, which
     * is isomorphic to fetching a unique list of all pairs of
     * (content_id, subtopic_id) from a connected component. ---AG */

    console.log(fcs);
    console.log(subtopics);

    /* Merge subtopics from all feature collections. */
    fcs.forEach(function (fc) {
      if(typeof fc.raw !== 'object') {
        console.log("Feature collection `raw´ attribute not found or invalid",
                    fc);
        return;
      }

      /* Only show subtopics from this FC that correspond to a label.
       * This FC may contain other subtopics, but they belong in different
       * subfolders. ---AG */
      for (var i = 0; i < subtopics[fc.content_id].length; i++) {
        var subid = subtopics[fc.content_id][i];
        self.subtopic_content_[subid] = fc.value(subid);
        count++;
      }
    } );

    console.log("Merged subtopics from %d feature collection(s): count=%d",
                fcs.length,
                count,
                this.subtopic_content_);
  };

  ViewList.prototype = Object.create(View.prototype);

  ViewList.prototype.render = function (fcs)
  {
    /* Finally create and render rows. */
    for(var k in this.subtopic_content_) {
      var row = new ViewListRow(this, k, this.subtopic_content_[k]);

      this.rows_.push(row);
      row.render();
    }
  };


  /**
   * @class
   * */
  var ViewListRow = function (owner, subtopic_id, content)
  {
    /* Invoke super constructor. */
    Row.call(this, owner, subtopic_id, content);
  };

  ViewListRow.prototype = Object.create(Row.prototype);

  ViewListRow.prototype.render = function ()
  {
    var row = $('<tr></tr>');

    /* Id */
    $('<td></td>')
      .addClass(Css.items.id)
      .html(this.id)
      .appendTo(row);

    /* Content */
    $('<td></td>')
      .addClass(Css.items.content)
      .html(this.htmlizeContent())
      .appendTo(row);

    row.insertAfter(this.owner_.owner.nodes.table.find('TR:last-child'));
  };


  /* CSS class names used. */
  var Css = {
    items: {
      id: 'sd-lb-items-id',
      content: 'sd-lb-items-content'
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
  define("LabelBrowser", [ "jquery" ], function (SortingQueue, $) {
    return LabelBrowser_(window, SortingQueue, $, Api);
  });
} else
  window.LabelBrowser = LabelBrowser_(window, SortingQueue, $);
