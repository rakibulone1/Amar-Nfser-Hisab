import Image from "next/image";

export function AppLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup">
      <Image src="/brand/logo.svg" alt="Amar Nfser Hisab" width={compact ? 40 : 46} height={compact ? 40 : 46} priority />
      {!compact && (
        <div className="brand-copy">
          <span className="brand-name">Amar Nfser Hisab</span>
          <span className="brand-tagline">ব্যক্তিগত মুহাসাবা ও আত্মশুদ্ধি</span>
        </div>
      )}
    </div>
  );
}
