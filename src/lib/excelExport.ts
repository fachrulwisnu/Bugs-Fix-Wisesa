import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { BugRecord } from "../types";

export const exportComprehensiveExcel = async (bugsData: BugRecord[]) => {
  try {
    if (!bugsData || bugsData.length === 0) {
      alert("Data tidak ditemukan untuk diekspor.");
      return;
    }

    console.log("Memulai proses ekspor data (Tanpa Filter UI - Menggabungkan Bug & CR)...");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Wisesa Governance System";
    workbook.lastModifiedBy = "Wisesa Governance System";
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Konfigurasi Palet Warna Premium ARGB
    const COLOR_NAVY = "FF2B3674";
    const COLOR_WHITE = "FFFFFFFF";
    const COLOR_ZEBRA = "FFF8FAFC";
    const COLOR_BORDER = "FFD1D5DB";
    const COLOR_LAVENDER = "FFEBF0FF";
    const COLOR_LIGHT_GRAY = "FFF1F5F9";
    
    const BG_RED = "FFFEE2E2";
    const TEXT_RED = "FF991B1B";
    const BG_GREEN = "FFD1FAE5";
    const TEXT_GREEN = "FF065F46";

    const thinBorder: ExcelJS.Border = {
      style: "thin",
      color: { argb: COLOR_BORDER }
    };

    const borderStyle: Partial<ExcelJS.Borders> = {
      top: thinBorder,
      left: thinBorder,
      bottom: thinBorder,
      right: thinBorder
    };

    const alignCenter: Partial<ExcelJS.Alignment> = { horizontal: "center", vertical: "middle" };
    const alignLeft: Partial<ExcelJS.Alignment> = { horizontal: "left", vertical: "middle" };

    // ==========================================
    // SHEET 1: PROJECT SUMMARY
    // ==========================================
    const ws1 = workbook.addWorksheet("Project Summary", {
      views: [{ showGridLines: true }]
    });
    ws1.mergeCells("A1:H1");
    const titleCell1 = ws1.getCell("A1");
    titleCell1.value = "PROJECT SUMMARY REPORT";
    titleCell1.font = { name: "Calibri", size: 16, bold: true, color: { argb: COLOR_NAVY } };
    titleCell1.alignment = alignLeft;
    ws1.getRow(1).height = 30;
    ws1.getRow(2).height = 15;

    const headers1 = ["No", "Project Name", "Total Bug", "Total CR", "Status FSD", "Rincian FSD (Ya/Tidak)", "Start Date", "Finish Date"];
    ws1.getRow(3).values = headers1;
    ws1.getRow(3).height = 25;
    ws1.getRow(3).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_NAVY } };
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: COLOR_WHITE } };
      cell.alignment = alignCenter;
      cell.border = borderStyle;
    });

    interface ProjectSummaryMapItem {
      name: string;
      bugs: number;
      crs: number;
      fsdYa: number;
      fsdTidak: number;
      startDates: Date[];
      finishDates: Date[];
    }

    const projectMap: Record<string, ProjectSummaryMapItem> = {};
    bugsData.forEach((bug) => {
      const projName = bug.projectName ? bug.projectName.trim() : `Unmapped Project (${bug.sectionName || "Unknown"})`;
      const typeLower = (bug.type || "").toLowerCase();
      const isCr = typeLower.includes("cr") || typeLower.includes("change") || typeLower.includes("addit") || typeLower.includes("requst");
      const isBug = !isCr;
      const fsdVal = (bug.includedInFsd || "").trim().toLowerCase();

      if (!projectMap[projName]) {
        projectMap[projName] = { name: projName, bugs: 0, crs: 0, fsdYa: 0, fsdTidak: 0, startDates: [], finishDates: [] };
      }
      if (isBug) projectMap[projName].bugs += 1;
      if (isCr) projectMap[projName].crs += 1;
      if (fsdVal === "ya") projectMap[projName].fsdYa += 1;
      else projectMap[projName].fsdTidak += 1;

      if (bug.startDate && bug.startDate !== "—" && bug.startDate !== "-") {
        const d = new Date(bug.startDate);
        if (!isNaN(d.getTime())) {
          projectMap[projName].startDates.push(d);
        }
      }
      if (bug.finishAt && bug.finishAt !== "—" && bug.finishAt !== "-") {
        const d = new Date(bug.finishAt);
        if (!isNaN(d.getTime())) {
          projectMap[projName].finishDates.push(d);
        }
      }
    });

    const sortedProjects = Object.values(projectMap).sort((a, b) => a.name.localeCompare(b.name));

    let rowIdx1 = 4;
    sortedProjects.forEach((proj, idx) => {
      const minStart = proj.startDates.length > 0 && !isNaN(Math.min(...proj.startDates.map(d => d.getTime()))) 
        ? new Date(Math.min(...proj.startDates.map(d => d.getTime()))).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";
      const maxFinish = proj.finishDates.length > 0 && !isNaN(Math.max(...proj.finishDates.map(d => d.getTime()))) 
        ? new Date(Math.max(...proj.finishDates.map(d => d.getTime()))).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—";

      const row = ws1.addRow([
        idx + 1, proj.name, proj.bugs, proj.crs, 
        proj.fsdYa > 0 ? "Ada FSD" : "Tanpa FSD", `Ya: ${proj.fsdYa}, Tidak: ${proj.fsdTidak}`, 
        minStart, maxFinish
      ]);
      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.border = borderStyle;
        cell.font = { name: "Calibri", size: 11 };
        cell.alignment = colNumber === 2 ? alignLeft : alignCenter;
        
        if (rowIdx1 % 2 === 0) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ZEBRA } };
        } else {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_WHITE } };
        }

        // Highlight Status FSD
        if (colNumber === 5) {
          if (cell.value === "Ada FSD") {
            cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF15803D" } };
          } else {
            cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFB91C1C" } };
          }
        }
      });
      rowIdx1++;
    });

    console.log("Sheet 1 berhasil dibuat...");

    // ==========================================
    // SHEET 2: DEVELOPER PERFORMANCE (MERGED FLAT TABLE)
    // ==========================================
    const ws2 = workbook.addWorksheet("Developer Performance", {
      views: [{ showGridLines: true }]
    });
    ws2.properties.outlineProperties = { summaryBelow: false, summaryRight: false };

    ws2.mergeCells("A1:F1");
    const titleCell2 = ws2.getCell("A1");
    titleCell2.value = "DEVELOPER PERFORMANCE REPORT";
    titleCell2.font = { name: "Calibri", size: 16, bold: true, color: { argb: COLOR_NAVY } };
    titleCell2.alignment = alignLeft;
    ws2.getRow(1).height = 30;
    ws2.getRow(2).height = 15;

    ws2.getRow(3).values = ["Developer Name", "Project Name", "PIC Name", "Task Type", "Severity", "Score"];
    ws2.getRow(3).height = 25;
    ws2.getRow(3).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_NAVY } };
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: COLOR_WHITE } };
      cell.alignment = alignCenter;
      cell.border = borderStyle;
    });

    // Pemrosesan & Pengurutan Data Flat Sheet 2
    interface DevFlatItem {
      devName: string;
      projectName: string;
      picName: string;
      type: string;
      severity: string;
      score: number;
    }

    const devFlatList: DevFlatItem[] = [];
    const devTotalScores: Record<string, number> = {};

    bugsData.forEach((bug) => {
      const dev = bug.devName ? bug.devName.trim() : "Unassigned";
      const score = Number(bug.bugScore) || 0;
      devTotalScores[dev] = (devTotalScores[dev] || 0) + score;

      devFlatList.push({
        devName: dev,
        projectName: bug.projectName ? bug.projectName.trim() : `Unmapped Project (${bug.sectionName || "Unknown"})`,
        picName: bug.picName || "—",
        type: bug.type || "Bug",
        severity: bug.severity || "Minor",
        score: score
      });
    });

    // Sort data agar penggabungan (merge) baris berurutan menjadi valid
    devFlatList.sort((a, b) => 
      a.devName.localeCompare(b.devName) || 
      a.projectName.localeCompare(b.projectName) || 
      a.picName.localeCompare(b.picName)
    );

    const startRow2 = 4;
    devFlatList.forEach((item) => {
      const row = ws2.addRow([item.devName, item.projectName, item.picName, item.type, item.severity, item.score]);
      row.height = 20;
      row.eachCell((cell) => {
        cell.border = borderStyle;
        cell.font = { name: "Calibri", size: 11 };
        cell.alignment = alignCenter;
      });
      ws2.getCell(`B${ws2.lastRow!.number}`).alignment = alignLeft;
    });

    // Algoritma Vertical Merging Vertikal untuk Sheet 2
    const endRow2 = ws2.lastRow ? ws2.lastRow.number : 4;
    let mStartDev = startRow2;
    let mStartProj = startRow2;
    let mStartPic = startRow2;

    for (let r = startRow2; r <= endRow2; r++) {
      const currDev = String(ws2.getCell(`A${r}`).value || "").trim();
      const nextDev = r < endRow2 ? String(ws2.getCell(`A${r + 1}`).value || "").trim() : null;
      const currProj = String(ws2.getCell(`B${r}`).value || "").trim();
      const nextProj = r < endRow2 ? String(ws2.getCell(`B${r + 1}`).value || "").trim() : null;
      const currPic = String(ws2.getCell(`C${r}`).value || "").trim();
      const nextPic = r < endRow2 ? String(ws2.getCell(`C${r + 1}`).value || "").trim() : null;

      if (currDev !== nextDev) {
        if (r > mStartDev) {
          ws2.mergeCells(mStartDev, 1, r, 1);
        }
        // Terapkan conditional highlight total score pada cell pertama dev yang di-merge
        // Clean up devName formatting from possibly merged values in devTotalScores
        const lookupDev = currDev.split("\n")[0].trim();
        const totalDevScore = devTotalScores[lookupDev] || 0;
        const targetScoreCell = ws2.getCell(`A${mStartDev}`);
        targetScoreCell.value = `${lookupDev}\n(Total: ${totalDevScore} Pts)`;
        targetScoreCell.font = { name: "Calibri", size: 11, bold: true };
        targetScoreCell.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
        if (totalDevScore > 50) {
          targetScoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BG_RED } };
        } else if (totalDevScore < 20) {
          targetScoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BG_GREEN } };
        }
        mStartDev = r + 1;
      }

      if (currProj !== nextProj || currDev !== nextDev) {
        if (r > mStartProj) {
          ws2.mergeCells(mStartProj, 2, r, 2);
        }
        ws2.getCell(`B${mStartProj}`).alignment = { vertical: "middle", horizontal: "left" };
        mStartProj = r + 1;
      }

      if (currPic !== nextPic || currProj !== nextProj || currDev !== nextDev) {
        if (r > mStartPic) {
          ws2.mergeCells(mStartPic, 3, r, 3);
        }
        ws2.getCell(`C${mStartPic}`).alignment = alignCenter;
        mStartPic = r + 1;
      }
    }

    console.log("Sheet 2 berhasil dibuat...");

    // ==========================================
    // SHEET 3: REPORT SCORE (RESTUCTURING & WRAP TEXT)
    // ==========================================
    const ws3 = workbook.addWorksheet("Report Score", {
      views: [{ showGridLines: true }]
    });
    ws3.mergeCells("A1:G1");
    const titleCell3 = ws3.getCell("A1");
    titleCell3.value = "SUMMARY SCORE REPORT";
    titleCell3.font = { name: "Calibri", size: 16, bold: true, color: { argb: COLOR_NAVY } };
    titleCell3.alignment = alignLeft;
    ws3.getRow(1).height = 30;

    // Cari Bad Developer Global
    let badDevName = "—";
    let maxGlobalScore = 0;
    Object.entries(devTotalScores).forEach(([name, score]) => {
      if (name !== "Unassigned" && name !== "Unassigned Developer" && score > maxGlobalScore) {
        maxGlobalScore = score;
        badDevName = name;
      }
    });

    ws3.mergeCells("A3:G3");
    const kpiCell = ws3.getCell("A3");
    kpiCell.value = `Highest Rank Developer (Bad Developer) : ${badDevName} , Score : ${maxGlobalScore}`;
    kpiCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: TEXT_RED } };
    kpiCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BG_RED } };
    kpiCell.border = borderStyle;
    kpiCell.alignment = alignLeft;
    ws3.getRow(3).height = 24;

    // Grouping Bulanan untuk Sheet 3
    const periodGroups: Record<string, BugRecord[]> = {};
    bugsData.forEach((bug) => {
      const pName = bug.periode ? bug.periode.trim() : "Tanpa Periode";
      if (!periodGroups[pName]) {
        periodGroups[pName] = [];
      }
      periodGroups[pName].push(bug);
    });

    let s3RowIdx = 5;
    const periodKeys = Object.keys(periodGroups).sort((a, b) => b.localeCompare(a));

    periodKeys.forEach((bulan) => {
      const items = periodGroups[bulan];

      // Hitung Ringkasan Nilai Dev khusus bulan ini
      const localDevScore: Record<string, number> = {};
      items.forEach(b => {
        const d = b.devName ? b.devName.trim() : "Unassigned";
        localDevScore[d] = (localDevScore[d] || 0) + (Number(b.bugScore) || 0);
      });
      const summaryDevString = Object.entries(localDevScore)
        .map(([dName, dScore]) => `${dName} (${dScore} Pts)`)
        .join(" | ");

      // Row Judul Bulan
      ws3.mergeCells(`A${s3RowIdx}:G${s3RowIdx}`);
      const lblCell = ws3.getCell(`A${s3RowIdx}`);
      lblCell.value = `Periode : ${bulan}`;
      lblCell.font = { name: "Calibri", size: 12, bold: true, color: { argb: COLOR_NAVY } };
      ws3.getRow(s3RowIdx).height = 22;
      s3RowIdx++;

      // Row Summary Score Bulanan
      ws3.mergeCells(`A${s3RowIdx}:G${s3RowIdx}`);
      const sumCell = ws3.getCell(`A${s3RowIdx}`);
      sumCell.value = `Summary Score Developer: ${summaryDevString}`;
      sumCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF475569" } };
      ws3.getRow(s3RowIdx).height = 20;
      s3RowIdx++;

      // Header Tabel Blok Bulan
      const subHeaders = ["Project Name", "PIC Name", "Developer Name", "List Task", "Type Bug / CR", "Severity", "Score"];
      ws3.getRow(s3RowIdx).values = subHeaders;
      ws3.getRow(s3RowIdx).height = 22;
      ws3.getRow(s3RowIdx).eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_NAVY } };
        c.font = { name: "Calibri", size: 10, bold: true, color: { argb: COLOR_WHITE } };
        c.alignment = alignCenter;
        c.border = borderStyle;
      });
      
      const startTableBlock = s3RowIdx + 1;
      s3RowIdx++;

      // Urutkan item agar merging teratur
      items.sort((a, b) => 
        (a.projectName || "").localeCompare(b.projectName || "") || 
        (a.picName || "").localeCompare(b.picName || "")
      );

      items.forEach((item, innerIdx) => {
        const dataRow = ws3.addRow([
          item.projectName ? item.projectName.trim() : `Unmapped Project (${item.sectionName || "Unknown"})`,
          item.picName || "—",
          item.devName || "Unassigned",
          item.remarks || "—",
          item.type || "Bug",
          item.severity || "Minor",
          Number(item.bugScore) || 0
        ]);
        dataRow.height = 24; // Tinggi ekstra agar baris wrap text lega
        dataRow.eachCell((cell, colNum) => {
          cell.border = borderStyle;
          cell.font = { name: "Calibri", size: 10 };
          cell.alignment = (colNum === 1 || colNum === 4) ? alignLeft : alignCenter;
          
          // Opsi Aktifkan Wrap Text di Kolom D (List Task)
          if (colNum === 4) {
            cell.alignment = { wrapText: true, vertical: "middle", horizontal: "left" };
          }
          if (innerIdx % 2 === 1) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ZEBRA } };
          } else {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_WHITE } };
          }
        });
        s3RowIdx++;
      });

      // Algoritma Vertical Merging khusus di dalam blok bulan ini
      const endTableBlock = s3RowIdx - 1;
      let mStartP3 = startTableBlock;
      let mStartPic3 = startTableBlock;

      for (let i = startTableBlock; i <= endTableBlock; i++) {
        const cProj = String(ws3.getCell(`A${i}`).value || "").trim();
        const nProj = i < endTableBlock ? String(ws3.getCell(`A${i + 1}`).value || "").trim() : null;
        const cPic = String(ws3.getCell(`B${i}`).value || "").trim();
        const nPic = i < endTableBlock ? String(ws3.getCell(`B${i + 1}`).value || "").trim() : null;

        if (cProj !== nProj) {
          if (i > mStartP3) {
            ws3.mergeCells(mStartP3, 1, i, 1);
          }
          ws3.getCell(`A${mStartP3}`).alignment = { vertical: "middle", horizontal: "left" };
          mStartP3 = i + 1;
        }

        if (cPic !== nPic || cProj !== nProj) {
          if (i > mStartPic3) {
            ws3.mergeCells(mStartPic3, 2, i, 2);
          }
          ws3.getCell(`B${mStartPic3}`).alignment = alignCenter;
          mStartPic3 = i + 1;
        }
      }

      // Beri space 1 baris kosong antar periode bulan
      ws3.addRow([]);
      s3RowIdx++;
    });

    // ==========================================
    // AUTO-FIT COLUMN WIDTHS (ALL SHEETS)
    // ==========================================
    [ws1, ws2, ws3].forEach((ws) => {
      ws.columns.forEach((column) => {
        let maxLen = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const rowNum = typeof cell.row === "number" ? cell.row : (cell.row as any)?.number || 0;
          if (rowNum > 2 && cell.value) {
            const valLen = cell.value.toString().length;
            if (valLen > maxLen) maxLen = valLen;
          }
        });
        // Batasi max width untuk text wrap di sheet 3 kolom D agar tidak terlalu lebar kesamping
        if (ws.name === "Report Score" && column.number === 4) {
          column.width = 40;
        } else {
          column.width = maxLen < 12 ? 12 : Math.min(maxLen + 4, 50);
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Wisesa_Bug_Tracker_Final_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
    console.log("Ekspor Multi-Sheet Berhasil dieksekusi!");

  } catch (error) {
    console.error("LOG ERROR EKSPOR EXCEL:", error);
    alert("Gagal memproses susunan merge sel. Cek tab Console F12.");
  }
};
