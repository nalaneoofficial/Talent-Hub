import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Signup = () => {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col bg-background p-6 overflow-y-auto">
      <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="mt-4">
        <div className="flex gap-1 mb-4">
          <span className="h-1 flex-1 rounded-full bg-primary" />
          <span className="h-1 flex-1 rounded-full bg-primary" />
          <span className="h-1 flex-1 rounded-full bg-secondary" />
          <span className="h-1 flex-1 rounded-full bg-secondary" />
        </div>
        <h1 className="text-2xl font-bold">Let's complete<br />your profile</h1>
        <p className="text-sm text-muted-foreground mt-1">We've filled in the details from your CV. Please review and edit if needed.</p>
      </div>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          navigate("/upload-cv");
        }}
      >
        <h2 className="text-sm font-semibold">Personal Information</h2>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Full Name</Label>
          <Input defaultValue="Thato Molefe" className="h-11 rounded-xl bg-card" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Email</Label>
          <Input type="email" defaultValue="thato.molefe@email.com" className="h-11 rounded-xl bg-card" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Phone</Label>
          <Input defaultValue="+267 7 123 4567" className="h-11 rounded-xl bg-card" />
        </div>

        <Button type="submit" className="w-full h-12 mt-4 bg-forest hover:bg-forest/90 rounded-xl font-semibold">
          Continue
        </Button>
      </form>
    </div>
  );
};

export default Signup;
