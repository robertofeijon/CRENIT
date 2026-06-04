import Image from 'next/image';
import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="inline-flex items-center">
      <Image
        src="/crenit-logo.svg"
        alt="CRENIT logo"
        width={160}
        height={64}
        priority
        className="h-auto w-[150px] max-w-full"
      />
    </Link>
  );
}
