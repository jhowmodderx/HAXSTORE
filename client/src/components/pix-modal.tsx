import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Copy, Upload, QrCode, CheckCircle } from "lucide-react";
import type { Product } from "@shared/schema";

interface PixModalProps {
  product: Product;
  onClose: () => void;
}

export default function PixModal({ product, onClose }: PixModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: pixSettingData } = useQuery({
    queryKey: ["/api/settings/pixKey"],
  });

  const pixKey = pixSettingData?.setting?.value || "Chave PIX não configurada";

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/payments", {
        userId: user?.id,
        productId: product.id,
        amount: product.price,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pagamento confirmado!",
        description: "Seu pagamento foi registrado e está aguardando aprovação.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments/pending"] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao processar pagamento.",
        variant: "destructive",
      });
    },
  });

  const uploadProofMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("proof", file);
      
      const response = await fetch(`/api/payments/1/upload-proof`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload proof");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Comprovante enviado!",
        description: "Seu comprovante foi enviado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao enviar comprovante.",
        variant: "destructive",
      });
    },
  });

  const copyPixKey = async () => {
    try {
      await navigator.clipboard.writeText(pixKey);
      toast({
        title: "Chave PIX copiada!",
        description: "A chave PIX foi copiada para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao copiar chave PIX.",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadProof = () => {
    if (selectedFile) {
      uploadProofMutation.mutate(selectedFile);
    }
  };

  const handleConfirmPayment = () => {
    createPaymentMutation.mutate();
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(price));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass-card border-[hsl(var(--hax-red))]/30">
        <DialogHeader>
          <DialogTitle className="hax-red">Pagamento via PIX</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Summary */}
          <Card className="bg-[hsl(var(--hax-dark))] border-border">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">{product.name}</span>
                <span className="text-[hsl(var(--hax-green))] font-semibold">
                  {formatPrice(product.price)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* PIX Instructions */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-gray-300 text-sm">
              <QrCode className="h-4 w-4 hax-red" />
              <span>Escaneie o QR Code ou copie a chave PIX abaixo:</span>
            </div>

            {/* PIX Key */}
            <Card className="bg-[hsl(var(--hax-dark))] border-border">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <code className="font-mono text-sm text-white break-all">
                    {pixKey}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-2 hax-red"
                    onClick={copyPixKey}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* File Upload Section */}
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-[hsl(var(--hax-red))] transition-colors">
              <Upload className="h-8 w-8 text-gray-400 mb-3 mx-auto" />
              <p className="text-gray-300 mb-2">Anexar Comprovante de Pagamento</p>
              <p className="text-xs text-gray-500 mb-4">PNG, JPG ou PDF até 5MB</p>
              
              <div className="space-y-3">
                <div>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="bg-[hsl(var(--hax-surface))] border-border"
                  />
                </div>
                
                {selectedFile && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{selectedFile.name}</span>
                    <Button
                      size="sm"
                      onClick={handleUploadProof}
                      disabled={uploadProofMutation.isPending}
                      className="hax-red-bg hover:bg-[hsl(var(--hax-red-dark))]"
                    >
                      {uploadProofMutation.isPending ? "Enviando..." : "Enviar"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-3 pt-4">
              <Button
                onClick={handleConfirmPayment}
                disabled={createPaymentMutation.isPending}
                className="hax-green-bg hover:bg-[hsl(var(--hax-green-dark))] text-black"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {createPaymentMutation.isPending ? "Confirmando..." : "Confirmar Pagamento"}
              </Button>

              <Button
                variant="outline"
                onClick={onClose}
                className="border-border hover:border-gray-500"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
