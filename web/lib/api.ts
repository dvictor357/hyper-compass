import {
  getHeatmapData, getNetflowEntries, getConvergenceSignals,
  getAIAnalyses, getAlphaSignals, getSyndicateReport,
  getSyndicateGraphData, getDivergenceData, getSignalHistory, calcAccuracyReport,
} from './mock-data';

export const api = {
  heatmap: getHeatmapData,
  netflows: getNetflowEntries,
  convergenceSignals: getConvergenceSignals,
  aiAnalyses: getAIAnalyses,
  alphaSignals: getAlphaSignals,
  syndicateReport: getSyndicateReport,
  syndicateGraph: getSyndicateGraphData,
  divergence: getDivergenceData,
  signalHistory: getSignalHistory,
  accuracyReport: () => calcAccuracyReport(getSignalHistory()),
};
