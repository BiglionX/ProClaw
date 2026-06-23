// 加入购物车按钮组件
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AddToCartButton;
var react_1 = require("react");
var api_1 = require("@/lib/api");
function AddToCartButton(_a) {
    var product = _a.product;
    var _b = (0, react_1.useState)(false), isAdded = _b[0], setIsAdded = _b[1];
    var handleAddToCart = function () {
        var quantityInput = document.getElementById('quantity');
        var quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
        (0, api_1.addToCart)(product, quantity);
        setIsAdded(true);
        setTimeout(function () {
            setIsAdded(false);
        }, 2000);
    };
    return (<button onClick={handleAddToCart} className={"flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ".concat(isAdded
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white')}>
      {isAdded ? '已加入购物车 ✓' : '加入购物车'}
    </button>);
}
