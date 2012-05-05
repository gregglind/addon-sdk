/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Parts of this module were taken from narwhal:
//
// http://narwhaljs.org

const { Cc, Ci } = require('chrome');
const { unloadTopic } = require('@packaging');
const { once } = require('./system/events');

const observers = [];
const unloaders = [];

var when = exports.when = function when(observer) {
  if (observers.indexOf(observer) != -1)
    return;
  observers.unshift(observer);
};

var ensure = exports.ensure = function ensure(obj, destructorName) {
  if (!destructorName)
    destructorName = "unload";
  if (!(destructorName in obj))
    throw new Error("object has no '" + destructorName + "' property");

  let called = false;
  let originalDestructor = obj[destructorName];

  function unloadWrapper(reason) {
    if (!called) {
      called = true;
      let index = unloaders.indexOf(unloadWrapper);
      if (index == -1)
        throw new Error("internal error: unloader not found");
      unloaders.splice(index, 1);
      originalDestructor.call(obj, reason);
      originalDestructor = null;
      destructorName = null;
      obj = null;
    }
  };

  // TODO: Find out why the order is inverted here. It seems that
  // it may be causing issues!
  unloaders.push(unloadWrapper);

  obj[destructorName] = unloadWrapper;
};

when(function(reason) {
  unloaders.slice().forEach(function(unloadWrapper) {
    unloadWrapper(reason);
  });
});

once(unloadTopic, function unload({ data: reason }) {
  observers.forEach(function(observer) {
    try {
      observer(reason);
    }
    catch (error) {
      console.exception(error);
    }
  });
});
