"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var CTASection = function (_a) {
    var title = _a.title, description = _a.description, _b = _a.primaryButtonText, primaryButtonText = _b === void 0 ? '免费下载桌面端' : _b, _c = _a.primaryButtonLink, primaryButtonLink = _c === void 0 ? '/download' : _c, secondaryButtonText = _a.secondaryButtonText, secondaryButtonLink = _a.secondaryButtonLink, _d = _a.variant, variant = _d === void 0 ? 'dark' : _d;
    var bgClass = variant === 'dark' ? 'bg-gray-900' : 'bg-gray-800';
    var textClass = variant === 'dark' ? 'text-white' : 'text-white';
    var descClass = variant === 'dark' ? 'text-gray-400' : 'text-gray-300';
    var secondaryBorderClass = variant === 'dark' ? 'border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white' : 'border-gray-500 text-gray-300 hover:border-gray-300 hover:text-white';
    return (<div className={"".concat(bgClass, " py-16")}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className={"text-3xl font-bold ".concat(textClass, " mb-4")}>{title}</h2>
        {description && (<p className={"".concat(descClass, " mb-8 max-w-xl mx-auto")}>{description}</p>)}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <react_router_dom_1.Link to={primaryButtonLink} className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl inline-block">
            {primaryButtonText}
          </react_router_dom_1.Link>
          {secondaryButtonText && secondaryButtonLink && (<react_router_dom_1.Link to={secondaryButtonLink} className={"px-8 py-4 border-2 ".concat(secondaryBorderClass, " font-medium rounded-lg transition-all inline-block")}>
              {secondaryButtonText}
            </react_router_dom_1.Link>)}
        </div>
      </div>
    </div>);
};
exports.default = CTASection;
