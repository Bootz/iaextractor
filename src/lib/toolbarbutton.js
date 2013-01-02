/* ***** BEGIN LICENSE BLOCK *****
 * Version: MIT/X11 License
 * 
 * Copyright (c) 2010 Erik Vold
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * Contributor(s):
 *   Erik Vold <erikvvold@gmail.com> (Original Author)
 *   Greg Parris <greg.parris@gmail.com>
 *
 * ***** END LICENSE BLOCK ***** */

const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const NS_SVG = "http://www.w3.org/2000/svg";
const NS_XLINK = "http://www.w3.org/1999/xlink";

const {unload} = require("unload+");
const {listen} = require("listen");
const winUtils = require("window-utils");

const browserURL = "chrome://browser/content/browser.xul";

exports.ToolbarButton = function ToolbarButton(options) {
  var unloaders = [],
      toolbarID = "",
      insertbefore = "",
      destroyed = false,
      destoryFuncs = [];

  var delegate = {
    onTrack: function (window) {
      if ("chrome://browser/content/browser.xul" != window.location || destroyed)
        return;

      let doc = window.document;
      let $ = function(id) doc.getElementById(id);

      options.tooltiptext = options.tooltiptext || '';

      // create toolbar button
      let tbb = doc.createElementNS(NS_XUL, "toolbarbutton");
      tbb.setAttribute("id", options.id);
      tbb.setAttribute("type", "button");

      let svg = doc.createElementNS(NS_SVG, "svg");
      svg.setAttributeNS (NS_SVG, "xlink", NS_XLINK)
      svg.setAttribute("viewBox", "0 0 16 16");
      svg.setAttribute("width", 16);
      svg.setAttribute("height", 16);
      svg.style.display = "block";
      
      let image = doc.createElementNS(NS_SVG, "image");
      image.setAttribute("width", 16);
      image.setAttribute("height", 16);
      image.setAttribute("filter", 'url(#fil)');
      if (options.image) image.setAttributeNS (NS_XLINK, "href", options.image);
      svg.appendChild(image);
      
      let rect = doc.createElementNS(NS_SVG, "rect");
      rect.setAttribute("x", 1);
      rect.setAttribute("y", 2);
      rect.setAttribute("width", 14 * (options.progress ? options.progress : 0));
      rect.setAttribute("height", 3);
      rect.setAttribute("fill", options.progressColor ? options.progressColor : "yellow");
      svg.appendChild(rect);
      
      let filter = doc.createElementNS(NS_SVG, "filter");
      filter.setAttribute("id", "fil");
      let feColorMatrix1 = doc.createElementNS(NS_SVG, "feColorMatrix");
      feColorMatrix1.setAttribute("type", "hueRotate");
      feColorMatrix1.setAttribute("values", "0");
      filter.appendChild(feColorMatrix1);
      let feColorMatrix2 = doc.createElementNS(NS_SVG, "feColorMatrix");
      feColorMatrix2.setAttribute("type", "saturate");
      feColorMatrix2.setAttribute("values", "1");
      filter.appendChild(feColorMatrix2);
      svg.appendChild(filter);
      
      tbb.appendChild(svg);
      
      tbb.setAttribute("class", "toolbarbutton-1 chromeclass-toolbar-additional");
      tbb.setAttribute("label", options.label);
      tbb.setAttribute('tooltiptext', options.tooltiptext);
      tbb.addEventListener("command", function(e) {
        if (options.onCommand)
          options.onCommand(e); // TODO: provide something?

        if (options.panel) {
          options.panel.show(tbb);
        }
      }, true);
      if (options.onClick) {
          tbb.addEventListener("click", options.onClick, true); 
      }

      // add toolbarbutton to palette
      ($("navigator-toolbox") || $("mail-toolbox")).palette.appendChild(tbb);

      // find a toolbar to insert the toolbarbutton into
      if (toolbarID) {
        var tb = $(toolbarID);
      }
      if (!tb) {
        var tb = toolbarbuttonExists(doc, options.id);
      }

      // found a toolbar to use?
      if (tb) {
        let b4;

        // find the toolbarbutton to insert before
        if (insertbefore) {
          b4 = $(insertbefore);
        }
        if (!b4) {
          let currentset = tb.getAttribute("currentset").split(",");
          let i = currentset.indexOf(options.id) + 1;

          // was the toolbarbutton id found in the curent set?
          if (i > 0) {
            let len = currentset.length;
            // find a toolbarbutton to the right which actually exists
            for (; i < len; i++) {
              b4 = $(currentset[i]);
              if (b4) break;
            }
          }
        }

        tb.insertItem(options.id, b4, null, false);
      }

      var saveTBNodeInfo = function(e) {
        toolbarID = tbb.parentNode.getAttribute("id") || "";
        insertbefore = (tbb.nextSibling || "")
            && tbb.nextSibling.getAttribute("id").replace(/^wrapper-/i, "");
      };

      window.addEventListener("aftercustomization", saveTBNodeInfo, false);

      // add unloader to unload+'s queue
      var unloadFunc = function() {
        tbb.parentNode.removeChild(tbb);
        window.removeEventListener("aftercustomization", saveTBNodeInfo, false);
      };
      var index = destoryFuncs.push(unloadFunc) - 1;
      listen(window, window, "unload", function() {
        destoryFuncs[index] = null;
      }, false);
      unloaders.push(unload(unloadFunc, window));
    },
    onUntrack: function (window) {}
  };
  var tracker = winUtils.WindowTracker(delegate);

  function setIcon(aOptions) {
    options.image = aOptions.image || aOptions.url;
    getToolbarButtons(function(tbb) {
      tbb.childNodes[0].childNodes[0].setAttributeNS(NS_XLINK, "href", options.image);
    }, options.id);
    return options.image;
  }
  function setProgress(aOptions) {
    getToolbarButtons(function(tbb) {
      tbb.childNodes[0].childNodes[1].setAttribute("width", 14*aOptions.progress);
    }, options.id);
    return aOptions.progress;
  }
  function setHueRotate(aOptions) {
    getToolbarButtons(function(tbb) {
      tbb.childNodes[0].childNodes[2].childNodes[0].setAttribute("values", aOptions.value);
    }, options.id);
    return aOptions.value;
  }
  function setSaturate(aOptions) {
    getToolbarButtons(function(tbb) {
      tbb.childNodes[0].childNodes[2].childNodes[1].setAttribute("values", aOptions.value);
    }, options.id);
    return aOptions.value;
  }
  
  return {
    destroy: function() {
      if (destroyed) return;
      destroyed = true;

      if (options.panel)
        options.panel.destroy();

      // run unload functions
      destoryFuncs.forEach(function(f) f && f());
      destoryFuncs.length = 0;

      // remove unload functions from unload+'s queue
      unloaders.forEach(function(f) f());
      unloaders.length = 0;
    },
    moveTo: function(pos) {
      if (destroyed) return;

      // record the new position for future windows
      toolbarID = pos.toolbarID;
      insertbefore = pos.insertbefore;

      // change the current position for open windows
      for each (var window in winUtils.windowIterator()) {
        if (browserURL != window.location) return;

        let doc = window.document;
        let $ = function (id) doc.getElementById(id);

        // if the move isn't being forced and it is already in the window, abort
        if (!pos.forceMove && $(options.id)) return;

        var tb = $(toolbarID);
        var b4 = $(insertbefore);

        // TODO: if b4 dne, but insertbefore is in currentset, then find toolbar to right

        if (tb) tb.insertItem(options.id, b4, null, false);
      };
    },
    get label() options.label,
    set label(value) {
      options.label = value;
      getToolbarButtons(function(tbb) {
        tbb.label = value;
      }, options.id);
      return value;
    },
    setIcon: setIcon,
    get image() options.image,
    set image(value) setIcon({image: value}),
    set progress(value) setProgress({progress: value}),
    set hueRotate(value) setHueRotate({value: value}),
    set saturate(value) setSaturate({value: value}),
    get tooltiptext() options.tooltiptext,
    set tooltiptext(value) {
      options.tooltiptext = value;
      getToolbarButtons(function(tbb) {
        tbb.setAttribute('tooltiptext', value);
      }, options.id);
    },
  };
};

function getToolbarButtons(callback, id) {
  let buttons = [];
  for each (var window in winUtils.windowIterator()) {
    if (browserURL != window.location) continue;
    let tbb = window.document.getElementById(id);

    if (tbb) buttons.push(tbb);
  }
  if (callback) buttons.forEach(callback);
  return buttons;
}

function toolbarbuttonExists(doc, id) {
  var toolbars = doc.getElementsByTagNameNS(NS_XUL, "toolbar");
  for (var i = toolbars.length - 1; ~i; i--) {
    if ((new RegExp("(?:^|,)" + id + "(?:,|$)")).test(toolbars[i].getAttribute("currentset")))
      return toolbars[i];
  }
  return false;
}