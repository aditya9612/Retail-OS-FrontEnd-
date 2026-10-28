import { createGRN, getGRNs, getGRNById, getGRNByNumber, getGRNStats, exportGRNs, deleteGRN, qualityCheckGRN, receiveGRN, rejectGRN, getGRNHistory, downloadGRNPdf, getGRNPrintSlip } from "../api/grnApi";

export const grnService = {
  createGRN,
  create: createGRN,
  getGRNs,
  getAll: getGRNs,
  list: getGRNs,
  getGRNById,
  getById: getGRNById,
  getGRNByNumber,
  getByNumber: getGRNByNumber,
  getGRNStats,
  getStats: getGRNStats,
  exportGRNs,
  exportCSV: exportGRNs,
  deleteGRN,
  delete: deleteGRN,
  remove: deleteGRN,
  qualityCheckGRN,
  qualityCheck: qualityCheckGRN,
  qc: qualityCheckGRN,
  receiveGRN,
  receive: receiveGRN,
  rejectGRN,
  reject: rejectGRN,
  getGRNHistory,
  getHistory: getGRNHistory,
  history: getGRNHistory,
  downloadGRNPdf,
  downloadPdf: downloadGRNPdf,
  printPdf: downloadGRNPdf,
  print: downloadGRNPdf,
  getGRNPrintSlip,
  getPrintSlip: getGRNPrintSlip,
  printSlip: getGRNPrintSlip,
};

export { createGRN, getGRNs, getGRNById, getGRNByNumber, getGRNStats, exportGRNs, deleteGRN, qualityCheckGRN, receiveGRN, rejectGRN, getGRNHistory, downloadGRNPdf, getGRNPrintSlip };
export default grnService;

