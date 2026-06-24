"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var SolutionPage_1 = require("../../components/SolutionPage");
var solutionData_1 = require("../../lib/solutionData");
var CloudSolutionPage = function () {
    return <SolutionPage_1.default data={solutionData_1.solutionData.cloud} routeKey="solutionsCloud"/>;
};
exports.default = CloudSolutionPage;
