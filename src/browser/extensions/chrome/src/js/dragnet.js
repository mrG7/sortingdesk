(function (window, chrome, $, std, undefined) {

  $(function () {
    chrome.runtime.sendMessage( { operation: "get-meta" }, function (meta) {
      std.ipc.post("instantiate", meta.config.activeUrl);

      std.ipc.on("select", function (c) {
        console.log("Opening or creating subfolder corresponding to:", c);
        chrome.runtime.sendMessage({ operation: "dragnet-select", item: c });
      } );
    } );
  } );

} )(this,
    this.chrome,
    this.$,
    this.SortingCommon);