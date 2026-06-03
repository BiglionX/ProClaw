import React from 'react';
import SolutionPage from '../../components/SolutionPage';
import { solutionData } from '../../lib/solutionData';

const CateringSolutionPage: React.FC = () => {
  return <SolutionPage data={solutionData.catering} routeKey="solutionsCatering" />;
};

export default CateringSolutionPage;
