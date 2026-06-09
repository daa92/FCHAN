const PDFDocument = require('pdfkit');
const db          = require('../config/db');
const Plant       = require('../models/Plant');
const Sensor      = require('../models/Sensor');
const Reading     = require('../models/Reading');
const Alert       = require('../models/Alert');

// ─── HELPERS ─────────────────────────────────────────
const fmt = d => d
  ? new Date(d).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})
  : 'N/A';

const healthLabel = s =>
  s >= 85 ? 'Excellent' : s >= 70 ? 'Good' : s >= 50 ? 'Fair' : s >= 30 ? 'Poor' : 'Critical';

// RGB arrays for PDFKit fillColor([r,g,b])
const C = {
  green:    [39,174,96],
  darkBlue: [26,82,118],
  blue:     [52,152,219],
  orange:   [243,156,18],
  red:      [231,76,60],
  text:     [44,62,80],
  muted:    [127,140,141],
  light:    [248,249,250],
  border:   [222,226,230],
  white:    [255,255,255],
  black:    [0,0,0],
  rowAlt:   [234,250,241],
  coverBg:  [26,82,118],
  coverFg:  [39,174,96],
  warn:     [255,243,205],
  warnText: [133,100,4],
};

const scoreColor = s =>
  s >= 85 ? C.green : s >= 70 ? C.green : s >= 50 ? C.orange : s >= 30 ? C.orange : C.red;

// ─── CONSTANTS ────────────────────────────────────────
const W      = 595.28;
const H      = 841.89;
const M      = 45;          // margin
const CW     = W - M * 2;  // content width

// ─── DRAW PRIMITIVES ──────────────────────────────────
const fill = (doc, color) => doc.fillColor(color);

function rect(doc, x, y, w, h, color, r = 0) {
  doc.save().roundedRect(x, y, w, h, r).fillColor(color).fill().restore();
}

function hline(doc, y, x1 = M, x2 = W - M, color = C.border) {
  doc.save().moveTo(x1,y).lineTo(x2,y).strokeColor(color).lineWidth(0.5).stroke().restore();
}

function sectionBand(doc, title, y) {
  rect(doc, M, y, CW, 28, C.darkBlue, 5);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.white)
     .text(title, M + 12, y + 8, { width: CW - 24 });
  return y + 36;
}

function subHead(doc, title, y) {
  rect(doc, M, y, CW, 22, C.rowAlt, 3);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.darkBlue)
     .text(title, M + 8, y + 6, { width: CW - 16 });
  return y + 28;
}

function tableHeader(doc, cols, y) {
  rect(doc, M, y, CW, 20, C.text);
  cols.forEach(c => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
       .text(c.label, c.x + 3, y + 6, { width: c.w - 6, ellipsis: true });
  });
  return y + 20;
}

function tableRow(doc, cols, vals, y, even) {
  if (even) rect(doc, M, y, CW, 20, C.light);
  cols.forEach((c, i) => {
    const color = c.color ? c.color(vals[i]) : C.text;
    const bold  = c.bold  ? c.bold(vals[i])  : false;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
       .fontSize(9).fillColor(color)
       .text(String(vals[i] ?? 'N/A'), c.x + 3, y + 5, { width: c.w - 6, ellipsis: true });
  });
  return y + 20;
}

function needsPage(doc, y, needed = 80) {
  if (y + needed > H - M - 30) { doc.addPage(); return M + 5; }
  return y;
}

function progressBar(doc, x, y, w, h, pct, color) {
  rect(doc, x, y, w, h, C.border, h / 2);
  if (pct > 0) rect(doc, x, y, Math.max(h, w * pct / 100), h, color, h / 2);
}

