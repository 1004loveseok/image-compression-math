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

        originalCtx.clearRect(
            0,
            0,
            img.width,
            img.height
        );

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
   실험 1
   해상도 축소
===================================================== */

function runResolutionExperiment() {

    if (!originalImage) {
        alert("먼저 이미지를 선택하세요.");
        return;
    }

    const ratio =
        Number(
            document.getElementById("resolutionSlider").value
        ) / 100;

    const w = originalImage.width;
    const h = originalImage.height;

    const smallW =
        Math.max(1, Math.floor(w * ratio));

    const smallH =
        Math.max(1, Math.floor(h * ratio));


    const tempCanvas =
        document.createElement("canvas");

    tempCanvas.width = smallW;
    tempCanvas.height = smallH;

    const tempCtx =
        tempCanvas.getContext("2d");


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
        calculateRGBMSE(
            originalData,
            compressedData
        );


    document.getElementById("resolutionMSE")
        .textContent = mse.toFixed(2);

    document.getElementById("tableResolution")
        .textContent = mse.toFixed(2);
}


/* =====================================================
   RGB MSE 계산
===================================================== */

function calculateRGBMSE(originalData, compressedData) {

    let sum = 0;

    const pixelCount =
        originalData.width *
        originalData.height;

    /*
       R, G, B 세 채널 모두 비교
    */

    for (
        let i = 0;
        i < originalData.data.length;
        i += 4
    ) {

        const r =
            originalData.data[i];

        const g =
            originalData.data[i + 1];

        const b =
            originalData.data[i + 2];


        const r2 =
            compressedData.data[i];

        const g2 =
            compressedData.data[i + 1];

        const b2 =
            compressedData.data[i + 2];


        sum +=
            (r - r2) * (r - r2);

        sum +=
            (g - g2) * (g - g2);

        sum +=
            (b - b2) * (b - b2);
    }


    /*
       RGB 3개 채널의 평균
    */

    return sum /
        (pixelCount * 3);
}


/* =====================================================
   8×8 DCT
===================================================== */

function dct8x8(block) {

    const result =
        Array.from(
            { length: 8 },
            () => Array(8).fill(0)
        );


    for (let u = 0; u < 8; u++) {

        for (let v = 0; v < 8; v++) {

            let sum = 0;


            for (let x = 0; x < 8; x++) {

                for (let y = 0; y < 8; y++) {

                    sum +=
                        block[x][y] *
                        Math.cos(
                            ((2 * x + 1) *
                            u *
                            Math.PI) / 16
                        ) *
                        Math.cos(
                            ((2 * y + 1) *
                            v *
                            Math.PI) / 16
                        );
                }
            }


            const Cu =
                (u === 0)
                ? 1 / Math.sqrt(2)
                : 1;

            const Cv =
                (v === 0)
                ? 1 / Math.sqrt(2)
                : 1;


            result[u][v] =
                0.25 *
                Cu *
                Cv *
                sum;
        }
    }


    return result;
}


/* =====================================================
   역 DCT
===================================================== */

function idct8x8(coefficients) {

    const result =
        Array.from(
            { length: 8 },
            () => Array(8).fill(0)
        );


    for (let x = 0; x < 8; x++) {

        for (let y = 0; y < 8; y++) {

            let sum = 0;


            for (let u = 0; u < 8; u++) {

                for (let v = 0; v < 8; v++) {

                    const Cu =
                        (u === 0)
                        ? 1 / Math.sqrt(2)
                        : 1;

                    const Cv =
                        (v === 0)
                        ? 1 / Math.sqrt(2)
                        : 1;


                    sum +=
                        Cu *
                        Cv *
                        coefficients[u][v] *
                        Math.cos(
                            ((2 * x + 1) *
                            u *
                            Math.PI) / 16
                        ) *
                        Math.cos(
                            ((2 * y + 1) *
                            v *
                            Math.PI) / 16
                        );
                }
            }


            /*
               DCT 전에 128을 빼었으므로
               다시 128을 더한다.
            */

            result[x][y] =
                sum + 128;
        }
    }


    return result;
}


/* =====================================================
   Zigzag 순서
   낮은 주파수 → 높은 주파수
===================================================== */

function getZigzagOrder() {

    return [
        [0,0],

        [0,1],
        [1,0],

        [2,0],
        [1,1],
        [0,2],

        [0,3],
        [1,2],
        [2,1],
        [3,0],

        [4,0],
        [3,1],
        [2,2],
        [1,3],
        [0,4],

        [0,5],
        [1,4],
        [2,3],
        [3,2],
        [4,1],
        [5,0],

        [6,0],
        [5,1],
        [4,2],
        [3,3],
        [2,4],
        [1,5],
        [0,6],

        [0,7],
        [1,6],
        [2,5],
        [3,4],
        [4,3],
        [5,2],
        [6,1],
        [7,0],

        [7,1],
        [6,2],
        [5,3],
        [4,4],
        [3,5],
        [2,6],
        [1,7],

        [2,7],
        [3,6],
        [4,5],
        [5,4],
        [6,3],
        [7,2],

        [7,3],
        [6,4],
        [5,5],
        [4,6],
        [3,7],

        [4,7],
        [5,6],
        [6,5],
        [7,4],

        [7,5],
        [6,6],
        [5,7],

        [6,7],
        [7,6],

        [7,7]
    ];
}


