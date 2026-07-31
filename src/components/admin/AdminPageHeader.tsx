import type { ReactNode } from "react";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** S67: 2 for a section header on a page that already has an h1 (the
   *  registrations block under Edit Event). Two h1s on one page is both an a11y
   *  problem and a visual one -- the section would shout as loud as the page. */
  level?: 1 | 2;
}

// S65. Root class is .admin-page-head, not .admin-page-header: the latter is a
// pre-existing flex row still used by ~8 sub-page and Bootstrap headers, and
// redefining it as a block wrapper would break every one of them.
export default function AdminPageHeader({
  title,
  subtitle,
  action,
  level = 1,
}: AdminPageHeaderProps) {
  const Heading = level === 2 ? "h2" : "h1";
  return (
    <div className="admin-page-head">
      <div className="admin-page-header-row">
        <div>
          <Heading className="admin-page-header-title">{title}</Heading>
          {subtitle ? <p className="admin-page-header-sub">{subtitle}</p> : null}
        </div>
        {action ? <div className="admin-page-header-action">{action}</div> : null}
      </div>
      <div className="admin-page-header-rule" />
    </div>
  );
}
