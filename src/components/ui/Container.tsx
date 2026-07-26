import type { ReactNode } from "react";
type ContainerProps = {
  children: ReactNode;
  className?: string;
};
export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div
      className={`mx-auto ${className}`}
      style={{ maxWidth: "80rem", width: "100%", paddingLeft: "1.5rem", paddingRight: "1.5rem", boxSizing: "border-box" }}
    >
      {children}
    </div>
  );
}
