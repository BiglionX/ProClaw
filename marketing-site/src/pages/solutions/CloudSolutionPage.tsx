import React from 'react';
import SolutionPage from '../../components/SolutionPage';
import { solutionData } from '../../lib/solutionData';

const CloudSolutionPage: React.FC = () => {
  return <SolutionPage data={solutionData.cloud} routeKey="solutionsCloud" />;
};

export default CloudSolutionPage;
