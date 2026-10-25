let originalImage = null;

const imageInput = document.getElementById("imageInput");

const originalCanvas = document.getElementById("originalCanvas");
const resolutionCanvas = document.getElementById("resolutionCanvas");
const dctCanvas = document.getElementById("dctCanvas");

const originalCtx = originalCanvas.getContext("2d");
const resolutionCtx = resolutionCanvas.getContext("2d");
const dctCtx = dctCanvas.getContext("2d");


/* =====================================================
   이미지 불러오기
===================================================== */

imageInput.addEventListener("change", function(event) {

    const file = event.target.files[0];

    if (!file) return;

    const img = new Image();

    img.onload = function() {

        originalImage = img;

        originalCanvas.width = img.width;
        originalCanvas.height = img.height;

        resolutionCanvas.width = img.width;
        resolutionCanvas.height = img.height;

        dctCanvas.width = img.width;
        dctCanvas.height = img.height;

        originalCtx.drawImage(
            img,
            0,
            0,
            img.width,
            img.height
        );
    };

    img.src = URL.createObjectURL(file);
});


/* =====================================================
   슬라이더
===================================================== */

document.getElementById("resolutionSlider")
.addEventListener("input", function() {

    document.getElementById("resolutionValue")
    .textContent = this.value;

});


document.getElementById("dctSlider")
.addEventListener("input", function() {

    document.getElementById("dctValue")
    .textContent = this.value;

});


/* =====================================================
   실험 1 : 해상도 축소
===================================================== */

function runResolutionExperiment() {

    if (!originalImage) {
        alert("먼저 이미지를 선택하세요.");
        return;
    }

    const ratio =
        Number(document.getElementById("resolutionSlider").value) / 100;

    const w = originalImage.width;
    const h = originalImage.height;

    const smallW =
        Math.max(1, Math.floor(w * ratio));

    const smallH =
        Math.max(1, Math.floor(h * ratio));


    const tempCanvas = document.createElement("canvas");

    tempCanvas.width = smallW;
    tempCanvas.height = smallH;

    const tempCtx = tempCanvas.getContext("2d");

    tempCtx.drawImage(
        originalImage,
        0,
        0,
        smallW,
        smallH
    );


    resolutionCtx.clearRect(
        0,
        0,
        w,
        h
    );

    resolutionCtx.drawImage(
        tempCanvas,
        0,
        0,
        w,
        h
    );


    const originalData =
        originalCtx.getImageData(
            0,
            0,
            w,
            h
        );

    const compressedData =
        resolutionCtx.getImageData(
            0,
            0,
            w,
            h
        );


    const mse =
        calculateMSE(
            originalData,
            compressedData
        );


    document.getElementById("resolutionMSE")
    .textContent = mse.toFixed(4);

    document.getElementById("tableResolution")
    .textContent = mse.toFixed(4);
}


/* =====================================================
   MSE
===================================================== */

function calculateMSE(originalData, resultData) {

    let sum = 0;

    const pixelCount =
        originalData.width *
        originalData.height;


    for (
        let i = 0;
        i < originalData.data.length;
        i += 4
    ) {

        const r1 = originalData.data[i];
        const g1 = originalData.data[i + 1];
        const b1 = originalData.data[i + 2];

        const r2 = resultData.data[i];
        const g2 = resultData.data[i + 1];
        const b2 = resultData.data[i + 2];


        sum += Math.pow(r1 - r2, 2);
        sum += Math.pow(g1 - g2, 2);
        sum += Math.pow(b1 - b2, 2);
    }


    return sum / (pixelCount * 3);
}


/* =====================================================
   8×8 DCT
===================================================== */

function DCT(block) {

    const result =
        Array.from(
            { length: 8 },
            () => Array(8).fill(0)
        );


    for (let u = 0; u < 8; u++) {

        for (let v = 0; v < 8; v++) {

            let sum = 0;


            for (let y = 0; y < 8; y++) {

                for (let x = 0; x < 8; x++) {

                    sum +=
                        block[y][x] *
                        Math.cos(
                            ((2 * x + 1) * u * Math.PI) / 16
                        ) *
                        Math.cos(
                            ((2 * y + 1) * v * Math.PI) / 16
                        );
                }
            }


            const Cu =
                u === 0
                ? 1 / Math.sqrt(2)
                : 1;

            const Cv =
                v === 0
                ? 1 / Math.sqrt(2)
                : 1;


            result[u][v] =
                0.25 * Cu * Cv * sum;
        }
    }


    return result;
}


/* =====================================================
   역 DCT
===================================================== */

function IDCT(coefficients) {

    const result =
        Array.from(
            { length: 8 },
            () => Array(8).fill(0)
        );


    for (let y = 0; y < 8; y++) {

        for (let x = 0; x < 8; x++) {

            let sum = 0;


            for (let u = 0; u < 8; u++) {

                for (let v = 0; v < 8; v++) {

                    const Cu =
                        u === 0
                        ? 1 / Math.sqrt(2)
                        : 1;

                    const Cv =
                        v === 0
                        ? 1 / Math.sqrt(2)
                        : 1;


                    sum +=
                        Cu *
                        Cv *
                        coefficients[u][v] *
                        Math.cos(
                            ((2 * x + 1) * u * Math.PI) / 16
                        ) *
                        Math.cos(
                            ((2 * y + 1) * v * Math.PI) / 16
                        );
                }
            }


            result[y][x] =
                sum + 128;
        }
    }


    return result;
}


/* =====================================================
   Zigzag 순서
===================================================== */

