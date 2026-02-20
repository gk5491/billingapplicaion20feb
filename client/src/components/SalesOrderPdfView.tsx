import { Badge } from "@/components/ui/badge";
import { SalesPDFHeader } from "@/components/sales-pdf-header";

interface SalesOrderItem {
    id: string;
    itemId: string;
    name: string;
    description: string;
    hsnSac: string;
    quantity: number;
    unit: string;
    rate: number;
    discount: number;
    discountType: string;
    tax: number;
    taxName: string;
    amount: number;
    ordered: number;
}

interface SalesOrderDetail {
    id: string;
    salesOrderNumber: string;
    referenceNumber: string;
    date: string;
    expectedShipmentDate: string;
    customerId: string;
    customerName: string;
    billingAddress: {
        street: string;
        city: string;
        state: string;
        country: string;
        pincode: string;
    };
    shippingAddress: {
        street: string;
        city: string;
        state: string;
        country: string;
        pincode: string;
    };
    paymentTerms: string;
    deliveryMethod: string;
    salesperson: string;
    placeOfSupply: string;
    items: SalesOrderItem[];
    subTotal: number;
    shippingCharges: number;
    cgst: number;
    sgst: number;
    igst: number;
    adjustment: number;
    total: number;
    customerNotes: string;
    termsAndConditions: string;
    orderStatus: string;
}

const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatAddress = (address: any) => {
    if (!address) return ['-'];
    const parts = [address.street, address.city, address.state, address.country, address.pincode].filter(Boolean);
    return parts.length > 0 ? parts : ['-'];
};

