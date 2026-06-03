import React from 'react';
import SolutionPage from '../../components/SolutionPage';
import { solutionData } from '../../lib/solutionData';

const BeautySolutionPage: React.FC = () => {
  return <SolutionPage data={solutionData.beauty} routeKey="solutionsBeauty" />;
};

export default BeautySolutionPage;
