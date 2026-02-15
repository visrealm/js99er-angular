# JS99'er

This is the 'new' version of js99er.net developed using Angular and TypeScript. Try it [here](https://js99er.net).

This project was originally generated with [Angular CLI](https://github.com/angular/angular-cli) version 1.7.3 (currently 18.2.7).

## visrealm version

This version has been modified to add support for the [PICO9918](https://github.com/visrealm/pico9918).

Although mostly compatible with the F18A, the PICO9918 has additional VRAM available to the GPU and is able to save and load game data. The version ID for the PICO9918 detection is also different but compatible with the F18A.

PICO9918-specific features supported:
* PICO9918 ident (SR1 returns 0xE8)
* Full 64KB GPU memory map supported (no repeated sections, no holes)
* LOAD/SAVE API for persistent data storage to flash (register 0x3F)
* 48/60 row text/tile modes (bit 0x04 in register 0 to enable)
* Opaque sprite flag support (reuse SIZE flag (0x10) in sprite attribute when global 16px enabled)
* Optional palette reset on VDP register reset (0x40 set when setting 0x80 in register 0x32)
* Configuration data read and write (option index at VR58(0x3A), option value write to VR59(0x3B) or read from SR12(0x0C))
* Diagnostics overlays and custom palette can be enabled using the PICO9918 configurator

Additional features:
* Multi-page name table views

Live version is served here: [https://js99er.visrealm.au](https://js99er.visrealm.au/)

If you're looking for the original JS99'er, be sure to use [https://github.com/Rasmus-M/js99er-angular](https://github.com/Rasmus-M/js99er-angular) instead.

## Setting up the development environment

* Clone the repository to a folder on your computer
* Install [Node.js](https://nodejs.org) 
* Install Angular CLI: ``npm install -g @angular/cli``
* Change to the directory containing the source code and install the dependencies: ``npm install``
* Run js99er locally by typing: ``ng serve``
* Open a browser and enter the address: ``http://localhost:4200``

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--configuration production` flag for a production build.

## Embedding into a website

First build the project. Then edit the dist/index.html file and insert a config attribute into the js99er element, e.g.:

```
<js99er config='{"sidePanelVisible": false, "toolbarVisible": false, "cartridgeURL": "my-folder/my-cart.rpk", "diskURL": "", "ramDiskDSRURL": "", "settings": {}}'></js99er>
```

The config attribute is formatted as a JSON object. Setting both sidePanelVisible and toolbarVisible to false will disable the JS99er UI, leaving only the console canvas.

Note: in the example above, `my-folder` must be a subfolder to the `assets` folder.

The settings object may contain the following properties, shown here with the defaults (note: don't include line breaks or comments in the settings attribute):

```
"settings": {
    "enableSound": true,
    "psg": "STANDARD",              // "STANDARD" | "FORTI"
    "enableSpeech": true,
    "ram": "32K",                   // "NONE" | "32K" | "SAMS1M" | "SAMS4M" | "SAMS16M"
    "vdp": "TMS9918A",              // "TMS9918A" | "F18A" | "V9938"
    "enablePCKeyboard": false,
    "enableMapArrowKeys": false,
    "enableGoogleDrive": false,
    "enableGRAM": false,
    "enablePixelated": false,
    "enablePauseOnFocusLost": false,
    "tipi": "NONE",                 // "NONE" | "MOUSE" | "FULL"
    "tipiWebsocketURI": "ws://localhost:9901/tipi",
    "enableDebugReset": false,
    "enableH264Codec": false,
    "disk": "GENERIC",              // "NONE" | "TIFDC" | "MYARC" | "GENERIC"
    "enablePCode": false,
    "ramDisk": "NONE"               // "NONE" | "HORIZON"
}
```

## URL parameters

By including URL query parameters, the emulator can load a specific cartridge and/or disk on startup:

`cartUrl` Load a cartridge image. This can either be a full URL or a URL relative to the `assets` folder. The program on menu item 2 in the cartridge will open automatically.

`diskUrl` Load a disk image. This can either be a full URL or a URL relative to the `assets` folder.

Example: https://js99er.net/#/?cartUrl=software/turboforth.rpk&diskUrl=software/turboforth.dsk

Note: The alternative way of loading a cartridge https://js99er.net/#/?cart=Parsec still works, but is likely to be removed in a future version.
