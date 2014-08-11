/** api-sorting_desk.js --- Sorting Desk's fake API
 *
 * Copyright (C) 2014 Diffeo
 *
 * Author: Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 * 
 */


/* Declare random number generator and assign it to Math static class */
Math.rand = function (min, max)
{
  return Math.floor(Math.random() * (max - min + 1) + min);
};


/* Class containing only static methods and attributes.
 * Cannot be instantiated.*/
Api = {
  DELAY_MIN: 200,
  DELAY_MAX: 750,
    

  /* The following method is in contravention of the specs. It returns the
   * text items inside of a possibly illegal attribute (`result'). */
  moreTexts: function (num) {
    var deferred = $.Deferred();

    if(num <= 0)
      throw "Specified invalid number of items to retrieve";

    window.setTimeout(function () {
      deferred.resolve( {
        error: null,
        result: [
          { id: 1, text: "text snippet" }
        ]
      } );
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));

    return deferred.promise();
  },

  /* The following method is in contravention of the specs. It returns the bin
   * descriptor inside of a possibly illegal attribute (`result').
   * 
   * Returns:
   * {
   *   error: error_string || null,
   *   result: null || {
   *     name: string,
   *     bins: [],
   *     isPrimary: boolean
   *   }
   * }
   */
  getBinData: function (id) {
    var self = this;
    var deferred = $.Deferred();

    window.setTimeout(function () {
      if(id in ApiData.bins) {
        deferred.resolve( {
          error: null,
          result: ApiData.bins[id]
        } );
      } else {
        deferred.resolve( {
          error: "Bin not existent",
          result: null
        } );
      }
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));

    return deferred.promise();
  },

  /* As discussed by email, we're not saving state.
   *
   * (Always) returns:
   * {
   *   error: null
   * }
   */
  saveBinData: function (id, bins) {
    var deferred = $.Deferred();
    
    window.setTimeout(function () {
      deferred.resolve( { error: null } );
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));

    return deferred.promise();
  },

  /* The following method is in contravention of the specs. Specifications
   * state,
   * 
   * "The promise will not be resolved until some user action completes that
   * selects a new secondary bin to add. (This may include a new UI component
   * separate from the SortingDesk .)"
   *
   * It isn't clear how the secondary bin's name is specified or how its id
   * received. The following is thus a guess. In addition, it returns the
   * resulting bin descriptor inside a possibly illegal attribute (`result').
   *
   * Returns:
   * {
   *   error: error_string || null
   *   result: null || {
   *     statement_id: {
   *       name: string,
   *       bins: []
   *       isPrimary: false
   *     }
   *   }
   */
  addSecondaryBin: function (name) {
    var self = this;
    var deferred = $.Deferred();

    window.setTimeout(function () {
      ++ApiData.lastId;
      
      ApiData.bins[ApiData.lastId] = {
        name: name,
        bins: [],
        isPrimary: false
      };

      var bin = { };

      bin[ApiData.lastId] = ApiData.bins[ApiData.lastId];
      
      deferred.resolve( {
        error: null,
        result: bin
      } );
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX) );

    return deferred.promise();
  },

  /* Always returns,
   * {
   *   error: error_string || null
   * }
   */
  removeSecondaryBin: function (id) {
    var self = this;
    var deferred = $.Deferred();

    window.setTimeout(function () {
      /* Ensure bin exists and is _not_ primary. */
      if(id in ApiData.bins) {
        if(ApiData.bins[id].isPrimary) {
          deferred.resolve( {
            error: "Not secondary bin"
          } );
        } else
          deferred.resolve( { error: null } );
      } else {
        deferred.resolve( {
          error: "Secondary bin not existent"
        } );
      }
    }, Math.rand(Api.DELAY_MIN, Api.DELAY_MAX));

    return deferred.promise();
  },

  renderText: function (content) {
    /* Wrap text inside of a SPAN. */
    return $('<span class="list-item">' + content + '</span>');
  },

  renderPrimaryBin: function (bin) {
    /* Wrap bin name inside a DIV. */
    return $('<div class="bin-primary">' + bin.name + '</div>');
  },

  renderPrimarySubBin: function (bin) {
    /* Wrap bin statement_text inside a DIV. */
    return $('<div class="bin-primary-sub">' + bin.statement_text + '</div>');
  },

  renderSecondaryBin: function (bin) {
    /* Wrap bin statement_text inside a DIV. */
    return $('<div class="bin-secondary">' + bin.name + '</div>');
  }
};


/* Class containing only static methods and attributes.
 * Cannot be instantiated. */
