"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var client_1 = require("react-dom/client");
var react_2 = require("@vercel/analytics/react");
var App_1 = require("./App");
require("./index.css");
client_1.default.createRoot(document.getElementById('root')).render(<react_1.default.StrictMode>
    <App_1.default />
    <react_2.Analytics />
  </react_1.default.StrictMode>);
