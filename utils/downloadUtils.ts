export const downloadCSV = (data: any[], filename: string = 'report.csv'): void => {
    if (!data || data.length === 0) {
        // Note: This function doesn't have access to notification context
        // Callers should check for empty data before calling this function
        console.warn("No data to download.");
        return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','), // Header row
        ...data.map(row => 
            headers.map(header => {
                let cellData = row[header];
                if (cellData === null || cellData === undefined) {
                    cellData = '';
                } else if (typeof cellData === 'string' && (cellData.includes(',') || cellData.includes('"') || cellData.includes('\n'))) {
                    // Escape quotes by doubling them and wrap in quotes
                    cellData = `"${cellData.replace(/"/g, '""')}"`;
                } else if (typeof cellData === 'object') {
                    // For complex objects/arrays, stringify them. Might need more specific handling based on needs.
                    cellData = `"${JSON.stringify(cellData).replace(/"/g, '""')}"`;
                }
                return cellData;
            }).join(',')
        )
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