var ApiData = {
  bins: {
    1: {
      name: "Primary",
      bins: {
        11: { statement_text: "Interesting" },
        12: { statement_text: "Undecided" },
        13: { statement_text: "Newsworthy" }
      },
      isPrimary: true           /* In my view, this attribute is needed because
                                 * a primary bin can potentially have NO sub
                                 * bins, in which case we wouldn't be able to
                                 * tell secondary bins apart.  In addition, IIRC
                                 * a more mature version of Sorting Desk will be
                                 * required to support multiple primary bins.
                                 * Only other way of discriminating primary from
                                 * secondary bins would be to, perhaps, keep
                                 * them in different maps. */
    },
    100: {
      name: "Irrelevant",
      bins: [],
      isPrimary: false
    },
    101: {
      name: "Rubbish",
      bins: [],
      isPrimary: false
    },
    102: {
      name: "Keep"
    }
  },
  lastId: 101,                 /* So we may assign ids to secondary bins when
                                * creating them. */
  lastItem: 0,                 /* So we know the last item sent. */

  items: [
    { snippet: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed consecrate." },
    { snippet: "Lobortis rutrum. Integer mollis et nulla ac varius. Donec condimentum diam quis." },
    { snippet: "Scelerisque ultrices. Mauris tempor convallis interdum. Pellentesque sagittis." },
    { snippet: "Libero tellus, vitae accumsan metus bibendum et. Phasellus a mi justo. Fusce." },
    { snippet: "Hendrerit, nulla sit amet faucibus sodales, orci felis commodo lacus, quis porta." },
    { snippet: "Libero magna id est. Vivamus cursus nisl in luctus congue. Maecenas eget facilisis elit." },
    { snippet: "Vestibulum molestie nulla tellus, eu gravida augue venenatis." },
    { snippet: "Mauris neque nisi, mollis vel dui quis, consequat pulvinar sapien." },
    { snippet: "Volutpat, urna in tempor placerat, diam mi iaculis massa, at dapibus odio orci" },
    { snippet: "Sed in euismod risus. Aliquam posuere mi lorem, eu aliquet sapien dignissim in. Iaculis felis vitae dignissim. Maecenas consectetur neque id tellus volutpat," },
    { snippet: "Eget venenatis metus tempor. Curabitur ornare odio egestas ipsum consectetur." },
    { snippet: "Eleifend nec id mauris. Morbi vitae lectus non nunc lacinia" },
    { snippet: "Pellentesque ultrices rutrum ipsum. Phasellus ut neque vel lorem." },
    { snippet: "Malesuada gravida in in velit. Cras ullamcorper orci a tellus laoreet." },
    { snippet: "Mauris eget risus at massa facilisis imperdiet sit amet quis lacus." },
    { snippet: "Bibendum vitae nulla sit amet ultricies. Etiam ac mauris et ipsum pharetra." },
    { snippet: "Pharetra non eu risus. Praesent porttitor lorem eu erat aliquet vulputate." },
    { snippet: "Bibendum imperdiet lectus quis pharetra. In dignissim dictum ipsum, vel cursus." },
    { snippet: "Curabitur sagittis rhoncus dui. Sed faucibus lectus vel metus dignissim." },
    { snippet: "Vel sollicitudin dolor elementum" },
    { snippet: "Nunc ligula libero, pretium eu augue vitae, tristique pellentesque massa." },
    { snippet: "Luctus luctus pulvinar. Duis bibendum hendrerit ligula, feugiat sollicitudin." },
    { snippet: "Dolor dapibus a. Donec consectetur congue ligula egestas pulvinar. Sed laoreet ullamcorper enim id porta. Praesent scelerisque ornare ullamcorper." },
    { snippet: "Malesuada fames ac ante ipsum primis in faucibus. Morbi quis leo scelerisque sem bibendum convallis. Etiam semper neque id lorem porttitor tincidunt faucibus porta tincidunt." },
    { snippet: "Sed placerat, mi et adipiscing condimentum, metus elit facilisis dui, auctor tincidunt erat justo ac tellus. Cras dolor nulla, auctor in nisi a, pretium porttitor enim." },
    { snippet: "Nunc vehicula et eros ac hendrerit. Donec sagittis tellus vitae diam fringilla volutpat. Ut cursus odio a tellus mollis suscipit." },
    { snippet: "Pellentesque mattis felis mi, a cursus neque pretium eu. Nullam a vehicula nulla In quis nisi suscipit, ultrices urna non, mattis magna." },
    { snippet: "Curabitur interdum nibh at lorem suscipit consectetur. Suspendisse dapibus diam nec quam lobortis sagittis." },
    { snippet: "Nulla auctor rhoncus pulvinar. Ut dignissim, sem et imperdiet rhoncus lectus ligula adipiscing magna, et mattis augue purus venenatis justo." },
    { snippet: "Proin eu sagittis nunc. Integer ac eros at metus scelerisque rhoncus ac a massa." },
    { snippet: "Pellentesque sit amet turpis quis libero hendrerit venenatis vitae elementum quam." },
    { snippet: "Praesent quis tempus elit. Duis sit amet tempus ipsum." },
    { snippet: "Etiam diam nulla, vestibulum eget lorem vitae, dignissim dapibus dolor." },
    { snippet: "Nulla facilisi. Nullam massa dolor, lobortis ut pretium non, rutrum vel sem. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Phasellus non mi arcu. Etiam sed libero ut dolor feugiat lacinia." }
  ]
};