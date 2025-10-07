// simple cosine similarity
export function cosineSim(a: number[], b: number[]) {
    let dot = 0, na = 0, nb = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

// naive chunking
export function chunkText(text: string, chunkSize = 1200, overlap = 200): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(text.length, start + chunkSize);
        chunks.push(text.slice(start, end));
        if (end === text.length) break;
        start = end - overlap;
        if (start < 0) start = 0;
    }
    return chunks;
}
