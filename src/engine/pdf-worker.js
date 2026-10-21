const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

class PDFWorker {
  async createPDFFromImages(imagePaths, outputPath) {
    const pdfDoc = await PDFDocument.create();

    for (const imgPath of imagePaths) {
      const ext = path.extname(imgPath).toLowerCase();
      const rawBytes = fs.readFileSync(imgPath);
      const bytes = new Uint8Array(
        rawBytes.buffer.slice(rawBytes.byteOffset, rawBytes.byteOffset + rawBytes.byteLength)
      );
      let img;

      if (['.jpg', '.jpeg'].includes(ext)) {
        img = await pdfDoc.embedJpg(bytes);
      } else if (ext === '.png') {
        img = await pdfDoc.embedPng(bytes);
      } else {
        continue;
      }

      const page = pdfDoc.addPage([img.width, img.height]);
      page.drawImage(img, {
        x: 0,
        y: 0,
        width: img.width,
        height: img.height
      });
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    return outputPath;
  }

  async splitPDF(inputPdfPath, outputDir = null) {
    const parsed = path.parse(inputPdfPath);
    const destDir = outputDir || path.join(parsed.dir, `${parsed.name} Pages`);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const existingBytes = fs.readFileSync(inputPdfPath);
    const srcDoc = await PDFDocument.load(existingBytes);
    const pageCount = srcDoc.getPageCount();
    const createdFiles = [];

    for (let i = 0; i < pageCount; i++) {
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
      newDoc.addPage(copiedPage);

      const outName = `${parsed.name} Page ${i + 1}.pdf`;
      const outPath = path.join(destDir, outName);
      const outBytes = await newDoc.save();
      fs.writeFileSync(outPath, outBytes);
      createdFiles.push(outPath);
    }

    return { folder: destDir, files: createdFiles };
  }

  async mergePDFs(inputPdfPaths, outputPath) {
    const mergedDoc = await PDFDocument.create();

    for (const docPath of inputPdfPaths) {
      const bytes = fs.readFileSync(docPath);
      const doc = await PDFDocument.load(bytes);
      const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
      copiedPages.forEach((page) => mergedDoc.addPage(page));
    }

    const mergedBytes = await mergedDoc.save();
    fs.writeFileSync(outputPath, mergedBytes);
    return outputPath;
  }
}

module.exports = new PDFWorker();
