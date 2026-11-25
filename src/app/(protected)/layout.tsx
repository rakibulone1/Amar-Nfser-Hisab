export const dynamic = "force-dynamic";

export default function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Individual pages redirect to the authenticated workspace. The workspace
  // performs one trusted identity check, then keeps tab navigation client-side.
  return children;
}
