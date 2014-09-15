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
        items: $(),
        bins: $(),
        binDelete: $()
      },
      primaryContentId: g_primaryContentId,
      secondaryContentIds: g_secondaryContentIds,
      visibleItems: 5
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
    reset = true;

/* Constants */
var DELAY = 10,
    DELAY_ITEMS = Math.pow(g_options.visibleItems, 2) * 1.1 + 10;


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