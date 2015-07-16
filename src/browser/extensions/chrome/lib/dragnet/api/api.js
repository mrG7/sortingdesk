/**
 * @file Sorting Desk extension dragnet component.
 * @copyright 2015 Diffeo
 *
 * Comments:
 *
 */

/*jshint laxbreak:true */


this.Dragnet = (function (window, std, dn, undefined) {

  /**
   * @namespace
   * */
  dn = dn || { };


  /**
   * @namespace
   * */
  var api = dn.api = dn.api || { };


  /* Attributes */
  var registry = { };


  api.register = function (name, constructor)
  {
    /* Don't allow an API to register twice. */
    if(name in registry) throw "API already registered: " + name;
    registry[name] = constructor;
  };

  api.construct = function (options)
  {
    if(!std.is_obj(options) || !std.is_str(options.backend))
      throw "Invalid options";

    var Type = registry[options.backend];
    if(!Type) throw "API not found: " + options.backend;

    return new Type(options);
  };


  return dn;

} )(this,
    this.SortingCommon,
    this.Dragnet);