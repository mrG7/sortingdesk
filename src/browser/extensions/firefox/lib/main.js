var buttons = require('sdk/ui/button/action'),
    tabs = require("sdk/tabs"),
    data = require("sdk/self").data;

require("sdk/ui/sidebar").Sidebar( {
  id: "sidebar-sorting-desk",
  title: "Sorting Desk",
  url: data.url("src/html/sidebar.html"),
  onAttach: function (worker) {
    console.log("Attached sidebar");
  }
} );

buttons.ActionButton({
  id: "button-diffeo",
  label: "Activate Sorting Desk",
  icon: {
    "16": data.url("media/icons/icon_16.png"),
    "32": data.url("media/icons/icon_32.png"),
    "64": data.url("media/icons/icon_64.png")
  },
  onClick: function (state) {
  }
});
