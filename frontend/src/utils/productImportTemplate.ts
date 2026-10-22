/**
 * Generates and downloads pre-formatted CSV template for Product Bulk Import
 */

export function downloadProductImportTemplate(filename = 'VyaaparSync_Product_Import_Template.csv'): void {
  const headers = [
    'Product Name',
    'SKU',
    'Category',
    'Unit Price (INR)',
    'Current Stock',
    'Minimum Stock',
    'Warehouse Location'
  ];

  const sampleRows = [
    ['Logitech MX Master 3S Wireless Mouse', 'LOGI-MX3S-BLK', 'Computer Accessories', '8995.00', '45', '10', 'Aisle A-04'],
    ['Dell UltraSharp 27 4K Monitor (U2723QE)', 'DELL-U2723QE', 'Office Equipment', '54500.00', '15', '5', 'Rack B-12'],
    ['Cisco Catalyst 1000 24-Port Gigabit Switch', 'CISCO-C1000-24P', 'Networking', '32000.00', '8', '3', 'Rack C-01'],
    ['Thermal Transfer Barcode Printer Label Rolls', 'LBL-ROLL-100X50', 'Packaging Supplies', '450.00', '200', '50', 'Shelf D-02'],
    ['Custom Industrial Sensor Module v2', 'SENS-IND-V2', 'Custom Hardware', '1250.00', '80', '20', 'Bin E-15']
  ];

  const csvLines = [
    headers.join(','),
    ...sampleRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ];

  const csvContent = csvLines.join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
