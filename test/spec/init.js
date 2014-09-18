/**
 * @file Test specification common logic.
 * @copyright 2014 Diffeo
 * @author Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 * 
 */


/* Configure API. */
Api.DELAY_MIN = Api.DELAY_MAX = 0;

/* Variables */
var g_sortingDesk = null,
    g_secondaryBins = [
      { node_id: 100, features: { NAME: { "Irrelevant": 0 } } },
      { node_id: 101, features: { NAME: { "Rubbish": 0 } } },
      { node_id: 102, features: { NAME: { "Keep": 0 } } }
    ],
    g_primaryContentId = g_descriptor.primaryBin.node_id,
    g_secondaryContentIds = Api.initialise(g_descriptor, g_secondaryBins),
    g_options = {
      nodes: {
        items: $('<div />'),
        bins: $('<div />'),
        binDelete: $('<div />')
      },
      primaryContentId: g_primaryContentId,
      secondaryContentIds: g_secondaryContentIds,
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
    g_callbacks = {
      moreTexts: Api.moreTexts,
      getBinData: Api.getBinData,
      saveBinData: Api.saveBinData,
      addPrimarySubBin: Api.addPrimarySubBin,
      addSecondaryBin: Api.addSecondaryBin,
      removePrimarySubBin: Api.removePrimarySubBin,
      removeSecondaryBin: Api.removeSecondaryBin,
      renderText: Api.renderText,
      renderPrimaryBin: Api.renderPrimaryBin,
      renderPrimarySubBin: Api.renderPrimarySubBin,
      renderSecondaryBin: Api.renderSecondaryBin,
      renderAddButton: Api.renderAddButton
    },
    reset = true,
    result = false;
    

/* Constants */
var DELAY = 10,
    DELAY_ITEMS = Math.pow(g_options.visibleItems, 2) * 1.1 + 10,
    DELAY_ITEM_DELETED = 260,
    DELAY_BUTTON_ADD = 25,
    DELAY_ITEM_DRAGGED = 25,
    DELAY_ITEM_DROPPED = 250,
    DELAY_BIN_DRAGGED = 25,
    DELAY_BIN_DROPPED = 25;


function setup() {
  afterEach(function () {
    if(g_sortingDesk
       && g_sortingDesk.isInitialised
       && g_sortingDesk.isInitialised()) {
      g_sortingDesk.reset()
        .done(function () {
          reset = true;
        } );
    } else
      reset = true;

    result = false;
  } );
}

function run(options, callbacks, condition, done) {
  var interval = window.setInterval(function () {
    if(!reset)
      return;

    window.clearInterval(interval);

    g_sortingDesk = SortingDesk.instantiate(options, callbacks);
    reset = false;

    interval = window.setInterval(function () {
      if(!g_sortingDesk.isInitialised())
        return;
      
      window.clearInterval(interval);
      condition();
      
      if(done)
        done();
    }, DELAY);
  }, DELAY);
}

function runNoInstantiation(condition, done) {
  var interval = window.setInterval(function () {
    if(!reset)
      return;

    window.clearInterval(interval);
    condition();
    
    if(done)
      done();
  }, DELAY);
}

function runAfterItemsRendered(options, callbacks, condition, done) {
  var interval = window.setInterval(function () {
    if(!reset)
      return;

    window.clearInterval(interval);

    g_sortingDesk = SortingDesk.instantiate(options, callbacks);
    reset = false;

    interval = window.setInterval(function () {
      if(!g_sortingDesk.isInitialised())
        return;
      
      window.clearInterval(interval);

      window.setTimeout(function () {
        condition();
      }, DELAY_ITEMS);
      
      if(done)
        done();
    }, DELAY);
  }, DELAY);
}


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