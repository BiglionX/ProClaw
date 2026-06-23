"use strict";
// 底部信息组件
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Footer;
function Footer() {
    return (<footer className="bg-gray-800 text-white py-8 mt-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 关于我们 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">关于我们</h3>
            <p className="text-gray-400">
              ProClaw 云托管商城，为小商户提供专业的在线商城解决方案。
            </p>
          </div>

          {/* 联系方式 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">联系方式</h3>
            <ul className="space-y-2 text-gray-400">
              <li>电话：400-123-4567</li>
              <li>邮箱：support@proclaw.com</li>
              <li>地址：北京市朝阳区某某路123号</li>
            </ul>
          </div>

          {/* 快速链接 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">快速链接</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  帮助中心
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  隐私政策
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  服务条款
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} ProClaw. All rights reserved.</p>
        </div>
      </div>
    </footer>);
}
