/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/api.js":
/*!********************!*\
  !*** ./src/api.js ***!
  \********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ API)\n/* harmony export */ });\nclass API {\r\n\r\n  constructor(url) {\r\n\r\n    this.url = url\r\n    this.activeCommands = []\r\n\r\n  }\r\n\r\n  parseMessage(message) {\r\n\r\n    // console.log(`message:`, message);\r\n    \r\n    try {\r\n      return JSON.parse(message.data)\r\n    } catch (err) {\r\n      throw new Error(`Couldn't parse message:`, err)\r\n    }\r\n\r\n  }\r\n\r\n  get connected() {\r\n    return this.socket != undefined && this.socket.readyState === WebSocket.OPEN\r\n  }\r\n\r\n  connectToServer() {\r\n    return new Promise((resolve, reject) => {\r\n\r\n      this.socket = new WebSocket(this.url)\r\n  \r\n      this.socket.onopen = () => {\r\n        if (this.socket.readyState === WebSocket.OPEN) {\r\n\r\n          console.log(`Socket opened!`)\r\n          \r\n          this.socket.onmessage = (message) => {\r\n            this.connectionId = JSON.parse(message.data)\r\n            return resolve()\r\n          }\r\n\r\n        } \r\n      }\r\n\r\n      this.socket.onerror = (error) => {\r\n        return reject(error)\r\n      }\r\n    \r\n    })\r\n  }\r\n\r\n  async send(data, responseHandler) {\r\n    \r\n    console.log(`this.connected:`, this.connected);\r\n    \r\n    if (!this.connected) {\r\n\r\n      try {\r\n        await this.connectToServer()\r\n      } catch (err) {\r\n        throw new Error(`Fatal: Failed to open websocket:`, err)\r\n      }\r\n      \r\n    }\r\n    \r\n    this.socket.send(JSON.stringify(data))\r\n\r\n    this.socket.onmessage = (message) => {\r\n      responseHandler(this.parseMessage(message))\r\n    }\r\n\r\n  }\r\n\r\n  async sendCommand(command, payload, responseHandler) {\r\n    \r\n    if (!this.connected) {\r\n\r\n      try {\r\n        await this.connectToServer()\r\n      } catch (err) {\r\n        throw new Error(`Fatal: Failed to open websocket:`, err)\r\n      }\r\n      \r\n    }\r\n    \r\n    this.socket.send(JSON.stringify({\r\n      type: `command`,\r\n      value: [\r\n        command,\r\n        ...payload\r\n      ]\r\n    }))\r\n    this.activeCommands.push({\r\n      name: command,\r\n      handler: responseHandler,\r\n    })\r\n\r\n    this.socket.onmessage = (message) => {\r\n\r\n      let parsed = this.parseMessage(message)\r\n\r\n      console.log(`parsed:`, parsed);\r\n  \r\n      let command = this.activeCommands.find(x => x.name === parsed.value[0])\r\n  \r\n      if (!command) {\r\n        throw new Error(`Command not found: ${command}`)\r\n      }\r\n  \r\n      switch (parsed.type) {\r\n        case `response`:\r\n            command.handler(parsed.value[1])\r\n          break;\r\n        case `commandEnd`:\r\n          this.activeCommands = this.activeCommands.filter(x => x !== command)\r\n          break;\r\n      \r\n        case `error`:\r\n          console.error(`Command '${parsed.value[0]}' threw an error:`, parsed.value[1])\r\n          //TODO add error handler\r\n          break;\r\n      \r\n        default:\r\n          break;\r\n      }\r\n    \r\n      \r\n    }\r\n\r\n  }\r\n  \r\n  async scanUrl(url) {\r\n\r\n    await this.sendCommand(`scan`,\r\n      [url],\r\n      (response) => {\r\n        console.log(`response:`, response);\r\n\r\n        switch (response.status) {\r\n          case `pending`:\r\n            console.info(response.message)\r\n            break;\r\n        \r\n          default:\r\n            document.querySelector(`#output`).innerText = JSON.stringify(response)\r\n            break;\r\n        }\r\n\r\n      }\r\n    )\r\n    \r\n  }\r\n\r\n}\n\n//# sourceURL=webpack://tailwind-template/./src/api.js?");

/***/ }),

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _api__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./api */ \"./src/api.js\");\n// import *any file or dependency (module)* that you want to bundle here\r\n\r\n\r\n\r\n// regular javascript goes below\r\n\r\nlet api\r\n\r\nlet scanButton = document.querySelector(`#scan-button`)\r\nlet urlInput = document.querySelector(`#url`)\r\n\r\nscanButton.addEventListener(`click`, performScan)\r\n\r\nfunction performScan() {\r\n\r\n  api.scanUrl(urlInput.value)\r\n  \r\n}\r\n\r\nwindow.onload = function() {\r\n\r\n  let host = location.origin.replace(/^http/, 'ws')\r\n  api = new _api__WEBPACK_IMPORTED_MODULE_0__.default(host)\r\n  api.connectToServer().catch(err => {\r\n    console.error(`Error while connecting to backend:`, err)\r\n  })\r\n  window.api = api\r\n  \r\n}\r\n\r\n\r\n// !! IMPORTANT: !!\r\n// Webpack doesn't automatically assing global variables to the window context when importing the bundle\r\n// Assign all variables, functions and classes, that you want to be accessible from html, to the window context\r\n\r\n\n\n//# sourceURL=webpack://tailwind-template/./src/index.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./src/index.js");
/******/ 	
/******/ })()
;