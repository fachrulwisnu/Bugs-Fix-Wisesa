/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { BugRecord } from '../types';

export const exportComprehensiveExcel = async (filteredData: BugRecord[], currentFilter: string = 'All') => {
  try {
    if (!filteredData || filteredData.length === 0) {
      alert("Data tidak ditemukan untuk diekspor.");
      return;
    }

    console.log(`Memulai ekspor dengan mode filter: ${currentFilter} (Menggunakan Terminologi FSD Baru)`);
    const workbook = new ExcelJS.Workbook();
    
    // Konfigurasi Palet Warna Premium ARGB
    const COLOR_NAVY = 'FF2B3674';
    const COLOR_WHITE = 'FFFFFFFF';
    const COLOR_ZEBRA = 'FFF8FAFC';
    const COLOR_BORDER = 'FFD1D5DB';
    
    const BG_RED = 'FFFEE2E2';
    const TEXT_RED = 'FF991B1B';
    const BG_GREEN = 'FFD1FAE5';

    const thinBorder = { 
      top: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: COLOR_BORDER } }, 
      left: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: COLOR_BORDER } }, 
      bottom: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: COLOR_BORDER } }, 
      right: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: COLOR_BORDER } } 
    };
    const alignCenter = { horizontal: 'center' as const, vertical: 'middle' as const };
    const alignLeftWrap = { horizontal: 'left' as const, vertical: 'middle' as const, wrapText: true };

    // Helper fungsi untuk generate label Rincian FSD Internasional
    const generateFsdDetailString = (fsdYa: number, fsdTidakBug: number, fsdTidakCr: number) => {
      if (currentFilter === 'Bug') {
        return `Include FSD: ${fsdYa}, Not Include FSD Bug: ${fsdTidakBug}`;
      } else if (currentFilter === 'CR') {
        return `Include FSD: ${fsdYa}, Not Include FSD CR: ${fsdTidakCr}`;
      } else {
        return `Include FSD: ${fsdYa} | Not Include FSD Bug: ${fsdTidakBug} | Not Include FSD CR: ${fsdTidakCr}`;
      }
    };

    // ==========================================
    // SHEET 1: PROJECT SUMMARY
    // ==========================================
    const ws1 = workbook.addWorksheet('Project Summary');
    ws1.mergeCells('A1:J1');
    ws1.getCell('A1').value = 'PROJECT SUMMARY REPORT';
    ws1.getCell('A1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLOR_NAVY } };
    ws1.getRow(1).height = 30; 
    ws1.getRow(2).height = 15;

    // Header Sheet 1
    ws1.getRow(3).values = ['No', 'Project Name', 'Total Bug', 'Total CR', 'Severity (Bug)', 'Severity (CR)', 'Status FSD', 'Rincian FSD Compliance', 'Start Date', 'Finish Date'];
    ws1.getRow(3).height = 25;
    ws1.getRow(3).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR_WHITE } };
      cell.alignment = alignCenter; 
      cell.border = thinBorder;
    });

    const projectMap: Record<string, any> = {};
    filteredData.forEach((bug) => {
      let projName = bug.projectName ? bug.projectName.trim() : `Unmapped Project (${bug.sectionName || 'Unknown'})`;
      const typeLower = (bug.type || '').toLowerCase();
      const isCr = typeLower.includes('cr') || typeLower.includes('change') || typeLower.includes('addit') || typeLower.includes('requst');
      const isBug = !isCr;
      const fsdVal = (bug.includedInFsd || '').trim().toLowerCase();
      
      const sevKey = bug.severity ? bug.severity.trim() : 'Minor';
      const formattedSev = sevKey.charAt(0).toUpperCase() + sevKey.slice(1).toLowerCase();

      if (!projectMap[projName]) {
        projectMap[projName] = { name: projName, bugs: 0, crs: 0, severitiesBug: {} as Record<string, number>, severitiesCr: {} as Record<string, number>, fsdYa: 0, fsdTidakBug: 0, fsdTidakCr: 0, startDates: [] as Date[], finishDates: [] as Date[] };
      }
      
      if (isBug) {
        projectMap[projName].bugs += 1;
        projectMap[projName].severitiesBug[formattedSev] = (projectMap[projName].severitiesBug[formattedSev] || 0) + 1;
      }
      if (isCr) {
        projectMap[projName].crs += 1;
        projectMap[projName].severitiesCr[formattedSev] = (projectMap[projName].severitiesCr[formattedSev] || 0) + 1;
      }

      if (fsdVal === 'ya') { 
        projectMap[projName].fsdYa += 1; 
      } else { 
        if (isBug) projectMap[projName].fsdTidakBug += 1; 
        if (isCr) projectMap[projName].fsdTidakCr += 1; 
      }

      if (bug.startDate && bug.startDate !== '—') projectMap[projName].startDates.push(new Date(bug.startDate));
      if (bug.finishAt && bug.finishAt !== '—') projectMap[projName].finishDates.push(new Date(bug.finishAt));
    });

    let rowIdx1 = 4;
    Object.values(projectMap).forEach((proj, idx) => {
      const minStart = proj.startDates.length > 0 && !isNaN(Math.min(...proj.startDates)) ? new Date(Math.min(...proj.startDates)).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
      const maxFinish = proj.finishDates.length > 0 && !isNaN(Math.max(...proj.finishDates)) ? new Date(Math.max(...proj.finishDates)).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
      
      // Menggunakan penamaan baru hasil konversi
      const statusFsd = proj.fsdYa > 0 ? 'Include FSD' : 'Not Include FSD';
      const rincianFsdLabel = generateFsdDetailString(proj.fsdYa, proj.fsdTidakBug, proj.fsdTidakCr);
      
      const sevBugStr = Object.keys(proj.severitiesBug).length > 0 ? Object.entries(proj.severitiesBug).map(([k, v]) => `${k}: ${v}`).join(', ') : '-';
      const sevCrStr = Object.keys(proj.severitiesCr).length > 0 ? Object.entries(proj.severitiesCr).map(([k, v]) => `${k}: ${v}`).join(', ') : '-';

      const row = ws1.addRow([idx + 1, proj.name, proj.bugs, proj.crs, sevBugStr, sevCrStr, statusFsd, rincianFsdLabel, minStart, maxFinish]);
      row.height = 24;
      row.eachCell((cell, colNumber) => {
        cell.border = thinBorder; 
        cell.font = { name: 'Calibri', size: 11 };
        if (colNumber === 2 || colNumber === 5 || colNumber === 6 || colNumber === 8) {
            cell.alignment = alignLeftWrap;
        } else {
            cell.alignment = alignCenter;
        }
        if (rowIdx1 % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA } };
      });
      rowIdx1++;
    });

    // ==========================================
    // SHEET 2: DEVELOPER PERFORMANCE
    // ==========================================
    const ws2 = workbook.addWorksheet('Developer Performance');
    ws2.mergeCells('A1:F1');
    ws2.getCell('A1').value = 'DEVELOPER PERFORMANCE REPORT';
    ws2.getCell('A1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLOR_NAVY } };
    ws2.getRow(1).height = 30; 
    ws2.getRow(2).height = 15;

    const rowListHeaders = ['Developer Name', 'Project Name', 'PIC Name', 'Task Type', 'Severity', 'Score'];
    ws2.addRow(rowListHeaders);
    ws2.getRow(3).height = 25;
    ws2.getRow(3).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR_WHITE } };
      cell.alignment = alignCenter; 
      cell.border = thinBorder;
    });

    const devFlatList: any[] = []; 
    const devTotalScores: Record<string, number> = {};
    filteredData.forEach((bug) => {
      const dev = bug.devName ? bug.devName.trim() : 'Unassigned';
      const score = Number(bug.bugScore) || 0;
      devTotalScores[dev] = (devTotalScores[dev] || 0) + score;
      devFlatList.push({ devName: dev, projectName: bug.projectName ? bug.projectName.trim() : `Unmapped Project (${bug.sectionName || 'Unknown'})`, picName: bug.picName || '—', type: bug.type || 'Bug', severity: bug.severity || 'Minor', score: score });
    });

    devFlatList.sort((a, b) => a.devName.localeCompare(b.devName) || a.projectName.localeCompare(b.projectName) || a.picName.localeCompare(b.picName));

    let startRow2 = 4;
    devFlatList.forEach((item) => {
      const row = ws2.addRow([item.devName, item.projectName, item.picName, item.type, item.severity, item.score]);
      row.height = 20;
      row.eachCell((cell) => { cell.border = thinBorder; cell.font = { name: 'Calibri', size: 11 }; cell.alignment = alignCenter; });
      ws2.getCell(`B${ws2.lastRow!.number}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    });

    let endRow2 = ws2.lastRow ? ws2.lastRow.number : 4;
    let mStartDev = startRow2, mStartProj = startRow2, mStartPic = startRow2;
    for (let r = startRow2; r <= endRow2; r++) {
      const currDev = ws2.getCell(`A${r}`).value; const nextDev = r < endRow2 ? ws2.getCell(`A${r+1}`).value : null;
      const currProj = ws2.getCell(`B${r}`).value; const nextProj = r < endRow2 ? ws2.getCell(`B${r+1}`).value : null;
      const currPic = ws2.getCell(`C${r}`).value; const nextPic = r < endRow2 ? ws2.getCell(`C${r+1}`).value : null;

      if (currDev !== nextDev) {
        if (r > mStartDev) ws2.mergeCells(mStartDev, 1, r, 1);
        const totalDevScore = devTotalScores[currDev as string] || 0;
        const targetScoreCell = ws2.getCell(`A${mStartDev}`);
        targetScoreCell.value = `${currDev}\n(Total: ${totalDevScore} Pts)`;
        targetScoreCell.font = { name: 'Calibri', size: 11, bold: true };
        targetScoreCell.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
        if (totalDevScore > 50) targetScoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_RED } };
        else if (totalDevScore < 20) targetScoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_GREEN } };
        mStartDev = r + 1;
      }
      if (currProj !== nextProj || currDev !== nextDev) {
        if (r > mStartProj) ws2.mergeCells(mStartProj, 2, r, 2);
        ws2.getCell(`B${mStartProj}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        mStartProj = r + 1;
      }
      if (currPic !== nextPic || currProj !== nextProj || currDev !== nextDev) {
        if (r > mStartPic) ws2.mergeCells(mStartPic, 3, r, 3);
        ws2.getCell(`C${mStartPic}`).alignment = alignCenter; mStartPic = r + 1;
      }
    }

    // ==========================================
    // SHEET 3: REPORT SCORE
    // ==========================================
    const ws3 = workbook.addWorksheet('Report Score');
    ws3.mergeCells('A1:G1');
    ws3.getCell('A1').value = 'SUMMARY SCORE REPORT';
    ws3.getCell('A1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLOR_NAVY } };
    ws3.getRow(1).height = 30;

    let badDevName = '—'; let maxGlobalScore = 0;
    Object.entries(devTotalScores).forEach(([name, score]) => {
      if (name !== 'Unassigned' && score > maxGlobalScore) { maxGlobalScore = score; badDevName = name; }
    });

    ws3.mergeCells('A3:G3');
    const kpiCell = ws3.getCell('A3');
    kpiCell.value = `Highest Rank Developer (Bad Developer) : ${badDevName} , Score : ${maxGlobalScore}`;
    kpiCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: TEXT_RED } };
    kpiCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BG_RED } };
    kpiCell.border = thinBorder; 
    kpiCell.alignment = alignLeftWrap;
    ws3.getRow(3).height = 24;

    const periodGroups: Record<string, any[]> = {};
    filteredData.forEach((bug) => {
      const pName = bug.periode ? bug.periode.trim() : 'Tanpa Periode';
      if (!periodGroups[pName]) periodGroups[pName] = [];
      periodGroups[pName].push(bug);
    });

    let s3RowIdx = 5;
    Object.entries(periodGroups).forEach(([bulan, items]) => {
      const localDevScore: Record<string, number> = {};
      items.forEach(b => {
        const d = b.devName ? b.devName.trim() : 'Unassigned';
        localDevScore[d] = (localDevScore[d] || 0) + (Number(b.bugScore) || 0);
      });
      const summaryDevString = Object.entries(localDevScore).map(([dName, dScore]) => `${dName} (${dScore} Pts)`).join(' | ');

      ws3.mergeCells(`A${s3RowIdx}:G${s3RowIdx}`);
      ws3.getCell(`A${s3RowIdx}`).value = `Periode : ${bulan}`;
      ws3.getCell(`A${s3RowIdx}`).font = { name: 'Calibri', size: 12, bold: true, color: { argb: COLOR_NAVY } };
      ws3.getRow(s3RowIdx).height = 22; s3RowIdx++;

      ws3.mergeCells(`A${s3RowIdx}:G${s3RowIdx}`);
      ws3.getCell(`A${s3RowIdx}`).value = `Summary Score Developer: ${summaryDevString}`;
      ws3.getCell(`A${s3RowIdx}`).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
      ws3.getRow(s3RowIdx).height = 20; s3RowIdx++;

      const subHeaders = ['Project Name', 'PIC Name', 'Developer Name', 'List Task', 'Type Bug / CR', 'Severity', 'Score'];
      ws3.getRow(s3RowIdx).values = subHeaders;
      ws3.getRow(s3RowIdx).height = 22;
      ws3.getRow(s3RowIdx).eachCell((c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
        c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_WHITE } };
        c.alignment = alignCenter; c.border = thinBorder;
      });
      
      let startTableBlock = s3RowIdx + 1; s3RowIdx++;
      items.sort((a, b) => (a.projectName || '').localeCompare(b.projectName || '') || (a.picName || '').localeCompare(b.picName || ''));

      items.forEach((item, innerIdx) => {
        const row = ws3.addRow([
          item.projectName ? item.projectName.trim() : `Unmapped Project (${item.sectionName || 'Unknown'})`,
          item.picName || '—', item.devName || 'Unassigned', item.remarks || '—', item.type || 'Bug', item.severity || 'Minor', Number(item.bugScore) || 0
        ]);
        row.height = 24; 
        row.eachCell((cell, colNum) => {
          cell.border = thinBorder; cell.font = { name: 'Calibri', size: 10 };
          cell.alignment = (colNum === 1 || colNum === 4) ? alignLeftWrap : alignCenter;
          if (innerIdx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA } };
        });
        s3RowIdx++;
      });

      let endTableBlock = s3RowIdx - 1;
      let mStartP3 = startTableBlock, mStartPic3 = startTableBlock;

      for (let i = startTableBlock; i <= endTableBlock; i++) {
        const cProj = ws3.getCell(`A${i}`).value; const nProj = i < endTableBlock ? ws3.getCell(`A${i+1}`).value : null;
        const cPic = ws3.getCell(`B${i}`).value; const nPic = i < endTableBlock ? ws3.getCell(`B${i+1}`).value : null;

        if (cProj !== nProj) {
          if (i > mStartP3) ws3.mergeCells(mStartP3, 1, i, 1);
          ws3.getCell(`A${mStartP3}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          mStartP3 = i + 1;
        }
        if (cPic !== nPic || cProj !== nProj) {
          if (i > mStartPic3) ws3.mergeCells(mStartPic3, 2, i, 2);
          ws3.getCell(`B${mStartPic3}`).alignment = alignCenter;
          mStartPic3 = i + 1;
        }
      }
      ws3.addRow([]); s3RowIdx++;
    });

    // ==========================================
    // AUTO-FIT COLUMN WIDTHS (ALL SHEETS)
    // ==========================================
    [ws1, ws2, ws3].forEach((ws) => {
      ws.columns!.forEach((column) => {
        let maxLen = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const rowNum = typeof cell.row === "number" ? cell.row : (cell.row as any)?.number || 0;
          if (rowNum > 2 && cell.value) {
            const valLen = cell.value.toString().length;
            if (valLen > maxLen) maxLen = valLen;
          }
        });
        if (ws.name === 'Report Score' && column.number === 4) { column.width = 45; } 
        else if (ws.name === 'Project Summary' && (column.number === 2 || column.number === 8)) { column.width = 40; } // Padding lebar aman untuk Project Name & Rincian FSD baru
        else if (ws.name === 'Project Summary' && (column.number === 5 || column.number === 6)) { column.width = 22; } 
        else { column.width = maxLen < 12 ? 12 : Math.min(maxLen + 4, 50); }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Wisesa_Bug_Tracker_Report_Final_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error("LOG ERROR EXPORT:", error);
    alert("Gagal memproses data. Cek Console.");
  }
};
