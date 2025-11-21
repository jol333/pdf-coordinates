# PDF Coordinates - Interactive PDF Coordinate Annotation Tool

> **🔒 100% Free | Runs Completely Offline | Your Data Never Leaves Your Device**

A completely free PDF coordinate picker and annotation tool that lets you click anywhere on a PDF document to capture precise X,Y coordinates. Perfect for PDF form filling, document automation, PDF coordinate mapping, and programmatic PDF manipulation.

**✨ No internet connection required after loading | No server uploads | Complete privacy**

**[🚀 Live Demo](https://jol333.github.io/pdf-coordinates/)**

## What is PDF Coordinates?

PDF Coordinates is a **completely free, offline-capable** browser-based tool for extracting and annotating coordinate positions on PDF documents. All processing happens locally in your browser - no internet connection needed, no file uploads, and your sensitive documents never leave your computer. Whether you're working on PDF automation, form filling scripts, or need to identify exact positions for PDF editing, this tool provides an intuitive visual interface to click and capture coordinates with pixel-perfect accuracy.

### Key Features

- **🔒 100% Private & Offline**: Works without internet, all processing in your browser, zero data collection
- **💰 Completely Free**: No subscriptions, no hidden costs, no account required
- **Click-to-Annotate**: Simply click anywhere on your PDF to add coordinate markers
- **Multiple Coordinate Systems**: Support for all four coordinate origins (Bottom-Left, Top-Left, Top-Right, Bottom-Right)
- **Multi-Page Support**: Navigate and annotate across all pages in your PDF document
- **Zoom & Pan**: Smooth zoom controls and trackpad/mouse panning for precise positioning
- **Drag & Drop Editing**: Move annotation points by dragging them to new positions
- **Export Annotated PDFs**: Download your PDF with all coordinate annotations embedded
- **Real-time Coordinate Display**: See X,Y coordinates update instantly as you work
- **Keyboard Shortcuts**: Delete points with Backspace/Delete, pan with Space+Drag

## Use Cases

- **PDF Form Automation**: Identify field coordinates for automated form filling with libraries like pdf-lib or PyPDF2
- **Document Processing**: Map coordinates for signature placement, stamp positioning, or text insertion
- **PDF Testing**: Verify element positions in PDF generation workflows
- **Data Extraction**: Mark regions for OCR or data scraping operations
- **PDF Development**: Debug coordinate systems when building PDF manipulation tools
- **Template Creation**: Design PDF templates with precise element positioning

## How to Use

1. **Upload PDF**: Click the upload area or drag-and-drop your PDF file
2. **Click to Annotate**: Click anywhere on the PDF page to add a coordinate marker
3. **Choose Coordinate System**: Select your preferred origin (Bottom-Left is PDF standard)
4. **Navigate Pages**: Use page controls to annotate multi-page documents
5. **Zoom & Pan**: Use zoom buttons and trackpad gestures for precision
6. **Edit Coordinates**: Drag markers to reposition or manually edit X,Y values in the sidebar
7. **Download**: Export your annotated PDF with all coordinate labels embedded

### Keyboard Shortcuts

- **Space + Drag**: Pan the canvas
- **Delete/Backspace**: Remove selected annotation point
- **Click**: Add new coordinate marker (when not in pan mode)

## Coordinate Systems Explained

PDF Coordinates supports all four coordinate origin systems:

- **Bottom-Left** (PDF Standard): Origin (0,0) at bottom-left corner, Y increases upward
- **Top-Left** (Screen Standard): Origin (0,0) at top-left corner, Y increases downward
- **Top-Right**: Origin (0,0) at top-right corner
- **Bottom-Right**: Origin (0,0) at bottom-right corner

Switch between systems anytime - all coordinates automatically recalculate.

## Run Locally

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jol333/pdf-coordinates.git
   cd pdf-coordinates
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist` folder.

## Technology Stack

- **React 19** - Modern UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **react-pdf** - PDF rendering in the browser
- **pdf-lib** - PDF manipulation and annotation export
- **Lucide React** - Beautiful icon library
- **Tailwind CSS** - Utility-first styling

## Browser Compatibility

Works in all modern browsers that support:
- ES6+ JavaScript
- Canvas API
- File API
- PDF.js

Tested on Chrome, Firefox, Safari, and Edge.

## Privacy & Security

- **100% Client-Side**: All PDF processing happens in your browser
- **No Server Upload**: Your PDF files never leave your device
- **No Data Collection**: Zero tracking or analytics
- **Open Source**: Full transparency - inspect the code yourself

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

MIT License - Free to use for personal and commercial projects.

## Related Keywords

PDF coordinate picker, PDF annotation tool, PDF coordinate finder, PDF form coordinates, PDF automation tool, PDF coordinate system, PDF point picker, PDF coordinate mapper, extract PDF coordinates, PDF position finder, PDF coordinate converter, interactive PDF tool, PDF coordinate extraction, PDF development tool, PDF coordinate utility