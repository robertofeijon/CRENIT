import Image from 'next/image';
import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-white shadow-sm">
        <Image src="/crenit-logo.jpeg" alt="CRENIT logo" fill className="object-cover" />
      </div>
      <span className="text-xl font-semibold tracking-tight text-[#1A1A1A]">CRENIT</span>
    </Link>
  );
}
