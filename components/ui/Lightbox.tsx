'use client';

import { useEffect, useCallback } from 'react';
import Image from 'next/image';

interface LightboxProps {
    isOpen: boolean;
    images: string[];
    currentIndex: number;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
    title: string;
}

export default function Lightbox({
    isOpen,
    images,
    currentIndex,
    onClose,
    onPrev,
    onNext,
    title
}: LightboxProps) {

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return;
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowLeft') onPrev();
        if (e.key === 'ArrowRight') onNext();
    }, [isOpen, onClose, onPrev, onNext]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen || images.length === 0) return null;

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center animate-fadeIn"
            onClick={onClose}
        >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-[110] bg-gradient-to-b from-black/50 to-transparent">
                <div>
                    <h3 className="text-white text-xl font-bold">{title}</h3>
                    <p className="text-white/60 text-sm">{currentIndex + 1} / {images.length}</p>
                </div>
                <button
                    onClick={onClose}
                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Main Image Container */}
            <div className="relative w-full h-[80vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                {/* Navigation Buttons */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={onPrev}
                            className="absolute left-4 z-[110] w-14 h-14 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all border border-white/10"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={onNext}
                            className="absolute right-4 z-[110] w-14 h-14 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all border border-white/10"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </>
                )}

                <div className="relative w-full h-full max-w-7xl px-12 transition-all duration-300">
                    <Image
                        src={images[currentIndex]}
                        alt={`${title} - image ${currentIndex + 1}`}
                        fill
                        className="object-contain"
                        priority
                        sizes="100vw"
                        quality={85}
                    />
                </div>
            </div>

            {/* Thumbnails (Optional) */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto p-2" onClick={(e) => e.stopPropagation()}>
                {images.map((img, idx) => (
                    <button
                        key={idx}
                        onClick={() => {/* Direct jump could be added */ }}
                        className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${idx === currentIndex ? 'border-primary' : 'border-transparent opacity-50 hover:opacity-100'
                            }`}
                    >
                        <Image src={img} alt="thumbnail" fill className="object-cover" />
                    </button>
                ))}
            </div>
        </div>
    );
}
