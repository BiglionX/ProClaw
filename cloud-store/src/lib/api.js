"use strict";
// 云商城 - 购物车工具函数（localStorage 本地存储）
// 注意：旧版桌面端 API 调用函数已移除，云托管版使用 Supabase 直接查询
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCart = getCart;
exports.saveCart = saveCart;
exports.addToCart = addToCart;
exports.removeFromCart = removeFromCart;
exports.updateCartItemQuantity = updateCartItemQuantity;
exports.getCartTotal = getCartTotal;
exports.getCartCount = getCartCount;
exports.clearCart = clearCart;
// ========== 购物车工具函数 ==========
/**
 * 从 localStorage 获取购物车
 */
function getCart() {
    if (typeof window === 'undefined')
        return [];
    try {
        var cart = localStorage.getItem('cart');
        return cart ? JSON.parse(cart) : [];
    }
    catch (_a) {
        return [];
    }
}
/**
 * 保存购物车到 localStorage
 */
function saveCart(cart) {
    if (typeof window === 'undefined')
        return;
    localStorage.setItem('cart', JSON.stringify(cart));
}
/**
 * 添加商品到购物车
 */
function addToCart(product, quantity) {
    if (quantity === void 0) { quantity = 1; }
    var cart = getCart();
    var existingItem = cart.find(function (item) { return item.product.id === product.id; });
    if (existingItem) {
        existingItem.quantity += quantity;
    }
    else {
        cart.push({ product: product, quantity: quantity });
    }
    saveCart(cart);
    return cart;
}
/**
 * 从购物车移除商品
 */
function removeFromCart(productId) {
    var cart = getCart().filter(function (item) { return item.product.id !== productId; });
    saveCart(cart);
    return cart;
}
/**
 * 更新购物车商品数量
 */
function updateCartItemQuantity(productId, quantity) {
    var cart = getCart();
    var item = cart.find(function (item) { return item.product.id === productId; });
    if (item) {
        if (quantity <= 0) {
            return removeFromCart(productId);
        }
        item.quantity = quantity;
    }
    saveCart(cart);
    return cart;
}
/**
 * 计算购物车总价
 */
function getCartTotal(cart) {
    return cart.reduce(function (total, item) { return total + item.product.price * item.quantity; }, 0);
}
/**
 * 计算购物车商品总数
 */
function getCartCount(cart) {
    return cart.reduce(function (count, item) { return count + item.quantity; }, 0);
}
/**
 * 清空购物车
 */
function clearCart() {
    if (typeof window === 'undefined')
        return;
    localStorage.removeItem('cart');
}
