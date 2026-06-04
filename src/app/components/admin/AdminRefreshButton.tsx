import { RefreshCw } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

type AdminRefreshButtonProps = {
  onClick: () => void;
  isFetching?: boolean;
  className?: string;
};

export function AdminRefreshButton({
  onClick,
  isFetching = false,
  className = '',
}: AdminRefreshButtonProps) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isFetching}
      className={`px-4 py-2 bg-card text-card-foreground border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      <RefreshCw className={`w-4 h-4 shrink-0 ${isFetching ? 'animate-spin' : ''}`} />
      {t('admin.common.refresh')}
    </button>
  );
}
