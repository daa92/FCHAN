const PDFDocument = require('pdfkit');
const db = require('../config/db');
const Plant = require('../models/Plant');
const Sensor = require('../models/Sensor');
const Reading = require('../models/Reading');
const Alert = require('../models/Alert');

// ── HELPERS ───────────────────────────────────────────
const fmt = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
};

const healthColor = (score) => {
  if (score >= 85) return '#27ae60';
  if (score >= 70) return '#2ecc71';
  if (score >= 50) return '#f39c12';
  if (score >= 30) return '#e67e22';
  return '#e74c3c';
};

// ── GATHER DATA ───────────────────────────────────────
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
      try {
        const { getForecast } = require('./forecast');
        forecast = await getForecast(plant, sensors);
      } catch (e) { forecast = null; }
      plantsData.push({ ...plant, forecast });
    }

    zonesData.push({ ...zone, plants: plantsData, sensors: sensorsData });
  }

  const alerts = await Alert.findByFarmId(farmId, 20);
  const [users] = await db.execute('SELECT name, email FROM users WHERE id = ?', [userId]);

  return { farm, zones: zonesData, alerts, user: users[0], generated_at: new Date() };
};

// ── DRAW HELPERS ──────────────────────────────────────
const COLORS = {
  primary:   '#27ae60',
  secondary: '#1a5276',
  danger:    '#e74c3c',
  warning:   '#f39c12',
  text:      '#2c3e50',
  muted:     '#7f8c8d',
  light:     '#f8f9fa',
  border:    '#dee2e6',
  white:     '#ffffff',
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;
const COL_W  = PAGE_W - MARGIN * 2;

function drawRect(doc, x, y, w, h, color, radius = 0) {
  doc.save().roundedRect(x, y, w, h, radius).fill(color).restore();
}

function sectionHeader(doc, title, y) {
  drawRect(doc, MARGIN, y, COL_W, 30, COLORS.secondary, 6);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.white)
     .text(title, MARGIN + 12, y + 8, { width: COL_W - 24 });
  return y + 40;
}

function rowLine(doc, y) {
  doc.save().moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y)
     .strokeColor(COLORS.border).lineWidth(0.5).stroke().restore();
}

function checkPage(doc, y, needed = 80) {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage();
    return MARGIN + 10;
  }
  return y;
}

