import { Link, LinkProps, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavLinkProps extends LinkProps {
  activeClassName?: string;
  end?: boolean;
}

export function NavLink({
  to,
  className,
  activeClassName,
  end,
  children,
  ...props
}: NavLinkProps) {
  const location = useLocation();
  const isActive = end
    ? location.pathname === to
    : location.pathname.startsWith(String(to));

  return (
    <Link
      to={to}
      className={cn(className, isActive && activeClassName)}
      {...props}
    >
      {children}
    </Link>
  );
}
