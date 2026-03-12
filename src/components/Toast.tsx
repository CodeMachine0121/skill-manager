interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose?: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  return (
    <div className={`toast toast-${type}`} onClick={onClose} role="alert">
      {message}
    </div>
  );
}
