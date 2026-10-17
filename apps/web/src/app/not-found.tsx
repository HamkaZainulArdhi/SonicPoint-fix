import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-page px-6 pb-24 pt-36 sm:pt-44">
      <div className="mx-auto max-w-xl text-center">
        <p className="eyebrow text-smoke">Error 404</p>
        <h1 className="mt-4 text-heading font-normal text-pure-white">
          Halaman tidak ditemukan.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-body text-ash">
          Link report mungkin salah ketik, atau session-nya sudah tidak ada.
          Halaman utama dan dokumentasi tetap bisa dibuka.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link href="/" className="btn-primary">
            Ke halaman utama
          </Link>
          <Link href="/docs" className="btn-ghost">
            Dokumentasi
          </Link>
        </div>
      </div>
    </div>
  );
}
