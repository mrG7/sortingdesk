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


var Api = function () { /* nop */ };

Api.prototype = {
  DELAY_MIN: 200,
  DELAY_MAX: 1500,
  
  bins_: {
    10: {
      name: "Primary",
      bins: {
        11: { statement_text: "Interesting" },
        12: { statement_text: "Undecided" }
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
    }
  },
  lastId_: 101,                 /* So we may assign ids to secondary bins when
                                 * creating them. */
    

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
    }, Math.rand(this.DELAY_MIN, this.DELAY_MAX));

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
      if(id in self.bins_) {
        deferred.resolve( {
          error: null,
          result: self.bins_[id]
        } );
      } else {
        deferred.resolve( {
          error: "Bin not existent",
          result: null
        } );
      }
    }, Math.rand(this.DELAY_MIN, this.DELAY_MAX));

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
    }, Math.rand(this.DELAY_MIN, this.DELAY_MAX));

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
      ++self.lastId_;
      
      self.bins_[self.lastId_] = {
        name: name,
        bins: [],
        isPrimary: false
      };

      var bin = { };

      bin[self.lastId_] = self.bins_[self.lastId_];
      
      deferred.resolve( {
        error: null,
        result: bin
      } );
    }, Math.rand(this.DELAY_MIN, this.DELAY_MAX) );

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
      if(id in self.bins_) {
        if(self.bins_[id].isPrimary) {
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
    }, Math.rand(this.DELAY_MIN, this.DELAY_MAX));

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