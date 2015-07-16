(function (window, std, undefined) {

  console.log("initialised");
  console.log(self);

  self.port.emit("get-preferences");
  self.port.once("get-preferences", function (prefs) {
    console.log("GOT", prefs);
  } );

} )(this,
    this.SortingCommon);