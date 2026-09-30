import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka sementara saat halaman admin dimuat: bentuknya mirip isi asli supaya tata letak tidak melompat. */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Memuat halaman" className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-56 bg-sand" />
        <Skeleton className="h-4 w-80 max-w-full bg-sand" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl bg-sand/70" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl bg-sand/70" />
    </div>
  );
}
