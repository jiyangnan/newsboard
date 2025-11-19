import { Vector4 } from './Vector4.js';

export class Tesseract {
    constructor(size = 1) {
        this.size = size;
        this.vertices = [];
        this.edges = [];
        this.init();
    }

    init() {
        // Generate 16 vertices
        // (±1, ±1, ±1, ±1) scaled by size
        const s = this.size;
        for (let i = 0; i < 16; i++) {
            // Binary representation of i gives us the signs
            // 0 -> -s, 1 -> +s
            const x = (i & 1) ? s : -s;
            const y = (i & 2) ? s : -s;
            const z = (i & 4) ? s : -s;
            const w = (i & 8) ? s : -s;
            this.vertices.push(new Vector4(x, y, z, w));
        }

        // Generate edges
        // Connect vertices that differ by exactly one coordinate
        for (let i = 0; i < 16; i++) {
            for (let j = i + 1; j < 16; j++) {
                if (this.isConnected(i, j)) {
                    this.edges.push([i, j]);
                }
            }
        }
    }

    // Check if two vertices (indices) differ by exactly one bit
    isConnected(i, j) {
        const diff = i ^ j;
        // Check if diff is a power of 2 (only one bit set)
        return diff !== 0 && (diff & (diff - 1)) === 0;
    }

    getVertices() {
        return this.vertices;
    }

    getEdges() {
        return this.edges;
    }
}
