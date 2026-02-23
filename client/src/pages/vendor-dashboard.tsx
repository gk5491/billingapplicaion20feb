import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, FileText, IndianRupee, CreditCard, Clock, ArrowRight } from "lucide-react";

interface DashboardStats {
  totalPurchaseOrders: number;
  pendingBills: number;
  outstandingAmount: number;
  paidAmount: number;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    date: string;
    amount?: number;
  }>;
}

export default function VendorDashboard() {
  const [, setLocation] = useLocation();
  const { user, token } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalPurchaseOrders: 0,
    pendingBills: 0,
    outstandingAmount: 0,
    paidAmount: 0,
    recentActivities: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/vendor/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) setStats(data.data);
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, [token]);

  const statCards = [
    {
      title: "Total Purchase Orders",
      value: stats.totalPurchaseOrders,
      icon: ShoppingBag,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/vendor/purchase-orders",
    },
    {
      title: "Pending Bills",
      value: stats.pendingBills,
      icon: FileText,
      color: "text-orange-600",
      bg: "bg-orange-50",
      href: "/vendor/bills",
    },
    {
      title: "Outstanding Amount",
      value: `₹${stats.outstandingAmount.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "text-red-600",
      bg: "bg-red-50",
      href: "/vendor/bills",
    },
    {
      title: "Paid Amount",
      value: `₹${stats.paidAmount.toLocaleString("en-IN")}`,
      icon: CreditCard,
      color: "text-green-600",
      bg: "bg-green-50",
      href: "/vendor/payment-history",
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" data-testid="text-vendor-dashboard-title">
          Vendor Dashboard
        </h1>
        <p className="text-slate-500 mt-1">Welcome back, {user?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card
            key={card.title}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setLocation(card.href)}
            data-testid={`card-stat-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-lg ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300" />
              </div>
              <div className="mt-3">
                <p className="text-sm text-slate-500">{card.title}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{isLoading ? "..." : card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-400" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-slate-400 text-sm">Loading...</p>
          ) : stats.recentActivities.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {stats.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div className="h-2 w-2 rounded-full bg-blue-400 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{activity.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(activity.date).toLocaleDateString("en-IN")}</p>
                  </div>
                  {activity.amount !== undefined && (
                    <Badge variant="outline" className="shrink-0">₹{activity.amount.toLocaleString("en-IN")}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
