
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Bell, Calendar, TrendingUp, AlertTriangle } from "lucide-react";

interface Invoice {
  id: string;
  client: string;
  amount: number;
  dueDate: string;
  status: "pending" | "upcoming" | "paid";
  description: string;
}

interface AIRemindersProps {
  invoices: Invoice[];
}

export const AIReminders = ({ invoices }: AIRemindersProps) => {
  // AI-generated insights (in a real app, this would come from your AI service)
  const insights = [
    {
      type: "urgent",
      title: "Payment Due Soon",
      message: "Invoice INV-001 from Safaricom Ltd (KSh 25,000) is due in 3 days. Consider sending a reminder.",
      icon: AlertTriangle,
      color: "bg-red-100 text-red-800"
    },
    {
      type: "opportunity",
      title: "Follow-up Opportunity", 
      message: "Client 'Equity Bank' has consistently paid on time. Consider proposing a long-term contract.",
      icon: TrendingUp,
      color: "bg-green-100 text-green-800"
    },
    {
      type: "reminder",
      title: "Weekly Summary",
      message: "You have 2 pending invoices totaling KSh 70,000. Average payment cycle is 14 days.",
      icon: Calendar,
      color: "bg-blue-100 text-blue-800"
    }
  ];

  const upcomingReminders = [
    {
      date: "Tomorrow",
      task: "Send payment reminder to Safaricom Ltd",
      invoice: "INV-001"
    },
    {
      date: "Dec 18",
      task: "Follow up on Equity Bank invoice",
      invoice: "INV-002"
    },
    {
      date: "Dec 25",
      task: "Send holiday greetings to top clients",
      invoice: "General"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI-Powered Insights
          </CardTitle>
          <CardDescription>
            Smart recommendations based on your invoice patterns
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {insights.map((insight, index) => (
            <div key={index} className="flex items-start gap-3 p-4 rounded-lg border">
              <div className={`p-2 rounded-full ${insight.color}`}>
                <insight.icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">{insight.title}</h4>
                <p className="text-sm text-gray-600">{insight.message}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {insight.type}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-600" />
            Upcoming Reminders
          </CardTitle>
          <CardDescription>
            Automated tasks to help you stay on top of your business
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            {upcomingReminders.map((reminder, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-sm">{reminder.task}</p>
                  <p className="text-xs text-gray-500">
                    {reminder.invoice !== "General" && `Invoice: ${reminder.invoice}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{reminder.date}</p>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Mark Done
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Analytics Summary</CardTitle>
          <CardDescription>
            AI-generated insights about your business performance
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-blue-50">
              <h4 className="font-medium text-blue-900 mb-2">Payment Patterns</h4>
              <p className="text-sm text-blue-700">
                Your clients typically pay within 10-15 days. Safaricom Ltd is your most reliable client with 100% on-time payments.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-green-50">
              <h4 className="font-medium text-green-900 mb-2">Revenue Trends</h4>
              <p className="text-sm text-green-700">
                Your monthly revenue has grown 15% over the last quarter. Consider raising your rates for new projects.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-purple-50">
              <h4 className="font-medium text-purple-900 mb-2">Client Insights</h4>
              <p className="text-sm text-purple-700">
                Banking clients (Equity, KCB) tend to have larger projects. Focus marketing efforts on financial sector.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-orange-50">
              <h4 className="font-medium text-orange-900 mb-2">Recommendations</h4>
              <p className="text-sm text-orange-700">
                Send payment reminders 3 days before due date to improve cash flow. Success rate increases by 40%.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
