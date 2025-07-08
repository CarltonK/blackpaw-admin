
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, CreditCard, FileText } from "lucide-react";
import { ProfileCard } from "@/components/ProfileCard";
import { InvoiceList } from "@/components/InvoiceList";
import { MpesaPayment } from "@/components/MpesaPayment";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data - in a real app, this would come from your backend
  const userProfile = {
    name: "John Kamau",
    email: "john@example.com",
    phone: "+254712345678",
    business: "Kamau Consulting",
    joinDate: "March 2024"
  };

  const invoices = [
    {
      id: "INV-001",
      client: "Safaricom Ltd",
      amount: 25000,
      dueDate: "2024-12-15",
      status: "pending" as const,
      description: "Website Development Services"
    },
    {
      id: "INV-002", 
      client: "Equity Bank",
      amount: 45000,
      dueDate: "2024-12-20",
      status: "upcoming" as const,
      description: "Mobile App Development"
    },
    {
      id: "INV-003",
      client: "KCB Bank",
      amount: 15000,
      dueDate: "2024-11-30",
      status: "paid" as const,
      description: "UI/UX Design"
    }
  ];

  const upcomingInvoices = invoices.filter(inv => inv.status === "upcoming" || inv.status === "pending");
  const paidInvoices = invoices.filter(inv => inv.status === "paid");

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {userProfile.name}
          </h1>
          <p className="text-gray-600">Manage your invoices and payments</p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              M-Pesa Pay
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    KSh {upcomingInvoices.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {upcomingInvoices.length} invoices
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    KSh {paidInvoices.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {paidInvoices.length} invoices
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Next Due</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Dec 15</div>
                  <p className="text-xs text-muted-foreground">
                    KSh 25,000 due
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Invoices</CardTitle>
                  <CardDescription>Invoices due soon</CardDescription>
                </CardHeader>
                <CardContent>
                  <InvoiceList invoices={upcomingInvoices} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Payments</CardTitle>
                  <CardDescription>Recently paid invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  <InvoiceList invoices={paidInvoices} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <ProfileCard profile={userProfile} />
          </TabsContent>

          <TabsContent value="payments">
            <MpesaPayment userPhone={userProfile.phone} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
