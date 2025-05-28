import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Gamepad2 } from "lucide-react";

export default function Register() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/auth/register", {
        username: username.toLowerCase(),
        password,
      });

      toast({
        title: "Registro realizado!",
        description: "Sua conta foi criada com sucesso. Faça login para continuar.",
      });

      setLocation("/login");
    } catch (error: any) {
      toast({
        title: "Erro no Registro",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--hax-dark))] flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card border-[hsl(var(--hax-red))]">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Gamepad2 className="h-8 w-8 hax-red mr-2" />
            <CardTitle className="text-2xl hax-red">HAX STORE</CardTitle>
          </div>
          <p className="text-muted-foreground">Crie sua conta</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Escolha um usuário"
                required
                className="bg-[hsl(var(--hax-surface))] border-border focus:border-[hsl(var(--hax-red))]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Escolha uma senha"
                required
                className="bg-[hsl(var(--hax-surface))] border-border focus:border-[hsl(var(--hax-red))]"
              />
            </div>
            <Button
              type="submit"
              className="w-full hax-red-bg hover:bg-[hsl(var(--hax-red-dark))] text-white"
              disabled={isLoading}
            >
              {isLoading ? "Registrando..." : "Registrar"}
            </Button>
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="hax-red"
                onClick={() => setLocation("/login")}
              >
                Já tem conta? Entrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
