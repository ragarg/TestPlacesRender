import * as THREE from "three";
import { pingpong } from "three/src/math/MathUtils.js";

export default function shopsParser(scene, placesData) {
    const sumS = placesData.reduce((total, data) => total + data.width * data.depth, 0);
    // const maxWidth = Math.sqrt(sumS);

    const rects = packMaxRects(placesData, 0.4, 0).positions;
    rects.forEach((rect) => {
        const position = new THREE.Vector3(rect.x + rect.data.width / 2, rect.y + rect.data.depth / 2, 0);
        scene.addObject(rect.data, position);
    });
}

/**
 * Packs rectangles into a container using th MaxRects algorithm with Best Short Side Fit
 * Modifies input rectangles by adding gaps and places them optimally
 * @param {Array<{width: number, depth:number, data: any}>} rects 
 *      Array of rectanglesto pack
 * @param {number} gap - Spacing (margin) between rectangles
 * @param {number} maxWidth - Maximum container width. If 0, container can expand forizontally. 
 * @returns {{
 *  positions: Array<{x: number, y:number, width:number, depth:number, data: any}>,
 *  containerWidth: number,
 *  containerDepth: number
 * }}
 */
function packMaxRects(rects, gap=0, maxWidth=0) {
    const prepared = rects.map((r, idx) => ({
        id: idx,
        w: r.width + gap,
        d: r.depth + gap,
        origW: r.width,
        origD: r.depth,
        data: r
    }));

    let freeRects = [{x: 0, y:0, w: maxWidth || 1e7, d: 1e7}];
    const placements = [];

    for (const rect of prepared) {
        let bestNode = null;
        let bestFreeId = -1;
        let bestShortSideFit = Infinity;
        let bestLongSideFit = Infinity;

        // Search for a free area for a selected rectangle
        for (let i = 0; i < freeRects.length; i++) {
            const free = freeRects[i];
            if (free.w >= rect.w && free.d >= rect.d) {
                const leftoverD = Math.abs(free.d - rect.d);
                const leftoverW = Math.abs(free.w - rect.w);
                const shortSideFit = Math.min(leftoverD, leftoverW);
                const longSideFit = Math.max(leftoverD, leftoverW);
                if (shortSideFit < bestShortSideFit ||
                    (shortSideFit === bestShortSideFit && longSideFit < bestLongSideFit)
                ) {
                    bestShortSideFit = shortSideFit;
                    bestLongSideFit = longSideFit;
                    bestNode = {...free, idx: i}
                }
            }
        }
        
        if (!bestNode) {
            if (!maxWidth && freeRects.length === 1 && freeRects[0].x === 0 && freeRects[0].y ===0) {
                const newW = Math.max(freeRects[0].w, rect.w);
                const newD = Math.max(freeRects[0].d, rect.d);
                freeRects[0].w = newW;
                freeRects[0].d = newD;

                const newBest = (() => {
                    for (let i = 0; i < freeRects.length; i++) {
                        const free = freeRects[i];
                        if (free.w >= rect.w && free.d >= rect.d) return {...free, idx: i};
                    }
                    return null;
                })();

                if (!newBest) throw new Error("Cannot place rectangle even after expanding");

                bestNode = newBest;
                bestFreeId = bestNode.idx;
            } else {
                throw new Error(`Rectangle ${rect.id} (${rect.w}x${rect.d}) does not fit`);
            }
        } else {
            bestFreeId = bestNode.idx;
        }

        placements.push({
            id: rect.id,
            x: bestNode.x,
            y: bestNode.y,
            width: rect.origW,
            depth: rect.origD,
            packedWidth: rect.w,
            packedDepth: rect.d,
            data: rect.data
        });

        const free = freeRects[bestFreeId];
        const leftRect = { x: free.x + rect.w, y: free.y, w: free.w - rect.w, d: rect.d};
        const bottomRect = { x: free.x, y: free.y + rect.d, w: free.w, d: free.d - rect.d};

        freeRects.splice(bestFreeId, 1);

        if (leftRect.w > 0 && leftRect.d > 0) freeRects.push(leftRect);
        if (bottomRect.w > 0 && bottomRect.d > 0) freeRects.push(bottomRect);

        mergeFreeRects(freeRects);
    }

    let containerWidth = 0, containerDepth = 0;

    for (const p of placements) {
        containerWidth = Math.max(containerWidth, p.x + p.packedWidth)
        containerDepth = Math.max(containerDepth, p.y + p.packedDepth)
    }

    if (containerWidth > 0 && gap > 0) containerWidth -= gap;
    if (containerDepth > 0 && gap > 0) containerDepth -= gap;

    const finalPositions = placements.map(p => ({
        x: p.x,
        y: p.y,
        width: p.width,
        depth: p.depth,
        data: p.data
    }))

    return { positions: finalPositions, containerWidth, containerDepth };
}

