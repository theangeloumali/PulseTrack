// Temporary toast hook implementation
// Consider replacing with Sonner in the future

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

let toastCount = 0;

export function useToast() {
  const toast = (props: Omit<Toast, "id">) => {
    toastCount++;
    const toastData: Toast = {
      id: String(toastCount),
      ...props,
    };

    // For now, just console log the toast
    // In a real implementation, this would update a global toast state
    console.log("Toast:", toastData);

    // You could also use the browser's native notification API
    if (props.title) {
      if (typeof window !== "undefined" && "Notification" in window) {
        // Request permission if not already granted
        if (Notification.permission === "granted") {
          new Notification(props.title, {
            body: props.description,
          });
        }
      }
    }
  };

  return { toast };
}
