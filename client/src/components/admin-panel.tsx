import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Shield, BarChart3, Package, CreditCard, Users, Settings, 
  FileText, Plus, Check, X, Eye, Save, Trash2, Edit,
  Clock, CheckCircle, AlertTriangle, UserPlus, UserMinus
} from "lucide-react";
import type { Product, Payment, User, AdminRequest, ActivityLog } from "@shared/schema";

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    oldPrice: "",
    imageUrl: "",
    isFeatured: false,
    tags: "",
  });
  const [pixKey, setPixKey] = useState("");

  const isOwner = user?.role === "owner";

  // Queries
  const { data: pendingPaymentsData } = useQuery({
    queryKey: ["/api/admin/payments/pending"],
  });

  const { data: paymentHistoryData } = useQuery({
    queryKey: ["/api/admin/payments/history"],
  });

  const { data: adminRequestsData } = useQuery({
    queryKey: ["/api/admin/requests"],
    enabled: isOwner,
  });

  const { data: usersData } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: logsData } = useQuery({
    queryKey: ["/api/admin/logs"],
  });

  const { data: productsData } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: pixSettingData } = useQuery({
    queryKey: ["/api/settings/pixKey"],
  });

  const pendingPayments = pendingPaymentsData?.payments || [];
  const paymentHistory = paymentHistoryData?.payments || [];
  const adminRequests = adminRequestsData?.requests || [];
  const users = usersData?.users || [];
  const logs = logsData?.logs || [];
  const products = productsData?.products || [];
  const currentPixKey = pixSettingData?.setting?.value || "";

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      return apiRequest("POST", "/api/products", {
        ...productData,
        userId: user?.id,
      });
    },
    onSuccess: () => {
      toast({
        title: "Produto criado!",
        description: "O produto foi criado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setNewProduct({
        name: "",
        description: "",
        price: "",
        oldPrice: "",
        imageUrl: "",
        isFeatured: false,
        tags: "",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar produto.",
        variant: "destructive",
      });
    },
  });

  const approvePaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      return apiRequest("PUT", `/api/admin/payments/${paymentId}/approve`, {
        approvedBy: user?.id,
      });
    },
    onSuccess: () => {
      toast({
        title: "Pagamento aprovado!",
        description: "O pagamento foi aprovado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments/history"] });
    },
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: number; reason: string }) => {
      return apiRequest("PUT", `/api/admin/payments/${paymentId}/reject`, {
        approvedBy: user?.id,
        rejectionReason: reason,
      });
    },
    onSuccess: () => {
      toast({
        title: "Pagamento rejeitado!",
        description: "O pagamento foi rejeitado.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments/history"] });
    },
  });

  const approveAdminRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest("PUT", `/api/admin/requests/${requestId}/approve`, {
        approvedBy: user?.id,
      });
    },
    onSuccess: () => {
      toast({
        title: "Solicitação aprovada!",
        description: "O usuário agora tem acesso administrativo.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  const rejectAdminRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest("PUT", `/api/admin/requests/${requestId}/reject`, {
        approvedBy: user?.id,
      });
    },
    onSuccess: () => {
      toast({
        title: "Solicitação rejeitada!",
        description: "A solicitação de acesso foi rejeitada.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/requests"] });
    },
  });

  const updatePixKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      return apiRequest("POST", "/api/settings", {
        key: "pixKey",
        value: key,
        updatedBy: user?.id,
      });
    },
    onSuccess: () => {
      toast({
        title: "Chave PIX atualizada!",
        description: "A chave PIX foi atualizada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/pixKey"] });
    },
  });

  const promoteUserMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: number; newRole: string }) => {
      return apiRequest("PUT", `/api/admin/users/${userId}/role`, {
        role: newRole,
        updatedBy: user?.id,
      });
    },
    onSuccess: () => {
      toast({
        title: "Cargo atualizado!",
        description: "O cargo do usuário foi atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
    },
  });

  const handleCreateProduct = () => {
    const tagsArray = newProduct.tags.split(",").map(tag => tag.trim()).filter(Boolean);
    
    createProductMutation.mutate({
      ...newProduct,
      price: parseFloat(newProduct.price),
      oldPrice: newProduct.oldPrice ? parseFloat(newProduct.oldPrice) : undefined,
      tags: tagsArray,
    });
  };

  const handleApprovePayment = (paymentId: number) => {
    approvePaymentMutation.mutate(paymentId);
  };

  const handleRejectPayment = (paymentId: number) => {
    const reason = prompt("Motivo da rejeição:");
    if (reason) {
      rejectPaymentMutation.mutate({ paymentId, reason });
    }
  };

  const handleSavePixKey = () => {
    updatePixKeyMutation.mutate(pixKey);
  };

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(typeof price === "string" ? parseFloat(price) : price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR");
  };

  const stats = {
    pendingPayments: pendingPayments.length,
    approvedPayments: paymentHistory.filter((p: any) => p.status === "approved").length,
    totalUsers: users.length,
    activeProducts: products.filter((p: Product) => p.isActive).length,
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden glass-card border-[hsl(var(--hax-green))]/30">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 hax-green" />
            <div>
              <DialogTitle className="text-2xl hax-green">Painel Administrativo</DialogTitle>
              <p className="text-muted-foreground">{user?.role === "owner" ? "Owner" : "Admin"} Level Access</p>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Produtos</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span>Pagamentos</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Configurações</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Logs</span>
            </TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto scrollbar-thin max-h-[60vh]">
            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-[hsl(var(--hax-dark))] border-blue-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Pagamentos Pendentes</p>
                        <p className="text-2xl font-bold text-blue-400">{stats.pendingPayments}</p>
                      </div>
                      <Clock className="h-6 w-6 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[hsl(var(--hax-dark))] border-green-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Pagamentos Aprovados</p>
                        <p className="text-2xl font-bold text-green-400">{stats.approvedPayments}</p>
                      </div>
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[hsl(var(--hax-dark))] border-yellow-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Produtos Ativos</p>
                        <p className="text-2xl font-bold text-yellow-400">{stats.activeProducts}</p>
                      </div>
                      <Package className="h-6 w-6 text-yellow-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[hsl(var(--hax-dark))] border-purple-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Total de Usuários</p>
                        <p className="text-2xl font-bold text-purple-400">{stats.totalUsers}</p>
                      </div>
                      <Users className="h-6 w-6 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className="bg-[hsl(var(--hax-dark))]">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Atividade Recente</h3>
                  <div className="space-y-3">
                    {logs.slice(0, 5).map((log: any) => (
                      <div key={log.id} className="flex items-center space-x-3 p-3 bg-[hsl(var(--hax-surface))] rounded-lg">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-white text-sm">{log.action}</p>
                          <p className="text-gray-400 text-xs">{formatDate(log.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Gerenciar Produtos</h3>
              </div>

              {/* Product Form */}
              <Card className="bg-[hsl(var(--hax-dark))]">
                <CardContent className="p-6">
                  <h4 className="text-md font-semibold text-white mb-4">Novo Produto</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome do Produto</Label>
                      <Input
                        id="name"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        className="bg-[hsl(var(--hax-surface))] border-border focus:border-[hsl(var(--hax-green))]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">Preço (R$)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                        className="bg-[hsl(var(--hax-surface))] border-border focus:border-[hsl(var(--hax-green))]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="oldPrice">Preço Antigo (R$)</Label>
                      <Input
                        id="oldPrice"
                        type="number"
                        step="0.01"
                        value={newProduct.oldPrice}
                        onChange={(e) => setNewProduct({ ...newProduct, oldPrice: e.target.value })}
                        className="bg-[hsl(var(--hax-surface))] border-border focus:border-[hsl(var(--hax-green))]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="imageUrl">URL da Imagem</Label>
                      <Input
                        id="imageUrl"
                        type="url"
                        value={newProduct.imageUrl}
                        onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                        className="bg-[hsl(var(--hax-surface))] border-border focus:border-[hsl(var(--hax-green))]"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                      <Input
                        id="tags"
                        value={newProduct.tags}
                        onChange={(e) => setNewProduct({ ...newProduct, tags: e.target.value })}
                        placeholder="RGB, Gaming, Premium"
                        className="bg-[hsl(var(--hax-surface))] border-border focus:border-[hsl(var(--hax-green))]"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      rows={3}
                      className="bg-[hsl(var(--hax-surface))] border-border focus:border-[hsl(var(--hax-green))]"
                    />
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={handleCreateProduct}
                      disabled={createProductMutation.isPending}
                      className="hax-green-bg hover:bg-[hsl(var(--hax-green-dark))] text-black"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {createProductMutation.isPending ? "Salvando..." : "Salvar Produto"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Products List */}
              <Card className="bg-[hsl(var(--hax-dark))]">
                <CardContent className="p-6">
                  <h4 className="text-md font-semibold text-white mb-4">Produtos Existentes</h4>
                  <div className="space-y-3">
                    {products.map((product: Product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-[hsl(var(--hax-surface))] rounded-lg">
                        <div className="flex items-center space-x-3">
                          {product.imageUrl && (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="text-white font-medium">{product.name}</p>
                            <p className="text-gray-400 text-sm">{formatPrice(product.price)}</p>
                          </div>
                          {product.isFeatured && (
                            <Badge className="hax-red-bg text-white">DESTAQUE</Badge>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Gerenciar Pagamentos</h3>

              {/* Pending Payments */}
              <Card className="bg-[hsl(var(--hax-dark))]">
                <CardContent className="p-6">
                  <h4 className="text-md font-semibold text-yellow-400 mb-4 flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Pagamentos Pendentes
                  </h4>
                  <div className="space-y-3">
                    {pendingPayments.map((payment: any) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 bg-[hsl(var(--hax-surface))] rounded-lg border border-yellow-500/30">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="text-white font-medium">{payment.product.name}</p>
                            <p className="text-gray-400 text-sm">
                              {payment.user.username} - IP: {payment.user.ipAddress || "N/A"}
                            </p>
                            <p className="text-yellow-400 text-sm">
                              {formatDate(payment.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-[hsl(var(--hax-green))] font-bold">
                            {formatPrice(payment.amount)}
                          </span>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprovePayment(payment.id)}
                              disabled={approvePaymentMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRejectPayment(payment.id)}
                              disabled={rejectPaymentMutation.isPending}
                              variant="destructive"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {pendingPayments.length === 0 && (
                      <p className="text-gray-400 text-center py-4">Nenhum pagamento pendente.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card className="bg-[hsl(var(--hax-dark))]">
                <CardContent className="p-6">
                  <h4 className="text-md font-semibold text-green-400 mb-4 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Histórico de Pagamentos
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-thin">
                    {paymentHistory.map((payment: any) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-[hsl(var(--hax-surface))] rounded-lg">
                        <div>
                          <p className="text-white text-sm">
                            {payment.product.name} - {payment.user.username}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {formatDate(payment.processedAt || payment.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-medium">{formatPrice(payment.amount)}</p>
                          <Badge className={payment.status === "approved" ? "bg-green-500" : "bg-red-500"}>
                            {payment.status === "approved" ? "Aprovado" : "Rejeitado"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Gerenciar Usuários</h3>

              {/* Admin Requests (Owner only) */}
              {isOwner && (
                <Card className="bg-[hsl(var(--hax-dark))]">
                  <CardContent className="p-6">
                    <h4 className="text-md font-semibold text-orange-400 mb-4 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Solicitações de Acesso Admin
                    </h4>
                    <div className="space-y-3">
                      {adminRequests.map((request: any) => (
                        <div key={request.id} className="flex items-center justify-between p-4 bg-[hsl(var(--hax-surface))] rounded-lg border border-orange-500/30">
                          <div>
                            <p className="text-white font-medium">{request.user.username}</p>
                            <p className="text-gray-400 text-sm">
                              IP: {request.user.ipAddress || "N/A"} - {formatDate(request.createdAt)}
                            </p>
                            <p className="text-orange-400 text-sm">Solicitou acesso administrativo</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => approveAdminRequestMutation.mutate(request.id)}
                              disabled={approveAdminRequestMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              onClick={() => rejectAdminRequestMutation.mutate(request.id)}
                              disabled={rejectAdminRequestMutation.isPending}
                              variant="destructive"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        </div>
                      ))}
                      {adminRequests.length === 0 && (
                        <p className="text-gray-400 text-center py-4">Nenhuma solicitação pendente.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* User List */}
              <Card className="bg-[hsl(var(--hax-dark))]">
                <CardContent className="p-6">
                  <h4 className="text-md font-semibold text-white mb-4">Lista de Usuários</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-thin">
                    {users.map((user: User) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-[hsl(var(--hax-surface))] rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-[hsl(var(--hax-red))] to-[hsl(var(--hax-green))] rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{user.username}</p>
                            <p className="text-gray-400 text-sm">
                              {user.lastLoginAt ? `Último acesso: ${formatDate(user.lastLoginAt)}` : "Nunca fez login"} 
                              {user.ipAddress && ` - IP: ${user.ipAddress}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={
                            user.role === "owner" ? "bg-purple-500" :
                            user.role === "admin" ? "bg-blue-500" : "bg-gray-500"
                          }>
                            {user.role === "owner" ? "Owner" : user.role === "admin" ? "Admin" : "Usuário"}
                          </Badge>
                          {/* Only owner can promote users and can't promote other owners */}
                          {isOwner && user.role !== "owner" && (
                            <div className="flex space-x-1">
                              {user.role === "user" && (
                                <Button
                                  size="sm"
                                  onClick={() => promoteUserMutation.mutate({ userId: user.id, newRole: "admin" })}
                                  disabled={promoteUserMutation.isPending}
                                  className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1"
                                >
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  Promover
                                </Button>
                              )}
                              {user.role === "admin" && (
                                <Button
                                  size="sm"
                                  onClick={() => promoteUserMutation.mutate({ userId: user.id, newRole: "user" })}
                                  disabled={promoteUserMutation.isPending}
                                  variant="outline"
                                  className="text-xs px-2 py-1 border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
                                >
                                  <UserMinus className="h-3 w-3 mr-1" />
                                  Rebaixar
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Configurações do Sistema</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PIX Settings */}
                <Card className="bg-[hsl(var(--hax-dark))]">
                  <CardContent className="p-6">
                    <h4 className="text-md font-semibold text-white mb-4 flex items-center">
                      <CreditCard className="h-4 w-4 hax-green mr-2" />
                      Configurações PIX
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="pixKey">Chave PIX</Label>
                        <Input
                          id="pixKey"
                          value={pixKey || currentPixKey}
                          onChange={(e) => setPixKey(e.target.value)}
                          className="bg-[hsl(var(--hax-surface))] border-border focus:border-[hsl(var(--hax-green))] font-mono text-sm"
                        />
                      </div>
                      <Button
                        onClick={handleSavePixKey}
                        disabled={updatePixKeyMutation.isPending}
                        className="hax-green-bg hover:bg-[hsl(var(--hax-green-dark))] text-black"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {updatePixKeyMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs" className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Logs do Sistema</h3>

              <Card className="bg-[hsl(var(--hax-dark))]">
                <CardContent className="p-6">
                  <h4 className="text-md font-semibold text-white mb-4">Atividades Recentes</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
                    {logs.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-3 bg-[hsl(var(--hax-surface))] rounded text-sm">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <div>
                            <p className="text-white">{log.action}</p>
                            <p className="text-gray-400 text-xs">
                              {log.user?.username || "Sistema"} - IP: {log.ipAddress || "N/A"}
                            </p>
                          </div>
                        </div>
                        <span className="text-gray-400 text-xs">{formatDate(log.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
