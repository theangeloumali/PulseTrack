// Basic toast hook - can be enhanced with a proper toast library later
export interface Toast {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = ({title, description, variant = 'default'}: Toast) => {
    // For now, just use console.log - in a real app you'd use a toast library
    console.log(
      `${variant === 'destructive' ? '❌' : '✅'} ${title}${description ? `: ${description}` : ''}`,
    );

    // You could also use window.alert for testing
    // alert(`${title}${description ? `\n${description}` : ""}`);
  };

  return {toast};
}
