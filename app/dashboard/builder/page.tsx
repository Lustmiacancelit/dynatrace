import DQLChat from "@/components/DQLChat";
import { requireSession } from "@/lib/auth";

export default function BuilderPage() {
  requireSession();
  // Negative margin undoes the layout's absence of padding; fill remaining height
  return (
    <div className="h-full">
      <DQLChat />
    </div>
  );
}
