import type { Metadata } from "next";

import BootstrapRegister from "@/components/bootstrap/BootstrapRegister";

export const metadata: Metadata = {
  title: "Volunteer Pre-Registration",
};

// PUBLIC page (S74B) - the always-open door into the pre-registration pool.
//
// Deliberately does NOT look up the active session. Every other registration
// page does, because their form depends on session contents (stalls to pick from,
// groups to be numbered into); this one has no session-dependent UI at all, so a
// lookup would only add a DB round trip and a failure mode to a page whose whole
// purpose is to work when there is no session. That also means it stays reachable
// while a session IS running -- someone registering for the NEXT event does not
// have to wait for the current one to end.
//
// Static by consequence, not by declaration: with nothing dynamic to read there is
// no `force-dynamic` here, unlike its two session-gated siblings.
export default function PoolRegisterPage() {
  return <BootstrapRegister variant="pool" hasSession={false} />;
}
