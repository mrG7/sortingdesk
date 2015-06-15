/**
 * @file Translation component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 * Uses the `SortingCommon´ component.
 *
 */


/*global $, define */
/*jshint laxbreak:true */


(function (factory, root) {

  /* Compatibility with RequireJs. */
  if(typeof define === "function" && define.amd) {
    var deps = [ "jquery", "SortingCommon", "SortingDesk" ];
    define("sorting_desk-translation", deps, function ($, std, sd) {
      return factory(root, $, std, sd);
    } );
  } else
    root.translation = factory(root, $, SortingCommon, SortingDesk);

} )(function (window, $, std, sd, undefined) {


  /* component namespace */
  var translation = { };


  /**
   * @class
   * */
  translation.Factory = {
    services: {},

    construct: function (options)
    {
      var Cl = this.services[options.api];
      if(!std.is_fn(Cl))
        throw "Invalid, no API name specified or API not found";

      return new Cl(options);
    },

    register: function (name, Cl)
    {
      if(!std.is_fn(Cl)) throw "Invalid or no constructor specified";
      this.services[name] = Cl;
    }
  };


  /**
   * @class
   * */
  translation.Service = function () {};
  translation.Service.prototype.detect = std.absm_noti;
  translation.Service.prototype.translate = std.absm_noti;

  translation.Service.DEFAULT_TARGET = 'en';


  /**
   * @class
   * */
  translation.ServiceGoogle = function (options)
  {
    if(!std.is_str(options.key) || options.key.length === 0)
      throw "API key not specified";
    this.key = options.key;
    this.useJsonp = options.useJsonp === true;
  };
  translation.Factory.register('google', translation.ServiceGoogle);

  translation.ServiceGoogle.URL_BASE
    = 'https://www.googleapis.com/language/translate/v2';

  translation.ServiceGoogle.prototype
    = Object.create(translation.Service.prototype);

  translation.ServiceGoogle.prototype.url = function (query, endpoint)
  {
    var url = translation.ServiceGoogle.URL_BASE;
    if(endpoint) url += '/' + endpoint;
    return url + '?key=' + this.key + '&q=' + encodeURIComponent(query);
  };

  translation.ServiceGoogle.prototype.query = function (url)
  {
    return $.ajax( { url: url, dataType: this.useJsonp ? "jsonp" : "json" } );
  };

  translation.ServiceGoogle.prototype.detect = function (query)
  {
    var url = this.url(query, 'detect');
    return this.query(url).then(function (response) {
      return $.Deferred(function (deferred) {
        if(!std.is_obj(response.data)
           || !std.is_arr(response.data.detections)
           || response.data.detections.length === 0
           || response.data.detections[0].length === 0) {
          deferred.reject();
        }

        response.data.detections[0].sort(function (l, r) {
          if(l.confidence < r.confidence)      return -1;
          else if(l.confidence > r.confidence) return 1;
          return 0;
        } );

        deferred.resolve(response.data.detections[0][0].language);
      } ).promise();
    } );
  };

  translation.ServiceGoogle.prototype.translate
    = function (query, /* optional */ tgt, src)
  {
    var self = this;

    if(!std.is_str(tgt)) tgt = translation.Service.DEFAULT_TARGET;

    if(!std.is_str(src)) {
      return this.detect(query)
        .then(function (src) { return self.translateEx(query, tgt, src); } );
    }

    return this.translateEx(query, tgt, src);
  };

  translation.ServiceGoogle.prototype.translateEx = function (query, tgt, src)
  {
    var url = this.url(query);

    if(!std.is_str(src))      throw "Invalid or no source language specified";
    else if(!std.is_str(tgt)) throw "Invalid or no target language specified";
    url += '&source=' + src + '&target=' + tgt;

    return this.query(url).then(function (response) {
      return $.Deferred(function (deferred) {
        if(!std.is_obj(response.data)
           || !std.is_arr(response.data.translations)
           || response.data.translations.length === 0) {
          deferred.reject();
        }

        deferred.resolve(response.data.translations[0].translatedText);
      } ).promise();
    } );
  };


  /**
   * @class
   * */
  translation.Controller = function (explorer, callbacks, options)
  {
    std.Controller.call(this, explorer);

    this.processing = false;
    this.$button = options.button;
    this.explorer = explorer;
    this.callbacks = callbacks;

    try {
      this.service = std.is_obj(options.service)
        ? translation.Factory.construct(options.service)
        : null;
    } catch(x) { console.info("Translation service unavailable"); }
  };

  translation.Controller.prototype = Object.create(std.Controller.prototype);

  translation.Controller.prototype.initialise = function ()
  {
    if(!this.service) {
      this.$button.addClass('disabled');
      return;
    }

    this.$button.on("click", this.onClick.bind(this));
  };

  translation.Controller.prototype.reset = function ()
  {
    this.processing = false;
    this.$button.off("click");
    this.$button = this.service = null;
  };

  translation.Controller.prototype.onClick = function ()
  {
    var subfolder = this.explorer.selected;

    if(this.processing) return;
    else if(!(subfolder instanceof sd.Subfolder)) {
      window.alert("Please select a subfolder to add the translated"
                   + " text item to.");
      return;
    }

    this.$button.addClass('disabled');
    this.processing = true;

    var self = this;
    this.explorer.get_selection_().done(function (selection) {
      if(selection.type !== "text") {
        console.info("Selection type not supported: %s", selection.type);
        self.enable_();
        return;
      }

      console.info("Translating: ", selection.content);
      self.service.translate(selection.content)
        .done(function (response) {
          console.log("Translation: ", response);
          selection.content = response;
          subfolder.add(selection);
        } )
        .fail(function () {
          window.alert("Text translation failed.");
          console.error("Translation failed");
        } )
        .always(function () { self.enable_(); } );
    } ).fail(function () {
      window.alert("Unable to translate text.  Please ensure text is currently"
                   + " selected in the active tab");
    } ).always(function () { self.enable_(); } );
  };

  translation.Controller.prototype.enable_ = function ()
  {
    this.processing = false;
    this.$button.removeClass('disabled');
  };


  return translation;

}, this);