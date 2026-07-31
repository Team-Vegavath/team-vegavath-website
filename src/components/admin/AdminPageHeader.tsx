import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

// S65. Root class is .admin-page-head, not .admin-page-header: the latter is a
// pre-existing flex row still used by ~8 sub-page and Bootstrap headers, and
// redefining it as a block wrapper would break every one of them.
export default function AdminPageHeader({ title, subtitle, action }: AdminPageHeaderProps) {
  return (
    <div className="admin-page-head">
      <div className="admin-page-header-row">
        <div>
          <h1 className="admin-page-header-title">{title}</h1>
          {subtitle ? <p className="admin-page-header-sub">{subtitle}</p> : null}
        </div>
        {action ? <div className="admin-page-header-action">{action}</div> : null}
      </div>
      <div className="admin-page-header-rule" />
    </div>
  );
}
