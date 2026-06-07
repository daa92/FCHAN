const puppeteer = require('puppeteer');
const db = require('../config/db');
const { getForecast } = require('./forecast');
const Plant = require('../models/Plant');
const Sensor = require('../models/Sensor');
const Reading = require('../models/Reading');
const Alert = require('../models/Alert');

// ─── HELPER: FORMAT DATE ──────────────────────────────
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
};

const getSeverityColor = (severity) => {
  switch (severity) {
    case 'critical': return '#e74c3c';
    case 'warning':  return '#f39c12';
    case 'info':     return '#3498db';
    default:         return '#95a5a6';
  }
};

const getHealthColor = (score) => {
  if (score >= 85) return '#27ae60';
  if (score >= 70) return '#2ecc71';
  if (score >= 50) return '#f39c12';
  if (score >= 30) return '#e67e22';
  return '#e74c3c';
};

// ─── FIND CHROME EXECUTABLE ───────────────────────────
const findChrome = () => {
  // 1. Explicit env var (Render dashboard setting)
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    const { execFileSync } = require('child_process');
    try {
      execFileSync('test', ['-f', process.env.PUPPETEER_EXECUTABLE_PATH]);
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    } catch {
      console.warn('PUPPETEER_EXECUTABLE_PATH set but file not found:', process.env.PUPPETEER_EXECUTABLE_PATH);
    }
  }

  // 2. Common Linux/Render paths
  const candidates = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ];

  const fs = require('fs');
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  // 3. Let puppeteer use its own bundled chromium (works locally)
  return null;
};

// ─── GATHER REPORT DATA ───────────────────────────────
const gatherReportData = async (farmId, userId) => {
  const [farms] = await db.execute(
    `SELECT f.* FROM farms f
     LEFT JOIN collaborators c ON c.farm_id = f.id AND c.user_id = ? AND c.status = 'accepted'
     WHERE f.id = ? AND (f.user_id = ? OR c.user_id IS NOT NULL)`,
    [userId, farmId, userId]
  );
  const farm = farms[0];
  if (!farm) throw new Error('Farm not found.');

  const [zones] = await db.execute('SELECT * FROM zones WHERE farm_id = ?', [farmId]);

  const zonesData = [];
  for (const zone of zones) {
    const plants  = await Plant.findByZoneId(zone.id);
    const sensors = await Sensor.findByZoneId(zone.id);

    const sensorsData = [];
    for (const sensor of sensors) {
      const latest = await Reading.findLatest(sensor.id);
      const stats  = await Reading.getAverage(sensor.id, 24);
      sensorsData.push({ ...sensor, latest, stats });
    }

    const plantsData = [];
    for (const plant of plants) {
      let forecast = null;
      try { forecast = await getForecast(plant, sensors); } catch (e) { forecast = null; }
      plantsData.push({ ...plant, forecast });
    }

    zonesData.push({ ...zone, plants: plantsData, sensors: sensorsData });
  }

  const alerts = await Alert.findByFarmId(farmId, 20);
  const [users] = await db.execute('SELECT name, email FROM users WHERE id = ?', [userId]);

  return { farm, zones: zonesData, alerts, user: users[0], generated_at: new Date() };
};

