/**
 * @file Test specification common logic.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 * 
 */

/*global $, Api, g_descriptor, define */
/*global afterEach */
/*jshint laxbreak:true */


define("Tests", [ "jquery", "SortingQueue", "API-SortingQueue" ], function ($, SortingQueue) {
  return Tests_($, SortingQueue);
} );


var Tests_ = function ($, SortingQueue) {

  var Queue = function ()
  {
    /* > BEGIN: Initialise instance attributes. */
    this.reset_ = true;
    this.result_ = null;
    this.instance_ = null;
    this.descriptor_ = g_descriptor;
    this.defaults_ = {
      bins: [
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
      ]
    };
    
    this.defaults_.options = {
      nodes: {
        items: $('<div />'),
        bins: $('<div />'),
        buttonDismiss: $('<div />')
      },
      bins: this.bins,
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
    };
    
    this.defaults_.callbacks = Api;

    /* Constants */
    this.TIMEOUT = 2000;
    this.DELAY = 10;
    this.DELAY_ITEM_DELETED = 25;
    this.DELAY_BUTTON_ADD = 50;
    this.DELAY_ITEM_DRAGGED = 25;
    this.DELAY_ITEM_DROPPED = 25;
    this.DELAY_BIN_DRAGGED = 25;
    this.DELAY_BIN_DROPPED = 25;
    this.DELAY_ITEMS = Math.pow(this.defaults_.options.visibleItems, 2)
      * 1.1 + 10;
    
    /* Specify test classes available. */
    this.classes_ = {
      "Standard": QueueTestStandard,
      "NoInstantiation": QueueTestNoInstantiation,
      "AfterItemsRendered": QueueTestAfterItemsRendered
    };
    /* < END: Initialisation of class attributes */

    /* Initialise the mock API. */
    Api.DELAY_MIN = Api.DELAY_MAX = 0;
    Api.initialise(this.descriptor_, this.defaults_.bins);

    /* Set up clean up sequence to run when a test concludes. */
    var self = this;
    
    afterEach(function () {
      if(self.instance_ && self.instance_.initialised) {
        self.instance_.reset()
          .always(function () {
            self.reset_ = true;

            Api.initialise(self.descriptor_, self.defaults_.bins);
          } );
      } else
        self.reset_ = true;

      self.result_ = null;
    } );
  };

  Queue.prototype = {
    set instance(instance)
    {
      if(!this.reset_)
        throw "A SortingQueue instance is currently active";

      this.instance_ = instance;
      this.reset_ = false;
    },

    get instance()
    { return this.instance_; },

    set reset(flag)
    {
      if(flag)
        this.instance_ = null;

      this.reset_ = flag;
    },
    
    get reset()
    { return this.reset_; },

    set result(value)
    { this.result_ = value; },

    get result()
    { return this.result_; },

    get defaults()
    { return this.defaults_; },

    get SortingQueue()
    { return SortingQueue; },
  
    instantiate: function (className, condition, done, options, callbacks)
    {
      var self = this,
          timestamp = Date.now();

      if(!(className in this.classes_))
        throw "Invalid test name: " + className;
      
      var interval = window.setInterval(function () {
        if(!self.reset_) {
          /* Deactivate timer once we've hit `TIMEOUT'. */
          if(Date.now() - timestamp > self.TIMEOUT) {
            console.log("Test timed out: terminating");
            window.clearInterval(interval);

            if(done) done();
          }
          
          return;
        }

        window.clearInterval(interval);

        new self.classes_[className](
          self, condition, done,
          options || $.extend(true, { }, self.defaults_.options),
          callbacks || $.extend(true, { }, self.defaults_.callbacks) );
      }, this.DELAY);
    }
  };


  var QueueTestStandard = function (queue, condition, done, options, callbacks)
  {
    queue.instance = new SortingQueue.Sorter(options, callbacks);
    queue.instance.initialise();
    
    if(!queue.instance.initialised)
      throw "Sorting Queue failed to initialise";

    condition(queue.instance);
    if(done) done();
  };


  var QueueTestNoInstantiation = function (queue, condition, done,
                                           options, callbacks)
  {
    condition();
    if(done) done();
  };

  
  var QueueTestAfterItemsRendered = function (queue, condition, done,
                                              options, callbacks)
  {
    queue.instance = new SortingQueue.Sorter(options, callbacks);
    queue.instance.initialise();
    
    if(!queue.instance.initialised)
      throw "Sorting Queue failed to initialise";
    
    var timestamp = Date.now();
    var interval = window.setInterval(function () {
      if(options.nodes.items.children().length < options.visibleItems)
      {
        /* Deactivate timer once we've hit `TIMEOUT'. */
        if(Date.now() - timestamp > self.TIMEOUT) {
          console.log("Test timed out waiting for items to be rendered:"
                      + " terminating");
          window.clearInterval(interval);

          if(done) done();
        }

        return;
      }
      
      window.clearInterval(interval);
      
      if(options.nodes.items.children().length > options.visibleItems)
        throw "Invalid item count: " + options.nodes.items.children().length;
      
      condition(queue.instance);
      if(done) done();
    }, this.DELAY);
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


  /* Module interface */
  var instances_ = { },
      classes_ = {
        "Queue": Queue
      };

  
  var get_ = function (className) {
    if(!(className in classes_))
      throw "Invalid class name: " + className;
    else if(className in instances_)
      return instances_[className];

    return (instances_[className] = new classes_[className]());
  };
  
  var getQueue = function () { return get_("Queue"); };


  /* Public interface */
  return {
    DraggingEvent: DraggingEvent,
    
    getQueue: getQueue
  };
};
