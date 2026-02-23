[x] 1. Update schema to support payment receipt storage and status tracking
[x] 2. Add backend API to send payment receipt to customer receipts section
[x] 3. Add "Send to Customer" button to the Payment Received PDF view header
[x] 4. Implement "My Receipts" section for customer role to view their receipts
[x] 5. Inform user the import is completed and they can start building, mark the import as completed using the complete_project_import tool
[x] 6. Fix customer invoice filtering logic
[x] 7. Install missing dependencies and configure database for Replit environment
[x] 8. Verify application starts and runs correctly
[x] 9. Provision PostgreSQL database and push schema
[x] 10. Configure workflow with webview output and verify app loads correctly
[x] 11. Implement balance due reduction logic upon payment verification
[x] 12. Ensure admin and customer views reflect updated balance after verification
[x] 13. Re-provision database and verify app loads in Replit environment
[x] 14. Enhanced payment receipt to show full invoice details with item breakdown, invoice number, total amount, and balance due
[x] 15. Fixed invoice details not showing in admin and customer receipt views by enriching all payment API endpoints with full invoice data
[x] 16. Redesigned customer Sales Orders page to match the Quotes page UI - table layout with slide-in detail panel
[x] 17. Fixed balance due not showing correctly on invoices - now uses stored balanceDue/amountPaid values instead of recalculating from empty payments array