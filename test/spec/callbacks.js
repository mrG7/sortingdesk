describe('Callbacks', function () {
  /* Configure API. */
  Api.DELAY_MIN = Api.DELAY_MAX = 0;

  /* Constants */
  var DELAY = 25;
        
  /* Variables */
  var sortingDesk = null,
      secondaryBins = [
        { node_id: 100, features: { NAME: { "Irrelevant": 0 } } },
        { node_id: 101, features: { NAME: { "Rubbish": 0 } } },
        { node_id: 102, features: { NAME: { "Keep": 0 } } }
      ],
      primaryContentId = g_descriptor.primaryBin.node_id,
      secondaryContentIds = Api.initialise(g_descriptor, secondaryBins),
      options = {
        nodes: {
          items: $(),
          bins: $(),
          binDelete: $()
        },
        primaryContentId: primaryContentId,
        secondaryContentIds: secondaryContentIds,
        visibleItems: 15
      },
      callbacks = {
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
      result = false;

  beforeEach(function () {
    result = false;
  } );

  afterEach(function () {
    sortingDesk.reset();
  } );

  it("invokes `getBinData' correctly whilst initialising", function (done) {
    sortingDesk = SortingDesk.instantiate(
      options,
      $.extend(true, { }, callbacks, {
        getBinData: function (ids) {
          result = ids.length == secondaryContentIds.length + 1;
          return $.Deferred().promise();
        }
      } ) );
    
    setTimeout(function () {
      expect(result).toBe(true);
      done();
    }, DELAY);
  } );

  it("invokes `moreTexts' to retrieve list of items", function (done) {
    sortingDesk = SortingDesk.instantiate(
      options,
      $.extend(true, { }, callbacks, {
        moreTexts: function (num) {
          result = num > 0;
          return $.Deferred().promise();
        }
      } ) );
    
    setTimeout(function () {
      expect(result).toBe(true);
      done();
    }, DELAY);
  } );
} );