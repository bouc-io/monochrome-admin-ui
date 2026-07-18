import * as React from "react";
import { useNavigate } from "react-router-dom";

const Unauthorized = React.forwardRef<HTMLDivElement>((_props, ref) => {
  const navigate = useNavigate();

  return (
    <div ref={ref} className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-foreground">403</h1>
        <p className="text-xl text-muted-foreground mb-2">Access Denied</p>
        <p className="text-sm text-muted-foreground mb-6">
          You don't have permission to view this page.
        </p>
        <button
          onClick={() => navigate("/")}
          className="text-foreground underline hover:opacity-70"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
});
Unauthorized.displayName = "Unauthorized";

export default Unauthorized;
