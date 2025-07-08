
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, DollarSign, User } from "lucide-react";

interface Invoice {
  id: string;
  client: string;
  amount: number;
  dueDate: string;
  status: "pending" | "upcoming" | "paid";
  description: string;
}

interface InvoiceListProps {
  invoices: Invoice[];
}

export const InvoiceList = ({ invoices }: InvoiceListProps) => {
  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No invoices to display
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map((invoice) => (
        <Card key={invoice.id} className="p-4">
          <CardContent className="p-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{invoice.id}</span>
                <Badge className={getStatusColor(invoice.status)}>
                  {invoice.status}
                </Badge>
              </div>
              <span className="font-bold text-green-600">
                KSh {invoice.amount.toLocaleString()}
              </span>
            </div>
            
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <User className="h-3 w-3" />
                <span>{invoice.client}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>
              <p className="text-xs">{invoice.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
