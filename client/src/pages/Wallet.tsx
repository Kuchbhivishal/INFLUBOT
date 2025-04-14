import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@/contexts/WalletContext";
import { useAuth } from "@/contexts/AuthContext";
import WalletRechargeModal from "@/components/wallet/WalletRechargeModal";
import { Transaction } from "@shared/schema";
import { Loader2, PlusCircle, ArrowUpCircle, ArrowDownCircle, Clock } from "lucide-react";

// Helper function to format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const Wallet = () => {
  const { balance } = useWallet();
  const { user } = useAuth();
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  
  // Fetch transactions
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: [`/api/transactions/${user?.id}`],
  });

  // Filter transactions by type
  const deposits = transactions?.filter(tx => tx.type === 'deposit');
  const charges = transactions?.filter(tx => tx.type === 'charge');
  const pendingTransactions = transactions?.filter(tx => tx.status === 'pending');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Wallet</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Balance Card */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gray-600">Available Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end">
              <span className="text-4xl font-bold">₹{balance.toFixed(2)}</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              You can use your balance to interact with influencers.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => setIsRechargeModalOpen(true)}
              className="w-full bg-primary text-white hover:bg-primary/90 flex items-center justify-center"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Add Money
            </Button>
          </CardFooter>
        </Card>

        {/* Quick Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Total Recharged</p>
              <p className="text-xl font-semibold">
                ₹{deposits?.reduce((sum, tx) => sum + tx.amount, 0)?.toFixed(2) || "0.00"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Spent</p>
              <p className="text-xl font-semibold">
                ₹{charges?.reduce((sum, tx) => sum + tx.amount, 0)?.toFixed(2) || "0.00"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>View your recent transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="all">All Transactions</TabsTrigger>
              <TabsTrigger value="recharges">Recharges</TabsTrigger>
              <TabsTrigger value="spending">Spending</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : transactions && transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center">
                      {transaction.type === 'deposit' ? (
                        <ArrowUpCircle className="h-8 w-8 text-green-500 mr-3" />
                      ) : (
                        <ArrowDownCircle className="h-8 w-8 text-red-500 mr-3" />
                      )}
                      <div>
                        <p className="font-medium">
                          {transaction.type === 'deposit' ? 'Wallet Recharge' : 'Interaction Payment'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(transaction.createdAt.toString())}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'deposit' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                      </p>
                      <p className="text-xs">
                        {transaction.status === 'completed' ? (
                          <span className="text-green-600">Completed</span>
                        ) : transaction.status === 'pending' ? (
                          <span className="text-amber-600 flex items-center justify-end">
                            <Clock className="h-3 w-3 mr-1" /> Pending
                          </span>
                        ) : (
                          <span className="text-red-600">Failed</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <p>No transactions yet.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="recharges" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : deposits && deposits.length > 0 ? (
                deposits.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center">
                      <ArrowUpCircle className="h-8 w-8 text-green-500 mr-3" />
                      <div>
                        <p className="font-medium">Wallet Recharge</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(transaction.createdAt.toString())}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">+₹{transaction.amount.toFixed(2)}</p>
                      <p className="text-xs">
                        {transaction.status === 'completed' ? (
                          <span className="text-green-600">Completed</span>
                        ) : transaction.status === 'pending' ? (
                          <span className="text-amber-600 flex items-center justify-end">
                            <Clock className="h-3 w-3 mr-1" /> Pending
                          </span>
                        ) : (
                          <span className="text-red-600">Failed</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <p>No recharges yet.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="spending" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : charges && charges.length > 0 ? (
                charges.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center">
                      <ArrowDownCircle className="h-8 w-8 text-red-500 mr-3" />
                      <div>
                        <p className="font-medium">Interaction Payment</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(transaction.createdAt.toString())}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">-₹{transaction.amount.toFixed(2)}</p>
                      <p className="text-xs">
                        {transaction.status === 'completed' ? (
                          <span className="text-green-600">Completed</span>
                        ) : transaction.status === 'pending' ? (
                          <span className="text-amber-600 flex items-center justify-end">
                            <Clock className="h-3 w-3 mr-1" /> Pending
                          </span>
                        ) : (
                          <span className="text-red-600">Failed</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <p>No spending yet.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <WalletRechargeModal open={isRechargeModalOpen} onOpenChange={setIsRechargeModalOpen} />
    </div>
  );
};

export default Wallet;
