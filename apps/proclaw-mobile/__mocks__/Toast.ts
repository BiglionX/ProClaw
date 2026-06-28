/**
 * Toast 测试用桩模块
 *
 * 由于 Toast.tsx 是 JSX 文件，jest node 环境无法解析，
 * 此文件作为 jest moduleNameMapper 映射目标，仅在测试中使用。
 *
 * 注意：此文件必须保持纯 JS（不能有 JSX），才能被 jest 加载。
 */

export const showToast = jest.fn();

export const toastConfig = {};

export default { showToast, toastConfig };