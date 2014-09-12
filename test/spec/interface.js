describe('Interface', function () {
  /* Configure API. */
  Api.DELAY_MIN = Api.DELAY_MAX = 0;

  /* Macros */
  var DELAY = 100;
        
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
      };

  afterEach(function () {
    sortingDesk.reset();
  } );
  
  it('should initialise without the bins container', function (done) {
    sortingDesk = SortingDesk.instantiate(
      $.extend(true, { }, options, { nodes: { bins: null } }),
      callbacks);
    
    setTimeout(function () {
      expect(sortingDesk.isInitialised()).toBe(true);
      done();
    }, DELAY);
  } );

  it('should initialise without the delete button', function (done) {
    sortingDesk = SortingDesk.instantiate(
      $.extend(true, { }, options, { nodes: { binDelete: null } }),
      callbacks);
    
    setTimeout(function () {
      expect(sortingDesk.isInitialised()).toBe(true);
      done();
    }, DELAY);
  } );

  it('should initialise without both the bins container and the delete button',
     function (done) {
       sortingDesk = SortingDesk.instantiate(
         $.extend(true, { }, options, { nodes: {
           bins: null,
           binDelete: null
         } } ),
         callbacks);
       
       setTimeout(function () {
         expect(sortingDesk.isInitialised()).toBe(true);
         done();
       }, DELAY);
     } );
} );