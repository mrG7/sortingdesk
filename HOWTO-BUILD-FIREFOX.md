# How to build the Firefox extension
1. Download and [install][1] the [Mozilla Add-on SDK][2]

  1. Ensure the `cfx` binary is in the `PATH`

2. `cd` to the Sorting Desk's repository

   e.g. `$ cd ~/dev/diffeo/sorting-desk`

3. Build the Firefox extension

   e.g. `~/dev/diffeo/sorting-desk$ sh/build-firefox`

   This will result in the creation of an `xpi` file with the name `sortingdesk.xpi` in `./src/browser/extensions/firefox` (from Sorting Desk's repository base directory).

## How to run it
1. Follow the steps 1 through to 3 in the previous section.

2. Install the [Extension Auto-Installer][3] addon

3. Ensure *either* but **not** both Firefox or the Tor browser is running

4. Invoke the script `sh/reload-firefox`

[1]: https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Installation
[2]: https://developer.mozilla.org/en/Add-ons/SDK
[3]: https://addons.mozilla.org/addon/autoinstaller/