// ─── DATA COLLECTION ──────────────────────────────────
async function gatherData(farmId, userId) {
  const [farms] = await db.execute(
    `SELECT f.* FROM farms f
     LEFT JOIN collaborators c ON c.farm_id=f.id AND c.user_id=? AND c.status='accepted'
     WHERE f.id=? AND (f.user_id=? OR c.user_id IS NOT NULL)`,
    [userId, farmId, userId]
  );
  if (!farms[0]) throw new Error('Farm not found.');

  const [zones] = await db.execute('SELECT * FROM zones WHERE farm_id=?', [farmId]);
  const zonesData = [];

  for (const zone of zones) {
    const plants  = await Plant.findByZoneId(zone.id);
    const sensors = await Sensor.findByZoneId(zone.id);

    const sensorsData = [];
    for (const s of sensors) {
      const latest = await Reading.findLatest(s.id);
      const stats  = await Reading.getAverage(s.id, 24);
      sensorsData.push({ ...s, latest, stats });
    }

    const plantsData = [];
    for (const p of plants) {
      let forecast = null;
      try { const { getForecast } = require('./forecast'); forecast = await getForecast(p, sensors); }
      catch { forecast = null; }
      plantsData.push({ ...p, forecast });
    }

    zonesData.push({ ...zone, plants: plantsData, sensors: sensorsData });
  }

  const alerts = await Alert.findByFarmId(farmId, 20);
  const [users] = await db.execute('SELECT name,email FROM users WHERE id=?', [userId]);
  return { farm: farms[0], zones: zonesData, alerts, user: users[0], generated_at: new Date() };
}