export function SalesOrderPdfView({ order, branding, organization }: { order: SalesOrderDetail; branding?: any; organization?: any }) {
    return (
        <div id="sales-order-pdf-preview" style={{
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            backgroundColor: '#ffffff',
            color: '#0f172a',
            margin: '0',
            minHeight: '296mm',
            width: '100%',
            maxWidth: '210mm',
            boxSizing: 'border-box',
            lineHeight: '1.5'
        }}>
            <div style={{ padding: '40px' }}>
                {/* Header Section */}
                <div style={{ marginBottom: '40px' }}>
                    <SalesPDFHeader
                        logo={branding?.logo || undefined}
                        documentTitle="SALES ORDER"
                        documentNumber={order.salesOrderNumber}
                        date={order.date}
                        referenceNumber={order.referenceNumber}
                        organization={organization}
                    />
                </div>

                {/* Addresses Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-10" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
                    <div style={{ borderLeft: '3px solid #f1f5f9', paddingLeft: '20px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', margin: '0 0 12px 0' }}>
                            BILL TO
                        </h3>
                        <p style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginBottom: '6px', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                            {order.customerName}
                        </p>
                        <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                            {formatAddress(order.billingAddress).map((line, i) => (
                                <p key={i} style={{ margin: '0' }}>{line}</p>
                            ))}
                        </div>
                    </div>
                    <div style={{ borderLeft: '3px solid #f1f5f9', paddingLeft: '20px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', margin: '0 0 12px 0' }}>
                            SHIP TO
                        </h3>
                        <p style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginBottom: '6px', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                            {order.customerName}
                        </p>
                        <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                            {formatAddress(order.shippingAddress).map((line, i) => (
                                <p key={i} style={{ margin: '0' }}>{line}</p>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Meta Information Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-[2px] mb-10 bg-slate-100 rounded-lg overflow-hidden border border-slate-100" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '2px',
                    marginBottom: '40px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #f1f5f9',
                    borderRadius: '8px',
                    overflow: 'hidden'
                }}>
                    <div style={{ backgroundColor: '#ffffff', padding: '16px' }}>
                        <p style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Order Date</p>
                        <p style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '0' }}>{formatDate(order.date)}</p>
                    </div>
                    <div style={{ backgroundColor: '#ffffff', padding: '16px' }}>
                        <p style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Expected Shipment</p>
                        <p style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '0' }}>{formatDate(order.expectedShipmentDate)}</p>
                    </div>
                    <div style={{ backgroundColor: '#ffffff', padding: '16px' }}>
                        <p style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Payment Terms</p>
                        <p style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '0' }}>{order.paymentTerms || 'Due on Receipt'}</p>
                    </div>
                    <div style={{ backgroundColor: '#ffffff', padding: '16px' }}>
                        <p style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Place of Supply</p>
                        <p style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '0' }}>{order.placeOfSupply || '-'}</p>
                    </div>
                </div>

                {/* Items Table */}
                <div style={{ marginBottom: '32px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#1e40af', color: '#ffffff' }}>
                                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '4px 0 0 0' }}>#</th>
                                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item & Description</th>
                                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>HSN/SAC</th>
                                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Qty</th>
                                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Rate</th>
                                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', borderRadius: '0 4px 0 0' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item, index) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '16px', fontSize: '13px', color: '#64748b', verticalAlign: 'top' }}>{index + 1}</td>
                                    <td style={{ padding: '16px', verticalAlign: 'top' }}>
                                        <p style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>{item.name}</p>
                                        {item.description && (
                                            <p style={{ fontSize: '12px', color: '#64748b', margin: '0', lineHeight: '1.4' }}>{item.description}</p>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '13px', color: '#64748b', textAlign: 'center', verticalAlign: 'top' }}>{item.hsnSac || '-'}</td>
                                    <td style={{ padding: '16px', fontSize: '13px', color: '#0f172a', textAlign: 'center', verticalAlign: 'top', fontWeight: '600' }}>
                                        {item.quantity || item.ordered} {item.unit}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '13px', color: '#0f172a', textAlign: 'right', verticalAlign: 'top' }}>
                                        {formatCurrency(item.rate)}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '13px', color: '#0f172a', textAlign: 'right', verticalAlign: 'top', fontWeight: '700' }}>
                                        {formatCurrency(item.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals Section */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
                    <div style={{ width: '320px', backgroundColor: '#f8fafc', borderRadius: '8px', padding: '20px', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                            <span style={{ color: '#64748b', fontWeight: '600' }}>Sub Total</span>
                            <span style={{ color: '#0f172a', fontWeight: '700' }}>{formatCurrency(order.subTotal)}</span>
                        </div>
                        {order.shippingCharges > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                                <span style={{ color: '#64748b', fontWeight: '600' }}>Shipping Charges</span>
                                <span style={{ color: '#0f172a', fontWeight: '700' }}>{formatCurrency(order.shippingCharges)}</span>
                            </div>
                        )}
                        {order.cgst > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                                <span style={{ color: '#64748b', fontWeight: '600' }}>CGST (9.0%)</span>
                                <span style={{ color: '#0f172a', fontWeight: '700' }}>{formatCurrency(order.cgst)}</span>
                            </div>
                        )}
                        {order.sgst > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                                <span style={{ color: '#64748b', fontWeight: '600' }}>SGST (9.0%)</span>
                                <span style={{ color: '#0f172a', fontWeight: '700' }}>{formatCurrency(order.sgst)}</span>
                            </div>
                        )}
                        {order.igst > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                                <span style={{ color: '#64748b', fontWeight: '600' }}>IGST (18.0%)</span>
                                <span style={{ color: '#0f172a', fontWeight: '700' }}>{formatCurrency(order.igst)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '2px solid #e2e8f0' }}>
                            <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Total</span>
                            <span style={{ fontSize: '18px', fontWeight: '800', color: '#1e40af' }}>{formatCurrency(order.total)}</span>
                        </div>
                    </div>
                </div>

                {/* Notes & Terms */}
                <div className="grid grid-cols-1 gap-6 mb-10" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                    {order.customerNotes && (
                        <div style={{ backgroundColor: '#fdfdfd', padding: '16px', borderRadius: '4px', borderLeft: '4px solid #cbd5e1' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', margin: '0 0 8px 0' }}>
                                Customer Notes
                            </h4>
                            <p style={{ fontSize: '13px', color: '#475569', margin: '0', lineHeight: '1.6' }}>{order.customerNotes}</p>
                        </div>
                    )}

                    {order.termsAndConditions && (
                        <div style={{ backgroundColor: '#fdfdfd', padding: '16px', borderRadius: '4px', borderLeft: '4px solid #cbd5e1' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', margin: '0 0 8px 0' }}>
                                Terms & Conditions
                            </h4>
                            <div style={{ fontSize: '12px', color: '#475569', margin: '0', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                {order.termsAndConditions}
                            </div>
                        </div>
                    )}
                </div>

                {/* Signature Section */}
                <div style={{ marginTop: '64px', display: 'flex', justifyContent: 'flex-end', textAlign: 'center' }}>
                    <div>
                        {branding?.signature?.url ? (
                            <img
                                src={branding.signature.url}
                                alt="Signature"
                                style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain', marginBottom: '8px' }}
                            />
                        ) : (
                            <div style={{ height: '80px', width: '200px', borderBottom: '1px solid #e2e8f0', marginBottom: '8px' }}></div>
                        )}
                        <p style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', margin: '0' }}>
                            Authorized Signature
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
