const canvas = document.getElementById('orchardCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const bgm = document.getElementById('bgm');
const video = document.getElementById('video');
const modal = document.getElementById('cameraModal');

let fruits = [];

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

// 🍎 열매 클래스 (대롱대롱 흔들리는 효과)
class Fruit {
    constructor(img) {
        this.img = img;
        this.size = 80 + Math.random() * 50;
        // 나뭇가지가 있을 법한 상단 영역에 랜덤 배치
        this.x = Math.random() * (canvas.width - this.size);
        this.y = (canvas.height * 0.1) + Math.random() * (canvas.height * 0.4);
        
        this.angle = 0; // 흔들림 각도
        this.swingSpeed = 0.02 + Math.random() * 0.03; // 흔들림 속도
        this.range = 0.1 + Math.random() * 0.15; // 흔들림 범위
    }
    update() {
        this.angle += this.swingSpeed;
    }
    draw() {
        ctx.save();
        // 열매의 윗부분을 중심으로 흔들리게 설정
        ctx.translate(this.x + this.size/2, this.y);
        ctx.rotate(Math.sin(this.angle) * this.range);
        ctx.drawImage(this.img, -this.size/2, 0, this.size, this.size);
        ctx.restore();
    }
}

// --- [공통 이미지 처리 로직] ---
async function processImage(dataUrl) {
    showLoading(true, "열매 열리는 중...");
    const base64Content = dataUrl.split(',')[1];
    try {
        const response = await fetch('/.netlify/functions/get-fish-data', { // 기존 넷리파이 함수 재사용 가능
            method: 'POST',
            body: JSON.stringify({ imageContent: base64Content })
        });
        const data = await response.json();
        const objects = data.responses[0].localizedObjectAnnotations;
        // 과수원이니 'Fruit', 'Food', 'Apple' 등을 찾거나 기본 첫번째 물체 추출
        const obj = objects ? objects[0] : null;

        if (obj) {
            addFruit(dataUrl, obj.boundingPoly.normalizedVertices);
        } else {
            addPlainFruit(dataUrl);
        }
    } catch (err) {
        addPlainFruit(dataUrl);
    }
}

function addFruit(src, vertices) {
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
        
        // 배경 제거 (흰색)
        const imgData = tCtx.getImageData(0,0,w,h);
        for(let i=0; i<imgData.data.length; i+=4) {
            if(imgData.data[i]>230 && imgData.data[i+1]>230 && imgData.data[i+2]>230) imgData.data[i+3]=0;
        }
        tCtx.putImageData(imgData, 0, 0);
        const fruitImg = new Image();
        fruitImg.src = tempCanvas.toDataURL();
        fruitImg.onload = () => { fruits.push(new Fruit(fruitImg)); showLoading(false); };
    };
}

function addPlainFruit(src) {
    const tempImg = new Image();
    tempImg.src = src;
    tempImg.onload = () => {
        const fruitImg = new Image();
        fruitImg.src = src;
        fruits.push(new Fruit(fruitImg));
        showLoading(false);
    };
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
function toggleFullScreen() {
    const ui = document.getElementById('uiPanel');
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            ui.style.opacity = "0"; ui.style.pointerEvents = "none";
        });
    } else { document.exitFullscreen(); ui.style.opacity = "1"; ui.style.pointerEvents = "auto"; }
}
window.addEventListener('mousemove', () => {
    if (document.fullscreenElement) {
        const ui = document.getElementById('uiPanel');
        ui.style.opacity = "1"; ui.style.pointerEvents = "auto";
        clearTimeout(window.uiTimeout);
        window.uiTimeout = setTimeout(() => {
            if (document.fullscreenElement) { ui.style.opacity = "0"; ui.style.pointerEvents = "none"; }
        }, 3000);
    }
});

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fruits.forEach(f => { f.update(); f.draw(); });
    requestAnimationFrame(animate);
}
animate();