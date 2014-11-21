/**
 * @file Test specification common logic.
 * @copyright 2014 Diffeo
 * @author Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 * 
 */

/*global $, g_descriptor, SortingQueue, Api */
/*global afterEach */
/*jshint laxbreak:true */


/* Configure API. */
Api.DELAY_MIN = Api.DELAY_MAX = 0;

/* Variables */
var g_sortingQueue = null,
    g_bins = [
      {
        id: '#100',
        name: "Irrelevant",
        children: [
          {
            id: "test-1",
            name: "Inner irrelevancy"
          },
          {
            id: "test-2",
            name: "Additional irrelevancy"
          }
        ]
      },
      { id: '^1$0#1', name: "Rubbish" },
      { id: '1_0%%^&#2', name: "Keep" },
    ],
    g_options = {
      nodes: {
        items: $('<div />'),
        bins: $('<div />'),
        buttonDismiss: $('<div />')
      },
      bins: g_bins,
      visibleItems: 5,
      delays: {
        animateAssign: 0,
        binRemoval: 0,
        deleteButtonShow: 0,
        deleteButtonHide: 0,
        slideItemUp: 0,
        addBinShow: 0,
        textItemFade: 0
      }
    },
    g_callbacks = Api,
    reset = true,
    result = false;
    

/* Constants */
var DELAY = 10,
    DELAY_ITEMS = Math.pow(g_options.visibleItems, 2) * 1.1 + 10,
    DELAY_ITEM_DELETED = 25,
    DELAY_BUTTON_ADD = 50,
    DELAY_ITEM_DRAGGED = 25,
    DELAY_ITEM_DROPPED = 25,
    DELAY_BIN_DRAGGED = 25,
    DELAY_BIN_DROPPED = 25;


var setup = function () {
  Api.initialise(g_descriptor, g_bins);

  afterEach(function () {
    if(g_sortingQueue && g_sortingQueue.initialised) {
      g_sortingQueue.reset()
        .always(function () {
          reset = true;

          Api.initialise(g_descriptor, g_bins);
        } );
    } else
      reset = true;

    result = false;
  } );
};

var run = function (options, callbacks, condition, done) {
  var interval = window.setInterval(function () {
    if(!reset)
      return;

    window.clearInterval(interval);

    g_sortingQueue = new SortingQueue.Instance(options, callbacks);
    reset = false;

    if(!g_sortingQueue.initialised)
      throw "Sorting Queue failed to initialise";
      
    condition();
      
    if(done)
      done();
  }, DELAY);
};

var runNoInstantiation = function (condition, done) {
  var interval = window.setInterval(function () {
    if(!reset)
      return;

    window.clearInterval(interval);
    condition();
    
    if(done)
      done();
  }, DELAY);
};

var runAfterItemsRendered = function (options, callbacks, condition, done) {
  var interval = window.setInterval(function () {
    if(!reset)
      return;

    window.clearInterval(interval);

    g_sortingQueue = new SortingQueue.Instance(options, callbacks);
    reset = false;

    if(!g_sortingQueue.initialised)
      throw "Sorting Queue failed to initialise";
    
    interval = window.setInterval(function () {
      if(g_options.nodes.items.children().length < g_options.visibleItems)
        return;

      window.clearInterval(interval);
      
      if(g_options.nodes.items.children().length > g_options.visibleItems)
        throw "Invalid item count: " + g_options.nodes.items.children().length;
      
      condition();
      
      if(done)
        done();
    }, DELAY);
  }, DELAY);
};


/* Class DraggingEvent
 * ---------------------------------------------------------------------- */
var DraggingEvent = function (node)
{
  var self = this;
  
  this.node = node;
  this.event = $.Event('dragstart');
  this.data = { };

  this.event.originalEvent = {
    target: node.get(0),
    dataTransfer: {
      setData: function (domain, value) {
        if(domain) {
          domain = domain.toLowerCase();
          
          if(typeof value === 'undefined' || value === null)
            delete self.data[domain];
          else
            self.data[domain] = value;
        }
      },

      getData: function (domain) {
        if(domain)
          return self.data[domain.toLowerCase()];

        return null;
      }
    }
  };
};

DraggingEvent.prototype = {
  node: null,
  event: null,
  data: null,

  trigger: function () {
    this.node.trigger(this.event);
  },

  drop: function (node) {
    var self = this,
        event = $.Event('drop');
    
    event.originalEvent = {
      dataTransfer: {
        getData: function (domain) {
          if(domain)
            return self.data[domain.toLowerCase()];

          return null;
        }
      }
    };

    node.trigger(event);
  }
};
