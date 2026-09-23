
export const printDocument = (htmlContent: string, title: string = "Print Document"): void => {
    const printWindow = window.open('', '_blank', 'height=700,width=900,toolbar=no,menubar=no,scrollbars=yes,resizable=yes');
    
    if (printWindow) {
        printWindow.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        @media print {
                            body { margin: 0; } /* Remove margins for actual printing */
                            /* Add any print-specific styles here */
                            .no-print { display: none !important; }
                        }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                    <script>
                        // Automatically trigger print dialog
                        window.onload = function() {
                            window.print();
                            // Optionally close window after print dialog is handled
                            // setTimeout(function(){ window.close(); }, 100); 
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close(); // Important for some browsers
        printWindow.focus(); // For IE
    } else {
        alert("Could not open print window. Please check your browser's popup blocker settings.");
    }
};
