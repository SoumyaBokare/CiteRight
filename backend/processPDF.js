import fs from 'fs'; // Built-in Node.js module
import path from 'path'; // Built-in Node.js module

async function processPDF() {
    // Dynamically import pdf-parse
    const Pdf = (await import('pdf-parse')).default;

    // Update the path to the correct location of the PDF file
    const PDF_FILE = path.resolve('./test/data/05-versions-space.pdf');
    if (!fs.existsSync(PDF_FILE)) {
        console.error(`File not found: ${PDF_FILE}`);
        return;
    }

    const dataBuffer = fs.readFileSync(PDF_FILE); // Read the file into a buffer

    try {
        const data = await Pdf(dataBuffer);
        fs.writeFileSync(`${PDF_FILE}.txt`, data.text, { encoding: 'utf8', flag: 'w' });
        console.log('PDF processed successfully!');
    } catch (err) {
        console.error('Error processing PDF:', err);
    }
}

// Call the async function
processPDF();