/**
 * Removes overlapping areas from a list of free rectangles and merges adjacent ones
 * @param {Array<{x: number, y: number, w: number, d: number}>} rects - Array of free (empty) rectangles to clean
 */
function mergeFreeRects(rects) {
    function intersectStrict(a, b) {
        return (a.x < b.x + b.w && a.x + a.w > b.x &&
                a.y < b.y + b.d && a.y + a.d > b.y);
    }
    let overalChanged = true;
    while (overalChanged){
        overalChanged = false;

        let i = 0;
        while (i < rects.length) {
            let j = 0
            while (j < rects.length) {
                if (i === j) {j++; continue; }

                const a = rects[i];
                const b = rects[j];
                if (b.x <= a.x && b.y <= a.y && b.x + b.w >= a.x + a.w && b.y + b.d >= a.y + a.d) {
                    rects.splice(i, 1);
                    i = Math.max(0, i - 1);
                    overalChanged = true;
                    continue;
                }
                else if (b.x >= a.x && b.y >= a.y && b.x + b.w <= a.x + a.w && b.y + b.d <= a.y + a.d) {
                    rects.splice(j, 1);
                    j = Math.max(0, j - 1);
                    overalChanged = true;
                    continue;
                }
                else if (intersectStrict(a, b)) {
                    const pieces = [];

                    if (b.x < a.x) {
                        pieces.push({ x: b.x, y: b.y, w: a.x - b.x, d: b.d})
                    }
                    if (b.x + b.w > a.x + a.w) {
                        pieces.push({ x: a.x + a.w, y: b.y, w: (b.x + b.w) - (a.x + a.w), d: b.d})
                    }
                    if (b.y < a.y) {
                        const topY = b.y;
                        const topD = a.y - b.y;
                        const topW = Math.min(b.w, a.x + a.w - b.x) - Math.max(0, a.x - b.x);
                        if (topW > 0)
                            pieces.push({ x: Math.max(b.x, a.x), y: topY, w: topW, d: topD})
                    }
                    if (b.y + b.d > a.y + a.d) {
                        const bottomY = a.y + a.d;
                        const bottomD = (b.y + b.d) - (a.y + a.d);
                        const bottomW = Math.min(b.w, a.x + a.w - b.x) - Math.max(0, a.x - b.x);
                        if (bottomW > 0)
                            pieces.push({ x: Math.max(b.x, a.x), y: bottomY, w: bottomW, d: bottomD})
                    }
                    rects.splice(j, 1);
                    for (const piece of pieces) {
                        if (piece.w > 0 && piece.d > 0) rects.push(piece);
                    }
                    overalChanged = true;
                    continue;
                }
                j++;
            }
            i++;
        }
        let change = true;


        change = false;
        let merged = [];
        for (let r of rects) {
            let mergedFlag = false;
            for (let i = 0; i < merged.length; i++) {
                const m = merged[i];

                if (m.x === r.x && m.y === r.y && m.w === r.w && m.d === r.d) {
                    mergedFlag = true;
                    break;
                }

                if (m.x === r.x && m.w === r.w && m.y + m.d === r.y) {
                    m.d += r.d;
                    mergedFlag = true;
                    change = true;
                    break;
                } else if (m.y === r.y && m.d === r.d && m.x + m.w === r.x) {
                    m.w += r.w;
                    mergedFlag = true;
                    change = true;
                    break;
                }
            }
            if (!mergedFlag) merged.push({...r});
        }
        rects.length = 0;
        rects.push(...merged);
        if (change) overalChanged = true;
    }
}