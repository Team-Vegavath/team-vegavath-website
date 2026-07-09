import { signOut } from "@/lib/auth";

export default function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/admin" });
      }}
    >
      <button type="submit" className="admin-signout">
        Sign Out
      </button>
    </form>
  );
}
