import React from 'react';
import SolutionPage from '../../components/SolutionPage';
import { solutionData } from '../../lib/solutionData';

const PetSolutionPage: React.FC = () => {
  return <SolutionPage data={solutionData.pet} />;
};

export default PetSolutionPage;
