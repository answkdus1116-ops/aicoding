const WHITE_THRESHOLD = 230; // 흰색 배경으로 판단할 밝기 임계값 (0~255). 숫자가 낮을수록 어두운 흰색까지 지웁니다.

const canvas = document.getElementById('aquariumCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true }); // ImageData 읽기 성능 향상
const uiPanel = document.getElementById('uiPanel');
const bgm = document.getElementById('bgm');

// 캔버스 크기를 화면에 맞춤
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let fishes = [];

// --- [변경 사항: Fish 클래스 업데이트] ---
class Fish {
    constructor(img) {
        this.img = img;
        this.size = 100 + Math.random() * 80;
        this.x = Math.random() * (canvas.width - this.size);
        this.y = Math.random() * (canvas.height - this.size);
        
        // 대각선 이동을 위해 속도를 X, Y 모두 다양하게 부여
        this.speedX = (Math.random() - 0.5) * 4; 
        this.speedY = (Math.random() - 0.5) * 3; // 위아래 속도 추가
        this.flip = this.speedX > 0;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // 좌우 벽 충돌
        if (this.x <= 0 || this.x >= canvas.width - this.size) {
            this.speedX *= -1;
            this.flip = !this.flip;
        }
        // 상하 벽 충돌 (수족관 천장과 바닥)
        if (this.y <= 0 || this.y >= canvas.height - 120) { // 모래사장(80px) 고려
            this.speedY *= -1;
        }
    }

    draw() {
        ctx.save();
        // 약간의 각도를 주어 대각선 이동 시 머리가 향하는 느낌을 줄 수 있음
        const angle = Math.atan2(this.speedY, Math.abs(this.speedX)) * 0.5;
        
        if (this.flip) {
            ctx.translate(this.x + this.size, this.y);
            ctx.scale(-1, 1);
            ctx.rotate(-angle);
            ctx.drawImage(this.img, 0, 0, this.size, this.size);
        } else {
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            ctx.drawImage(this.img, 0, 0, this.size, this.size);
        }
        ctx.restore();
    }
}

// --- [변경 사항: 커스텀 알림창 제어] ---
function showLoading(show, message = "물고기를 데려오는 중...") {
    const alertBox = document.getElementById('customAlert');
    document.getElementById('alertMessage').innerText = message;
    if (show) alertBox.classList.add('show');
    else alertBox.classList.remove('show');
}

// handleFileUpload 내의 alert()를 showLoading()으로 교체하세요
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    showLoading(true); // 커스텀 알림 켜기

    // ... (기존 API 호출 로직 생략) ...

    // 작업 완료 후 알림 끄기
    // showLoading(false); 를 extractFishAndAdd의 img.onload 마지막에 넣으세요.
}

// --- [변경 사항: 소리 재생 문제 해결] ---
function toggleAudio() {
    const audioBtn = document.getElementById('audioBtn');
    if (bgm.paused) {
        bgm.play()
            .then(() => {
                audioBtn.innerText = "소리 켜짐 🫧";
                audioBtn.classList.add('playing');
            })
            .catch(e => {
                console.log("재생 실패:", e);
                showLoading(true, "화면을 클릭하면 소리가 시작됩니다!");
                setTimeout(() => showLoading(false), 2000);
            });
    } else {
        bgm.pause();
        audioBtn.innerText = "소리 꺼짐 🔇";
        audioBtn.classList.remove('playing');
    }
}

// 사용자가 화면 아무 데나 클릭하면 오디오 컨텍스트를 활성화
document.body.addEventListener('click', () => {
    if (bgm.paused && !bgm.currentTime) {
        // 첫 클릭 시 조용히 소리 준비만 함
        bgm.load();
    }
}, { once: true });

// [핵심 기능] 캔버스의 흰색 배경을 투명하게 만드는 함수
function removeWhiteBackground(canvas, threshold = WHITE_THRESHOLD) {
    const tempCtx = canvas.getContext('2d');
    const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data; // [R, G, B, A, R, G, B, A, ...] 형태의 배열

    // 모든 픽셀을 순회하며 흰색 감지
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];     // Red
        const g = data[i + 1]; // Green
        const b = data[i + 2]; // Blue
        // const a = data[i + 3]; // Alpha (투명도)

        // R, G, B 값이 모두 임계값보다 크면 '흰색 배경'으로 간주
        if (r > threshold && g > threshold && b > threshold) {
            data[i + 3] = 0; // 알파(투명도) 값을 0으로 설정하여 투명하게 만듦
        }
    }

    // 수정된 이미지 데이터를 다시 캔버스에 그리기
    tempCtx.putImageData(imageData, 0, 0);
}

