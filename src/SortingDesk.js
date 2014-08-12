/** SortingDesk.js --- Sorting Desk
 *
 * Copyright (C) 2014 Diffeo
 *
 * Author: Miguel Guedes <miguel@miguelguedes.org>
 *
 * Comments:
 *
 * 
 */

var SortingDesk = function(options, callbacks)
{
  var self = this;

  console.log("Initialising Sorting Desk UI");
  
  this.options = jQuery.extend({}, SortingDesk.defaults, options);
  this.callbacks = callbacks;

  callbacks.getBinData([ options.primaryContentId ]
                       .concat(options.secondaryContentIds))
    .done(function(bins) {
      self.initialise(bins);
    } );
};


/* Do not make the following instantiable. */
SortingDesk.defaults = {
  css: {
    primaryBin: "wrapper-primary-bin",
    leftmostBin: "left"
  }
};


SortingDesk.prototype = {
  callbacks: null,
  options: null,
  bins: [ ],
  text: null,

  initialise: function (bins)
  {
    /* Firstly process primary bin. */
    if(bins[this.options.primaryContentId].error)
      throw "Failed to retrieve contents of primary bin";
    
    this.bins.push(new BinPrimary(bins[this.options.primaryContentId],
                                  this));

    /* Now, create secondary bins */
    var count = 0;
    
    for(var id in bins) {
      var bin = bins[id];

      /* Report error, if applicable, but do not abort. */
      if(bin.error) {
        console.log("Failed to retrieve contents of secondary bin: ", id);
        continue;
      }

      this.bins.push(new BinSecondary(bin, this));

      /* Apply appropriate CSS class to leftmost bin. */
      if(count % 2 === 0) {
        this.bins[this.bins.length - 1].getNode()
          .addClass(this.options.css.leftmostBin);
      }
      
      ++count;
    }
    
    this.text = new ItemsList(this);
    console.log("Sorting Desk UI initialised");
  },

  invoke: function ()
  {
    if(arguments.length < 1)
      throw "Callback name required";
    else if(!(arguments[0] in this.callbacks))
      throw "Callback non existent: " + arguments[0];

    return this.callbacks[arguments[0]]
      .apply(null, [].slice.call(arguments, 1));
  },

  getOption: function (property)
  {
    return property in this.options ? this.options[property] : null;
  },

  getOptions: function ()
  { return this.options; },

  getCallbacks: function ()
  { return this.callbacks; }
};


var BinPrimary = function (bin, owner)
{
  this.owner = owner;
  this.bin = bin;
  this.container = $('<div/>');
  owner.getOption("nodes").bins.append(this.container);

  this.node = $(owner.invoke("renderPrimaryBin", bin));
  this.container
    .addClass(owner.getOption("css").primaryBin)
    .append(this.node);

  for(var subbin in bin.bins) {
    var obj = new SubBin(bin.bins[subbin], this);
    
    if(this.subbins.length % 2 === 0)
      obj.getNode().addClass("left");
    
    this.subbins.push(obj);
  }

  this.container.append('<div style="clear:both"/>');
};

BinPrimary.prototype = {
  owner: null,
  bin: null,
  subbins: [ ],
  container: null,
  node: null,

  getNode: function ()
  { return this.node; },
  
  getContainer: function ()
  { return this.container; },
  
  getOwner: function ()
  { return this.owner; }
};


var SubBin = function (bin, owner)
{
  this.owner = owner;
  this.bin = bin;

  this.node = owner.getOwner().invoke("renderPrimarySubBin", bin);
  owner.getContainer().append(this.node);
};

SubBin.prototype = {
  owner: null,
  bin: null,
  node: null,

  getNode: function ()
  { return this.node; }
};


var BinSecondary = function (bin, owner)
{
  this.owner = owner;
  this.bin = bin;

  this.node = $(owner.getCallbacks().renderSecondaryBin(bin));
  owner.getOptions().nodes.bins.append(this.node);
};

BinSecondary.prototype = {
  owner: null,
  bin: null,
  node: null,

  getNode: function ()
  { return this.node; }
};


var ItemsList = function (owner)
{
  this.owner = owner;
};

ItemsList.prototype = {
  owner: null,
  items: [ ]
};