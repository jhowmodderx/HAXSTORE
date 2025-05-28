import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import PixModal from "@/components/pix-modal";
import AdminPanel from "@/components/admin-panel";
import { apiRequest } from "@/lib/queryClient";
import { Gamepad2, Search, ShoppingCart, Edit, Trash2, Settings, Bell, ExternalLink } from "lucide-react";
import type { Product, Warning } from "@shared/schema";

export default function Store() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("featured");

  const isAdmin = user?.role === "admin" || user?.role === "owner";

  const { data: productsData } = useQuery({
    queryKey: ["/api/products"],
    enabled: !!user,
  });

  const { data: warningsData } = useQuery({
    queryKey: ["/api/warnings"],
    enabled: !!user,
  });

  const products = productsData?.products || [];
  const warnings = warningsData?.warnings || [];

  const filteredProducts = products
    .filter((product: Product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a: Product, b: Product) => {
      switch (sortBy) {
        case "price-low":
          return parseFloat(a.price) - parseFloat(b.price);
        case "price-high":
          return parseFloat(b.price) - parseFloat(a.price);
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      }
    });

  const handleBuyProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowPixModal(true);
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      await apiRequest("DELETE", `/api/products/${productId}`, { userId: user?.id });
      toast({
        title: "Produto excluído",
        description: "O produto foi excluído com sucesso.",
      });
      // Refetch products
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao excluir produto.",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(price));
  };

  const calculateDiscount = (oldPrice?: string, newPrice?: string) => {
    if (!oldPrice || !newPrice) return null;
    const discount = ((parseFloat(oldPrice) - parseFloat(newPrice)) / parseFloat(oldPrice)) * 100;
    return Math.round(discount);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--hax-dark))]">
      {/* Header */}
      <header className="hax-surface border-b border-[hsl(var(--hax-red))]/20 sticky top-0 z-40 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Gamepad2 className="h-6 w-6 hax-red" />
                <span className="text-2xl font-bold hax-red">HAX STORE</span>
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => window.open("https://discord.gg/gJ79TUn6Bb", "_blank")}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Discord
              </Button>

              {isAdmin && (
                <Button
                  onClick={() => setShowAdminPanel(true)}
                  className="hax-green-bg hover:bg-[hsl(var(--hax-green-dark))] text-black admin-glow"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              )}

              <div className="flex items-center space-x-2">
                <span className="text-white">Olá, {user?.username}</span>
                <Button
                  onClick={logout}
                  variant="outline"
                  className="border-[hsl(var(--hax-red))] text-[hsl(var(--hax-red))] hover:bg-[hsl(var(--hax-red))] hover:text-white"
                >
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative bg-gradient-to-r from-[hsl(var(--hax-dark))] via-[hsl(var(--hax-dark-light))] to-[hsl(var(--hax-dark))] py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--hax-red))]/10 to-[hsl(var(--hax-green))]/10"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Bem-vindo à HAX STORE
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Sua loja gamer definitiva. Produtos premium, preços imbatíveis e suporte 24/7.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="py-16 bg-[hsl(var(--hax-dark-light))]">
        <div className="container mx-auto px-4">
          
          {/* Warning Messages */}
          {warnings.length > 0 && (
            <div className="mb-8">
              {warnings.map((warning: Warning) => (
                <div key={warning.id} className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4 animate-slide-up">
                  <div className="flex items-center">
                    <Bell className="h-5 w-5 text-yellow-500 mr-3" />
                    <span className="text-yellow-200">{warning.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Products Section Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Produtos em Destaque</h2>
              <p className="text-gray-400">Confira nossos produtos mais populares</p>
            </div>
            
            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[hsl(var(--hax-surface))] border-border focus:border-[hsl(var(--hax-red))]"
                />
              </div>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48 bg-[hsl(var(--hax-surface))] border-border focus:border-[hsl(var(--hax-red))]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Destaque</SelectItem>
                  <SelectItem value="price-low">Menor Preço</SelectItem>
                  <SelectItem value="price-high">Maior Preço</SelectItem>
                  <SelectItem value="newest">Mais Recente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product: Product) => (
              <Card key={product.id} className="glass-card rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group">
                <CardContent className="p-6 relative">
                  
                  {/* Featured Badge */}
                  {product.isFeatured && (
                    <Badge className="absolute top-4 left-4 hax-red-bg text-white">
                      DESTAQUE
                    </Badge>
                  )}
                  
                  {/* Admin Controls */}
                  {isAdmin && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          // TODO: Implement edit product modal
                          toast({
                            title: "Em desenvolvimento",
                            description: "Função de edição em desenvolvimento.",
                          });
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Product Image */}
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white group-hover:text-[hsl(var(--hax-red))] transition-colors">
                      {product.name}
                    </h3>
                    
                    <p className="text-gray-300 text-sm">
                      {product.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        {product.oldPrice && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400 line-through text-sm">
                              {formatPrice(product.oldPrice)}
                            </span>
                            <Badge className="bg-green-500 text-white text-xs">
                              -{calculateDiscount(product.oldPrice, product.price)}%
                            </Badge>
                          </div>
                        )}
                        <div className="text-2xl font-bold hax-green">
                          {formatPrice(product.price)}
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => handleBuyProduct(product)}
                        className="hax-red-bg hover:bg-[hsl(var(--hax-red-dark))] text-white"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Comprar
                      </Button>
                    </div>
                    
                    {/* Product Tags */}
                    {product.tags && product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {product.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Nenhum produto encontrado.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="hax-surface border-t border-[hsl(var(--hax-red))]/20 py-12 mt-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Gamepad2 className="h-6 w-6 hax-red" />
                <span className="text-xl font-bold hax-red">HAX STORE</span>
              </div>
              <p className="text-gray-400 mb-4">
                Sua loja gamer definitiva. Oferecemos os melhores produtos com qualidade premium e suporte especializado para gamers.
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              &copy; 2025 HAX STORE. Todos os direitos reservados. Desenvolvido com ❤️ para gamers.
            </p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showPixModal && selectedProduct && (
        <PixModal
          product={selectedProduct}
          onClose={() => {
            setShowPixModal(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {showAdminPanel && isAdmin && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
    </div>
  );
}
