import React from 'react';
import { Link } from 'react-router-dom';

interface CTASectionProps {
  title: string;
  description?: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  variant?: 'dark' | 'gray';
}

const CTASection: React.FC<CTASectionProps> = ({
  title,
  description,
  primaryButtonText = '免费下载桌面端',
  primaryButtonLink = '/download',
  secondaryButtonText,
  secondaryButtonLink,
  variant = 'dark',
}) => {
  const bgClass = variant === 'dark' ? 'bg-gray-900' : 'bg-gray-800';
  const textClass = variant === 'dark' ? 'text-white' : 'text-white';
  const descClass = variant === 'dark' ? 'text-gray-400' : 'text-gray-300';
  const secondaryBorderClass = variant === 'dark' ? 'border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white' : 'border-gray-500 text-gray-300 hover:border-gray-300 hover:text-white';

  return (
    <div className={`${bgClass} py-16`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className={`text-3xl font-bold ${textClass} mb-4`}>{title}</h2>
        {description && (
          <p className={`${descClass} mb-8 max-w-xl mx-auto`}>{description}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to={primaryButtonLink}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl inline-block"
          >
            {primaryButtonText}
          </Link>
          {secondaryButtonText && secondaryButtonLink && (
            <Link
              to={secondaryButtonLink}
              className={`px-8 py-4 border-2 ${secondaryBorderClass} font-medium rounded-lg transition-all inline-block`}
            >
              {secondaryButtonText}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default CTASection;
