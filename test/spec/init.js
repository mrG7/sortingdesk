/* Configure API. */
Api.DELAY_MIN = Api.DELAY_MAX = 0;

/* Constants */
var DELAY = 50;

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
      visibleItems: 15
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
    };