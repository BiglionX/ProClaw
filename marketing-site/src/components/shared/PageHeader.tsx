import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, subtitle, className = '' }) => {
  return (
    <div className={`bg-white border-b border-gray-200 py-16 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-400 mb-2">{subtitle}</p>
        )}
        {description && (
          <p className="text-xl text-gray-500 max-w-3xl mx-auto">{description}</p>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
