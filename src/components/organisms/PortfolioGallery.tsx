"use client";

import { useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Photo } from "@/components/atoms/Photo";
import { PortfolioItem } from "@/components/molecules/PortfolioItem";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { galleryLabels, portfolioFilters } from "@/content/portfolio";
import { site } from "@/content/site";
import { reveal } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { PortfolioFilter, PortfolioImage } from "@/types";

type FilterValue = PortfolioFilter["value"];

/** Jumlah foto minimal agar galeri memakai layout mosaik. */
const FEATURE_MIN = 5;

/**
 * Pola mosaik 4 kolom: besar, tinggi, lebar. 9 foto pas mengisi 4 baris penuh;
 * foto berikutnya mengulang pola dari awal.
 */
const MOSAIC = [
  "col-span-2 row-span-2",
  "row-span-2",
  "",
  "",
  "col-span-2",
  "",
  "row-span-2",
  "",
  "col-span-2",
];

const navButton =
  "absolute top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-paper/25 bg-ink/60 text-paper backdrop-blur-sm transition-transform duration-200 hover:scale-110";

function imagesFor(all: PortfolioImage[], filter: FilterValue) {
  return filter === "semua" ? all : all.filter((image) => image.category === filter);
}

function labelOf(category: string) {
  return portfolioFilters.find((filter) => filter.value === category)?.label ?? category;
}

type PortfolioGalleryProps = {
  images: PortfolioImage[];
};

/** Galeri bento dengan filter kategori dan lightbox (tombol, panah keyboard, thumbnail). */
export function PortfolioGallery({ images: all }: PortfolioGalleryProps) {
  const [filter, setFilter] = useState<FilterValue>(portfolioFilters[0].value);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const images = imagesFor(all, filter);
  const current = openIndex === null ? null : images[openIndex];
  const hasMany = images.length > 1;

  function step(delta: number) {
    setOpenIndex((index) =>
      index === null ? index : (index + delta + images.length) % images.length,
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") step(1);
    if (event.key === "ArrowLeft") step(-1);
  }

  return (
    <>
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as FilterValue)}
        className="gap-8"
      >
        <TabsList
          aria-label={site.a11y.portfolioFilter}
          className="glass grid h-auto w-full grid-cols-4 rounded-md p-1 sm:inline-flex sm:w-fit"
        >
          {portfolioFilters.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="h-11 rounded-sm px-2 font-heading font-semibold text-ink/80 transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none sm:px-5"
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {portfolioFilters.map((item) => {
          const list = imagesFor(all, item.value);
          const featured = list.length >= FEATURE_MIN;

          return (
            <TabsContent
              key={item.value}
              value={item.value}
              className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-3 data-[state=active]:duration-500"
            >
              <ul
                className={cn(
                  "grid grid-flow-dense auto-rows-[9.5rem] grid-cols-2 gap-3 sm:auto-rows-[12rem] md:gap-4 lg:auto-rows-[13.5rem]",
                  featured ? "md:grid-cols-4" : "md:grid-cols-3",
                )}
              >
                {list.map((image, index) => {
                  const span = featured ? MOSAIC[index % MOSAIC.length] : "";
                  const isLarge = span.includes("col-span-2");
                  return (
                    <li key={image.id} {...reveal(index % 4)} className={span}>
                      <PortfolioItem
                        image={image}
                        categoryLabel={labelOf(image.category)}
                        openLabel={galleryLabels.open}
                        sizes={
                          isLarge
                            ? "(min-width: 768px) 560px, 100vw"
                            : "(min-width: 1024px) 280px, 50vw"
                        }
                        onOpen={() => setOpenIndex(index)}
                      />
                    </li>
                  );
                })}
              </ul>
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={current !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <DialogContent
          showCloseButton={false}
          onKeyDown={handleKeyDown}
          className="gap-0 overflow-hidden border-none bg-ink p-0 text-paper sm:max-w-5xl"
        >
          {current && openIndex !== null && (
            <>
              <DialogTitle className="sr-only">{current.alt}</DialogTitle>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="glass-gradient-dark rounded-full px-3 py-1 font-heading text-sm font-semibold">
                  {galleryLabels.counter(openIndex + 1, images.length)}
                </span>
                <DialogClose className="inline-flex size-11 items-center justify-center rounded-full text-paper transition-colors hover:bg-paper/10">
                  <X aria-hidden className="size-5" />
                  <span className="sr-only">{galleryLabels.close}</span>
                </DialogClose>
              </div>

              <div className="relative">
                {/* Lebar dibatasi tinggi layar (rasio 3:2) supaya lightbox muat tanpa scroll. */}
                <div
                  key={current.id}
                  className="mx-auto max-w-[calc(62vh*1.5)] animate-in fade-in-0 zoom-in-95 duration-300"
                >
                  <Photo
                    image={current}
                    sizes="(min-width: 1024px) 1024px, 100vw"
                    className="bg-ink object-contain"
                  />
                </div>
                {hasMany && (
                  <>
                    <button
                      type="button"
                      onClick={() => step(-1)}
                      className={cn(navButton, "left-3")}
                    >
                      <ChevronLeft aria-hidden className="size-5" />
                      <span className="sr-only">{galleryLabels.previous}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => step(1)}
                      className={cn(navButton, "right-3")}
                    >
                      <ChevronRight aria-hidden className="size-5" />
                      <span className="sr-only">{galleryLabels.next}</span>
                    </button>
                  </>
                )}
              </div>

              <div className="px-4 pt-3">
                <DialogDescription className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-paper/80">
                  <span className="font-heading font-semibold text-paper">
                    {labelOf(current.category)}
                  </span>
                  {current.client && <span>{current.client}</span>}
                  {current.year && <span>{current.year}</span>}
                  <span className="sr-only">{galleryLabels.keyboardHint}</span>
                </DialogDescription>
              </div>

              {hasMany && (
                <ul
                  aria-label={galleryLabels.thumbnails}
                  className="flex gap-2 overflow-x-auto p-4"
                >
                  {images.map((image, index) => (
                    <li key={image.id} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setOpenIndex(index)}
                        aria-current={index === openIndex}
                        aria-label={image.alt}
                        className={cn(
                          "block w-20 overflow-hidden rounded-md ring-2 ring-transparent transition-[opacity,box-shadow] duration-200 [&_span]:hidden",
                          index === openIndex ? "ring-paper" : "opacity-60 hover:opacity-100",
                        )}
                      >
                        <Photo image={image} sizes="80px" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
