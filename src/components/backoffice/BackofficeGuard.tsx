import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import BackofficeLayout from "@/components/backoffice/BackofficeLayout";
import LoginPage from "@/pages/backoffice/LoginPage";
import Icon from "@/components/ui/icon";

interface BackofficeGuardProps {
  children: ReactNode;
  module?: string;
}

export default function BackofficeGuard({ children, module }: BackofficeGuardProps) {
  const { user, loading, canModule } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Icon name="Loader2" size={28} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const allowed = !module || canModule(module);

  return (
    <BackofficeLayout>
      {allowed ? (
        children
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <Icon name="Lock" size={40} className="text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-700">Нет доступа</h2>
          <p className="max-w-sm text-sm text-slate-400">
            У вас нет прав на просмотр этого раздела. Обратитесь к руководителю.
          </p>
        </div>
      )}
    </BackofficeLayout>
  );
}
