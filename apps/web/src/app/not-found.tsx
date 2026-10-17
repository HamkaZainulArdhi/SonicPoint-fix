import Link from "next/link";
import { pill } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-page px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-xl text-center">
        <p className="font-mono text-caption text-smoke">404</p>
        <h1 className="mt-4 text-heading font-normal text-snow">
          Halaman tidak ditemukan.
        </h1>
        <p className="mt-3 text-body text-silver-mist">
          Link report mungkin salah ketik, atau session-nya sudah tidak ada.
          Halaman utama dan dokumentasi tetap bisa dibuka.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className={pill("primary")}>
            Ke halaman utama
          </Link>
          <Link href="/docs" className={pill("ghost")}>
            Dokumentasi
          </Link>
        </div>
      </div>
    </div>
  );
}
