document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       기본 설정
    ===================================================== */

    let originalImage = null;

    const imageInput =
        document.getElementById("imageInput");

    const originalCanvas =
        document.getElementById("originalCanvas");

    const resolutionCanvas =
        document.getElementById("resolutionCanvas");

    const dctCanvas =
        document.getElementById("dctCanvas");

    const originalCtx =
        originalCanvas.getContext("2d");

    const resolutionCtx =
        resolutionCanvas.getContext("2d");

    const dctCtx =
        dctCanvas.getContext("2d");


    /* =====================================================
       이미지 업로드
    ===================================================== */

    imageInput.addEventListener("change", function (event) {

        const file = event.target.files[0];

        if (!file) {
            return;
        }

        const img = new Image();

        img.onload = function () {

            originalImage = img;

            const width = img.naturalWidth;
            const height = img.naturalHeight;

            originalCanvas.width = width;
            originalCanvas.height = height;

            resolutionCanvas.width = width;
            resolutionCanvas.height = height;

            dctCanvas.width = width;
            dctCanvas.height = height;

            originalCtx.clearRect(
                0,
                0,
                width,
                height
            );

            resolutionCtx.clearRect(
                0,
                0,
                width,
                height
            );

            dctCtx.clearRect(
                0,
                0,
                width,
                height
            );


            /* 원본 이미지 */

            originalCtx.drawImage(
                img,
                0,
                0,
                width,
                height
            );


            /* 처음에는 결과에도 원본 표시 */

            resolutionCtx.drawImage(
                img,
                0,
                0,
                width,
                height
            );

            dctCtx.drawImage(
                img,
                0,
                0,
                width,
                height
            );


            /* MSE 초기화 */

            const resolutionMSE =
                document.getElementById("resolutionMSE");

            const dctMSE =
                document.getElementById("dctMSE");

            if (resolutionMSE) {
                resolutionMSE.textContent = "-";
            }

            if (dctMSE) {
                dctMSE.textContent = "-";
            }
        };


        img.onerror = function () {

            alert("이미지를 불러오지 못했습니다.");
        };


        img.src =
            URL.createObjectURL(file);
    });


    /* =====================================================
       슬라이더
    ===================================================== */

    const resolutionSlider =
        document.getElementById("resolutionSlider");

    const resolutionValue =
        document.getElementById("resolutionValue");

    const dctSlider =
        document.getElementById("dctSlider");

    const dctValue =
        document.getElementById("dctValue");


    if (resolutionSlider && resolutionValue) {

        resolutionSlider.addEventListener(
            "input",
            function () {

                resolutionValue.textContent =
                    this.value;
            }
        );
    }


    if (dctSlider && dctValue) {

        dctSlider.addEventListener(
            "input",
            function () {

                dctValue.textContent =
                    this.value;
            }
        );
    }


    /* =====================================================
       MSE
       
       RGB 세 채널의 평균제곱오차
    ===================================================== */

    function calculateMSE(
        originalData,
        resultData
    ) {

        let sum = 0;

        const pixelCount =
            originalData.width *
            originalData.height;


        for (
            let i = 0;
            i < originalData.data.length;
            i += 4
        ) {

            const r1 =
                originalData.data[i];

            const g1 =
                originalData.data[i + 1];

            const b1 =
                originalData.data[i + 2];


            const r2 =
                resultData.data[i];

            const g2 =
                resultData.data[i + 1];

            const b2 =
                resultData.data[i + 2];


            sum +=
                (r1 - r2) *
                (r1 - r2);

            sum +=
                (g1 - g2) *
                (g1 - g2);

            sum +=
                (b1 - b2) *
                (b1 - b2);
        }


        return sum /
            (pixelCount * 3);
    }


    /* =====================================================
       DCT용 코사인 테이블

       8×8 DCT에서 반복적으로 사용되므로
       미리 계산
    ===================================================== */

    const cosTable =
        Array.from(
            { length: 8 },
            () => Array(8).fill(0)
        );


    for (let n = 0; n < 8; n++) {

        for (let k = 0; k < 8; k++) {

            cosTable[n][k] =
                Math.cos(
                    ((2 * n + 1) *
                    k *
                    Math.PI) / 16
                );
        }
    }


    /* =====================================================
       DCT

       입력값은 -128 ~ 127 범위
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
                            cosTable[x][u] *
                            cosTable[y][v];
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


                /*
                   8×8 DCT 정규화 계수
                */

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

       DCT의 정확한 역변환

       f(x,y)
       =
       1/4 ΣΣ Cu Cv F(u,v)
       cos(...) cos(...)
       + 128
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
                            cosTable[x][u] *
                            cosTable[y][v];
                    }
                }


                /*
                   반드시 1/4를 곱한다.
                   그리고 DCT 전에 빼었던 128을 다시 더한다.
                */

                result[y][x] =
                    0.25 * sum + 128;
            }
        }


        return result;
    }


    /* =====================================================
       Zigzag 순서

       낮은 주파수 → 높은 주파수
    ===================================================== */

    function getZigzag() {

        const order = [];


        for (let sum = 0; sum <= 14; sum++) {

            if (sum % 2 === 0) {

                for (
                    let y = Math.min(sum, 7);
                    y >= Math.max(0, sum - 7);
                    y--
                ) {

                    const x =
                        sum - y;

                    order.push([y, x]);
                }

            } else {

                for (
                    let x = Math.min(sum, 7);
                    x >= Math.max(0, sum - 7);
                    x--
                ) {

                    const y =
                        sum - x;

                    order.push([y, x]);
                }
            }
        }


        return order;
    }


    /* =====================================================
       실험 1
       해상도 축소
    ===================================================== */

    function runResolutionExperiment() {

        if (!originalImage) {

            alert(
                "먼저 이미지를 선택하세요."
            );

            return;
        }


        const ratio =
            Number(
                resolutionSlider.value
            ) / 100;


        const width =
            originalImage.naturalWidth;

        const height =
            originalImage.naturalHeight;


        const smallWidth =
            Math.max(
                1,
                Math.floor(width * ratio)
            );

        const smallHeight =
            Math.max(
                1,
                Math.floor(height * ratio)
            );


        const tempCanvas =
            document.createElement("canvas");

        tempCanvas.width =
            smallWidth;

        tempCanvas.height =
            smallHeight;


        const tempCtx =
            tempCanvas.getContext("2d");


        /* 작은 이미지 생성 */

        tempCtx.drawImage(
            originalImage,
            0,
            0,
            smallWidth,
            smallHeight
        );


        /* 다시 원래 크기로 확대 */

        resolutionCtx.clearRect(
            0,
            0,
            width,
            height
        );


        resolutionCtx.drawImage(
            tempCanvas,
            0,
            0,
            width,
            height
        );


        /* 원본과 결과 비교 */

        const originalData =
            originalCtx.getImageData(
                0,
                0,
                width,
                height
            );


        const resultData =
            resolutionCtx.getImageData(
                0,
                0,
                width,
                height
            );


        const mse =
            calculateMSE(
                originalData,
                resultData
            );


        const mseElement =
            document.getElementById(
                "resolutionMSE"
            );


        if (mseElement) {

            mseElement.textContent =
                mse.toFixed(4);
        }


        const tableElement =
            document.getElementById(
                "tableResolution"
            );


        if (tableElement) {

            tableElement.textContent =
                mse.toFixed(4);
        }
    }


    /* =====================================================
       실험 2
       DCT 이미지 압축
    ===================================================== */

    function runDCTExperiment() {

        if (!originalImage) {

            alert(
                "먼저 이미지를 선택하세요."
            );

            return;
        }


        const width =
            originalImage.naturalWidth;

        const height =
            originalImage.naturalHeight;


        /* 원본 픽셀 */

        const originalData =
            originalCtx.getImageData(
                0,
                0,
                width,
                height
            );


        /* 결과 이미지 */

        const result =
            dctCtx.createImageData(
                width,
                height
            );


        /* 보존할 DCT 계수 비율 */

        const keepPercent =
            Number(
                dctSlider.value
            );


        /*
           64개 계수 중 몇 개를 보존할 것인가?

           100% → 64개
           75%  → 48개
           50%  → 32개
           25%  → 16개
           10%  → 6개
           0%   → 0개
        */

        const keepCount =
            Math.round(
                64 *
                keepPercent /
                100
            );


        const zigzag =
            getZigzag();


        let firstDCTMatrix =
            null;


        /* =================================================
           8×8 블록 단위 처리
        ================================================= */

        for (
            let blockY = 0;
            blockY < height;
            blockY += 8
        ) {

            for (
                let blockX = 0;
                blockX < width;
                blockX += 8
            ) {


                const restoredChannels = [];


                /* =========================================
                   R, G, B 각각 처리
                ========================================= */

                for (
                    let channel = 0;
                    channel < 3;
                    channel++
                ) {


                    /* 8×8 픽셀 블록 */

                    const block =
                        Array.from(
                            { length: 8 },
                            () => Array(8).fill(0)
                        );


                    for (
                        let y = 0;
                        y < 8;
                        y++
                    ) {

                        for (
                            let x = 0;
                            x < 8;
                            x++
                        ) {

                            let px =
                                blockX + x;

                            let py =
                                blockY + y;


                            /*
                               이미지 경계를 넘어가면
                               가장자리 픽셀을 반복 사용
                            */

                            px =
                                Math.min(
                                    px,
                                    width - 1
                                );

                            py =
                                Math.min(
                                    py,
                                    height - 1
                                );


                            const index =
                                (py * width + px) * 4;


                            /*
                               DCT 계산을 위해
                               0~255 → -128~127
                            */

                            block[y][x] =
                                originalData.data[
                                    index + channel
                                ] - 128;
                        }
                    }


                    /* =====================================
                       DCT 변환
                    ===================================== */

                    const coefficients =
                        DCT(block);


                    /*
                       첫 번째 블록의
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


                    /* =====================================
                       계수 제거
                    ===================================== */

                    const compressed =
                        Array.from(
                            { length: 8 },
                            () => Array(8).fill(0)
                        );


                    /*
                       낮은 주파수부터 보존

                       100%라면
                       64개 전체가 그대로 들어간다.
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


                    /* =====================================
                       역 DCT
                    ===================================== */

                    const restored =
                        IDCT(compressed);


                    restoredChannels.push(
                        restored
                    );
                }


                /* =========================================
                   RGB 결과를 이미지에 기록
                ========================================= */

                for (
                    let y = 0;
                    y < 8;
                    y++
                ) {

                    for (
                        let x = 0;
                        x < 8;
                        x++
                    ) {

                        const px =
                            blockX + x;

                        const py =
                            blockY + y;


                        if (
                            px >= width ||
                            py >= height
                        ) {

                            continue;
                        }


                        const index =
                            (py * width + px) * 4;


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


                        /* 0~255 범위로 제한 */

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


        /* =================================================
           결과 출력
        ================================================= */

        dctCtx.putImageData(
            result,
            0,
            0
        );


        /* =================================================
           MSE 계산
        ================================================= */

        const mse =
            calculateMSE(
                originalData,
                result
            );


        const mseElement =
            document.getElementById(
                "dctMSE"
            );


        if (mseElement) {

            mseElement.textContent =
                mse.toFixed(4);
        }


        const tableElement =
            document.getElementById(
                "tableDCT"
            );


        if (tableElement) {

            tableElement.textContent =
                mse.toFixed(4);
        }


        /* DCT 행렬 출력 */

        displayMatrix(
            firstDCTMatrix
        );
    }


    /* =====================================================
       DCT 행렬 표시
    ===================================================== */

    function displayMatrix(matrix) {

        const container =
            document.getElementById(
                "dctMatrix"
            );


        if (
            !container ||
            !matrix
        ) {

            return;
        }


        let html =
            '<table class="matrix">';


        for (
            let y = 0;
            y < 8;
            y++
        ) {

            html += "<tr>";


            for (
                let x = 0;
                x < 8;
                x++
            ) {

                html +=
                    "<td>" +
                    matrix[y][x].toFixed(2) +
                    "</td>";
            }


            html += "</tr>";
        }


        html += "</table>";


        container.innerHTML =
            html;
    }


    /* =====================================================
       HTML onclick 연결
    ===================================================== */

    window.runResolutionExperiment =
        runResolutionExperiment;

    window.runDCTExperiment =
        runDCTExperiment;

});