function getZigzag() {

    const order = [];

    for (let s = 0; s <= 14; s++) {

        if (s % 2 === 0) {

            for (
                let y = Math.min(s, 7);
                y >= Math.max(0, s - 7);
                y--
            ) {

                const x = s - y;

                order.push([y, x]);
            }

        } else {

            for (
                let x = Math.min(s, 7);
                x >= Math.max(0, s - 7);
                x--
            ) {

                const y = s - x;

                order.push([y, x]);
            }
        }
    }

    return order;
}


/* =====================================================
   DCT 실험
===================================================== */

function runDCTExperiment() {

    if (!originalImage) {
        alert("먼저 이미지를 선택하세요.");
        return;
    }


    const w = originalImage.width;
    const h = originalImage.height;


    const originalData =
        originalCtx.getImageData(
            0,
            0,
            w,
            h
        );


    const result =
        dctCtx.createImageData(
            w,
            h
        );


    const keepPercent =
        Number(
            document.getElementById("dctSlider").value
        );


    /*
       64개의 DCT 계수 중 몇 개를 보존할지 결정

       100% → 64개
       50%  → 32개
       25%  → 16개
       10%  → 6개
       0%   → 0개
    */

    const keepCount =
        Math.round(
            64 * keepPercent / 100
        );


    const zigzag =
        getZigzag();


    let firstDCTMatrix = null;


    /* -----------------------------------------------
       8×8 블록
    ------------------------------------------------ */

    for (let by = 0; by < h; by += 8) {

        for (let bx = 0; bx < w; bx += 8) {


            /*
               R, G, B 각각 복원
            */

            const restoredChannels = [];


            for (let channel = 0; channel < 3; channel++) {


                /* 8×8 픽셀 행렬 */

                const block =
                    Array.from(
                        { length: 8 },
                        () => Array(8).fill(0)
                    );


                for (let y = 0; y < 8; y++) {

                    for (let x = 0; x < 8; x++) {

                        const px = bx + x;
                        const py = by + y;


                        if (
                            px < w &&
                            py < h
                        ) {

                            const index =
                                (py * w + px) * 4;


                            /*
                               DCT 계산을 위해
                               128을 빼준다.
                            */

                            block[y][x] =
                                originalData.data[
                                    index + channel
                                ] - 128;

                        } else {

                            /*
                               이미지 밖 영역은
                               0으로 처리
                            */

                            block[y][x] = 0;
                        }
                    }
                }


                /* DCT */

                const coefficients =
                    DCT(block);


                /*
                   첫 번째 8×8 블록의
                   R 채널 DCT 행렬 저장
                */

                if (
                    firstDCTMatrix === null &&
                    channel === 0
                ) {

                    firstDCTMatrix =
                        coefficients.map(
                            row => [...row]
                        );
                }


                /*
                   압축된 계수 행렬

                   처음에는 전부 0
                */

                const compressed =
                    Array.from(
                        { length: 8 },
                        () => Array(8).fill(0)
                    );


                /*
                   낮은 주파수부터
                   필요한 계수만 보존
                */

                for (
                    let k = 0;
                    k < keepCount;
                    k++
                ) {

                    const y =
                        zigzag[k][0];

                    const x =
                        zigzag[k][1];


                    compressed[y][x] =
                        coefficients[y][x];
                }


                /* 역 DCT */

                const restored =
                    IDCT(compressed);


                restoredChannels.push(
                    restored
                );
            }


            /* ---------------------------------------
               RGB 복원
            ---------------------------------------- */

            for (let y = 0; y < 8; y++) {

                for (let x = 0; x < 8; x++) {

                    const px = bx + x;
                    const py = by + y;


                    if (
                        px < w &&
                        py < h
                    ) {

                        const index =
                            (py * w + px) * 4;


                        let r =
                            Math.round(
                                restoredChannels[0][y][x]
                            );

                        let g =
                            Math.round(
                                restoredChannels[1][y][x]
                            );

                        let b =
                            Math.round(
                                restoredChannels[2][y][x]
                            );


                        r =
                            Math.max(
                                0,
                                Math.min(255, r)
                            );

                        g =
                            Math.max(
                                0,
                                Math.min(255, g)
                            );

                        b =
                            Math.max(
                                0,
                                Math.min(255, b)
                            );


                        result.data[index] =
                            r;

                        result.data[index + 1] =
                            g;

                        result.data[index + 2] =
                            b;

                        result.data[index + 3] =
                            255;
                    }
                }
            }
        }
    }


    /* 결과 이미지 출력 */

    dctCtx.putImageData(
        result,
        0,
        0
    );


    /* MSE 계산 */

    const mse =
        calculateMSE(
            originalData,
            result
        );


    document.getElementById("dctMSE")
    .textContent =
        mse.toFixed(4);


    document.getElementById("tableDCT")
    .textContent =
        mse.toFixed(4);


    /* DCT 행렬 표시 */

    displayMatrix(
        firstDCTMatrix
    );
}


/* =====================================================
   DCT 행렬 표시
===================================================== */

function displayMatrix(matrix) {

    const container =
        document.getElementById("dctMatrix");


    if (!matrix) return;


    let html =
        '<table class="matrix">';


    for (let y = 0; y < 8; y++) {

        html += "<tr>";


        for (let x = 0; x < 8; x++) {

            html +=
                `<td>${matrix[y][x].toFixed(2)}</td>`;
        }


        html += "</tr>";
    }


    html += "</table>";


    container.innerHTML =
        html;
}
