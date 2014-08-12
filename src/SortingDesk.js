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
  
  this.options = jQuery.extend(true, {}, options);
  this.callbacks = callbacks;

  /* This is cumbersome.
   *
   * Instead of being given primary and secondary bin ids, there should be an
   * API function we could call to retrieve ALL bin descriptors in one go.  As
   * it stands, we are forced to make a call for every bin id.
   *
   * In my view, it needs to be redesigned. */
  callbacks.getBinData(options.primaryContentId)
    .done(function(bin) {
      self.initialisePrimaryBin(bin);

      /* Retrieve descriptor of first secondary bin. */
      if(self.options.secondaryContentIds.length > 0) {
        self.callbacks.getBinData(self.options.secondaryContentIds[0])
          .done(function (bin) { self.initialiseSecondaryBin(0, bin); });
      }
    });
};

SortingDesk.prototype = {
  callbacks: null,
  options: null,
  bins: [ ],
  text: null,
  countSecondary: 0,

  initialise: function ()
  {
    this.text = new ItemsList(this);
    console.log("Sorting Desk UI initialised");
  },

  initialisePrimaryBin: function (bin)
  {
    var self = this;
    
    if(bin.error) {
      console.log("Failed to retrieve contents of primary bin");
      return;
    }

    this.bins.push(new BinPrimary(bin, this));
  },

  initialiseSecondaryBin: function (index, bin)
  {
    var self = this;
    
    if(bin.error) {
      console.log("Failed to retrieve contents of secondary bin: ",
                  this.options.secondaryContentIds[index]);
      return;
    }

    this.bins.push(new BinSecondary(bin, this));
    
    if(this.countSecondary % 2 === 0)
      this.bins[this.bins.length - 1].getNode().addClass('left');

    ++this.countSecondary;

    /* Retrieve descriptor of next secondary bin */
    if(++index < this.options.secondaryContentIds.length) {
      this.callbacks.getBinData(this.options.secondaryContentIds[index])
        .done(function (bin) { self.initialiseSecondaryBin(index, bin); });
    } else
      this.initialise();
  },

  invoke: function ()
  {
    if(arguments.length < 1)
      throw "Callback name required";
    else if(!(arguments[0] in this.callbacks))
      throw "Callback non existent: " + arguments[0];

    var name = arguments[0];
    return this.callbacks[name].apply(null, [].slice.call(arguments, 1));
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