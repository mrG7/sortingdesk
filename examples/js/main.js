/*global $, define, require */
/*jshint laxbreak:true */

define("examples-main", [ "jQuery",
                          "SortingDesk",
                          "API-Data",
                          "API-SortingDesk" ], function () {
  return Examples;
} );


var Examples = (function () {
  var examples_ = { },
      requests_ = 0,
      options_,
      callbacks_,
      contentIds_ = [
        { node_id: '#100', features: { NAME: { "Irrelevant": 0 } } },
        { node_id: '^1$0#1', features: { NAME: { "Rubbish": 0 } } },
        { node_id: '1_0%%^&#2', features: { NAME: { "Keep": 0 } } }
      ],
      instance_ = null;

  var instance = function () { return instance_; };
  
  var initialise = function () {
    var loading = $('#loading'),
        select = $('#examples'),
        nitems = $("#items"),
        nbins = $("#bins"),
        height = $(window).height()
          - nitems.offset().top
          - select.parent().height()
          - 45;                 /* padding/margin */
        
    for(var id in examples_) {
      select.append('<option value="' + id + '">'
                    + examples_[id].caption + '</option>');
    }
    
    options_ = {
      nodes: {
        items: nitems,
        bins: nbins,
        buttonDismiss: $("#button-dismiss")
      },
      contentIds: Api.initialise(g_descriptor, contentIds_),
      visibleItems: 15
    };

    callbacks_ = $.extend(Api, {
      onRequestStart: function () { if(!requests_++) loading.stop().fadeIn(); },
      onRequestStop: function () { if(!--requests_) loading.stop().fadeOut(); }
    } );

    $(".wrapper").fadeIn();
    nitems.height(height);
    nbins.height(height);

    select.bind('change', function () {
      var self = this;
      
      if(instance_) {
        instance_.reset().done(function () {
          console.log("re-initialising");
          instance_ = null;
          load_(examples_[self.value]);
        } );
      } else
        load_(examples_[self.value]);
    } );

    if(select.children().length)
      select.change();
  };

  var load_ = function (descriptor) {
    if(instance_)
      throw "An instance is currently active";
    
    instance_ = descriptor.run($.extend(true, {}, options_),
                               $.extend(true, {}, callbacks_) );
  };

  var register = function (name, caption, run) {
    if(name in examples_)
      throw "Already registered: " + name;
    
    examples_[name] = {
      run: run,
      caption: caption
    };
  };


  /* Initialise "module" */
  require( [ "examples/js/examples/minimal",
             "examples/js/examples/bins-suppressed" ], function () {
    console.log("Initialising examples interface");
    initialise();
  } );

  
  /* Return public interface. */
  return {
    instance: instance,
    register: register,
    sd: function () { return instance_; }
  };
})();