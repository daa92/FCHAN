const { generatePDF } = require('../services/reports');

// GET /api/reports/farm/:farmId
const downloadReport = async (req, res) => {
  try {
    console.log(`Generating report for farm ${req.params.farmId}...`);

    const { pdf, farmName } = await generatePDF(
      req.params.farmId,
      req.user.id
    );

    // Set headers for PDF download
    const filename = `FCHAN_Report_${farmName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.length);

    console.log(`Report generated: ${filename}`);
    return res.send(pdf);

  } catch (err) {
    console.error('DownloadReport error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate report.',
      error: err.message
    });
  }
};

module.exports = { downloadReport };
