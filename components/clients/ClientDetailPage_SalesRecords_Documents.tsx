// This is a replacement section for Sales Records and Documents tabs
// Replace the purchaseHistory tab section with this

{activeTab === 'salesRecords' && (
  <div>
    {purchaseHistory.filter(h => h.type === 'Sale').length === 0 ? (
      <p className="text-text-secondary">No sales records available.</p>
    ) : (
      <div>
        {/* Filters */}
        <div className="mb-4 p-4 bg-container-bg dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input
              label="Start Date"
              type="date"
              value={salesRecordsStartDate}
              onChange={e => setSalesRecordsStartDate(e.target.value)}
              containerClassName="mb-0"
            />
            <Input
              label="End Date"
              type="date"
              value={salesRecordsEndDate}
              onChange={e => setSalesRecordsEndDate(e.target.value)}
              containerClassName="mb-0"
            />
            <Select
              label="Status"
              value={salesRecordsStatusFilter}
              onChange={e => setSalesRecordsStatusFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Statuses' },
                ...Array.from(new Set(purchaseHistory.filter(h => h.type === 'Sale').map(h => h.status))).map(status => ({
                  value: status,
                  label: status
                }))
              ]}
              containerClassName="mb-0"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-secondary dark:text-slate-400">
              {selectedSalesRecordIds.size > 0 && (
                <span>{selectedSalesRecordIds.size} record(s) selected</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleDownloadSalesRecordsPDF()} 
                variant="secondary" 
                size="sm"
                isLoading={isDownloadingPdf}
              >
                Download PDF
              </Button>
              <Button 
                onClick={() => setIsCreateInvoiceModalOpen(true)} 
                variant="primary" 
                size="sm"
                disabled={selectedSalesRecordIds.size === 0}
              >
                Create Invoice from Selected ({selectedSalesRecordIds.size})
              </Button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedSalesRecordIds.size === filteredSalesRecords.length && filteredSalesRecords.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSalesRecordIds(new Set(filteredSalesRecords.map(h => h.id)));
                      } else {
                        setSelectedSalesRecordIds(new Set());
                      }
                    }}
                    className="rounded border-gray-300 text-primary-action focus:ring-primary-action"
                  />
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Reference</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Amount (MMK)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {filteredSalesRecords.map(entry => (
                <tr key={`${entry.type}-${entry.id}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedSalesRecordIds.has(entry.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedSalesRecordIds);
                        if (e.target.checked) {
                          newSet.add(entry.id);
                        } else {
                          newSet.delete(entry.id);
                        }
                        setSelectedSalesRecordIds(newSet);
                      }}
                      className="rounded border-gray-300 text-primary-action focus:ring-primary-action"
                    />
                  </td>
                  <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">{entry.date ? new Date(entry.date).toLocaleDateString('en-GB') : 'N/A'}</td>
                  <td className="px-4 py-2 text-sm font-medium text-text-primary dark:text-slate-200">{entry.service}</td>
                  <td className="px-4 py-2 text-sm text-right text-text-primary dark:text-slate-200 font-medium">{entry.amount.toLocaleString()}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Hidden PDF Template */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <SalesRecordsPDFTemplate
            ref={salesRecordsPdfRef}
            data={filteredSalesRecords}
            clientOrBusiness={item}
            companyProfile={companyProfile}
            dateRange={{ start: salesRecordsStartDate, end: salesRecordsEndDate }}
            filter={{ status: salesRecordsStatusFilter }}
          />
        </div>
      </div>
    )}
  </div>
)}

{activeTab === 'documents' && (
  <div>
    {purchaseHistory.filter(h => h.type === 'Invoice' || h.service.startsWith('Quotation:')).length === 0 ? (
      <p className="text-text-secondary">No documents available.</p>
    ) : (
      <div>
        {/* Filters */}
        <div className="mb-4 p-4 bg-container-bg dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Input
              label="Start Date"
              type="date"
              value={documentsStartDate}
              onChange={e => setDocumentsStartDate(e.target.value)}
              containerClassName="mb-0"
            />
            <Input
              label="End Date"
              type="date"
              value={documentsEndDate}
              onChange={e => setDocumentsEndDate(e.target.value)}
              containerClassName="mb-0"
            />
            <Select
              label="Type"
              value={documentsTypeFilter}
              onChange={e => setDocumentsTypeFilter(e.target.value as 'All' | 'Invoice' | 'Quotation')}
              options={[
                { value: 'All', label: 'All Types' },
                { value: 'Invoice', label: 'Invoices Only' },
                { value: 'Quotation', label: 'Quotations Only' }
              ]}
              containerClassName="mb-0"
            />
            <Select
              label="Status"
              value={documentsStatusFilter}
              onChange={e => setDocumentsStatusFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Statuses' },
                ...Array.from(new Set(purchaseHistory.filter(h => h.type === 'Invoice' || h.service.startsWith('Quotation:')).map(h => h.status))).map(status => ({
                  value: status,
                  label: status
                }))
              ]}
              containerClassName="mb-0"
            />
          </div>
          <div className="flex justify-end">
            <Button 
              onClick={() => handleDownloadDocumentsPDF()} 
              variant="secondary" 
              size="sm"
              isLoading={isDownloadingPdf}
            >
              Download PDF
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Reference</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Amount (MMK)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-container-bg dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {filteredDocuments.map(entry => {
                const isQuotation = entry.service.startsWith('Quotation:');
                const recordId = entry.id;
                return (
                  <tr key={`${entry.type}-${entry.id}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-2 text-sm text-text-secondary dark:text-slate-400">{entry.date ? new Date(entry.date).toLocaleDateString('en-GB') : 'N/A'}</td>
                    <td className="px-4 py-2 text-sm text-text-primary dark:text-slate-200">{isQuotation ? 'Quotation' : entry.type}</td>
                    <td className="px-4 py-2 text-sm font-medium text-text-primary dark:text-slate-200">{entry.service}</td>
                    <td className="px-4 py-2 text-sm text-right text-text-primary dark:text-slate-200 font-medium">{entry.amount.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {isQuotation ? (
                        <Link to={`/sales/quotations/${recordId}`} className="text-primary-action hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                          View
                        </Link>
                      ) : (
                        <Link to={`/sales/invoices/${recordId}`} className="text-primary-action hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Hidden PDF Template */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <DocumentsPDFTemplate
            ref={documentsPdfRef}
            data={filteredDocuments}
            clientOrBusiness={item}
            companyProfile={companyProfile}
            dateRange={{ start: documentsStartDate, end: documentsEndDate }}
            filters={{ type: documentsTypeFilter, status: documentsStatusFilter }}
          />
        </div>
      </div>
    )}
  </div>
)}

