import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/authStore';

const navLinks = [
  { path: '/', label: '首页' },
  { path: '/features', label: '功能' },
  { path: '/flowhub', label: 'AI插件' },
  { path: '/download', label: '下载' },
  { path: '/faq', label: 'FAQ' },
];

const solutionLinks = [
  { path: '/solutions/catering', label: '餐饮', emoji: '\uD83C\uDF7D\uFE0F' },
  { path: '/solutions/beauty', label: '美业', emoji: '\uD83D\uDC87' },
  { path: '/solutions/pet', label: '宠物', emoji: '\uD83D\uDC3E' },
  { path: '/solutions/cloud', label: 'Cloud 托管', emoji: '\u2601\uFE0F' },
];

const Navbar: React.FC = () => {
  const { user, profile, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [solutionDropdownOpen, setSolutionDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const solutionDropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (solutionDropdownRef.current && !solutionDropdownRef.current.contains(e.target as Node)) {
        setSolutionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src="/proclaw-logo.png" alt="ProClaw Logo" className="h-8 w-auto" />
            <span className="text-xl font-bold tracking-tight hover:text-gray-600">ProClaw</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={
                  isActive(link.path)
                    ? 'text-black font-semibold border-b-2 border-black pb-1'
                    : 'text-gray-600 hover:text-black font-semibold'
                }
              >
                {link.label}
              </Link>
            ))}

            {/* 行业方案 下拉 */}
            <div className="relative" ref={solutionDropdownRef}>
              <button
                onClick={() => setSolutionDropdownOpen(!solutionDropdownOpen)}
                onMouseEnter={() => setSolutionDropdownOpen(true)}
                className="flex items-center gap-1 text-gray-600 hover:text-black font-semibold"
              >
                行业方案
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {solutionDropdownOpen && (
                <div
                  className="absolute left-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                  onMouseLeave={() => setSolutionDropdownOpen(false)}
                >
                  {solutionLinks.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSolutionDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
                    >
                      {item.emoji} {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: User State */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {(profile?.username || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[120px] truncate">
                    {profile?.username || user.email?.split('@')[0] || '用户'}
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                    <button
                      onClick={() => { setDropdownOpen(false); navigate('/user'); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      用户中心
                    </button>
                    <button
                      onClick={() => { setDropdownOpen(false); navigate('/user/cloud'); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                      </svg>
                      我的商城
                    </button>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black transition-colors"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
