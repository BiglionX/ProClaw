"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var PageHeader = function (_a) {
    var title = _a.title, description = _a.description, subtitle = _a.subtitle, _b = _a.className, className = _b === void 0 ? '' : _b;
    return (<div className={"bg-white border-b border-gray-200 py-16 ".concat(className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">{title}</h1>
        {subtitle && (<p className="text-sm text-gray-400 mb-2">{subtitle}</p>)}
        {description && (<p className="text-xl text-gray-500 max-w-3xl mx-auto">{description}</p>)}
      </div>
    </div>);
};
exports.default = PageHeader;