// 이미지 업로드 및 배경 제거 처리
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 로딩 표시 (간단하게)
    alert("물고기를 데려오는 중입니다... 잠시만 기다려주세요.");

    // 1. 이미지를 Base64로 변환
    const base64Image = await toBase64(file);
    const base64Content = base64Image.split(',')[1];

    try {
       // 수정된 호출 부분: 구글 API 주소가 아닌 내 서버 함수 주소로 요청
    const response = await fetch('/.netlify/functions/get-fish-data', {
        method: 'POST',
        body: JSON.stringify({ imageContent: base64Content })
    });

        const data = await response.json();
        const objects = data.responses[0].localizedObjectAnnotations;

        // 3. 물고기 관련 객체 찾기
        const fishObject = objects ? objects.find(obj => obj.name === 'Fish' || obj.name === 'Animal') || objects[0] : null;

        if (fishObject) {
            // 영역 감지 성공 시, 잘라내고 + 흰 배경 지우기 수행
            extractFishAndAdd(base64Image, fishObject.boundingPoly.normalizedVertices);
        } else {
            console.log("Fish not detected, adding whole image with background removal.");
            // 감지 실패 시 전체 이미지에서 흰 배경만 지우고 추가
            addPlainFishWithBgRemoval(base64Image);
        }

    } catch (error) {
        console.error("Vision API Error:", error);
        // 에러 발생 시 전체 이미지에서 흰 배경만 지우고 추가
        addPlainFishWithBgRemoval(base64Image);
    }
}

// 파일을 Base64로 변환하는 헬퍼 함수
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// 4. 감지된 좌표를 바탕으로 물고기 영역 추출 및 흰 배경 제거
function extractFishAndAdd(originalSrc, vertices) {
    const tempImg = new Image();
    tempImg.src = originalSrc;
    tempImg.onload = () => {
        const tempCanvas = document.createElement('canvas');
        const tCtx = tempCanvas.getContext('2d');

        // 원본 이미지 대비 비율 좌표 계산
        const x = vertices[0].x * tempImg.width;
        const y = vertices[0].y * tempImg.height;
        const width = (vertices[2].x - vertices[0].x) * tempImg.width;
        const height = (vertices[2].y - vertices[0].y) * tempImg.height;

        tempCanvas.width = width;
        tempCanvas.height = height;

        // [작업 1] 물고기 영역만 임시 캔버스에 그리기
        tCtx.drawImage(tempImg, x, y, width, height, 0, 0, width, height);

        // [작업 2] 캔버스에서 흰 배경을 투명하게 지우기 (핵심 추가 로직)
        removeWhiteBackground(tempCanvas);

        // [작업 3] 투명해진 캔버스를 이미지 객체로 변환하여 수족관에 추가
        const fishImg = new Image();
        fishImg.src = tempCanvas.toDataURL();
        fishImg.onload = () => {
            fishes.push(new Fish(fishImg));
        };
    };
}

// 객체 감지 실패 시 호출되는 함수 (전체 이미지 배경 제거)
function addPlainFishWithBgRemoval(src) {
    const tempImg = new Image();
    tempImg.src = src;
    tempImg.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = tempImg.width;
        tempCanvas.height = tempImg.height;
        const tCtx = tempCanvas.getContext('2d');
        
        tCtx.drawImage(tempImg, 0, 0);
        
        // 전체 이미지에 대해 흰 배경 제거 적용
        removeWhiteBackground(tempCanvas);

        const fishImg = new Image();
        fishImg.src = tempCanvas.toDataURL();
        fishImg.onload = () => fishes.push(new Fish(fishImg));
    };
}

// 애니메이션 루프 및 제어 함수들 (기존과 동일)
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fishes.forEach(fish => {
        fish.update();
        fish.draw();
    });
    requestAnimationFrame(animate);
}

function toggleAudio() {
    if (bgm.paused) { bgm.play().catch(() => alert("화면을 먼저 클릭한 후 소리를 켜주세요!")); }
    else { bgm.pause(); }
}

function clearAquarium() { fishes = []; }

function toggleFullScreen() {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); uiPanel.classList.add('hide-ui'); }
    else { document.exitFullscreen(); uiPanel.classList.remove('hide-ui'); }
}

let uiTimer;
window.addEventListener('mousemove', () => {
    if (document.fullscreenElement) {
        uiPanel.classList.remove('hide-ui');
        clearTimeout(uiTimer);
        uiTimer = setTimeout(() => { uiPanel.classList.add('hide-ui'); }, 3000);
    }
});

animate();