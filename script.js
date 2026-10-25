let originalImage = null;

const imageInput = document.getElementById("imageInput");

const originalCanvas = document.getElementById("originalCanvas");
const resolutionCanvas = document.getElementById("resolutionCanvas");
const dctCanvas = document.getElementById("dctCanvas");

const originalCtx = originalCanvas.getContext("2d");
const resolutionCtx = resolutionCanvas.getContext("2d");
const dctCtx = dctCanvas.getContext("2d");


/* =========================
   이미지 불러오기
========================= */

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


/* =========================
   슬라이더
========================= */

document.getElementById("resolutionSlider")
    .addEventListener("input", function() {

        document.getElementById("resolutionValue").textContent =
            this.value;
    });


document.getElementById("dctSlider")
    .addEventListener("input", function() {

        document.getElementById("dctValue").textContent =
            this.value;
    });


/* =========================
   실험 1
   해상도 축소
========================= */

function runResolutionExperiment() {

    if (!originalImage) {
        alert("먼저 이미지를 선택하세요.");
        return;
    }

    const ratio =
        Number(document.getElementById("resolutionSlider").value) / 100;

    const w = originalImage.width;
    const h = originalImage.height;

    const smallW = Math.max(1, Math.floor(w * ratio));
    const smallH = Math.max(1, Math.floor(h * ratio));

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

    const mse = calculateMSE(
        originalCtx.getImageData(0, 0, w, h),
        resolutionCtx.getImageData(0, 0, w, h)
    );

    document.getElementById("resolutionMSE")
        .textContent = mse.toFixed(2);

    document.getElementById("tableResolution")
        .textContent = mse.toFixed(2);
}


/* =========================
   MSE 계산
========================= */

function calculateMSE(originalData, compressedData) {

    let sum = 0;

    const pixelCount =
        originalData.width * originalData.height;

    for (let i = 0; i < originalData.data.length; i += 4) {

        const originalBrightness =
            (
                originalData.data[i] +
                originalData.data[i + 1] +
                originalData.data[i + 2]
            ) / 3;

        const compressedBrightness =
            (
                compressedData.data[i] +
                compressedData.data[i + 1] +
                compressedData.data[i + 2]
            ) / 3;

        const difference =
            originalBrightness - compressedBrightness;

        sum += difference * difference;
    }

    return sum / pixelCount;
}


/* =========================
   DCT 함수
========================= */

function dct8x8(block) {

    const result = Array.from(
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
                            ((2 * x + 1) * u * Math.PI) / 16
                        ) *
                        Math.cos(
                            ((2 * y + 1) * v * Math.PI) / 16
                        );
                }
            }

            const cu = (u === 0)
                ? 1 / Math.sqrt(2)
                : 1;

            const cv = (v === 0)
                ? 1 / Math.sqrt(2)
                : 1;

            result[u][v] =
                0.25 * cu * cv * sum;
        }
    }

    return result;
}


/* =========================
   역 DCT
========================= */

function idct8x8(coefficients) {

    const result = Array.from(
        { length: 8 },
        () => Array(8).fill(0)
    );

    for (let x = 0; x < 8; x++) {

        for (let y = 0; y < 8; y++) {

            let sum = 0;

            for (let u = 0; u < 8; u++) {

                for (let v = 0; v < 8; v++) {

                    const cu = (u === 0)
                        ? 1 / Math.sqrt(2)
                        : 1;

                    const cv = (v === 0)
                        ? 1 / Math.sqrt(2)
                        : 1;

                    sum +=
                        cu * cv *
                        coefficients[u][v] *
                        Math.cos(
                            ((2 * x + 1) * u * Math.PI) / 16
                        ) *
                        Math.cos(
                            ((2 * y + 1) * v * Math.PI) / 16
                        );
                }
            }

            result[x][y] =
                Math.max(
                    0,
                    Math.min(
                        255,
                        sum
                    )
                );
        }
    }

    return result;
}


/* =========================
   실험 2
   DCT 압축
========================= */

function runDCTExperiment() {

    if (!originalImage) {
        alert("먼저 이미지를 선택하세요.");
        return;
    }

    const w = originalImage.width;
    const h = originalImage.height;

    const originalData =
        originalCtx.getImageData(0, 0, w, h);

    const output =
        dctCtx.createImageData(w, h);

    const keep =
        Number(document.getElementById("dctSlider").value);

    let firstMatrix = null;


    /*
       이미지를 8×8 블록으로 나누어 처리
    */

    for (let y = 0; y < h; y += 8) {

        for (let x = 0; x < w; x += 8) {

            const block =
                Array.from(
                    { length: 8 },
                    () => Array(8).fill(0)
                );


            /* 픽셀 행렬 생성 */

            for (let i = 0; i < 8; i++) {

                for (let j = 0; j < 8; j++) {

                    const px = x + j;
                    const py = y + i;

                    if (px < w && py < h) {

                        const index =
                            (py * w + px) * 4;

                        const gray =
                            (
                                originalData.data[index] +
                                originalData.data[index + 1] +
                                originalData.data[index + 2]
                            ) / 3;

                        block[i][j] =
                            gray - 128;
                    }
                }
            }


            /* DCT */

            let coefficients =
                dct8x8(block);


            if (firstMatrix === null) {
                firstMatrix = coefficients;
            }


            /*
               고주파 성분 제거

               u + v가 클수록
               상대적으로 높은 주파수 성분
            */

            const threshold =
                16 * (1 - keep / 100);

            for (let u = 0; u < 8; u++) {

                for (let v = 0; v < 8; v++) {

                    if (u + v > threshold) {
                        coefficients[u][v] = 0;
                    }
                }
            }


            /* 역 DCT */

            const restored =
                idct8x8(coefficients);


            /* 이미지에 다시 저장 */

            for (let i = 0; i < 8; i++) {

                for (let j = 0; j < 8; j++) {

                    const px = x + j;
                    const py = y + i;

                    if (px < w && py < h) {

                        const index =
                            (py * w + px) * 4;

                        const value =
                            Math.round(restored[i][j]);

                        output.data[index] = value;
                        output.data[index + 1] = value;
                        output.data[index + 2] = value;
                        output.data[index + 3] = 255;
                    }
                }
            }
        }
    }


    dctCtx.putImageData(output, 0, 0);


    /* MSE */

    const mse =
        calculateMSE(
            originalData,
            output
        );

    document.getElementById("dctMSE")
        .textContent = mse.toFixed(2);

    document.getElementById("tableDCT")
        .textContent = mse.toFixed(2);


    /* 첫 번째 DCT 행렬 표시 */

    displayMatrix(firstMatrix);
}


/* =========================
   DCT 행렬 표시
========================= */

function displayMatrix(matrix) {

    const container =
        document.getElementById("dctMatrix");

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

    container.innerHTML = html;
}
