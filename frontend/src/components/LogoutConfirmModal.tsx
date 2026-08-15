import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

interface LogoutConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Logout should never be an accidental click (spec section 15) — AppSidebar's logout
 * button used to fire immediately with zero confirmation; this gates it behind an explicit
 * confirm. logout() itself is synchronous and doesn't navigate, so we drive the redirect
 * here after it clears the user. */
export function LogoutConfirmModal({ open, onOpenChange }: LogoutConfirmModalProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleConfirm() {
    logout();
    onOpenChange(false);
    navigate("/login");
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Դուրս գալ"
      description="Վստա՞հ ես, որ ցանկանում ես դուրս գալ։"
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
            Մնալ
          </Button>
          <Button variant="danger" className="flex-1" onClick={handleConfirm}>
            Դուրս գալ
          </Button>
        </>
      }
    />
  );
}