// ── GENERATE PDF ──────────────────────────────────────
const generatePDF = (farmId, userId) => new Promise(async (resolve, reject) => {
  try {
    const data = await gatherReportData(farmId, userId);
    const { farm, zones, alerts, user, generated_at } = data;

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: {
        Title:  `FCHAN Report — ${farm.name}`,
        Author: user.name,
        Subject: 'Farm Intelligence Report',
      }
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end',  ()    => resolve({ pdf: Buffer.concat(chunks), farmName: farm.name }));
    doc.on('error', reject);

    // ─── COVER PAGE ────────────────────────────────────
    // Green gradient background (simulated with rect)
    drawRect(doc, 0, 0, PAGE_W, PAGE_H, COLORS.secondary);
    drawRect(doc, 0, PAGE_H * 0.55, PAGE_W, PAGE_H * 0.45, COLORS.primary);

    // Logo / Title
    doc.font('Helvetica-Bold').fontSize(52).fillColor(COLORS.white)
       .text('FCHAN', 0, 180, { align: 'center' });
    doc.font('Helvetica').fontSize(18).fillColor('rgba(255,255,255,0.85)')
       .text('Farm Intelligence Platform', 0, 248, { align: 'center' });

    // Divider
    const divX = PAGE_W / 2 - 40;
    doc.save().moveTo(divX, 290).lineTo(divX + 80, 290)
       .strokeColor('rgba(255,255,255,0.4)').lineWidth(3).stroke().restore();

    // Farm info box
    drawRect(doc, MARGIN + 60, 315, COL_W - 120, 160, 'rgba(255,255,255,0.12)', 12);
    doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.white)
       .text(farm.name, MARGIN + 60, 335, { align: 'center', width: COL_W - 120 });
    doc.font('Helvetica').fontSize(12).fillColor('rgba(255,255,255,0.8)');
    const loc = [farm.city, farm.country].filter(Boolean).join(', ') || 'N/A';
    doc.text(`  ${loc}`,       MARGIN + 60, 362, { align: 'center', width: COL_W - 120 });
    doc.text(`  ${user.name}`, MARGIN + 60, 385, { align: 'center', width: COL_W - 120 });
    doc.text(`  ${user.email}`,MARGIN + 60, 408, { align: 'center', width: COL_W - 120 });
    doc.text(`  Generated: ${fmt(generated_at)}`, MARGIN + 60, 431, { align: 'center', width: COL_W - 120 });

    // Summary stats at bottom of cover
    const totalPlants  = zones.reduce((a, z) => a + z.plants.length, 0);
    const totalSensors = zones.reduce((a, z) => a + z.sensors.length, 0);
    const stats = [
      { label: 'Zones',   value: zones.length },
      { label: 'Plants',  value: totalPlants  },
      { label: 'Sensors', value: totalSensors },
      { label: 'Alerts',  value: alerts.length },
    ];
    const boxW = (COL_W - 30) / 4;
    stats.forEach((s, i) => {
      const bx = MARGIN + i * (boxW + 10);
      drawRect(doc, bx, 570, boxW, 70, 'rgba(255,255,255,0.15)', 8);
      doc.font('Helvetica-Bold').fontSize(26).fillColor(COLORS.white)
         .text(String(s.value), bx, 582, { align: 'center', width: boxW });
      doc.font('Helvetica').fontSize(10).fillColor('rgba(255,255,255,0.7)')
         .text(s.label.toUpperCase(), bx, 614, { align: 'center', width: boxW });
    });

    // Footer
    doc.font('Helvetica').fontSize(10).fillColor('rgba(255,255,255,0.5)')
       .text('Complete Farm Report — Confidential', 0, PAGE_H - 60, { align: 'center' });

    // ─── PAGE 2: FARM OVERVIEW ─────────────────────────
    doc.addPage();
    let y = MARGIN;

    y = sectionHeader(doc, 'Farm Overview', y);

    const infoItems = [
      ['Farm Name',   farm.name],
      ['Location',    loc],
      ['Owner',       user.name],
      ['Email',       user.email],
      ['Total Zones', String(zones.length)],
      ['Total Plants',String(totalPlants)],
      ['Total Sensors',String(totalSensors)],
      ['Report Date', fmt(generated_at)],
    ];

    infoItems.forEach((item, i) => {
      const ix = MARGIN;
      const iy = y + i * 26;
      if (i % 2 === 0) drawRect(doc, ix, iy, COL_W, 26, COLORS.light);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.muted)
         .text(item[0], ix + 10, iy + 7, { width: 160 });
      doc.font('Helvetica').fontSize(11).fillColor(COLORS.text)
         .text(item[1], ix + 175, iy + 7, { width: COL_W - 185 });
    });
    y += infoItems.length * 26 + 20;

    // ─── ZONES SECTION ─────────────────────────────────
    for (const zone of zones) {
      y = checkPage(doc, y, 120);
      y = sectionHeader(doc, `Zone: ${zone.name}${zone.area_sqm ? '  ('+zone.area_sqm+' m²)' : ''}`, y);

      if (zone.description) {
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLORS.muted)
           .text(zone.description, MARGIN, y, { width: COL_W });
        y += 20;
      }

      // Sensors table
      y = checkPage(doc, y, 60);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.secondary)
         .text('Sensors & Readings (Last 24h)', MARGIN, y);
      y += 18;

      // Table header
      const cols = [
        { label: 'Sensor Name', x: MARGIN,       w: 130 },
        { label: 'Type',        x: MARGIN + 130,  w: 100 },
        { label: 'Latest',      x: MARGIN + 230,  w: 80  },
        { label: 'Avg (24h)',   x: MARGIN + 310,  w: 80  },
        { label: 'Min',         x: MARGIN + 390,  w: 60  },
        { label: 'Max',         x: MARGIN + 450,  w: 60  },
        { label: 'Status',      x: MARGIN + 510,  w: 55  },
      ];
      drawRect(doc, MARGIN, y, COL_W, 22, COLORS.secondary);
      cols.forEach(c => {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.white)
           .text(c.label, c.x + 4, y + 6, { width: c.w - 4 });
      });
      y += 22;

      if (zone.sensors.length === 0) {
        drawRect(doc, MARGIN, y, COL_W, 24, COLORS.light);
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLORS.muted)
           .text('No sensors in this zone', MARGIN, y + 6, { align: 'center', width: COL_W });
        y += 24;
      } else {
        zone.sensors.forEach((s, i) => {
          y = checkPage(doc, y, 26);
          if (i % 2 === 0) drawRect(doc, MARGIN, y, COL_W, 22, COLORS.light);
          const latest = s.latest ? `${parseFloat(s.latest.value).toFixed(1)} ${s.unit||''}` : 'No data';
          const avg    = s.stats?.average ? `${parseFloat(s.stats.average).toFixed(1)} ${s.unit||''}` : 'N/A';
          const min    = s.stats?.minimum ? parseFloat(s.stats.minimum).toFixed(1) : 'N/A';
          const max    = s.stats?.maximum ? parseFloat(s.stats.maximum).toFixed(1) : 'N/A';
          const status = s.is_active ? 'Active' : 'Inactive';
          const stColor = s.is_active ? COLORS.primary : COLORS.danger;

          doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
          doc.text(s.name,                       MARGIN + 4,     y + 6, { width: 126 });
          doc.text(s.type.replace(/_/g, ' '),    MARGIN + 134,   y + 6, { width: 96  });
          doc.text(latest,                        MARGIN + 234,   y + 6, { width: 76  });
          doc.text(avg,                           MARGIN + 314,   y + 6, { width: 76  });
          doc.text(min,                           MARGIN + 394,   y + 6, { width: 56  });
          doc.text(max,                           MARGIN + 454,   y + 6, { width: 56  });
          doc.font('Helvetica-Bold').fontSize(9).fillColor(stColor)
             .text(status,                        MARGIN + 514,   y + 6, { width: 51  });
          y += 22;
        });
      }
      y += 12;

      // Plants
      y = checkPage(doc, y, 60);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.secondary)
         .text('Plants', MARGIN, y);
      y += 18;

      if (zone.plants.length === 0) {
        drawRect(doc, MARGIN, y, COL_W, 24, COLORS.light);
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLORS.muted)
           .text('No plants in this zone', MARGIN, y + 6, { align: 'center', width: COL_W });
        y += 24;
      } else {
        for (const plant of zone.plants) {
          y = checkPage(doc, y, 100);
          // Plant card header
          drawRect(doc, MARGIN, y, COL_W, 26, '#eafaf1');
          doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.secondary)
             .text(`🌱 ${plant.name}`, MARGIN + 8, y + 7, { width: COL_W * 0.6 });
          doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
             .text(`Stage: ${plant.growth_stage || 'N/A'}  |  Qty: ${plant.quantity || 'N/A'}  |  Planted: ${fmt(plant.planted_at)}`,
                   MARGIN + 8, y + 22 - 9, { width: COL_W - 16 });
          y += 26;

          // Forecast
          const f = plant.forecast;
          if (f && !f.error) {
            const hs = f.health_score || 0;
            const hColor = healthColor(hs);

            // Progress bar
            drawRect(doc, MARGIN + 8, y + 4, COL_W - 16, 10, COLORS.border, 5);
            drawRect(doc, MARGIN + 8, y + 4, Math.max(4, (COL_W - 16) * (f.growth_percentage || 0) / 100), 10, hColor, 5);
            doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
               .text(`Growth: ${f.growth_percentage || 0}%`, MARGIN + 8, y + 17, { width: 100 });
            doc.font('Helvetica-Bold').fontSize(9).fillColor(hColor)
               .text(`Health: ${hs}/100 — ${f.health_status || 'N/A'}`, PAGE_W - MARGIN - 160, y + 17, { width: 155, align: 'right' });
            y += 30;

            // Forecast grid
            const fItems = [
              ['GDD Accumulated', String(f.accumulated_gdd || 'N/A')],
              ['GDD Needed',      String(f.total_gdd_needed || 'N/A')],
              ['Days Remaining',  String(f.days_remaining || 'N/A')],
              ['Est. Harvest',    fmt(f.estimated_harvest_date)],
            ];
            const fColW = (COL_W - 24) / 2;
            fItems.forEach((fi, idx) => {
              const fx = MARGIN + 8 + (idx % 2) * (fColW + 8);
              const fy = y + Math.floor(idx / 2) * 22;
              drawRect(doc, fx, fy, fColW, 20, COLORS.light, 3);
              doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
                 .text(fi[0], fx + 6, fy + 3, { width: fColW / 2 - 4 });
              doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.text)
                 .text(fi[1], fx + fColW / 2, fy + 3, { width: fColW / 2 - 6, align: 'right' });
            });
            y += 50;

            // Recommendations
            if (f.recommendations && f.recommendations.length) {
              y = checkPage(doc, y, 30 + f.recommendations.length * 16);
              drawRect(doc, MARGIN + 8, y, COL_W - 16, 20 + f.recommendations.length * 16, '#fff3cd', 4);
              doc.font('Helvetica-Bold').fontSize(9).fillColor('#856404')
                 .text('Recommendations:', MARGIN + 14, y + 5);
              f.recommendations.forEach((r, ri) => {
                doc.font('Helvetica').fontSize(9).fillColor('#856404')
                   .text(`• ${r}`, MARGIN + 14, y + 18 + ri * 16, { width: COL_W - 28 });
              });
              y += 20 + f.recommendations.length * 16;
            }
          } else {
            drawRect(doc, MARGIN + 8, y, COL_W - 16, 22, '#fff3cd', 4);
            doc.font('Helvetica-Oblique').fontSize(9).fillColor('#856404')
               .text(f?.error || 'Forecast unavailable', MARGIN + 14, y + 6, { width: COL_W - 28 });
            y += 22;
          }
          rowLine(doc, y + 4);
          y += 14;
        }
      }
      y += 16;
    }

    // ─── ALERTS PAGE ───────────────────────────────────
    y = checkPage(doc, y, 200);
    if (y > MARGIN + 100) { doc.addPage(); y = MARGIN; }

    y = sectionHeader(doc, 'Recent Alerts', y);

    // Alert summary boxes
    const aCrit = alerts.filter(a => a.severity === 'critical').length;
    const aWarn = alerts.filter(a => a.severity === 'warning').length;
    const aInfo = alerts.filter(a => a.severity === 'info').length;
    const aBoxW = (COL_W - 20) / 3;
    [
      { label: 'Critical', count: aCrit, color: COLORS.danger  },
      { label: 'Warnings', count: aWarn, color: COLORS.warning },
      { label: 'Info',     count: aInfo, color: COLORS.secondary },
    ].forEach((ab, i) => {
      const abx = MARGIN + i * (aBoxW + 10);
      drawRect(doc, abx, y, aBoxW, 55, COLORS.light, 6);
      doc.save().rect(abx, y, aBoxW, 4).fill(ab.color).restore();
      doc.font('Helvetica-Bold').fontSize(26).fillColor(ab.color)
         .text(String(ab.count), abx, y + 10, { align: 'center', width: aBoxW });
      doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted)
         .text(ab.label, abx, y + 38, { align: 'center', width: aBoxW });
    });
    y += 65;

    // Alerts table header
    const aCols = [
      { label: 'Date',     x: MARGIN,       w: 105 },
      { label: 'Type',     x: MARGIN + 105, w: 110 },
      { label: 'Severity', x: MARGIN + 215, w: 70  },
      { label: 'Message',  x: MARGIN + 285, w: 195 },
      { label: 'Status',   x: MARGIN + 480, w: 65  },
    ];
    drawRect(doc, MARGIN, y, COL_W, 22, COLORS.secondary);
    aCols.forEach(c => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.white)
         .text(c.label, c.x + 4, y + 6, { width: c.w - 4 });
    });
    y += 22;

    if (alerts.length === 0) {
      drawRect(doc, MARGIN, y, COL_W, 24, COLORS.light);
      doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLORS.muted)
         .text('No alerts recorded', MARGIN, y + 6, { align: 'center', width: COL_W });
      y += 24;
    } else {
      alerts.forEach((a, i) => {
        const rowH = 22;
        y = checkPage(doc, y, rowH);
        if (i % 2 === 0) drawRect(doc, MARGIN, y, COL_W, rowH, COLORS.light);
        const sevColor = a.severity === 'critical' ? COLORS.danger
                       : a.severity === 'warning'  ? COLORS.warning
                       : COLORS.secondary;
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
        doc.text(fmt(a.created_at),              MARGIN + 4,     y + 6, { width: 101 });
        doc.text(a.type.replace(/_/g,' '),       MARGIN + 109,   y + 6, { width: 106 });
        doc.font('Helvetica-Bold').fontSize(9).fillColor(sevColor)
           .text(a.severity,                     MARGIN + 219,   y + 6, { width: 66 });
        doc.font('Helvetica').fontSize(8).fillColor(COLORS.text)
           .text(a.message,                      MARGIN + 289,   y + 6, { width: 191 });
        const stColor2 = a.is_resolved ? COLORS.primary : COLORS.warning;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(stColor2)
           .text(a.is_resolved ? 'Resolved' : 'Active', MARGIN + 484, y + 6, { width: 61 });
        y += rowH;
      });
    }

    // ─── FOOTER ON ALL PAGES ───────────────────────────
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);
      if (i === 0) continue; // skip cover
      const footerY = PAGE_H - 35;
      doc.save().moveTo(MARGIN, footerY).lineTo(PAGE_W - MARGIN, footerY)
         .strokeColor(COLORS.border).lineWidth(0.5).stroke().restore();
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
         .text('FCHAN — Farm Intelligence Platform', MARGIN, footerY + 6, { width: COL_W / 2 })
         .text(`Page ${i + 1} of ${pages.count}  |  ${fmt(generated_at)}`,
               MARGIN + COL_W / 2, footerY + 6, { width: COL_W / 2, align: 'right' });
    }

    doc.end();

  } catch (err) {
    reject(err);
  }
});

module.exports = { generatePDF };
