/**
 * 数据导出工具函数
 */

import React from 'react';

/**
 * 将数据导出为 CSV 文件
 * @param data - 要导出的数据数组
 * @param filename - 文件名（不含扩展名）
 * @param headers - 表头映射（可选，如果不提供则使用数据的第一个对象的键）
 */
export const exportToCSV = (
  data: any[],
  filename: string,
  headers?: { key: string; label: string }[]
) => {
  if (!data || data.length === 0) {
    alert('没有数据可导出');
    return;
  }

  // 确定表头
  const headerKeys = headers 
    ? headers.map(h => h.key)
    : Object.keys(data[0]);
  
  const headerLabels = headers
    ? headers.map(h => h.label)
    : headerKeys;

  // 创建 CSV 内容
  const csvRows: string[] = [];
  
  // 添加表头
  csvRows.push(headerLabels.join(','));
  
  // 添加数据行
  for (const row of data) {
    const values = headerKeys.map(key => {
      const value = row[key];
      // 处理包含逗号、引号或换行符的值
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }

  // 创建 Blob 并下载
  const csvContent = '\uFEFF' + csvRows.join('\n'); // 添加 BOM 以支持中文
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 将数据导出为 JSON 文件
 * @param data - 要导出的数据
 * @param filename - 文件名（不含扩展名）
 */
export const exportToJSON = (data: any, filename: string) => {
  if (!data) {
    alert('没有数据可导出');
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 导出按钮组件属性
 */
export interface ExportButtonProps {
  data: any[];
  filename: string;
  format?: 'csv' | 'json';
  headers?: { key: string; label: string }[];
  className?: string;
  children?: React.ReactNode;
}

/**
 * 通用导出按钮组件
 */
export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  filename,
  format = 'csv',
  headers,
  className = '',
  children,
}) => {
  const handleExport = () => {
    if (format === 'csv') {
      exportToCSV(data, filename, headers);
    } else {
      exportToJSON(data, filename);
    }
  };

  return (
    <button
      onClick={handleExport}
      className={`flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors ${className}`}
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {children || `导出为 ${format.toUpperCase()}`}
    </button>
  );
};
