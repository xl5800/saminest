/// <reference types="vite/client" />

interface Window {
  SaminestModules: {
    dom: {
      escapeHtml(value: unknown): string;
    };
    toast: {
      showAppNotice(message: string, tone?: string): void;
    };
    loading: {
      renderLoading(
        root: Pick<HTMLElement, "innerHTML">,
        pageHeader: (title: string) => string,
        message?: unknown
      ): void;
    };
  };
}