/* =====================================================
   DCT 실험
===================================================== */

function runDCTExperiment() {

    if (!originalImage) {
        alert("먼저 이미지를 선택하세요.");
        return;
    }


    const w =
        originalImage.width;

    const h =
        originalImage.height;


    const originalData =
        originalCtx.getImageData(
            0,
            0,
            w,
            h
        );


    const output =
        dctCtx.createImageData(
            w,
            h
        );


    const keepPercent =
        Number(
            document.getElementById("dctSlider").value
        );


    /*
       보존할 DCT 계수 개수

       100% → 64개 모두 보존
       50%  → 32개 보존
       25%  → 16개 보존
       10%  → 약 6개 보존
       0%   → 0개 보존
    */

    const keepCount =
        Math.round(
            64 *
            keepPercent /
            100
        );


    const zigzag =
        getZigzagOrder();


    let firstMatrix = null;


    /*
       8×8 블록 단위로 처리
    */

    for (let by = 0; by < h; by += 8) {

        for (let bx = 0; bx < w; bx += 8) {


            /*
               RGB 각각을 독립적으로 처리
            */

            const restoredChannels = [];


            for (let channel = 0; channel < 3; channel++) {


                /*
                   8×8 픽셀 행렬 생성
                */

                const block =
                    Array.from(
                        { length: 8 },
                        () => Array(8).fill(128)
                    );


                for (let y = 0; y < 8; y++) {

                    for (let x = 0; x < 8; x++) {

                        const px =
                            bx + x;

                        const py =
                            by + y;


                        if (
                            px < w &&
                            py < h
                        ) {

                            const index =
                                (py * w + px) * 4;


                            /*
                               RGB 값에서 128을 빼서
                               DCT 계산
                            */

                            block[y][x] =
                                originalData.data[
                                    index + channel
                                ] - 128;
                        }
                    }
                }


                /*
                   DCT 변환
                */

                let coefficients =
                    dct8x8(block);


                /*
                   첫 번째 블록의
                   R 채널 DCT 행렬 저장
                */

                if (
                    firstMatrix === null &&
                    channel === 0
                ) {

                    firstMatrix =
                        coefficients.map(
                            row => [...row]
                        );
                }


                /*
                   모든 계수를 제거한 뒤
                   낮은 주파수 계수만 남긴다.
                */

                const compressed =
                    Array.from(
                        { length: 8 },
                        () => Array(8).fill(0)
                    );


                for (
                    let k = 0;
                    k < keepCount;
                    k++
                ) {

                    const u =
                        zigzag[k][0];

                    const v =
                        zigzag[k][1];


                    compressed[u][v] =
                        coefficients[u][v];
                }


                /*
                   역 DCT
                */

                const restored =
                    idct8x8(compressed);


                restoredChannels.push(
                    restored
                );
            }


            /*
               복원된 RGB를 이미지에 저장
            */

            for (let y = 0; y < 8; y++) {

                for (let x = 0; x < 8; x++) {

                    const px =
                        bx + x;

                    const py =
                        by + y;


                    if (
                        px < w &&
                        py < h
                    ) {

                        const index =
                            (py * w + px) * 4;


                        const r =
                            Math.max(
                                0,
                                Math.min(
                                    255,
                                    Math.round(
                                        restoredChannels[0][y][x]
                                    )
                                )
                            );


                        const g =
                            Math.max(
                                0,
                                Math.min(
                                    255,
                                    Math.round(
                                        restoredChannels[1][y][x]
                                    )
                                )
                            );


                        const b =
                            Math.max(
                                0,
                                Math.min(
                                    255,
                                    Math.round(
                                        restoredChannels[2][y][x]
                                    )
                                )
                            );


                        output.data[index] =
                            r;

                        output.data[index + 1] =
                            g;

                        output.data[index + 2] =
                            b;

                        output.data[index + 3] =
                            255;
                    }
                }
            }
        }
    }


    /*
       결과 이미지 표시
    */

    dctCtx.putImageData(
        output,
        0,
        0
    );


    /*
       MSE 계산
    */

    const mse =
        calculateRGBMSE(
            originalData,
            output
        );


    document.getElementById("dctMSE")
        .textContent =
        mse.toFixed(4);


    document.getElementById("tableDCT")
        .textContent =
        mse.toFixed(4);


    /*
       DCT 행렬 표시
    */

    displayMatrix(
        firstMatrix
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


    for (let i = 0; i < 8; i++) {

        html += "<tr>";


        for (let j = 0; j < 8; j++) {

            html +=
                `<td>${matrix[i][j].toFixed(1)}</td>`;
        }


        html += "</tr>";
    }


    html += "</table>";


    container.innerHTML =
        html;
}
