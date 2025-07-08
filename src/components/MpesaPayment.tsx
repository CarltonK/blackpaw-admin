
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MpesaPaymentProps {
  userPhone: string;
}

export const MpesaPayment = ({ userPhone }: MpesaPaymentProps) => {
  const [amount, setAmount] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");

  const mockInvoices = [
    { id: "INV-001", client: "Safaricom Ltd", amount: 25000 },
    { id: "INV-002", client: "Equity Bank", amount: 45000 },
  ];

  const handlePayment = async () => {
    setIsProcessing(true);
    setPaymentStatus("processing");

    // Simulate M-Pesa STK push
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentStatus("success");
      
      // Reset form after success
      setTimeout(() => {
        setPaymentStatus("idle");
        setAmount("");
        setSelectedInvoice("");
      }, 3000);
    }, 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            M-Pesa Payment
          </CardTitle>
          <CardDescription>
            Pay your invoices using M-Pesa STK Push
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoice">Select Invoice</Label>
            <Select value={selectedInvoice} onValueChange={setSelectedInvoice}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an invoice to pay" />
              </SelectTrigger>
              <SelectContent>
                {mockInvoices.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    {invoice.id} - {invoice.client} (KSh {invoice.amount.toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">M-Pesa Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={userPhone}
              disabled
              className="bg-gray-100 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500">Phone number is pre-selected from your profile</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (KSh)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {paymentStatus === "processing" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Processing payment... Please check your phone for M-Pesa prompt.
              </AlertDescription>
            </Alert>
          )}

          {paymentStatus === "success" && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Payment successful! Your invoice has been marked as paid.
              </AlertDescription>
            </Alert>
          )}

          {paymentStatus === "error" && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Payment failed. Please try again or contact support.
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handlePayment}
            disabled={!amount || !selectedInvoice || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>Processing...</>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay with M-Pesa
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How M-Pesa Payment Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Select the invoice you want to pay</li>
            <li>Your M-Pesa phone number is automatically selected</li>
            <li>Enter the payment amount</li>
            <li>Click "Pay with M-Pesa"</li>
            <li>You'll receive an STK push notification on your phone</li>
            <li>Enter your M-Pesa PIN to complete the payment</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};