// ─── BUILD HTML ───────────────────────────────────────
const buildReportHTML = (data) => {
  const { farm, zones, alerts, user, generated_at } = data;

  const zonesHTML = zones.map(zone => {
    const sensorsHTML = zone.sensors.length > 0
      ? zone.sensors.map(s => `
          <tr>
            <td>${s.name}</td>
            <td>${s.type.replace('_',' ')}</td>
            <td>${s.latest ? s.latest.value+' '+(s.unit||'') : 'No data'}</td>
            <td>${s.stats.average ? parseFloat(s.stats.average).toFixed(2)+' '+(s.unit||'') : 'N/A'}</td>
            <td>${s.stats.minimum ? parseFloat(s.stats.minimum).toFixed(2) : 'N/A'}</td>
            <td>${s.stats.maximum ? parseFloat(s.stats.maximum).toFixed(2) : 'N/A'}</td>
            <td><span class="badge ${s.is_active?'badge-success':'badge-danger'}">${s.is_active?'Active':'Inactive'}</span></td>
          </tr>`).join('')
      : '<tr><td colspan="7" class="text-center">No sensors in this zone</td></tr>';

    const plantsHTML = zone.plants.length > 0
      ? zone.plants.map(plant => {
          const f = plant.forecast;
          return `<div class="plant-card">
            <div class="plant-header">
              <h4>${plant.name}</h4>
              <span class="badge badge-info">${plant.growth_stage}</span>
            </div>
            <div class="plant-details">
              <div class="detail-row"><span>Species:</span><strong>${plant.species||'Unknown'}</strong></div>
              <div class="detail-row"><span>Quantity:</span><strong>${plant.quantity}</strong></div>
              <div class="detail-row"><span>Planted:</span><strong>${formatDate(plant.planted_at)}</strong></div>
              ${f && !f.error ? `
              <div class="forecast-box">
                <h5>Forecast</h5>
                <div class="progress-bar-container">
                  <div class="progress-bar-label">Growth: ${f.growth_percentage}%</div>
                  <div class="progress-bar"><div class="progress-fill" style="width:${f.growth_percentage}%;background:${getHealthColor(f.growth_percentage)}"></div></div>
                </div>
                <div class="forecast-grid">
                  <div class="forecast-item"><span>GDD Accumulated</span><strong>${f.accumulated_gdd}</strong></div>
                  <div class="forecast-item"><span>Total GDD Needed</span><strong>${f.total_gdd_needed}</strong></div>
                  <div class="forecast-item"><span>Days Remaining</span><strong>${f.days_remaining||'N/A'}</strong></div>
                  <div class="forecast-item"><span>Est. Harvest</span><strong>${formatDate(f.estimated_harvest_date)}</strong></div>
                  <div class="forecast-item"><span>Health Score</span><strong style="color:${getHealthColor(f.health_score)}">${f.health_score||'N/A'}/100</strong></div>
                  <div class="forecast-item"><span>Status</span><strong style="color:${getHealthColor(f.health_score)}">${f.health_status||'N/A'}</strong></div>
                </div>
                ${f.recommendations&&f.recommendations.length?`<div class="recommendations"><h6>Recommendations</h6><ul>${f.recommendations.map(r=>`<li>${r}</li>`).join('')}</ul></div>`:''}
              </div>` : `<div class="no-forecast">${f&&f.error?f.error:'Forecast unavailable'}</div>`}
            </div>
          </div>`;
        }).join('')
      : '<p class="no-data">No plants in this zone</p>';

    return `<div class="zone-section">
      <div class="zone-header">
        <h3>${zone.name}</h3>
        ${zone.area_sqm?`<span class="zone-area">${zone.area_sqm} m²</span>`:''}
      </div>
      ${zone.description?`<p class="zone-desc">${zone.description}</p>`:''}
      <h4 class="section-title">Sensors & Readings (Last 24h)</h4>
      <table class="data-table"><thead><tr><th>Sensor</th><th>Type</th><th>Latest</th><th>Average</th><th>Min</th><th>Max</th><th>Status</th></tr></thead><tbody>${sensorsHTML}</tbody></table>
      <h4 class="section-title">Plants</h4>
      <div class="plants-grid">${plantsHTML}</div>
    </div>`;
  }).join('');

  const alertsHTML = alerts.length > 0
    ? alerts.map(a => `<tr>
        <td>${formatDate(a.created_at)}</td>
        <td>${a.type.replace(/_/g,' ')}</td>
        <td><span class="badge" style="background:${getSeverityColor(a.severity)};color:white">${a.severity}</span></td>
        <td>${a.message}</td>
        <td><span class="badge ${a.is_resolved?'badge-success':'badge-warning'}">${a.is_resolved?'Resolved':'Active'}</span></td>
      </tr>`).join('')
    : '<tr><td colspan="5" class="text-center">No alerts recorded</td></tr>';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
  <title>FCHAN Report - ${farm.name}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#2c3e50;background:#fff;font-size:13px;line-height:1.6}
    .cover{min-height:100vh;background:linear-gradient(135deg,#1a5276 0%,#27ae60 100%);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;color:white;padding:40px;page-break-after:always}
    .cover h1{font-size:42px;font-weight:800;letter-spacing:3px;margin-bottom:10px}
    .cover h2{font-size:24px;font-weight:300;margin-bottom:40px;opacity:0.9}
    .cover-divider{width:80px;height:4px;background:rgba(255,255,255,0.5);margin:30px auto;border-radius:2px}
    .cover-info{font-size:16px;opacity:0.85;line-height:2}
    .cover-badge{margin-top:40px;background:rgba(255,255,255,0.2);padding:10px 30px;border-radius:50px;font-size:14px;border:1px solid rgba(255,255,255,0.4)}
    .content{padding:40px;max-width:1000px;margin:0 auto}
    .page-section{page-break-before:always;padding-top:20px}
    .section-header{background:linear-gradient(135deg,#1a5276,#27ae60);color:white;padding:15px 25px;border-radius:8px;margin-bottom:25px}
    .section-header h2{font-size:20px;font-weight:700}
    .summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:30px}
    .summary-card{background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;padding:20px;text-align:center}
    .summary-card .value{font-size:32px;font-weight:800;color:#27ae60}
    .summary-card .label{font-size:12px;color:#7f8c8d;margin-top:5px;text-transform:uppercase;letter-spacing:1px}
    .info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:25px}
    .info-item{background:#f8f9fa;padding:12px 15px;border-radius:6px;border-left:4px solid #27ae60}
    .info-item label{font-size:11px;color:#7f8c8d;text-transform:uppercase;letter-spacing:1px;display:block}
    .info-item value{font-size:14px;font-weight:600;color:#2c3e50}
    .zone-section{margin-bottom:30px;border:1px solid #e9ecef;border-radius:10px;overflow:hidden}
    .zone-header{background:#eafaf1;padding:15px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #d5f5e3}
    .zone-header h3{color:#1a5276;font-size:16px}
    .zone-area{background:#27ae60;color:white;padding:3px 12px;border-radius:20px;font-size:12px}
    .zone-desc{padding:10px 20px;color:#7f8c8d;font-style:italic;border-bottom:1px solid #e9ecef}
    .section-title{padding:12px 20px;font-size:14px;color:#2c3e50;background:#f8f9fa;border-bottom:1px solid #e9ecef;border-top:1px solid #e9ecef}
    .data-table{width:100%;border-collapse:collapse;font-size:12px}
    .data-table th{background:#2c3e50;color:white;padding:10px 12px;text-align:left;font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:0.5px}
    .data-table td{padding:9px 12px;border-bottom:1px solid #f0f0f0;color:#2c3e50}
    .data-table tr:nth-child(even) td{background:#f8f9fa}
    .text-center{text-align:center}
    .badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .badge-success{background:#d5f5e3;color:#27ae60}
    .badge-danger{background:#fadbd8;color:#e74c3c}
    .badge-warning{background:#fef9e7;color:#f39c12}
    .badge-info{background:#d6eaf8;color:#2980b9}
    .plants-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px;padding:15px}
    .plant-card{border:1px solid #e9ecef;border-radius:8px;overflow:hidden}
    .plant-header{background:#eafaf1;padding:12px 15px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #d5f5e3}
    .plant-header h4{font-size:14px;color:#1a5276}
    .plant-details{padding:12px 15px}
    .detail-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f8f9fa;font-size:12px}
    .detail-row span{color:#7f8c8d}
    .forecast-box{margin-top:12px;background:#f8f9fa;border-radius:6px;padding:12px}
    .forecast-box h5{font-size:13px;margin-bottom:10px;color:#2c3e50}
    .progress-bar-container{margin-bottom:10px}
    .progress-bar-label{font-size:12px;color:#7f8c8d;margin-bottom:4px}
    .progress-bar{height:10px;background:#e9ecef;border-radius:5px;overflow:hidden}
    .progress-fill{height:100%;border-radius:5px}
    .forecast-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:10px}
    .forecast-item{background:white;padding:6px 10px;border-radius:4px;border:1px solid #e9ecef}
    .forecast-item span{display:block;font-size:10px;color:#7f8c8d;text-transform:uppercase}
    .forecast-item strong{font-size:13px}
    .recommendations{margin-top:10px;background:#fff3cd;border-radius:4px;padding:8px 12px}
    .recommendations h6{font-size:12px;margin-bottom:5px;color:#856404}
    .recommendations ul{padding-left:16px;font-size:11px;color:#856404}
    .no-forecast{margin-top:10px;background:#fff3cd;padding:8px;border-radius:4px;font-size:12px;color:#856404}
    .no-data{padding:15px;color:#7f8c8d;font-style:italic;text-align:center}
    .alerts-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:20px}
    .alert-stat{text-align:center;padding:15px;border-radius:8px}
    .alert-stat.critical{background:#fadbd8}.alert-stat.warning{background:#fef9e7}.alert-stat.info{background:#d6eaf8}
    .alert-stat .num{font-size:28px;font-weight:800}
    .alert-stat.critical .num{color:#e74c3c}.alert-stat.warning .num{color:#f39c12}.alert-stat.info .num{color:#3498db}
    .footer{margin-top:40px;padding:20px 40px;background:#2c3e50;color:white;text-align:center;font-size:12px}
    .footer p{opacity:0.7}
    @media print{.page-section{page-break-before:always}.zone-section{page-break-inside:avoid}.plant-card{page-break-inside:avoid}}
  </style></head><body>

  <div class="cover">
    <div style="font-size:64px;margin-bottom:20px">🌿</div>
    <h1>FCHAN</h1>
    <h2>Farm Intelligence Platform</h2>
    <div class="cover-divider"></div>
    <div class="cover-info">
      <p><strong>${farm.name}</strong></p>
      <p>${farm.city||''}${farm.city&&farm.country?', ':''}${farm.country||''}</p>
      <p>Generated for: ${user.name}</p>
      <p>${formatDate(generated_at)}</p>
    </div>
    <div class="cover-badge">Complete Farm Report</div>
  </div>

  <div class="content">
    <div class="page-section">
      <div class="section-header"><h2>Farm Overview</h2></div>
      <div class="summary-grid">
        <div class="summary-card"><div class="value">${zones.length}</div><div class="label">Total Zones</div></div>
        <div class="summary-card"><div class="value">${zones.reduce((a,z)=>a+z.plants.length,0)}</div><div class="label">Total Plants</div></div>
        <div class="summary-card"><div class="value">${zones.reduce((a,z)=>a+z.sensors.length,0)}</div><div class="label">Total Sensors</div></div>
      </div>
      <div class="info-grid">
        <div class="info-item"><label>Farm Name</label><value>${farm.name}</value></div>
        <div class="info-item"><label>Location</label><value>${farm.city||'N/A'}${farm.city&&farm.country?', ':''}${farm.country||''}</value></div>
        <div class="info-item"><label>Owner</label><value>${user.name}</value></div>
        <div class="info-item"><label>Report Generated</label><value>${formatDate(generated_at)}</value></div>
      </div>
    </div>

    <div class="page-section">
      <div class="section-header"><h2>Zones, Sensors & Plants</h2></div>
      ${zonesHTML}
    </div>

    <div class="page-section">
      <div class="section-header"><h2>Recent Alerts</h2></div>
      <div class="alerts-summary">
        <div class="alert-stat critical"><div class="num">${alerts.filter(a=>a.severity==='critical').length}</div><div>Critical</div></div>
        <div class="alert-stat warning"><div class="num">${alerts.filter(a=>a.severity==='warning').length}</div><div>Warnings</div></div>
        <div class="alert-stat info"><div class="num">${alerts.filter(a=>a.severity==='info').length}</div><div>Info</div></div>
      </div>
      <table class="data-table"><thead><tr><th>Date</th><th>Type</th><th>Severity</th><th>Message</th><th>Status</th></tr></thead><tbody>${alertsHTML}</tbody></table>
    </div>
  </div>

  <div class="footer">
    <p>FCHAN — Farm Intelligence Platform</p>
    <p>Report generated on ${formatDate(generated_at)} for ${user.name} (${user.email})</p>
    <p>This report is confidential and intended solely for the use of the farm owner.</p>
  </div>
</body></html>`;
};

// ─── GENERATE PDF ─────────────────────────────────────
const generatePDF = async (farmId, userId) => {
  let browser = null;
  try {
    const data = await gatherReportData(farmId, userId);
    const html = buildReportHTML(data);

    const executablePath = findChrome();
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ]
    };

    if (executablePath) {
      launchOptions.executablePath = executablePath;
      console.log('Using Chrome at:', executablePath);
    } else {
      console.log('Using puppeteer bundled chromium');
    }

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    return { pdf, farmName: data.farm.name };

  } finally {
    if (browser) await browser.close();
  }
};

module.exports = { generatePDF };