// ─── GENERATE ─────────────────────────────────────────
const generatePDF = (farmId, userId) => new Promise(async (resolve, reject) => {
  try {
    const data = await gatherData(farmId, userId);
    const { farm, zones, alerts, user, generated_at } = data;

    const totalPlants  = zones.reduce((a, z) => a + z.plants.length, 0);
    const totalSensors = zones.reduce((a, z) => a + z.sensors.length, 0);
    const loc = [farm.city, farm.country].filter(Boolean).join(', ') || 'N/A';

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: M, bottom: M + 20, left: M, right: M },
      bufferPages: true,
      info: { Title: `FCHAN Report - ${farm.name}`, Author: user.name }
    });

    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  ()  => resolve({ pdf: Buffer.concat(chunks), farmName: farm.name }));
    doc.on('error', reject);

    // ══ COVER ════════════════════════════════════════
    // Background
    rect(doc, 0, 0, W, H * 0.6, C.darkBlue);
    rect(doc, 0, H * 0.6, W, H * 0.4, C.coverFg);

    // Accent stripe
    rect(doc, 0, H * 0.6 - 6, W, 12, [255,255,255]);

    // Brand
    doc.font('Helvetica-Bold').fontSize(56).fillColor(C.white)
       .text('FCHAN', 0, 130, { align: 'center' });
    doc.font('Helvetica').fontSize(16).fillColor([200,230,210])
       .text('Farm Intelligence Platform', 0, 198, { align: 'center' });

    // Divider line
    doc.save()
       .moveTo(W/2 - 50, 230).lineTo(W/2 + 50, 230)
       .strokeColor([255,255,255]).opacity(0.4).lineWidth(2).stroke()
       .restore();

    // Info card
    const cardX = M + 40, cardY = 255, cardW = CW - 80, cardH = 170;
    rect(doc, cardX, cardY, cardW, cardH, [255,255,255,0.12], 10);
    doc.save().roundedRect(cardX, cardY, cardW, cardH, 10)
       .lineWidth(1).strokeColor([255,255,255]).opacity(0.25).stroke().restore();

    doc.font('Helvetica-Bold').fontSize(18).fillColor(C.white)
       .text(farm.name, cardX, cardY + 18, { align: 'center', width: cardW });

    const infoLines = [
      `Location: ${loc}`,
      `Owner: ${user.name}`,
      `Email: ${user.email}`,
      `Generated: ${fmt(generated_at)}`,
    ];
    infoLines.forEach((line, i) => {
      doc.font('Helvetica').fontSize(11).fillColor([220,240,225])
         .text(line, cardX, cardY + 50 + i * 24, { align: 'center', width: cardW });
    });

    // Stats boxes at bottom (on green section)
    const statY = H * 0.62 + 30;
    const stats = [
      { label: 'ZONES',   v: zones.length  },
      { label: 'PLANTS',  v: totalPlants   },
      { label: 'SENSORS', v: totalSensors  },
      { label: 'ALERTS',  v: alerts.length },
    ];
    const bW = (CW - 30) / 4;
    stats.forEach((s, i) => {
      const bx = M + i * (bW + 10);
      rect(doc, bx, statY, bW, 72, [255,255,255,0.2], 8);
      doc.font('Helvetica-Bold').fontSize(30).fillColor(C.white)
         .text(String(s.v), bx, statY + 8, { align: 'center', width: bW });
      doc.font('Helvetica').fontSize(9).fillColor([230,255,240])
         .text(s.label, bx, statY + 46, { align: 'center', width: bW });
    });

    // Cover footer text
    doc.font('Helvetica').fontSize(10).fillColor([200,230,200])
       .text('Complete Farm Report  —  Confidential', 0, H - 55, { align: 'center' });

    // ══ PAGE 2: OVERVIEW ════════════════════════════
    doc.addPage();
    let y = M;

    y = sectionBand(doc, 'Farm Overview', y); y += 6;

    const overviewRows = [
      ['Farm Name',     farm.name],
      ['Location',      loc],
      ['Owner',         user.name],
      ['Email',         user.email],
      ['Total Zones',   String(zones.length)],
      ['Total Plants',  String(totalPlants)],
      ['Total Sensors', String(totalSensors)],
      ['Report Date',   fmt(generated_at)],
    ];
    overviewRows.forEach(([label, value], i) => {
      if (i % 2 === 0) rect(doc, M, y, CW, 22, C.light);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(C.muted)
         .text(label, M + 8, y + 6, { width: 150 });
      doc.font('Helvetica').fontSize(10).fillColor(C.text)
         .text(value, M + 162, y + 6, { width: CW - 170 });
      y += 22;
    });
    y += 16;

    // ══ ZONES ════════════════════════════════════════
    for (const zone of zones) {
      y = needsPage(doc, y, 130);
      y = sectionBand(doc, `Zone: ${zone.name}${zone.area_sqm ? '  ('+parseFloat(zone.area_sqm).toFixed(0)+' m2)' : ''}`, y);

      if (zone.description) {
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(C.muted)
           .text(zone.description, M, y, { width: CW });
        y += 18;
      }

      // ── Sensors table ──
      y = needsPage(doc, y, 60);
      y = subHead(doc, 'Sensors & Readings (Last 24h)', y);

      const sCols = [
        { label: 'Sensor Name', x: M,       w: 130 },
        { label: 'Type',        x: M + 130,  w: 95  },
        { label: 'Latest',      x: M + 225,  w: 75  },
        { label: 'Avg (24h)',   x: M + 300,  w: 75  },
        { label: 'Min',         x: M + 375,  w: 55  },
        { label: 'Max',         x: M + 430,  w: 55  },
        { label: 'Status',      x: M + 485,  w: 60  },
      ];
      y = tableHeader(doc, sCols, y);

      if (!zone.sensors.length) {
        rect(doc, M, y, CW, 22, C.light);
        doc.font('Helvetica-Oblique').fontSize(9).fillColor(C.muted)
           .text('No sensors in this zone', M, y + 6, { align: 'center', width: CW });
        y += 22;
      } else {
        zone.sensors.forEach((s, i) => {
          y = needsPage(doc, y, 22);
          const latest = s.latest ? `${parseFloat(s.latest.value).toFixed(1)} ${s.unit||''}` : 'No data';
          const avg    = s.stats?.average != null ? `${parseFloat(s.stats.average).toFixed(1)} ${s.unit||''}` : 'N/A';
          const min    = s.stats?.minimum != null ? parseFloat(s.stats.minimum).toFixed(1) : 'N/A';
          const max    = s.stats?.maximum != null ? parseFloat(s.stats.maximum).toFixed(1) : 'N/A';
          if (i % 2 === 0) rect(doc, M, y, CW, 20, C.light);
          doc.font('Helvetica').fontSize(9).fillColor(C.text);
          doc.text(s.name,                    M + 3,   y + 5, { width: 127, ellipsis: true });
          doc.text(s.type.replace(/_/g,' '),  M + 133, y + 5, { width: 92  });
          doc.text(latest,                    M + 228, y + 5, { width: 72  });
          doc.text(avg,                       M + 303, y + 5, { width: 72  });
          doc.text(min,                       M + 378, y + 5, { width: 52  });
          doc.text(max,                       M + 433, y + 5, { width: 52  });
          doc.font('Helvetica-Bold').fontSize(9)
             .fillColor(s.is_active ? C.green : C.red)
             .text(s.is_active ? 'Active' : 'Inactive', M + 488, y + 5, { width: 57 });
          y += 20;
        });
      }
      y += 14;

      // ── Plants ──
      y = needsPage(doc, y, 60);
      y = subHead(doc, 'Plants', y);

      if (!zone.plants.length) {
        rect(doc, M, y, CW, 22, C.light);
        doc.font('Helvetica-Oblique').fontSize(9).fillColor(C.muted)
           .text('No plants in this zone', M, y + 6, { align: 'center', width: CW });
        y += 22;
      } else {
        for (const plant of zone.plants) {
          y = needsPage(doc, y, 110);

          // Plant header bar
          rect(doc, M, y, CW, 26, C.rowAlt, 4);
          rect(doc, M, y, 5, 26, C.green, 2);
          doc.font('Helvetica-Bold').fontSize(11).fillColor(C.darkBlue)
             .text(plant.name, M + 12, y + 7, { width: CW * 0.55 });
          doc.font('Helvetica').fontSize(9).fillColor(C.muted)
             .text(
               `Stage: ${plant.growth_stage||'N/A'}   Qty: ${plant.quantity||'N/A'}   Planted: ${fmt(plant.planted_at)}`,
               M + 12, y + 21 - 9, { width: CW - 20 }
             );
          y += 30;

          const f = plant.forecast;
          if (f && !f.error) {
            const hs  = f.health_score  || 0;
            const gp  = f.growth_percentage || 0;
            const hc  = scoreColor(hs);

            // Progress bar row
            doc.font('Helvetica').fontSize(9).fillColor(C.muted)
               .text(`Growth Progress: ${gp}%`, M, y);
            doc.font('Helvetica-Bold').fontSize(9).fillColor(hc)
               .text(`Health: ${hs}/100 — ${healthLabel(hs)}`, M + CW - 150, y, { width: 150, align: 'right' });
            y += 14;
            progressBar(doc, M, y, CW, 10, gp, hc);
            y += 18;

            // Stats grid (2x2)
            const fItems = [
              ['GDD Accumulated', f.accumulated_gdd ?? 'N/A'],
              ['GDD Needed',      f.total_gdd_needed ?? 'N/A'],
              ['Days Remaining',  f.days_remaining ?? 'N/A'],
              ['Est. Harvest',    fmt(f.estimated_harvest_date)],
            ];
            const gW = (CW - 8) / 2;
            fItems.forEach((fi, idx) => {
              const fx = M + (idx % 2) * (gW + 8);
              const fy = y + Math.floor(idx / 2) * 24;
              rect(doc, fx, fy, gW, 22, C.light, 3);
              doc.font('Helvetica').fontSize(8).fillColor(C.muted)
                 .text(fi[0], fx + 6, fy + 4, { width: gW / 2 });
              doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text)
                 .text(String(fi[1]), fx + gW / 2, fy + 4, { width: gW / 2 - 6, align: 'right' });
            });
            y += 56;

            // Recommendations
            if (f.recommendations?.length) {
              y = needsPage(doc, y, 24 + f.recommendations.length * 16);
              rect(doc, M, y, CW, 18 + f.recommendations.length * 16, C.warn, 4);
              doc.font('Helvetica-Bold').fontSize(9).fillColor(C.warnText)
                 .text('Recommendations:', M + 8, y + 5);
              f.recommendations.forEach((r, ri) => {
                doc.font('Helvetica').fontSize(9).fillColor(C.warnText)
                   .text(`- ${r}`, M + 8, y + 18 + ri * 16, { width: CW - 16 });
              });
              y += 18 + f.recommendations.length * 16;
            }
          } else {
            rect(doc, M, y, CW, 22, C.warn, 4);
            doc.font('Helvetica-Oblique').fontSize(9).fillColor(C.warnText)
               .text(f?.error || 'Forecast unavailable', M + 8, y + 6, { width: CW - 16 });
            y += 22;
          }
          hline(doc, y + 6);
          y += 16;
        }
      }
      y += 10;
    }

    // ══ ALERTS ══════════════════════════════════════
    y = needsPage(doc, y, 160);
    y = sectionBand(doc, 'Recent Alerts', y); y += 8;

    // Summary boxes
    const aCrit = alerts.filter(a => a.severity === 'critical').length;
    const aWarn = alerts.filter(a => a.severity === 'warning').length;
    const aInfo = alerts.filter(a => a.severity === 'info').length;
    const abW   = (CW - 20) / 3;
    [
      { label: 'Critical', count: aCrit, color: C.red    },
      { label: 'Warnings', count: aWarn, color: C.orange },
      { label: 'Info',     count: aInfo, color: C.blue   },
    ].forEach((ab, i) => {
      const abx = M + i * (abW + 10);
      rect(doc, abx, y, abW, 52, C.light, 6);
      rect(doc, abx, y, abW, 4, ab.color, 6);
      doc.font('Helvetica-Bold').fontSize(24).fillColor(ab.color)
         .text(String(ab.count), abx, y + 10, { align: 'center', width: abW });
      doc.font('Helvetica').fontSize(10).fillColor(C.muted)
         .text(ab.label, abx, y + 36, { align: 'center', width: abW });
    });
    y += 62;

    // Alerts table
    const alCols = [
      { label: 'Date',     x: M,       w: 100 },
      { label: 'Type',     x: M + 100, w: 105 },
      { label: 'Severity', x: M + 205, w: 68  },
      { label: 'Message',  x: M + 273, w: 200 },
      { label: 'Status',   x: M + 473, w: 72  },
    ];
    y = tableHeader(doc, alCols, y);

    if (!alerts.length) {
      rect(doc, M, y, CW, 22, C.light);
      doc.font('Helvetica-Oblique').fontSize(9).fillColor(C.muted)
         .text('No alerts recorded', M, y + 6, { align: 'center', width: CW });
      y += 22;
    } else {
      alerts.forEach((a, i) => {
        y = needsPage(doc, y, 22);
        if (i % 2 === 0) rect(doc, M, y, CW, 20, C.light);
        const sc = a.severity === 'critical' ? C.red : a.severity === 'warning' ? C.orange : C.blue;
        doc.font('Helvetica').fontSize(8.5).fillColor(C.text)
           .text(fmt(a.created_at),           M + 3,   y + 5, { width: 97  })
           .text(a.type.replace(/_/g,' '),    M + 103, y + 5, { width: 102 });
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(sc)
           .text(a.severity,                  M + 208, y + 5, { width: 65  });
        doc.font('Helvetica').fontSize(8.5).fillColor(C.text)
           .text(a.message,                   M + 276, y + 5, { width: 197, ellipsis: true });
        doc.font('Helvetica-Bold').fontSize(8.5)
           .fillColor(a.is_resolved ? C.green : C.orange)
           .text(a.is_resolved ? 'Resolved':'Active', M + 476, y + 5, { width: 69 });
        y += 20;
      });
    }

    // ══ FOOTER ON ALL PAGES EXCEPT COVER ════════════
    doc.flushPages();
    const range = doc.bufferedPageRange();
    for (let i = 1; i < range.count; i++) {         // i=0 is cover, skip it
      doc.switchToPage(range.start + i);
      const fy = H - M + 2;
      hline(doc, fy - 4);
      doc.font('Helvetica').fontSize(8).fillColor(C.muted)
         .text('FCHAN — Farm Intelligence Platform', M, fy, { width: CW / 2 })
         .text(`Page ${i} of ${range.count - 1}   |   ${fmt(generated_at)}`,
               M + CW / 2, fy, { width: CW / 2, align: 'right' });
    }

    doc.end();
  } catch (err) {
    reject(err);
  }
});

module.exports = { generatePDF };
