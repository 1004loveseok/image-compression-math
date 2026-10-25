const imageInput = document.getElementById("imageInput");

const originalCanvas =
    document.getElementById("originalCanvas");

const compressedCanvas =
    document.getElementById("compressedCanvas");

const compression =
    document.getElementById("compression");

const compressionValue =
    document.getElementById("compressionValue");

let originalImage = null;


// 압축 정도 표시
compression.addEventListener("input", function () {

    compressionValue.textContent =
        compression.value;

});


// 이미지 선택
imageInput.addEventListener("change", function (event) {

    const file = event.target.files[0];

    if (!file) return;

    const img = new Image();

    img.onload = function () {

        originalImage = img;

        originalCanvas.width = img.width;
        originalCanvas.height = img.height;

        const ctx =
            originalCanvas.getContext("2d");

        ctx.drawImage(
            img,
            0,
            0
        );

    };

    img.src = URL.createObjectURL(file);

});


// 이미지 압축
function compressImage() {

    if (!originalImage) {

        alert("먼저 이미지를 선택하세요.");

        return;
    }


    const scale =
        compression.value / 100;


    const width =
        Math.max(
            1,
            Math.floor(originalImage.width * scale)
        );

    const height =
        Math.max(
            1,
            Math.floor(originalImage.height * scale)
        );


    // 작은 이미지 생성
    const smallCanvas =
        document.createElement("canvas");

    smallCanvas.width = width;
    smallCanvas.height = height;


    const smallCtx =
        smallCanvas.getContext("2d");

    smallCtx.drawImage(
        originalImage,
        0,
        0,
        width,
        height
    );


    // 다시 원래 크기로 확대
    compressedCanvas.width =
        originalImage.width;

    compressedCanvas.height =
        originalImage.height;


    const compressedCtx =
        compressedCanvas.getContext("2d");


    compressedCtx.drawImage(
        smallCanvas,
        0,
        0,
        originalImage.width,
        originalImage.height
    );


    calculateMSE();
}


// MSE 계산
function calculateMSE() {

    const originalCtx =
        originalCanvas.getContext("2d");

    const compressedCtx =
        compressedCanvas.getContext("2d");


    const originalData =
        originalCtx.getImageData(
            0,
            0,
            originalCanvas.width,
            originalCanvas.height
        ).data;


    const compressedData =
        compressedCtx.getImageData(
            0,
            0,
            compressedCanvas.width,
            compressedCanvas.height
        ).data;


    let error = 0;

    const pixels =
        originalData.length / 4;


    for (let i = 0; i < originalData.length; i += 4) {

        const originalBrightness =
            (
                originalData[i] +
                originalData[i + 1] +
                originalData[i + 2]
            ) / 3;


        const compressedBrightness =
            (
                compressedData[i] +
                compressedData[i + 1] +
                compressedData[i + 2]
            ) / 3;


        error +=
            Math.pow(
                originalBrightness -
                compressedBrightness,
                2
            );
    }


    const mse =
        error / pixels;


    document.getElementById("mse")
        .textContent =
        mse.toFixed(2);


    document.getElementById("ratio")
        .textContent =
        compression.value + "%";
}
