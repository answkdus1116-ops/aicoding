const canvas = document.getElementById('orchardCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const bgm = document.getElementById('bgm');
const video = document.getElementById('video');
const modal = document.getElementById('cameraModal');

let fruits = [];

// 1. 기본 설정
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function startOrchard() {
    document.getElementById('entryOverlay').style.display = 'none';
    bgm.play().catch(() => console.log("재생 권한 필요"));
    document.getElementById('audioBtn').innerText = "🔊 소리 켬";
}

// 🍎 열매 클래스 (대롱대롱 매달려 좌우로 흔들리는 효과)
class Fruit {
    constructor(img) {
        this.img = img;
        this.size = 80 + Math.random() * 50; // 수족관보다 약간 작게 (열매느낌)
        
        // 🌳 문제 2 해결: 열매가 상단 나뭇가지에만 매달리도록 X, Y 배치 수정
        this.x = (canvas.width * 0.05) + Math.random() * (canvas.width * 0.9); // 화면 좌우 끝에서 약간 떨어짐
        this.y = (canvas.height * 0.1) + Math.random() * (canvas.height * 0.35); // 화면 위쪽 10% ~ 45% 영역에 배치
        
        // 흔들림 물리 효과
        this.angle = Math.random() * Math.PI * 2; // 초기 각도 랜덤
        this.swingSpeed = 0.015 + Math.random() * 0.02; // 흔들림 속도
        this.range = 0.08 + Math.random() * 0.1; // 흔들림 범위 (각도)
    }
    update() {
        this.angle += this.swingSpeed;
    }
    draw() {
        ctx.save();
        // 열매의 윗부분(가지에 매달린 부분)을 중심으로 흔들리게 설정
        ctx.translate(this.x + this.size/2, this.y);
        ctx.rotate(Math.sin(this.angle) * this.range);
        // 이미지를 캔버스 중앙에서 위로 올리지 않도록 배치 (윗부분 고정)
        ctx.drawImage(this.img, -this.size/2, 0, this.size, this.size);
        ctx.restore();
    }
}

// --- [공통 이미지 처리 로직] ---
async function processImage(dataUrl) {
    showLoading(true, "열매 열리는 중...");
    const base64Content = dataUrl.split(',')[1];
    try {
        const response = await fetch('/.netlify/functions/get-fish-data', { // 기존 넷리파이 함수 재사용
            method: 'POST',
            body: JSON.stringify({ imageContent: base64Content })
        });
        const data = await response.json();
        const objects = data.responses[0].localizedObjectAnnotations;
        // 과수원이니 'Fruit', 'Food', 'Apple' 등을 찾거나 기본 첫번째 물체 추출
        const obj = objects ? objects[0] : null;

        if (obj) {
            extractFruit(dataUrl, obj.boundingPoly.normalizedVertices);
        } else {
            addPlainFruit(dataUrl); // AI 감지 실패 시에도 배경제거 로직 포함
        }
    } catch (err) {
        console.error("AI 처리 실패, 기본 추가로 전환:", err);
        addPlainFruit(dataUrl);
    }
}

// 누끼 따기 (AI가 감지한 물체 추출)
function extractFruit(src, vertices) {
    const tempImg = new Image();
    tempImg.src = src;
    tempImg.onload = () => {
        const tempCanvas = document.createElement('canvas');
        const tCtx = tempCanvas.getContext('2d');
        const x = vertices[0].x * tempImg.width;
        const y = vertices[0].y * tempImg.height;
        const w = (vertices[2].x - vertices[0].x) * tempImg.width;
        const h = (vertices[2].y - vertices[0].y) * tempImg.height;
        tempCanvas.width = w; tempCanvas.height = h;
        tCtx.drawImage(tempImg, x, y, w, h, 0, 0, w, h);
        
        removeBackground(tempCanvas, tCtx); // 배경 제거 (흰색)
        
        const fruitImg = new Image();
        fruitImg.src = tempCanvas.toDataURL();
        fruitImg.onload = () => { fruits.push(new Fruit(fruitImg)); showLoading(false); };
    };
}

// 🍎 문제 1 대안 해결: AI 실패 시에도 흰색 배경을 제거하는 로직 추가
function addPlainFruit(src) {
    const tempImg = new Image();
    tempImg.src = src;
    tempImg.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = tempImg.width; tempCanvas.height = tempImg.height;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.drawImage(tempImg, 0, 0);
        
        removeBackground(tempCanvas, tCtx); // 배경 제거 (흰색)
        
        const fruitImg = new Image();
        fruitImg.src = tempCanvas.toDataURL();
        fruitImg.onload = () => { fruits.push(new Fruit(fruitImg)); showLoading(false); };
    };
}

// 배경 제거 (흰색 영역 투명화) 공통 함수
function removeBackground(canvas, ctx) {
    const imgData = ctx.getImageData(0,0, canvas.width, canvas.height);
    for(let i=0; i<imgData.data.length; i+=4) {
        // 흰색에 가까운 색 (220 이상)을 발견하면 투명하게 (data[i+3]=0) 만듭니다.
        if(imgData.data[i]>220 && imgData.data[i+1]>220 && imgData.data[i+2]>220) imgData.data[i+3]=0;
    }
    ctx.putImageData(imgData, 0, 0);
}

// --- [카메라/파일/UI 로직] ---
async function openCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream; modal.style.display = 'flex';
    } catch (err) { alert("카메라를 켤 수 없어요!"); }
}
function takeSnapshot() {
    const cap = document.getElementById('captureCanvas');
    cap.width = video.videoWidth; cap.height = video.videoHeight;
    cap.getContext('2d').drawImage(video, 0, 0);
    processImage(cap.toDataURL('image/jpeg'));
    closeCamera();
}
function closeCamera() {
    if (video.srcObject) video.srcObject.getTracks().forEach(t => t.stop());
    modal.style.display = 'none';
}
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => processImage(e.target.result);
    reader.readAsDataURL(file);
}
function toggleAudio() {
    if (bgm.paused) { bgm.play(); document.getElementById('audioBtn').innerText = "🔊 소리 켬"; }
    else { bgm.pause(); document.getElementById('audioBtn').innerText = "🔇 소리 끔"; }
}
function clearOrchard() { fruits = []; }
function showLoading(show, msg) {
    const el = document.getElementById('customAlert');
    document.getElementById('alertMessage').innerText = msg;
    el.classList.toggle('show', show);
}

// 🖥️ 문제 4 해결: 크게 보기 시 UI 사라지게 하기 (수족관과 동일 로직)
function toggleFullScreen() {
    const ui = document.getElementById('uiPanel');
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            ui.style.opacity = "0"; // 부드럽게 숨기기 (CSS transition)
            ui.style.pointerEvents = "none"; // 클릭 안 되게 방지
        });
    } else {
        document.exitFullscreen();
        ui.style.opacity = "1"; // 다시 보여주기
        ui.style.pointerEvents = "auto";
    }
}
window.addEventListener('mousemove', () => {
    if (document.fullscreenElement) {
        const ui = document.getElementById('uiPanel');
        ui.style.opacity = "1"; ui.style.pointerEvents = "auto";
        clearTimeout(window.uiTimeout);
        window.uiTimeout = setTimeout(() => {
            if (document.fullscreenElement) { ui.style.opacity = "0"; ui.style.pointerEvents = "none"; }
        }, 3000); // 마우스 가만히 3초 뒤 다시 숨김
    }
});

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fruits.forEach(f => { f.update(); f.draw(); });
    requestAnimationFrame(animate);
}
animate();